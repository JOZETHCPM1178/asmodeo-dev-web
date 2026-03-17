// src/services/notifications.js
// ════════════════════════════════════════
//  NOTIFICATIONS SERVICE — OneSignal + Worker de Cloudflare
// ════════════════════════════════════════
import { db, doc, updateDoc, getDoc } from './firebase'

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID
const WORKER_URL = import.meta.env.VITE_WORKER_URL

// ─── INICIALIZAR ONESIGNAL ───
export async function initOneSignal() {
  if (typeof window === 'undefined') return
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') {
    console.warn('OneSignal App ID no configurado')
    return
  }

  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      safari_web_id: '', // Safari Web Push (opcional)
      notifyButton: { enable: false }, // Usamos nuestro propio botón
      allowLocalhostAsSecureOrigin: true, // Solo para desarrollo
      welcomeNotification: {
        title: 'AsmodeoDev 🔔',
        message: '¡Bienvenido! Ahora recibirás notificaciones.',
      },
    })

    // Suscribir automáticamente con native prompt
    const permission = await OneSignal.Notifications.permission
    if (!permission) {
      // Mostrar prompt después de 3 segundos
      setTimeout(() => OneSignal.Slidedown.promptPush(), 3000)
    }
  })
}

// ─── GUARDAR ID DE ONESIGNAL EN FIRESTORE ───
export async function saveOneSignalId(userId) {
  if (!userId) return
  try {
    const playerId = await window.OneSignal?.User?.PushSubscription?.id
    if (playerId) {
      await updateDoc(doc(db, 'users', userId), { oneSignalId: playerId })
    }
  } catch (e) {
    console.warn('No se pudo guardar OneSignal ID:', e)
  }
}

// ─── ENVIAR NOTIFICACIÓN VÍA WORKER ───
async function sendViaWorker(payload) {
  if (!WORKER_URL || WORKER_URL.includes('your-worker')) return
  try {
    await fetch(`${WORKER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.warn('Worker no disponible:', e)
  }
}

// ─── NOTIFICAR A UN USUARIO ESPECÍFICO ───
export async function notifyUser(targetUserId, { title, message, url = '/' }) {
  try {
    const userSnap = await getDoc(doc(db, 'users', targetUserId))
    if (!userSnap.exists()) return
    const { oneSignalId } = userSnap.data()
    if (!oneSignalId) return

    await sendViaWorker({
      type: 'notify_user',
      playerId: oneSignalId,
      title,
      message,
      url,
    })
  } catch (e) {
    console.warn('Error notificando usuario:', e)
  }
}

// ─── NOTIFICAR A ADMINS ───
export async function notifyAdmins(payload) {
  await sendViaWorker({
    type: 'notify_admins',
    ...payload,
  })
}

// ─── PUBLICAR EN TELEGRAM ───
export async function publishToTelegram(post) {
  await sendViaWorker({
    type: 'telegram_post',
    post: {
      id: post.id,
      name: post.name,
      description: post.description,
      category: post.category,
      imageUrl: post.imageUrl,
      downloadUrl: post.downloadUrl,
    },
  })
}

// ─── PUBLICAR EN TELEGRAM + ONESIGNAL via Worker ───
export async function notifyTelegramNewPost(post) {
  if (!WORKER_URL || WORKER_URL.includes('your-worker')) return
  try {
    await fetch(`${WORKER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post: {
          id:          post.id,
          name:        post.name,
          title:       post.name,
          description: post.description,
          category:    post.category,
          imageUrl:    post.imageUrl,
          downloadUrl: post.downloadUrl,
        }
      }),
    })
  } catch (e) {
    console.warn('Worker notify error:', e)
  }
}

// ─── VERIFICAR PERMISO DE NOTIFICACIONES ───
export async function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

// ─── PEDIR PERMISO MANUAL ───
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}


