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

// ── Notificaciones de actividad (seguidores, etc.) ──
async function loadActivityNotifications() {
  const u = window._currentUser;
  if (!u) return;
  try {
    const { db, collection, query, where, orderBy, limit, getDocs, updateDoc, doc } = window._fb;
    const snap = await getDocs(query(
      collection(db, 'notifications'),
      where('toUid', '==', u.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    ));
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const unread = notifs.filter(n => !n.read).length;

    // Update bell badge
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread > 0 ? (unread > 9 ? '9+' : unread) : '';
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }

    return { notifs, unread };
  } catch(e) { return { notifs: [], unread: 0 }; }
}

async function showNotificationsPanel() {
  const u = window._currentUser;
  if (!u) return showLogin();

  const { notifs } = await loadActivityNotifications();

  // Mark all as read
  const { db, collection, query, where, getDocs, writeBatch, doc } = window._fb;
  try {
    const snap = await getDocs(query(collection(db, 'notifications'), where('toUid', '==', u.uid), where('read', '==', false)));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { read: true }));
      await batch.commit();
    }
  } catch(e) {}

  const badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = 'none';

  const modal = document.createElement('div');
  modal.id = 'notif-panel';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:flex-start;justify-content:flex-end;padding:60px 12px 0';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const fmtAgo = ts => {
    if (!ts) return '';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
    return `${Math.floor(diff/86400000)}d`;
  };

  const icons = { follow: '👤', like: '❤️', comment: '💬', report: '🚩' };

  modal.innerHTML = `
    <div style="background:var(--s1);border-radius:16px;padding:0;width:100%;max-width:340px;max-height:70vh;overflow:hidden;border:1px solid var(--p);display:flex;flex-direction:column">
      <div style="padding:16px;border-bottom:1px solid rgba(255,255,255,.08);font-family:var(--font1);font-weight:700">🔔 Notificaciones</div>
      <div style="overflow-y:auto;flex:1">
        ${notifs.length === 0
          ? '<div style="text-align:center;padding:32px;color:var(--t3)">Sin notificaciones</div>'
          : notifs.map(n => `
            <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer" onclick="showUserProfile('${n.fromUid}');document.getElementById('notif-panel')?.remove()">
              <img src="${n.fromPhoto || avatarUrl(n.fromName)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='${avatarUrl(n.fromName)}'"/>
              <div style="flex:1;min-width:0">
                <div style="font-size:.82rem"><b>${n.fromName}</b> ${n.message || ''}</div>
                <div style="font-size:.72rem;color:var(--t3)">${fmtAgo(n.createdAt)}</div>
              </div>
              <span style="font-size:1.1rem">${icons[n.type] || '🔔'}</span>
            </div>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(modal);
}

window.showNotificationsPanel = showNotificationsPanel;
window.loadActivityNotifications = loadActivityNotifications;
