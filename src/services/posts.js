// src/services/posts.js
import {
  db, collection, addDoc, getDocs, getDoc, doc, deleteDoc,
  updateDoc, serverTimestamp, query, orderBy, where,
  increment, onSnapshot, limit, startAfter,
  writeBatch,
} from './firebase'

// ─── GENERAR SLUG desde el nombre ───
export function generateSlug(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // solo letras, números, espacios y guiones
    .trim()
    .replace(/\s+/g, '-')            // espacios → guiones
    .replace(/-+/g, '-')             // guiones múltiples → uno
    .slice(0, 80)                    // máximo 80 chars
}

// ─── CREAR POST ───
export async function createPost(postData, userId) {
  const isVerified = postData.authorVerified === true
  const isStaff    = postData.authorIsStaff === true
  const status     = (isVerified || isStaff) ? 'active' : 'pending'

  // Generar slug único desde el nombre
  const baseSlug = generateSlug(postData.name || 'post')
  const slug     = `${baseSlug}-${Date.now().toString(36)}`

  const post = {
    ...postData,
    authorId: userId,
    slug,
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
  return { id: ref.id, slug, status }
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

// ─── POSTS MÁS POPULARES (por score → likes → descargas) ───
export async function getPopular({ pageSize = 6, category = null } = {}) {
  const constraints = [
    where('status', '==', 'active'),
    // Solo posts con al menos 1 like o descarga para no mostrar vacíos
    where('score', '>', 0),
    orderBy('score', 'desc'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ]
  if (category) {
    constraints.splice(1, 0, where('category', '==', category))
  }

  try {
    const snap = await getDocs(query(collection(db, 'posts'), ...constraints))
    if (snap.docs.length > 0) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    }
  } catch {}

  // Fallback: si no hay posts con score > 0, ordenar por likes
  try {
    const fallbackConstraints = [
      where('status', '==', 'active'),
      orderBy('likes', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ]
    if (category) fallbackConstraints.splice(1, 0, where('category', '==', category))
    const snap2 = await getDocs(query(collection(db, 'posts'), ...fallbackConstraints))
    const posts = snap2.docs.map(d => ({ id: d.id, ...d.data() }))
    // Filtrar los que tengan al menos 1 like o descarga
    const withActivity = posts.filter(p => (p.likes || 0) > 0 || (p.downloads || 0) > 0)
    return withActivity.length > 0 ? withActivity : []
  } catch {
    return []
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

// ─── UN POST — busca por slug O por ID (compatibilidad con posts viejos) ───
export async function getPost(slugOrId) {
  // Intentar por ID primero (posts viejos sin slug)
  try {
    const snap = await getDoc(doc(db, 'posts', slugOrId))
    if (snap.exists()) {
      updateDoc(snap.ref, { views: increment(1) }).catch(() => {})
      return { id: snap.id, ...snap.data() }
    }
  } catch {}

  // Buscar por slug (posts nuevos)
  const slugSnap = await getDocs(
    query(collection(db, 'posts'), where('slug', '==', slugOrId), limit(1))
  )
  if (!slugSnap.empty) {
    const d = slugSnap.docs[0]
    updateDoc(d.ref, { views: increment(1) }).catch(() => {})
    return { id: d.id, ...d.data() }
  }

  return null
}

// ─── OBTENER URL amigable de un post ───
export function getPostUrl(post) {
  return post?.slug ? `/post/${post.slug}` : `/post/${post?.id}`
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
    query(collection(db, 'posts'), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(200))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
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
