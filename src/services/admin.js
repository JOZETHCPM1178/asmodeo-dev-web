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

export async function getAllPosts({ pageSize = 100, status = null } = {}) {
  let constraints = [orderBy('createdAt', 'desc'), limit(pageSize)]
  if (status) constraints = [where('status', '==', status), ...constraints]
  const snap = await getDocs(query(collection(db, 'posts'), ...constraints))
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

// ═══════════════════════════════════════
//  ZONA PELIGROSA — Solo owner
// ═══════════════════════════════════════

/**
 * Banea usuarios inactivos:
 * Sin posts, sin seguidores reales, sin actividad en 30+ días
 */
export async function banInactiveUsers(adminId) {
  const snap = await getDocs(collection(db, 'users'))
  const batch = writeBatch(db)
  let count = 0

  snap.docs.forEach(d => {
    const u = d.data()
    // No tocar: owners, admins, verificados, ya baneados
    if (['owner', 'admin', 'admin_jr'].includes(u.role)) return
    if (u.verified || u.banned) return

    const noActivity = (u.posts || 0) === 0
      && (u.followers || 0) === 0
      && (u.following || 0) === 0

    if (noActivity) {
      batch.update(d.ref, {
        banned: true,
        banReason: 'Cuenta inactiva — baneada automáticamente por owner',
        bannedAt: serverTimestamp(),
      })
      count++
    }
  })

  if (count > 0) {
    await batch.commit()
    await addDoc(collection(db, 'adminLogs'), {
      action: 'ban_inactive_users',
      adminId,
      count,
      createdAt: serverTimestamp(),
    })
  }

  return count
}

/**
 * Envía una notificación interna a todos los usuarios
 */
export async function notifyAllUsers(message, adminId) {
  const snap = await getDocs(
    query(collection(db, 'users'), where('banned', '==', false))
  )
  const batch = writeBatch(db)
  let count = 0

  snap.docs.forEach(d => {
    const notifRef = doc(collection(db, 'notifications'))
    batch.set(notifRef, {
      userId: d.id,
      type: 'admin_broadcast',
      fromUserId: adminId,
      fromUsername: 'ASMODEO DEV',
      message,
      read: false,
      createdAt: serverTimestamp(),
    })
    count++
  })

  await batch.commit()

  await addDoc(collection(db, 'adminLogs'), {
    action: 'notify_all_users',
    adminId,
    message,
    count,
    createdAt: serverTimestamp(),
  })

  return count
}

/**
 * Resetea el contador de seguidores bot (fakeFollowers) de todos los usuarios
 */
export async function resetAllBotFollowers(adminId) {
  const snap = await getDocs(
    query(collection(db, 'users'), where('fakeFollowers', '>', 0))
  )
  const batch = writeBatch(db)
  let count = 0

  snap.docs.forEach(d => {
    const fake = d.data().fakeFollowers || 0
    if (fake > 0) {
      batch.update(d.ref, {
        followers: increment(-fake),
        fakeFollowers: 0,
      })
      count++
    }
  })

  if (count > 0) {
    await batch.commit()
    await addDoc(collection(db, 'adminLogs'), {
      action: 'reset_bot_followers',
      adminId,
      affectedUsers: count,
      createdAt: serverTimestamp(),
    })
  }

  return count
}

// ═══════════════════════════════════════
//  STATS FALSOS EN PUBLICACIONES — Solo owner
// ═══════════════════════════════════════

export async function addFakePostStats(postId, { likes = 0, downloads = 0, views = 0 }, adminId) {
  const updates = {}
  if (likes)     updates.likes     = increment(likes)
  if (downloads) updates.downloads = increment(downloads)
  if (views)     updates.views     = increment(views)
  if (likes)     updates.score     = increment(likes * 3)  // likes pesan más en el score
  if (downloads) updates.score     = increment(downloads * 2)
  if (views)     updates.score     = increment(views)

  await updateDoc(doc(db, 'posts', postId), updates)

  await addDoc(collection(db, 'adminLogs'), {
    action: 'add_fake_post_stats',
    targetId: postId,
    adminId,
    likes, downloads, views,
    createdAt: serverTimestamp(),
  })
}

export async function removeFakePostStats(postId, { likes = 0, downloads = 0, views = 0 }, adminId) {
  const updates = {}
  if (likes)     updates.likes     = increment(-likes)
  if (downloads) updates.downloads = increment(-downloads)
  if (views)     updates.views     = increment(-views)
  if (likes)     updates.score     = increment(-likes * 3)
  if (downloads) updates.score     = increment(-downloads * 2)
  if (views)     updates.score     = increment(-views)

  await updateDoc(doc(db, 'posts', postId), updates)

  await addDoc(collection(db, 'adminLogs'), {
    action: 'remove_fake_post_stats',
    targetId: postId,
    adminId,
    likes, downloads, views,
    createdAt: serverTimestamp(),
  })
}

// ═══════════════════════════════════════
//  COMENTARIOS BOT CON IA — Solo owner
// ═══════════════════════════════════════

// Nombres y avatares bot predefinidos (variados y realistas)
const BOT_PROFILES = [
  { username: 'carlos_mx',     displayName: 'Carlos MX',      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos' },
  { username: 'gamer_pro99',   displayName: 'GamerPro99',     photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gamer' },
  { username: 'luisa_tech',    displayName: 'Luisa Tech',     photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luisa' },
  { username: 'el_androider',  displayName: 'El Androider',   photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=android' },
  { username: 'sofia_games',   displayName: 'Sofía Games',    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sofia' },
  { username: 'modmaster_hn',  displayName: 'ModMaster HN',   photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mod' },
  { username: 'tecno_david',   displayName: 'Tecno David',    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david' },
  { username: 'apk_hunter',    displayName: 'APK Hunter',     photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hunter' },
  { username: 'jenny_droid',   displayName: 'Jenny Droid',    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jenny' },
  { username: 'kingofmods',    displayName: 'King of Mods',   photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=king' },
]

export async function addBotComments(postId, { postName, postDescription, postCategory, count = 3 }, adminId) {
  // Elegir perfiles bot aleatorios sin repetir
  const shuffled = [...BOT_PROFILES].sort(() => Math.random() - 0.5).slice(0, count)

  const results = []
  for (const profile of shuffled) {
    // Generar comentario con IA (Anthropic API)
    const text = await generateBotComment({ postName, postDescription, postCategory, username: profile.displayName })
    if (!text) continue

    // Insertar comentario en Firestore
    const ref = await addDoc(collection(db, 'posts', postId, 'comments'), {
      userId:    `bot_${profile.username}`,
      username:  profile.displayName,
      photoURL:  profile.photoURL,
      text,
      type:      'text',
      replyToId: null,
      likes:     0,
      isBot:     true,
      createdAt: serverTimestamp(),
    })

    // Actualizar contador
    await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) })

    results.push({ id: ref.id, username: profile.displayName, text })
  }

  // Log
  await addDoc(collection(db, 'adminLogs'), {
    action:   'add_bot_comments',
    targetId: postId,
    adminId,
    count:    results.length,
    createdAt: serverTimestamp(),
  })

  return results
}

export async function deleteBotComments(postId, adminId) {
  const snap = await getDocs(
    query(collection(db, 'posts', postId, 'comments'), where('isBot', '==', true))
  )
  if (snap.empty) return 0

  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.delete(d.ref))
  batch.update(doc(db, 'posts', postId), { commentCount: increment(-snap.docs.length) })
  await batch.commit()

  await addDoc(collection(db, 'adminLogs'), {
    action: 'delete_bot_comments', targetId: postId, adminId,
    count: snap.docs.length, createdAt: serverTimestamp(),
  })

  return snap.docs.length
}

// Llama al Worker de Cloudflare que a su vez llama a Claude
// La API key de Anthropic se guarda de forma segura en las variables del Worker
async function generateBotComment({ postName, postDescription, postCategory, username }) {
  try {
    const WORKER_URL = import.meta.env.VITE_WORKER_URL
    if (!WORKER_URL) throw new Error('VITE_WORKER_URL no configurado')

    const res = await fetch(`${WORKER_URL}/generate-comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postName, postDescription, postCategory, username }),
    })

    const data = await res.json()
    if (!data.ok) throw new Error(data.error || 'Error del servidor')
    return data.text || null
  } catch(e) {
    console.warn('generateBotComment error:', e.message)
    return null
  }
}
