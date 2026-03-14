// src/services/posts.js
import {
  db, collection, addDoc, getDocs, getDoc, doc, deleteDoc,
  updateDoc, serverTimestamp, query, orderBy, where,
  increment, onSnapshot, limit, startAfter,
  writeBatch, getCountFromServer,
} from './firebase'

function calcScore(post) {
  const likes     = post.likes || 0
  const downloads = post.downloads || 0
  const comments  = post.commentCount || 0
  const featured  = post.featured ? 500 : 0
  const ageDays   = post.createdAt?.toDate
    ? (Date.now() - post.createdAt.toDate().getTime()) / 86400000 : 0
  const decay = Math.max(0, 1 - ageDays / 30)
  return Math.round((likes * 3 + downloads * 2 + comments) * (1 + decay) + featured)
}

// ─── CREAR POST — sin IA, directo a active ───
export async function createPost(postData, userId) {
  const post = {
    ...postData,
    authorId: userId,
    likes: 0,
    downloads: 0,
    commentCount: 0,
    views: 0,
    featured: false,
    verified: false,
    status: 'active',
    safetyScore: 100,
    safetyIssues: [],
    score: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, 'posts'), post)
  return ref.id
}

// ─── FEED PAGINADO ───
export async function getFeed({ pageSize = 10, lastDoc = null, category = null } = {}) {
  let constraints = [
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ]
  if (category) constraints = [
    where('status', '==', 'active'),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ]
  if (lastDoc) constraints.push(startAfter(lastDoc))

  const snap = await getDocs(query(collection(db, 'posts'), ...constraints))
  return {
    posts: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  }
}

// ─── UN POST ───
export async function getPost(postId) {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return null
  updateDoc(snap.ref, { views: increment(1) }).catch(() => {})
  return { id: snap.id, ...snap.data() }
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
    query(collection(db, 'posts'), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(200))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── LISTENER ───
export function subscribeToFeed(callback, { category, pageSize = 20 } = {}) {
  let constraints = [
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ]
  if (category) constraints = [
    where('status', '==', 'active'),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ]
  return onSnapshot(query(collection(db, 'posts'), ...constraints),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}
