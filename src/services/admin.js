// src/services/admin.js
// ════════════════════════════════════════
//  ADMIN SERVICE — Stats, moderación, seguidores bot, reportes
// ════════════════════════════════════════
import {
  db, collection, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
  getCountFromServer, writeBatch, addDoc, getDoc, increment,
} from './firebase'

// ═══════════════════════════════════════
//  ESTADÍSTICAS
// ═══════════════════════════════════════
export async function getStats() {
  const [postsSnap, usersSnap, reportsSnap] = await Promise.all([
    getCountFromServer(collection(db, 'posts')),
    getCountFromServer(collection(db, 'users')),
    getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'pending'))),
  ])

  const allPosts = await getDocs(
    query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(200))
  )
  const posts = allPosts.docs.map(d => d.data())
  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0)
  const totalDownloads = posts.reduce((s, p) => s + (p.downloads || 0), 0)
  const byCategory = posts.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1
    return acc
  }, {})
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
  const recentPostsCount = posts.filter(p => p.createdAt?.toDate?.() > sevenDaysAgo).length
  const topPosts = [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5)

  return {
    totalPosts: postsSnap.data().count,
    totalUsers: usersSnap.data().count,
    pendingReports: reportsSnap.data().count,
    totalLikes,
    totalDownloads,
    byCategory,
    recentPostsCount,
    topPosts,
  }
}

// ═══════════════════════════════════════
//  GESTIÓN DE USUARIOS
// ═══════════════════════════════════════
export async function getAllUsers({ pageSize = 100 } = {}) {
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), limit(pageSize))
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch {
    // Fallback sin limit
    const snap = await getDocs(collection(db, 'users'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }
}

export async function setUserRole(userId, role) {
  await updateDoc(doc(db, 'users', userId), { role })
}

export async function banUser(userId, reason = '') {
  await updateDoc(doc(db, 'users', userId), {
    banned: true,
    banReason: reason,
    bannedAt: serverTimestamp(),
  })
  await addDoc(collection(db, 'adminLogs'), {
    action: 'ban_user', targetId: userId, reason, createdAt: serverTimestamp(),
  })
}

export async function unbanUser(userId) {
  await updateDoc(doc(db, 'users', userId), { banned: false, banReason: '' })
  await addDoc(collection(db, 'adminLogs'), {
    action: 'unban_user', targetId: userId, createdAt: serverTimestamp(),
  })
}

export async function verifyUser(userId, verified = true) {
  await updateDoc(doc(db, 'users', userId), { verified })
}

// ═══════════════════════════════════════
//  SEGUIDORES BOT (solo admin)
// ═══════════════════════════════════════

/**
 * Agrega seguidores falsos a un creador
 * @param {string} targetUserId - UID del creador
 * @param {number} amount - Cantidad de seguidores a agregar
 * @param {string} adminId - UID del admin que hace la acción
 */
export async function addFakeFollowers(targetUserId, amount, adminId) {
  if (amount < 1 || amount > 10000) throw new Error('Cantidad debe ser entre 1 y 10000')

  await updateDoc(doc(db, 'users', targetUserId), {
    followers: increment(amount),
    fakeFollowers: increment(amount),
  })

  await addDoc(collection(db, 'adminLogs'), {
    action: 'add_fake_followers',
    targetId: targetUserId,
    adminId,
    amount,
    createdAt: serverTimestamp(),
  })
}

/**
 * Quita seguidores falsos de un creador
 */
export async function removeFakeFollowers(targetUserId, amount, adminId) {
  const userSnap = await getDoc(doc(db, 'users', targetUserId))
  const current = userSnap.data()?.fakeFollowers || 0
  const toRemove = Math.min(amount, current)

  await updateDoc(doc(db, 'users', targetUserId), {
    followers: increment(-toRemove),
    fakeFollowers: increment(-toRemove),
  })

  await addDoc(collection(db, 'adminLogs'), {
    action: 'remove_fake_followers',
    targetId: targetUserId,
    adminId,
    amount: toRemove,
    createdAt: serverTimestamp(),
  })
}

// ═══════════════════════════════════════
//  MODERACIÓN DE POSTS
// ═══════════════════════════════════════
export async function getPendingPosts() {
  const snap = await getDocs(
    query(collection(db, 'posts'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ═══════════════════════════════════════
//  SISTEMA DE REPORTES CON RESPUESTA
// ═══════════════════════════════════════
export async function getReports() {
  const snap = await getDocs(
    query(collection(db, 'reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Admin responde a un reporte enviando mensaje interno al usuario
 * @param {string} reportId - ID del reporte
 * @param {string} adminId - UID del admin
 * @param {string} adminName - Nombre del admin
 * @param {string} message - Mensaje de respuesta
 * @param {string} verdict - 'legitimate' | 'not_legitimate'
 */
export async function replyToReport(reportId, adminId, adminName, message, verdict) {
  const reportSnap = await getDoc(doc(db, 'reports', reportId))
  if (!reportSnap.exists()) throw new Error('Reporte no encontrado')
  const report = reportSnap.data()

  const batch = writeBatch(db)

  // Actualizar reporte
  batch.update(doc(db, 'reports', reportId), {
    status: 'resolved',
    verdict,           // 'legitimate' | 'not_legitimate'
    adminReply: message,
    resolvedBy: adminId,
    resolvedAt: serverTimestamp(),
  })

  // Crear notificación interna para el usuario que reportó
  const notifRef = doc(collection(db, 'notifications'))
  batch.set(notifRef, {
    userId: report.reportedBy,
    type: 'report_reply',
    fromUserId: adminId,
    fromUsername: adminName,
    postId: report.postId || null,
    message: `Tu reporte fue revisado: ${verdict === 'legitimate' ? '✅ Legítimo' : '❌ No legítimo'}. ${message}`,
    verdict,
    read: false,
    createdAt: serverTimestamp(),
  })

  await batch.commit()
}

export async function resolveReport(reportId, action = 'resolved') {
  await updateDoc(doc(db, 'reports', reportId), {
    status: action,
    resolvedAt: serverTimestamp(),
  })
}

// ═══════════════════════════════════════
//  LOGS
// ═══════════════════════════════════════
export async function getAdminLogs({ pageSize = 50 } = {}) {
  const snap = await getDocs(
    query(collection(db, 'adminLogs'), orderBy('createdAt', 'desc'), limit(pageSize))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function logAdminAction(adminId, action, details = {}) {
  await addDoc(collection(db, 'adminLogs'), {
    adminId, action, ...details, createdAt: serverTimestamp(),
  })
}
