// js/notifications.js — OneSignal Web Push

const ONESIGNAL_APP_ID = '57488b36-1bd3-4f46-9d9b-2729c0055a23';

// ── Inicializar OneSignal ──
async function initOneSignal() {
  if (typeof OneSignal === 'undefined') return;
  await OneSignal.init({
    appId: ONESIGNAL_APP_ID,
    safari_web_id: '',
    notifyButton: { enable: false }, // usamos nuestro propio botón
    allowLocalhostAsSecureOrigin: true,
  });
  updateNotifBtn();
  OneSignal.on('subscriptionChange', updateNotifBtn);
}

// ── Activar/desactivar notificaciones ──
async function toggleNotif() {
  if (typeof OneSignal === 'undefined') {
    toast('Notificaciones no disponibles en este navegador', 'err');
    return;
  }
  const enabled = await OneSignal.isPushNotificationsEnabled();
  if (enabled) {
    await OneSignal.setSubscription(false);
    toast('🔕 Notificaciones desactivadas');
  } else {
    await OneSignal.registerForPushNotifications();
    await OneSignal.setSubscription(true);
    toast('🔔 Notificaciones activadas');
  }
  updateNotifBtn();
}

async function updateNotifBtn() {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  if (typeof OneSignal === 'undefined') return;
  const enabled = await OneSignal.isPushNotificationsEnabled();
  btn.textContent = enabled ? '🔔' : '🔕';
  btn.title = enabled ? 'Notificaciones activadas' : 'Activar notificaciones';
  btn.classList.toggle('notif-on', enabled);
}

// ── Enviar notificación a todos (desde admin) ──
async function enviarNotifATodos(post) {
  try {
    const cat = window.CATS?.[post.category];
    const emoji = cat?.icon || '⚡';
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${window.ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: `${emoji} ${post.title}` },
        contents: { en: (post.description || '').substring(0, 100) + '...' },
        big_picture: post.imageUrl || undefined,
        url: `https://asmodeo-dev-web.pages.dev/?post=${post.id}`,
        chrome_web_icon: 'https://asmodeo-dev-web.pages.dev/icon-192x192.png',
        firefox_icon: 'https://asmodeo-dev-web.pages.dev/icon-192x192.png',
      })
    });
    const data = await res.json();
    console.log('OneSignal:', data);
  } catch(e) {
    console.error('Error notificación:', e);
  }
}

// Iniciar cuando cargue
window.addEventListener('load', () => setTimeout(initOneSignal, 1000));
