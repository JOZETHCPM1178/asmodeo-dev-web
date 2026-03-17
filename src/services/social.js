// src/services/social.js
// ════════════════════════════════════════
//  SOCIAL SERVICE — Follows, comentarios, notificaciones
// ════════════════════════════════════════
import {
  db, collection, addDoc, getDocs, getDoc, doc, deleteDoc,
  updateDoc, setDoc, serverTimestamp, query, orderBy, where,
  increment, onSnapshot, limit, writeBatch, arrayUnion, arrayRemove,
} from './firebase'

// ═══════════════════════════════════════
//  SISTEMA DE FOLLOWS
// ═══════════════════════════════════════

export async function followUser(followerId, targetId) {
  const batch = writeBatch(db)

  // Crear relación de follow
  batch.set(doc(db, 'follows', `${followerId}_${targetId}`), {
    followerId,
    targetId,
    createdAt: serverTimestamp(),
  })

  // Actualizar contadores
  batch.update(doc(db, 'users', followerId), { following: increment(1) })
  batch.update(doc(db, 'users', targetId), { followers: increment(1) })

  await batch.commit()

  // Notificar al usuario seguido
  await createNotification(targetId, {
    type: 'follow',
    fromUserId: followerId,
    message: 'comenzó a seguirte',
  })
}

export async function unfollowUser(followerId, targetId) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'follows', `${followerId}_${targetId}`))
  batch.update(doc(db, 'users', followerId), { following: increment(-1) })
  batch.update(doc(db, 'users', targetId), { followers: increment(-1) })
  await batch.commit()
}

export async function isFollowing(followerId, targetId) {
  const snap = await getDoc(doc(db, 'follows', `${followerId}_${targetId}`))
  return snap.exists()
}

export async function getFollowers(userId) {
  const snap = await getDocs(
    query(collection(db, 'follows'), where('targetId', '==', userId))
  )
  return snap.docs.map(d => d.data().followerId)
}

export async function getFollowing(userId) {
  const snap = await getDocs(
    query(collection(db, 'follows'), where('followerId', '==', userId))
  )
  return snap.docs.map(d => d.data().targetId)
}

// ═══════════════════════════════════════
//  COMENTARIOS
// ═══════════════════════════════════════

export async function addComment(postId, { userId, username, photoURL, text, replyToId = null, type = 'text' }) {
  // Validación básica
  if (!text?.trim()) throw new Error('El comentario no puede estar vacío')

  const ref = await addDoc(collection(db, 'posts', postId, 'comments'), {
    userId,
    username,
    photoURL: photoURL || '',
    text: text.slice(0, 1000),
    type,
    replyToId: replyToId || null,
    likes: 0,
    createdAt: serverTimestamp(),
  })

  // Actualizar contador de comentarios en el post
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) })

  // Obtener el autor del post para notificarle
  const postSnap = await getDoc(doc(db, 'posts', postId))
  if (postSnap.exists() && postSnap.data().authorId !== userId) {
    await createNotification(postSnap.data().authorId, {
      type: 'comment',
      fromUserId: userId,
      fromUsername: username,
      postId,
      postName: postSnap.data().name,
      message: `comentó en tu publicación: "${text.slice(0, 50)}"`,
    })
  }

  return ref.id
}

export function subscribeToComments(postId, callback) {
  return onSnapshot(
    query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(100)
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export async function deleteComment(postId, commentId) {
  await deleteDoc(doc(db, 'posts', postId, 'comments', commentId))
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) })
}

// ═══════════════════════════════════════
//  NOTIFICACIONES
// ═══════════════════════════════════════

export async function createNotification(userId, { type, fromUserId, fromUsername, postId, postName, message }) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    fromUserId: fromUserId || null,
    fromUsername: fromUsername || null,
    postId: postId || null,
    postName: postName || null,
    message,
    read: false,
    createdAt: serverTimestamp(),
  })
}

export function subscribeToNotifications(userId, callback) {
  return onSnapshot(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, 'notifications', notifId), { read: true })
}

export async function markAllNotificationsRead(userId) {
  const snap = await getDocs(
    query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false))
  )
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.update(d.ref, { read: true }))
  await batch.commit()
}

// ═══════════════════════════════════════
//  CHAT GLOBAL
// ═══════════════════════════════════════

// Cache anti-spam por usuario
const _spamCache = new Map()

export function subscribeToChatMessages(callback) {
  // Solo los 10 más recientes — liviano, sin acumular historial
  return onSnapshot(
    query(collection(db, 'globalChat'), orderBy('createdAt', 'desc'), limit(10)),
    snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse()
      callback(msgs)
    }
  )
}

export async function sendChatMessage({ userId, username, photoURL, text, verified = false }) {
  // Anti-spam: máximo 1 mensaje cada 2 segundos
  const now = Date.now()
  const lastMsg = _spamCache.get(userId) || 0
  if (now - lastMsg < 2000) {
    throw new Error('Estás enviando mensajes muy rápido.')
  }
  _spamCache.set(userId, now)

  // Obtener estado del chat
  const chatSnap = await getDoc(doc(db, 'config', 'chat'))
  if (chatSnap.exists() && chatSnap.data().closed) {
    throw new Error('El chat está cerrado temporalmente.')
  }

  await addDoc(collection(db, 'globalChat'), {
    userId,
    username,
    photoURL: photoURL || '',
    verified: verified || false,
    text: text.slice(0, 300),
    createdAt: serverTimestamp(),
  })

  // Limpiar mensajes viejos — mantener solo los 10 más recientes en Firestore
  try {
    const all = await getDocs(
      query(collection(db, 'globalChat'), orderBy('createdAt', 'desc'))
    )
    const toDelete = all.docs.slice(10) // los que van más allá de 10
    if (toDelete.length > 0) {
      const batch = writeBatch(db)
      toDelete.forEach(d => batch.delete(d.ref))
      await batch.commit()
    }
  } catch {} // no bloquear si falla la limpieza
}

export async function setChatStatus(closed) {
  await setDoc(doc(db, 'config', 'chat'), { closed })
}

export async function getChatStatus() {
  const snap = await getDoc(doc(db, 'config', 'chat'))
  return snap.exists() ? snap.data().closed : false
}

// Limpiar mensajes de chat viejos (llamar desde admin)
export async function cleanOldChatMessages(daysOld = 7) {
  const cutoff = new Date(Date.now() - daysOld * 86400000)
  const snap = await getDocs(
    query(collection(db, 'globalChat'), where('createdAt', '<', cutoff))
  )
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
  return snap.docs.length
}

// ─── MANTENIMIENTO ───
export async function setMaintenanceMode(active) {
  await setDoc(doc(db, 'config', 'maintenance'), { active, updatedAt: serverTimestamp() })
}

export async function getMaintenanceMode() {
  const snap = await getDoc(doc(db, 'config', 'maintenance'))
  return snap.exists() ? snap.data().active : false
}
