// js/notifications.js — OneSignal Web Push

const ONESIGNAL_APP_ID = '57488b36-1bd3-4f46-9d9b-2729c0055a23';

// ── Inicializar OneSignal ──
async function initOneSignal() {
  if (typeof OneSignal === 'undefined') {
    console.warn('OneSignal SDK no cargado');
    return;
  }
  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
    });
    await updateNotifBtn();
    OneSignal.on('subscriptionChange', updateNotifBtn);
  } catch(e) {
    console.error('OneSignal init error:', e);
  }
}

// ── Activar/desactivar notificaciones ──
async function toggleNotif() {
  if (typeof OneSignal === 'undefined') {
    toast('Notificaciones no disponibles en este navegador', 'err');
    return;
  }
  try {
    // OneSignal v16 API
    const permission = await OneSignal.Notifications.permission;
    if (permission) {
      // Ya tiene permiso — toggle suscripción
      const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
      if (isSubscribed) {
        await OneSignal.User.PushSubscription.optOut();
        toast('🔕 Notificaciones desactivadas');
      } else {
        await OneSignal.User.PushSubscription.optIn();
        toast('🔔 Notificaciones activadas');
      }
    } else {
      // Pedir permiso
      await OneSignal.Notifications.requestPermission();
      toast('🔔 Notificaciones activadas');
    }
    await updateNotifBtn();
  } catch(e) {
    console.error('toggleNotif error:', e);
    toast('Error con notificaciones', 'err');
  }
}

async function updateNotifBtn() {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  if (typeof OneSignal === 'undefined') return;
  try {
    const optedIn = OneSignal.User?.PushSubscription?.optedIn;
    btn.textContent = optedIn ? '🔔' : '🔕';
    btn.title = optedIn ? 'Notificaciones activadas' : 'Activar notificaciones';
    btn.classList.toggle('notif-on', !!optedIn);
  } catch(e) {
    btn.textContent = '🔕';
  }
}

// ── Enviar notificación a todos (desde admin al publicar) ──
async function enviarNotifATodos(post) {
  const key = window.ONESIGNAL_REST_KEY;
  if (!key || key === 'PEGA_AQUI_TU_REST_API_KEY') {
    console.warn('OneSignal REST Key no configurada — sin notificaciones');
    return;
  }
  try {
    const cat = window.CATS?.[post.category];
    const emoji = cat?.icon || '⚡';
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${key}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: `${emoji} ${post.title}`, es: `${emoji} ${post.title}` },
        contents: {
          en: (post.description || '').substring(0, 100),
          es: (post.description || '').substring(0, 100)
        },
        big_picture: post.imageUrl || undefined,
        url: `https://asmodeo-dev-web.pages.dev/?post=${post.id}`,
        chrome_web_icon: 'https://asmodeo-dev-web.pages.dev/icon-192x192.png',
      })
    });
    const data = await res.json();
    if (data.errors) console.error('OneSignal error:', data.errors);
    else console.log('✅ Notificación enviada:', data.id, '— destinatarios:', data.recipients);
  } catch(e) {
    console.error('Error enviando notificación:', e);
  }
}

window.addEventListener('load', () => setTimeout(initOneSignal, 1500));
