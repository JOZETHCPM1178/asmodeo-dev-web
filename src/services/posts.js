// src/services/posts.js
// ════════════════════════════════════════
//  POSTS SERVICE — CRUD y lógica de publicaciones
// ════════════════════════════════════════
import {
  db, collection, addDoc, getDocs, getDoc, doc, deleteDoc,
  updateDoc, serverTimestamp, query, orderBy, where,
  increment, onSnapshot, limit, startAfter, arrayUnion, arrayRemove,
  writeBatch, getCountFromServer,
} from './firebase'
import { analyzePostSafety } from './gemini'
import { notifyAdmins } from './notifications'

// ─── SCORE DE RANKING ───
// Calcula el score de cada post para el feed
function calcScore(post) {
  const likes = post.likes || 0
  const downloads = post.downloads || 0
  const comments = post.commentCount || 0
  const featured = post.featured ? 500 : 0
  const ageDays = post.createdAt
    ? (Date.now() - post.createdAt.toDate().getTime()) / 86400000
    : 0
  // Decaimiento temporal: más reciente = más score
  const decay = Math.max(0, 1 - ageDays / 30)
  return Math.round((likes * 3 + downloads * 2 + comments) * (1 + decay) + featured)
}

// ─── CREAR PUBLICACIÓN ───
export async function createPost(postData, userId) {
  // Análisis de seguridad con Gemini
  let safetyResult = { safe: true, score: 100, issues: [] }
  try {
    safetyResult = await analyzePostSafety({
      title: postData.name,
      description: postData.description,
      downloadUrl: postData.downloadUrl,
    })
  } catch (e) {
    console.warn('Gemini safety check failed, continuing:', e.message)
  }

  const post = {
    ...postData,
    authorId: userId,
    likes: 0,
    downloads: 0,
    commentCount: 0,
    views: 0,
    featured: false,
    verified: false,
    status: safetyResult.safe ? 'active' : 'pending_review',
    safetyScore: safetyResult.score,
    safetyIssues: safetyResult.issues,
    score: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, 'posts'), post)

  // Si el contenido es sospechoso, notificar a admins
  if (!safetyResult.safe) {
    await notifyAdmins({
      type: 'suspicious_content',
      postId: ref.id,
      postName: postData.name,
      reason: safetyResult.reason,
      issues: safetyResult.issues,
    })
  }

  return ref.id
}

// ─── OBTENER FEED PAGINADO ───
export async function getFeed({ pageSize = 10, lastDoc = null, category = null } = {}) {
  let q = query(
    collection(db, 'posts'),
    where('status', '==', 'active'),
    orderBy('score', 'desc'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  )

  if (category) {
    q = query(
      collection(db, 'posts'),
      where('status', '==', 'active'),
      where('category', '==', category),
      orderBy('score', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    )
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }

  const snap = await getDocs(q)
  return {
    posts: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  }
}

// ─── OBTENER UN POST ───
export async function getPost(postId) {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return null
  // Incrementar views
  updateDoc(snap.ref, { views: increment(1) }).catch(() => {})
  return { id: snap.id, ...snap.data() }
}

// ─── LIKE / UNLIKE ───
export async function toggleLike(postId, userId) {
  const postRef = doc(db, 'posts', postId)
  const likeRef = doc(db, 'posts', postId, 'likes', userId)
  const snap = await getDoc(likeRef)

  const batch = writeBatch(db)

  if (snap.exists()) {
    batch.delete(likeRef)
    batch.update(postRef, { likes: increment(-1) })
  } else {
    batch.set(likeRef, { userId, createdAt: serverTimestamp() })
    batch.update(postRef, { likes: increment(1) })
  }

  await batch.commit()
  return !snap.exists() // true = liked, false = unliked
}

// ─── COMPROBAR SI DIO LIKE ───
export async function hasLiked(postId, userId) {
  const snap = await getDoc(doc(db, 'posts', postId, 'likes', userId))
  return snap.exists()
}

// ─── REGISTRAR DESCARGA ───
export async function registerDownload(postId) {
  await updateDoc(doc(db, 'posts', postId), { downloads: increment(1) })
}

// ─── ELIMINAR POST ───
export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId))
}

// ─── DESTACAR POST (admin) ───
export async function toggleFeatured(postId, featured) {
  await updateDoc(doc(db, 'posts', postId), {
    featured,
    score: increment(featured ? 500 : -500),
  })
}

// ─── VERIFICAR POST (admin jr) ───
export async function verifyPost(postId, verified) {
  await updateDoc(doc(db, 'posts', postId), { verified })
}

// ─── CAMBIAR ESTADO (moderación) ───
export async function setPostStatus(postId, status) {
  await updateDoc(doc(db, 'posts', postId), { status })
}

// ─── REPORTAR POST ───
export async function reportPost(postId, userId, reason) {
  await addDoc(collection(db, 'reports'), {
    postId,
    reportedBy: userId,
    reason,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

// ─── ACTUALIZAR SCORES (cron-like, llamar ocasionalmente) ───
export async function refreshScores() {
  const snap = await getDocs(query(collection(db, 'posts'), where('status', '==', 'active')))
  const batch = writeBatch(db)
  snap.docs.forEach(d => {
    const score = calcScore(d.data())
    batch.update(d.ref, { score })
  })
  await batch.commit()
}

// ─── BÚSQUEDA ───
export async function searchPosts(term) {
  // Firestore no tiene full-text search nativo.
  // Cargamos todos los posts activos y filtramos en cliente con Fuse.js
  const snap = await getDocs(
    query(collection(db, 'posts'), where('status', '==', 'active'), orderBy('score', 'desc'), limit(200))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── LISTENER TIEMPO REAL ───
export function subscribeToFeed(callback, { category, pageSize = 20 } = {}) {
  let q = query(
    collection(db, 'posts'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  )
  if (category) {
    q = query(q, where('category', '==', category))
  }
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}
