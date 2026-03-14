// src/services/admin.js
// ════════════════════════════════════════
//  ADMIN SERVICE — Panel de administración
// ════════════════════════════════════════
import {
  db, collection, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
  getCountFromServer, writeBatch, addDoc,
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

  // Posts por categoría
  const allPosts = await getDocs(
    query(collection(db, 'posts'), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(200))
  )

  const posts = allPosts.docs.map(d => d.data())

  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0)
  const totalDownloads = posts.reduce((s, p) => s + (p.downloads || 0), 0)

  // Posts por categoría
  const byCategory = posts.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1
    return acc
  }, {})

  // Posts de los últimos 7 días
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
  const recentPosts = posts.filter(p => {
    const date = p.createdAt?.toDate()
    return date && date > sevenDaysAgo
  })

  // Top 5 posts por likes
  const topPosts = [...posts]
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 5)

  return {
    totalPosts: postsSnap.data().count,
    totalUsers: usersSnap.data().count,
    pendingReports: reportsSnap.data().count,
    totalLikes,
    totalDownloads,
    byCategory,
    recentPostsCount: recentPosts.length,
    topPosts,
  }
}

// ═══════════════════════════════════════
//  GESTIÓN DE USUARIOS
// ═══════════════════════════════════════

export async function getAllUsers({ pageSize = 20 } = {}) {
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(pageSize))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
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
  // Guardar log
  await addDoc(collection(db, 'adminLogs'), {
    action: 'ban_user',
    targetId: userId,
    reason,
    createdAt: serverTimestamp(),
  })
}

export async function unbanUser(userId) {
  await updateDoc(doc(db, 'users', userId), {
    banned: false,
    banReason: '',
  })
  await addDoc(collection(db, 'adminLogs'), {
    action: 'unban_user',
    targetId: userId,
    createdAt: serverTimestamp(),
  })
}

export async function verifyUser(userId, verified = true) {
  await updateDoc(doc(db, 'users', userId), { verified })
}

// ═══════════════════════════════════════
//  MODERACIÓN DE POSTS
// ═══════════════════════════════════════

export async function getPendingPosts() {
  const snap = await getDocs(
    query(collection(db, 'posts'), where('status', '==', 'pending_review'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getReports() {
  const snap = await getDocs(
    query(collection(db, 'reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function resolveReport(reportId, action = 'resolved') {
  await updateDoc(doc(db, 'reports', reportId), {
    status: action,
    resolvedAt: serverTimestamp(),
  })
}

// ═══════════════════════════════════════
//  LOGS DE ADMINISTRACIÓN
// ═══════════════════════════════════════

export async function getAdminLogs({ pageSize = 50 } = {}) {
  const snap = await getDocs(
    query(collection(db, 'adminLogs'), orderBy('createdAt', 'desc'), limit(pageSize))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function logAdminAction(adminId, action, details = {}) {
  await addDoc(collection(db, 'adminLogs'), {
    adminId,
    action,
    ...details,
    createdAt: serverTimestamp(),
  })
}
