// js/notifications.js — OneSignal Web Push v16

const ONESIGNAL_APP_ID = '57488b36-1bd3-4f46-9d9b-2729c0055a23';

async function initOneSignal() {
  if (typeof OneSignal === 'undefined') return;
  try {
    OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
    });
    // Wait a bit for SDK to be ready
    setTimeout(updateNotifBtn, 2000);
  } catch(e) {
    console.error('OneSignal init:', e);
  }
}

async function toggleNotif() {
  if (typeof OneSignal === 'undefined') {
    toast('Notificaciones no disponibles', 'err');
    return;
  }
  try {
    const granted = Notification.permission === 'granted';
    if (!granted) {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        toast('Permiso denegado por el navegador', 'err');
        return;
      }
    }
    // Check if subscribed via OneSignal v16
    const isSubscribed = OneSignal.User?.PushSubscription?.optedIn;
    if (isSubscribed) {
      OneSignal.User.PushSubscription.optOut();
      toast('🔕 Notificaciones desactivadas');
    } else {
      OneSignal.User.PushSubscription.optIn();
      toast('🔔 Notificaciones activadas');
    }
    setTimeout(updateNotifBtn, 1000);
  } catch(e) {
    console.error('toggleNotif:', e);
    // Fallback: just request permission
    Notification.requestPermission().then(p => {
      toast(p === 'granted' ? '🔔 Notificaciones activadas' : 'Permiso denegado', p === 'granted' ? 'ok' : 'err');
      updateNotifBtn();
    });
  }
}

function updateNotifBtn() {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  try {
    const isSubscribed = typeof OneSignal !== 'undefined'
      ? OneSignal.User?.PushSubscription?.optedIn
      : Notification.permission === 'granted';
    btn.textContent = isSubscribed ? '🔔 Desactivar notificaciones' : '🔕 Activar notificaciones';
    btn.classList.toggle('notif-on', !!isSubscribed);
  } catch(e) {
    btn.textContent = Notification.permission === 'granted' ? '🔔 Desactivar notificaciones' : '🔕 Activar notificaciones';
  }
}

// ── Enviar notificación a todos al publicar (via worker seguro) ──
async function enviarNotifATodos(post) {
  try {
    const res = await fetch('https://asmodeo-notif.asmodeotayson.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    const data = await res.json();
    if (data.errors) console.error('OneSignal errors:', data.errors);
    else console.log('✅ Notificación enviada a', data.recipients, 'usuarios');
  } catch(e) {
    console.error('enviarNotif:', e);
  }
}

window.addEventListener('load', () => setTimeout(initOneSignal, 1000));
