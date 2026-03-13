// js/notifications.js — Push notifications (OneSignal) + Activity notifications

// ── OneSignal push notifications ──
async function toggleNotif() {
  const btn = document.getElementById('notif-btn');
  try {
    if (typeof OneSignal === 'undefined') return toast('Notificaciones no disponibles', 'err');
    const isSubscribed = OneSignal.User?.PushSubscription?.optedIn;
    if (isSubscribed) {
      await OneSignal.User.PushSubscription.optOut();
      toast('🔕 Notificaciones desactivadas');
    } else {
      await OneSignal.User.PushSubscription.optIn();
      toast('🔔 Notificaciones activadas');
    }
    updateNotifBtn();
  } catch(e) { toast('Error con notificaciones', 'err'); }
}

function updateNotifBtn() {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  try {
    const isSubscribed = typeof OneSignal !== 'undefined'
      ? OneSignal.User?.PushSubscription?.optedIn
      : Notification.permission === 'granted';
    btn.textContent = isSubscribed ? '🔔 Desactivar notificaciones push' : '🔕 Activar notificaciones push';
    btn.classList.toggle('notif-on', !!isSubscribed);
  } catch(e) {}
}

// ── Crear notificación de actividad ──
async function createNotification(toUid, type, data = {}) {
  if (!toUid || !window._currentUser || toUid === window._currentUser.uid) return;
  try {
    const { db, collection, addDoc, serverTimestamp } = window._fb;
    await addDoc(collection(db, 'notifications'), {
      type, // 'follow' | 'like_post' | 'comment' | 'report_response'
      toUid,
      fromUid: window._currentUser.uid,
      fromName: window._currentUser.username || window._currentUser.displayName || 'Alguien',
      fromPhoto: window._currentUser.photoURL || '',
      read: false,
      createdAt: serverTimestamp(),
      ...data
    });
  } catch(e) {}
}
window.createNotification = createNotification;

// ── Cargar notificaciones y actualizar badge ──
async function loadActivityNotifications() {
  const u = window._currentUser;
  if (!u) return { notifs: [], unread: 0 };
  try {
    const { db, collection, query, where, orderBy, limit, getDocs } = window._fb;
    // Sin orderBy para evitar error de índice compuesto — ordenamos en cliente
    const snap = await getDocs(query(
      collection(db, 'notifications'),
      where('toUid', '==', u.uid),
      limit(50)
    ));
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread > 9 ? '9+' : unread || '';
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
    return { notifs, unread };
  } catch(e) { return { notifs: [], unread: 0 }; }
}
window.loadActivityNotifications = loadActivityNotifications;

// ── Panel de notificaciones ──
async function showNotificationsPanel() {
  const u = window._currentUser;
  if (!u) return showLogin();

  const { notifs } = await loadActivityNotifications();

  // Marcar todas como leídas
  try {
    const { db, collection, query, where, getDocs, writeBatch } = window._fb;
    const snap = await getDocs(query(collection(db, 'notifications'), where('toUid', '==', u.uid)));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.filter(d => !d.data().read).forEach(d => batch.update(d.ref, { read: true }));
      await batch.commit();
    }
  } catch(e) {}

  const badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = 'none';

  // Cerrar menú móvil si está abierto
  const mob = document.getElementById('mob-menu');
  if (mob) mob.classList.remove('open');

  const fmtAgo = ts => {
    if (!ts) return '';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
    return `${Math.floor(diff/86400000)}d`;
  };

  const icons = { follow: '👤', like_post: '❤️', comment: '💬', report_response: '📋' };
  const msgs = {
    follow: 'empezó a seguirte',
    like_post: n => `le dio ❤️ a tu publicación "${(n.postTitle||'').substring(0,30)}"`,
    comment: n => `comentó en "${(n.postTitle||'').substring(0,30)}"`,
    report_response: n => `Respuesta a tu reporte: ${n.response || ''}`
  };

  document.getElementById('notif-panel')?.remove();
  const modal = document.createElement('div');
  modal.id = 'notif-panel';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:70px 12px 0';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div style="background:var(--s1);border-radius:16px;width:100%;max-width:420px;max-height:75vh;overflow:hidden;border:1px solid var(--p);display:flex;flex-direction:column">
      <div style="padding:16px;border-bottom:1px solid rgba(255,255,255,.08);font-family:var(--font1);font-weight:700;display:flex;align-items:center;justify-content:space-between">
        <span>🔔 Notificaciones</span>
        <button onclick="document.getElementById('notif-panel').remove()" style="background:none;border:none;color:var(--t3);font-size:1.2rem;cursor:pointer">✕</button>
      </div>
      <div style="overflow-y:auto;flex:1">
        ${notifs.length === 0
          ? '<div style="text-align:center;padding:40px;color:var(--t3)">Sin notificaciones aún 🔕</div>'
          : notifs.map(n => {
              const msg = typeof msgs[n.type] === 'function' ? msgs[n.type](n) : (msgs[n.type] || n.message || '');
              const isReport = n.type === 'report_response';
              return `
                <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);${!n.read ? 'background:rgba(139,92,246,.08)' : ''};cursor:pointer"
                  onclick="${isReport ? '' : `showUserProfile('${n.fromUid}');document.getElementById('notif-panel')?.remove()`}">
                  <img src="${n.fromPhoto || avatarUrl(n.fromName)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='${avatarUrl(n.fromName)}'"/>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:.82rem"><b>${n.fromName}</b> ${msg}</div>
                    ${isReport && n.response ? `<div style="font-size:.78rem;color:var(--p);margin-top:4px;padding:6px 8px;background:rgba(139,92,246,.15);border-radius:8px">${n.response}</div>` : ''}
                    <div style="font-size:.7rem;color:var(--t3);margin-top:2px">${fmtAgo(n.createdAt)}</div>
                  </div>
                  <span style="font-size:1rem;flex-shrink:0">${icons[n.type] || '🔔'}</span>
                </div>`;
            }).join('')}
      </div>
    </div>`;
  document.body.appendChild(modal);
}
window.showNotificationsPanel = showNotificationsPanel;

// ── Notificación al publicar like en post ──
async function notifyPostLike(postAuthorId, postId, postTitle) {
  await createNotification(postAuthorId, 'like_post', { postId, postTitle });
}
window.notifyPostLike = notifyPostLike;

window.toggleNotif = toggleNotif;
window.updateNotifBtn = updateNotifBtn;
window.loadActivityNotifications = loadActivityNotifications;
window.createNotification = createNotification;
window.notifyPostLike = notifyPostLike;

// ── Enviar notificación push a todos (OneSignal) al publicar ──
async function enviarNotifATodos({ id, title, description, imageUrl, category }) {
  try {
    const workerUrl = 'https://asmodeo-notif.asmodeotayson.workers.dev/notify';
    await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🆕 ' + (title || 'Nueva publicación'),
        message: description ? description.substring(0, 100) : 'Nueva app disponible',
        url: 'https://asmodeo-dev-web.pages.dev/?post=' + id,
        imageUrl: imageUrl || '',
        category: category || ''
      })
    });
  } catch(e) {
    console.warn('enviarNotifATodos error:', e.message);
    // No mostrar error al usuario — la publicación ya se creó
  }
}
window.enviarNotifATodos = enviarNotifATodos;
