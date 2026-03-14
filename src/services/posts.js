// src/services/posts.js
// ════════════════════════════════════════
//  POSTS SERVICE — CRUD y lógica de publicaciones
// ════════════════════════════════════════
import {
  db, collection, addDoc, getDocs, getDoc, doc, deleteDoc,
  updateDoc, serverTimestamp, query, orderBy, where,
  increment, onSnapshot, limit, startAfter,
  writeBatch, getCountFromServer,
} from './firebase'
import { analyzePostSafety } from './gemini'
import { notifyAdmins } from './notifications'

// ─── SCORE DE RANKING ───
function calcScore(post) {
  const likes     = post.likes     || 0
  const downloads = post.downloads || 0
  const comments  = post.commentCount || 0
  const featured  = post.featured ? 500 : 0
  const ageDays   = post.createdAt?.toDate
    ? (Date.now() - post.createdAt.toDate().getTime()) / 86400000
    : 0
  const decay = Math.max(0, 1 - ageDays / 30)
  return Math.round((likes * 3 + downloads * 2 + comments) * (1 + decay) + featured)
}

// ─── CREAR POST ───
export async function createPost(postData, userId) {
  let safetyResult = { safe: true, score: 100, issues: [] }
  try {
    safetyResult = await analyzePostSafety({
      title: postData.name,
      description: postData.description,
      downloadUrl: postData.downloadUrl,
    })
  } catch { /* IA deshabilitada, continuar */ }

  const post = {
    ...postData,
    authorId: userId,
    likes: 0,
    downloads: 0,
    commentCount: 0,
    views: 0,
    featured: false,
    verified: false,
    // IMPORTANTE: todos los posts nuevos arrancan como 'active' directamente
    status: safetyResult.safe ? 'active' : 'pending_review',
    safetyScore: safetyResult.score,
    safetyIssues: safetyResult.issues || [],
    score: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, 'posts'), post)

  if (!safetyResult.safe) {
    notifyAdmins({
      type: 'suspicious_content',
      postId: ref.id,
      postName: postData.name,
      reason: safetyResult.reason || '',
      issues: safetyResult.issues || [],
    }).catch(() => {})
  }

  return ref.id
}

// ─── OBTENER FEED PAGINADO ───
// Muestra posts con status='active' O posts que no tienen campo status (posts antiguos)
export async function getFeed({ pageSize = 12, lastDoc = null, category = null } = {}) {
  // Query principal: posts activos ordenados por score y fecha
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
  const activePosts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Si no hay posts activos, buscar también posts sin campo status (posts antiguos migrados)
  if (activePosts.length === 0 && !lastDoc) {
    const oldQ = category
      ? query(collection(db, 'posts'), where('category', '==', category), orderBy('createdAt', 'desc'), limit(pageSize))
      : query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize))
    const oldSnap = await getDocs(oldQ)
    const oldPosts = oldSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => !p.status || p.status === 'active')
    return {
      posts: oldPosts,
      lastDoc: oldSnap.docs[oldSnap.docs.length - 1] || null,
      hasMore: oldSnap.docs.length === pageSize,
    }
  }

  return {
    posts: activePosts,
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  }
}

// ─── OBTENER POSTS DE UN USUARIO (para perfil) ───
export async function getUserPosts(userId, { pageSize = 50 } = {}) {
  // Busca posts del usuario sin filtrar por status (para que vea sus propios posts)
  const q = query(
    collection(db, 'posts'),
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── OBTENER UN POST ───
export async function getPost(postId) {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return null
  updateDoc(snap.ref, { views: increment(1) }).catch(() => {})
  return { id: snap.id, ...snap.data() }
}

// ─── LIKE / UNLIKE ───
export async function toggleLike(postId, userId) {
  const postRef = doc(db, 'posts', postId)
  const likeRef = doc(db, 'posts', postId, 'likes', userId)
  const snap    = await getDoc(likeRef)
  const batch   = writeBatch(db)

  if (snap.exists()) {
    batch.delete(likeRef)
    batch.update(postRef, { likes: increment(-1) })
  } else {
    batch.set(likeRef, { userId, createdAt: serverTimestamp() })
    batch.update(postRef, { likes: increment(1) })
  }

  await batch.commit()
  return !snap.exists()
}

// ─── COMPROBAR LIKE ───
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

// ─── DESTACAR POST ───
export async function toggleFeatured(postId, featured) {
  await updateDoc(doc(db, 'posts', postId), {
    featured,
    score: increment(featured ? 500 : -500),
  })
}

// ─── VERIFICAR POST ───
export async function verifyPost(postId, verified) {
  await updateDoc(doc(db, 'posts', postId), { verified })
}

// ─── CAMBIAR STATUS ───
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

// ─── BÚSQUEDA (carga todos para Fuse.js) ───
export async function searchPosts() {
  // Busca tanto posts activos como posts sin status (antiguos)
  const snap = await getDocs(
    query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(200))
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.status || p.status === 'active')
}

// ─── MIGRAR POSTS ANTIGUOS (ejecutar una vez desde admin) ───
// Agrega 'status: active' y 'score: 0' a posts que no los tienen
export async function migrateOldPosts() {
  const snap = await getDocs(collection(db, 'posts'))
  const batch = writeBatch(db)
  let count = 0

  snap.docs.forEach(d => {
    const data = d.data()
    if (!data.status) {
      batch.update(d.ref, {
        status: 'active',
        score: calcScore(data),
      })
      count++
    }
  })

  if (count > 0) await batch.commit()
  return count
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
