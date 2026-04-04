// src/services/posts.js
import {
  db, collection, addDoc, getDocs, getDoc, doc, deleteDoc,
  updateDoc, serverTimestamp, query, orderBy, where,
  increment, onSnapshot, limit, startAfter,
  writeBatch,
} from './firebase'

// ─── SLUG ───
export function generateSlug(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    + '-' + Date.now().toString(36)
}

// ─── CREAR POST ───
export async function createPost(postData, userId) {
  const isVerified = postData.authorVerified === true
  const isStaff    = postData.authorIsStaff === true
  const status = (isVerified || isStaff) ? 'active' : 'pending'

  const post = {
    ...postData,
    authorId: userId,
    slug: generateSlug(postData.name || 'post'),
    likes: 0,
    downloads: 0,
    commentCount: 0,
    views: 0,
    featured: false,
    verified: false,
    authorVerified: postData.authorVerified || false,
    status,
    score: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, 'posts'), post)
  return { id: ref.id, status, slug: post.slug }
}

// ─── FEED PAGINADO (home + categorías) ───
export async function getFeed({ pageSize = 12, lastDoc = null, category = null } = {}) {
  let base = [
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
  ]
  if (category) base = [
    where('status', '==', 'active'),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
  ]

  const constraints = [...base, limit(pageSize)]
  if (lastDoc) constraints.push(startAfter(lastDoc))

  const snap = await getDocs(query(collection(db, 'posts'), ...constraints))
  return {
    posts: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  }
}

// ─── POSTS DE UN USUARIO ESPECÍFICO (para perfil) ───
export async function getUserPosts(authorId) {
  const snap = await getDocs(
    query(
      collection(db, 'posts'),
      where('authorId', '==', authorId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── FEED DE SEGUIDOS ───
export async function getFollowingFeed(authorIds, pageSize = 20) {
  if (!authorIds?.length) return []
  // Firestore where-in soporta hasta 10 valores, dividir en chunks
  const chunks = []
  for (let i = 0; i < authorIds.length; i += 10) {
    chunks.push(authorIds.slice(i, i + 10))
  }
  const allPosts = []
  for (const chunk of chunks) {
    const snap = await getDocs(
      query(
        collection(db, 'posts'),
        where('authorId', 'in', chunk),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      )
    )
    snap.docs.forEach(d => allPosts.push({ id: d.id, ...d.data() }))
  }
  // Ordenar todo por fecha
  allPosts.sort((a, b) => {
    const ta = a.createdAt?.toDate?.()?.getTime() || a.createdAt?.seconds * 1000 || 0
    const tb = b.createdAt?.toDate?.()?.getTime() || b.createdAt?.seconds * 1000 || 0
    return tb - ta
  })
  return allPosts.slice(0, pageSize)
}

// ─── UN POST (por slug o ID) ───
export async function getPost(slugOrId) {
  // Intentar primero por ID directo
  const byId = await getDoc(doc(db, 'posts', slugOrId))
  if (byId.exists()) {
    updateDoc(byId.ref, { views: increment(1) }).catch(() => {})
    return { id: byId.id, ...byId.data() }
  }
  // Si no existe por ID, buscar por slug
  const snap = await getDocs(
    query(collection(db, 'posts'), where('slug', '==', slugOrId), limit(1))
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  updateDoc(d.ref, { views: increment(1) }).catch(() => {})
  return { id: d.id, ...d.data() }
}

// ─── URL de un post (usa slug si tiene, si no ID) ───
export function getPostUrl(post) {
  return `/post/${post.slug || post.id}`
}

// ─── LIKE ───
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
  return !snap.exists()
}

export async function hasLiked(postId, userId) {
  const snap = await getDoc(doc(db, 'posts', postId, 'likes', userId))
  return snap.exists()
}

// ─── DESCARGA ───
export async function registerDownload(postId) {
  await updateDoc(doc(db, 'posts', postId), { downloads: increment(1) })
}

// ─── ACTUALIZAR POST ───
export async function updatePost(postId, updates) {
  await updateDoc(doc(db, 'posts', postId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

// ─── ELIMINAR ───
export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId))
}

// ─── ADMIN ───
export async function toggleFeatured(postId, featured) {
  await updateDoc(doc(db, 'posts', postId), { featured, score: increment(featured ? 500 : -500) })
}
export async function verifyPost(postId, verified) {
  await updateDoc(doc(db, 'posts', postId), { verified })
}
export async function setPostStatus(postId, status) {
  await updateDoc(doc(db, 'posts', postId), { status })
}

// ─── REPORTE ───
export async function reportPost(postId, userId, reason) {
  await addDoc(collection(db, 'reports'), {
    postId, reportedBy: userId, reason, status: 'pending', createdAt: serverTimestamp(),
  })
}

// ─── BÚSQUEDA ───
export async function searchPosts() {
  const snap = await getDocs(
    query(collection(db, 'posts'), where('status', '==', 'active'), limit(200))
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

// ─── ACTUALIZAR NOMBRE DE AUTOR en sus posts ───
// Llamar cuando el usuario cambia su displayName
export async function updateAuthorNameInPosts(authorId, newName, newPhoto) {
  const snap = await getDocs(
    query(collection(db, 'posts'), where('authorId', '==', authorId), limit(100))
  )
  const batch = writeBatch(db)
  snap.docs.forEach(d => {
    const updates = {}
    if (newName)  updates.authorName  = newName
    if (newPhoto) updates.authorPhoto = newPhoto
    batch.update(d.ref, updates)
  })
  await batch.commit()
}
