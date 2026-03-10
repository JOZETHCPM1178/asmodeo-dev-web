// js/notifications.js — FCM Push Notifications para todos los usuarios

const VAPID_PUBLIC = 'BEXfYf8_9AjuftZOT2jUdNM0yNaIEDqtKxno6Z6SUAr6ztpLpq_ye5tpoyA4jCZCNunt7xdiyEicn45xwKkZ9zk';

// ── Suscribir usuario ──
async function suscribirNotificaciones() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast('Tu navegador no soporta notificaciones', 'err');
      return false;
    }

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      toast('Activa las notificaciones en los ajustes de tu navegador', 'err');
      return false;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
    });

    // Guardar suscripción en Firestore (disponible para todos, con o sin cuenta)
    const subKey = btoa(JSON.stringify(sub.endpoint)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 40);
    if (window._fb) {
      const { db, doc, setDoc } = window._fb;
      await setDoc(doc(db, 'subscriptions', subKey), {
        subscription: JSON.stringify(sub),
        uid: window._currentUser?.uid || 'anonymous',
        createdAt: new Date().toISOString()
      });
    }

    localStorage.setItem('notif_enabled', 'true');
    localStorage.setItem('notif_sub', JSON.stringify(sub));
    toast('🔔 Notificaciones activadas');
    updateNotifBtn();
    return true;
  } catch(e) {
    console.error('Error notif:', e);
    toast('Error activando notificaciones: ' + e.message, 'err');
    return false;
  }
}

function desactivarNotificaciones() {
  localStorage.setItem('notif_enabled', 'false');
  toast('🔕 Notificaciones desactivadas');
  updateNotifBtn();
}

function notifActivadas() {
  return localStorage.getItem('notif_enabled') === 'true' && Notification.permission === 'granted';
}

function updateNotifBtn() {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  const on = notifActivadas();
  btn.textContent = on ? '🔔' : '🔕';
  btn.title = on ? 'Notificaciones activadas — toca para desactivar' : 'Toca para recibir notificaciones de nuevas apps';
  btn.classList.toggle('notif-on', on);
}

function toggleNotif() {
  if (notifActivadas()) desactivarNotificaciones();
  else suscribirNotificaciones();
}

// Helper VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Iniciar botón al cargar
window.addEventListener('authchange', () => setTimeout(updateNotifBtn, 500));
window.addEventListener('load', () => setTimeout(updateNotifBtn, 1000));

// ── Enviar notificación a TODOS los suscriptores ──
// Llama al Cloudflare Worker que hace el envío masivo
async function enviarNotifATodos(post) {
  try {
    const cat = window.CATS?.[post.category];
    const emoji = cat?.icon || '⚡';
    await fetch('https://asmodeo-notif.asmodeotayson.workers.dev/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${emoji} ${post.title}`,
        body: (post.description || '').substring(0, 100) + '...',
        image: post.imageUrl || null,
        url: `https://asmodeodev.netlify.app/?post=${post.id}`
      })
    });
    console.log('✅ Notificaciones enviadas');
  } catch(e) {
    console.error('Error enviando notificaciones:', e);
  }
}
