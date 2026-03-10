// js/notifications.js — Notificaciones push tipo YouTube

// ── Suscribir usuario a notificaciones ──
async function suscribirNotificaciones() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast('Tu navegador no soporta notificaciones', 'err');
      return false;
    }

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      toast('Notificaciones bloqueadas. Actívalas en ajustes del navegador.', 'err');
      return false;
    }

    const reg = await navigator.serviceWorker.ready;

    // Guardar suscripción en Firestore
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY || '')
    });

    if (window._currentUser && window._fb) {
      const { db, doc, setDoc } = window._fb;
      await setDoc(doc(db, 'subscriptions', window._currentUser.uid), {
        subscription: JSON.stringify(sub),
        uid: window._currentUser.uid,
        email: window._currentUser.email,
        createdAt: new Date()
      });
    }

    // Guardar local
    localStorage.setItem('notif_sub', JSON.stringify(sub));
    localStorage.setItem('notif_enabled', 'true');
    toast('🔔 Notificaciones activadas');
    updateNotifBtn();
    return true;
  } catch(e) {
    // Sin VAPID key — usar notificaciones locales simples
    const permiso = await Notification.requestPermission();
    if (permiso === 'granted') {
      localStorage.setItem('notif_enabled', 'true');
      toast('🔔 Notificaciones activadas');
      updateNotifBtn();
      return true;
    }
    toast('Error activando notificaciones', 'err');
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
  btn.title = on ? 'Notificaciones activadas' : 'Activar notificaciones';
  btn.classList.toggle('notif-on', on);
}

// ── Enviar notificación local cuando se publica ──
// (se llama desde admin.js al crear post)
async function notificarNuevaPublicacion(post) {
  if (Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(`⚡ ${post.title}`, {
      body: post.description?.substring(0, 80) + '...' || '¡Nueva publicación en ASMODEO DEV!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      image: post.imageUrl || null,
      data: { url: `/?post=${post.id}` },
      vibrate: [200, 100, 200],
      tag: 'asmodeo-new-post',
      renotify: true
    });
  } catch(e) {
    // Fallback: notificación normal del navegador
    new Notification(`⚡ ${post.title}`, {
      body: post.description?.substring(0, 80) + '...',
      icon: '/icon-192x192.png'
    });
  }
}

// ── Escuchar nuevas publicaciones en tiempo real ──
function escucharNuevasPublicaciones() {
  if (!window._fb) return;
  if (!notifActivadas()) return;

  const { db, collection, query, orderBy, limit, onSnapshot } = window._fb;
  let primeraVez = true;

  onSnapshot(
    query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(1)),
    (snap) => {
      if (primeraVez) { primeraVez = false; return; }
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const post = { id: change.doc.id, ...change.doc.data() };
          notificarNuevaPublicacion(post);
        }
      });
    }
  );
}

// Helper para VAPID
function urlBase64ToUint8Array(base64String) {
  try {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  } catch(e) { return new Uint8Array(); }
}

// Iniciar listener cuando Firebase esté listo
window.addEventListener('authchange', () => {
  setTimeout(escucharNuevasPublicaciones, 2000);
});
