// src/services/dm.js
import {
  db, collection, addDoc, getDocs, getDoc, doc,
  updateDoc, serverTimestamp, query, orderBy, where,
  onSnapshot, limit, writeBatch, setDoc, arrayUnion, arrayRemove,
} from './firebase'

export function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join('_')
}

export async function getOrCreateConversation(myUid, otherUid) {
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

export async function sendDM(conversationId, senderId, text) {
  if (!text.trim()) return
  const batch = writeBatch(db)
  const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'))
  batch.set(msgRef, {
    senderId, text: text.slice(0, 1000), read: false, createdAt: serverTimestamp(),
  })
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

export function subscribeToDMMessages(conversationId, callback) {
  return onSnapshot(
    query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'), limit(100)),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export function subscribeToConversations(userId, callback) {
  return onSnapshot(
    query(collection(db, 'conversations'), where('participants', 'array-contains', userId), orderBy('lastMessageAt', 'desc'), limit(30)),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export async function markDMsRead(conversationId, userId) {
  await updateDoc(doc(db, 'conversations', conversationId), { [`unread.${userId}`]: 0 })
}

export function getTotalUnread(conversations, userId) {
  return conversations.reduce((sum, c) => sum + (c.unread?.[userId] || 0), 0)
}

// ─── SISTEMA DE BLOQUEO ───
export async function blockUser(myUid, targetUid) {
  await updateDoc(doc(db, 'users', myUid), {
    blockedUsers: arrayUnion(targetUid),
  })
}

export async function unblockUser(myUid, targetUid) {
  await updateDoc(doc(db, 'users', myUid), {
    blockedUsers: arrayRemove(targetUid),
  })
}

export async function isBlocked(myUid, targetUid) {
  const snap = await getDoc(doc(db, 'users', myUid))
  const blocked = snap.data()?.blockedUsers || []
  return blocked.includes(targetUid)
}

export async function getBlockedUsers(myUid) {
  const snap = await getDoc(doc(db, 'users', myUid))
  return snap.data()?.blockedUsers || []
}
