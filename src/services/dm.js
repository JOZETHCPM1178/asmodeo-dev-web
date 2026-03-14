// src/services/dm.js
// ════════════════════════════════════════
//  MENSAJES PRIVADOS — Estilo TikTok
// ════════════════════════════════════════
import {
  db, collection, addDoc, getDocs, getDoc, doc,
  updateDoc, serverTimestamp, query, orderBy, where,
  onSnapshot, limit, writeBatch, setDoc,
} from './firebase'

/**
 * Genera un ID de conversación único entre dos usuarios
 * Siempre el mismo sin importar el orden
 */
export function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join('_')
}

/**
 * Obtener o crear una conversación entre dos usuarios
 */
export async function getOrCreateConversation(myUid, otherUid, otherProfile) {
  const convId = getConversationId(myUid, otherUid)
  const convRef = doc(db, 'conversations', convId)
  const snap = await getDoc(convRef)

  if (!snap.exists()) {
    await setDoc(convRef, {
      participants: [myUid, otherUid],
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      unread: { [myUid]: 0, [otherUid]: 0 },
      createdAt: serverTimestamp(),
    })
  }
  return convId
}

/**
 * Enviar mensaje privado
 */
export async function sendDM(conversationId, senderId, text) {
  if (!text.trim()) return

  const batch = writeBatch(db)

  // Agregar mensaje
  const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'))
  batch.set(msgRef, {
    senderId,
    text: text.slice(0, 1000),
    read: false,
    createdAt: serverTimestamp(),
  })

  // Actualizar conversación (último mensaje + unread)
  const convRef = doc(db, 'conversations', conversationId)
  const convSnap = await getDoc(convRef)
  const participants = convSnap.data()?.participants || []
  const otherId = participants.find(p => p !== senderId)

  batch.update(convRef, {
    lastMessage: text.slice(0, 80),
    lastMessageAt: serverTimestamp(),
    [`unread.${otherId}`]: (convSnap.data()?.unread?.[otherId] || 0) + 1,
  })

  await batch.commit()
}

/**
 * Escuchar mensajes de una conversación en tiempo real
 */
export function subscribeToDMMessages(conversationId, callback) {
  return onSnapshot(
    query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

/**
 * Obtener todas las conversaciones de un usuario
 */
export function subscribeToConversations(userId, callback) {
  return onSnapshot(
    query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc'),
      limit(30)
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

/**
 * Marcar mensajes como leídos
 */
export async function markDMsRead(conversationId, userId) {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`unread.${userId}`]: 0,
  })
}

/**
 * Contar mensajes no leídos totales
 */
export function getTotalUnread(conversations, userId) {
  return conversations.reduce((sum, c) => sum + (c.unread?.[userId] || 0), 0)
}
