// js/chat.js — Chat Global en Tiempo Real
// Usa Firestore onSnapshot para actualizaciones sin recargar

let _chatUnsub = null; // para cancelar el listener cuando se cierra

function showGlobalChat() {
  // Si ya está abierto, cerrar
  const existing = document.getElementById('chat-modal');
  if (existing) { existing.remove(); if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; } return; }

  const u = window._currentUser;

  const modal = document.createElement('div');
  modal.id = 'chat-modal';
  modal.style.cssText = `
    position:fixed; bottom:0; right:0; z-index:9990;
    width:100%; max-width:380px; height:520px;
    background:var(--card); border:1px solid var(--border2);
    border-radius:16px 16px 0 0; display:flex; flex-direction:column;
    box-shadow:0 -8px 40px rgba(0,0,0,.5);
    animation:fadeUp .3s ease;
  `;

  modal.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:1.1rem">💬</span>
        <span style="font-family:var(--font1);font-size:.85rem;font-weight:700">Chat Global</span>
        <span id="chat-online" style="font-size:.7rem;color:var(--green);background:rgba(16,185,129,.1);padding:2px 8px;border-radius:20px">● En vivo</span>
      </div>
      <button onclick="cerrarChat()" style="background:none;border:none;color:var(--t3);font-size:1.2rem;cursor:pointer;padding:4px">✕</button>
    </div>
    <div id="chat-msgs" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth"></div>
    <div style="padding:10px 12px;border-top:1px solid var(--border);display:flex;gap:8px;flex-shrink:0">
      ${u ? `
        <input id="chat-inp" class="inp" placeholder="Escribe un mensaje..." style="flex:1;padding:10px 12px;font-size:.85rem"
          onkeypress="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();enviarMensajeChat()}"
          maxlength="300"/>
        <button class="btn btn-primary btn-sm" onclick="enviarMensajeChat()" style="flex-shrink:0;padding:10px 14px">➤</button>
      ` : `
        <div style="flex:1;text-align:center;padding:10px;font-size:.82rem;color:var(--t3)">
          <a onclick="showLogin()" style="color:var(--p);cursor:pointer">Inicia sesión</a> para chatear
        </div>
      `}
    </div>`;

  document.body.appendChild(modal);
  iniciarChatListener();
}

function cerrarChat() {
  const modal = document.getElementById('chat-modal');
  if (modal) modal.remove();
  if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }
}

function iniciarChatListener() {
  const { db, collection, query, orderBy, limit, onSnapshot } = window._fb;

  const q = query(
    collection(db, 'globalChat'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  _chatUnsub = onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
    renderMensajes(msgs);
  }, err => {
    console.error('Chat error:', err);
  });
}

function renderMensajes(msgs) {
  const el = document.getElementById('chat-msgs');
  if (!el) return;
  const u = window._currentUser;
  const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;

  if (!msgs.length) {
    el.innerHTML = `<div style="text-align:center;color:var(--t3);font-size:.82rem;padding:20px">
      Sin mensajes aún. ¡Sé el primero! 👋
    </div>`;
    return;
  }

  el.innerHTML = msgs.map(m => {
    const isOwn   = u && m.uid === u.uid;
    const isAdmin = m.isAdmin || m.isAdminJr;
    const time    = m.createdAt?.seconds
      ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
      : '';

    return `
      <div style="display:flex;gap:8px;align-items:flex-end;${isOwn ? 'flex-direction:row-reverse' : ''}">
        <img src="${m.photo || avatarUrl(m.name)}"
          style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;cursor:pointer"
          onclick="showUserProfile('${m.uid}')"
          onerror="this.src='${avatarUrl(m.name)}'"/>
        <div style="max-width:72%;${isOwn ? 'align-items:flex-end' : ''};display:flex;flex-direction:column;gap:2px">
          ${!isOwn ? `
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">
              <span style="font-size:.7rem;font-weight:700;color:var(--p);cursor:pointer" onclick="showUserProfile('${m.uid}')">${m.name}</span>
              ${isAdmin ? `<span style="font-size:.6rem;background:rgba(124,58,237,.2);color:var(--p);padding:1px 5px;border-radius:8px">${m.isAdmin ? '🛡️' : '⚡'}</span>` : ''}
            </div>` : ''}
          <div style="
            padding:8px 12px;border-radius:${isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
            background:${isOwn ? 'var(--p)' : 'rgba(255,255,255,.07)'};
            color:${isOwn ? '#fff' : 'var(--t1)'};
            font-size:.83rem;line-height:1.5;word-break:break-word">
            ${escapeHtml(m.text)}
          </div>
          <span style="font-size:.65rem;color:var(--t3);${isOwn ? 'text-align:right' : ''}">${time}</span>
        </div>
        ${isOwn && (window._currentUser?.isAdmin) ? `
          <button onclick="eliminarMensajeChat('${m.id}')"
            style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:.75rem;opacity:.5;align-self:center">🗑️</button>` : ''}
      </div>`;
  }).join('');

  // Scroll al final si ya estaba abajo
  if (wasAtBottom) el.scrollTop = el.scrollHeight;
}

async function enviarMensajeChat() {
  const u = window._currentUser;
  if (!u) return toast('Inicia sesión para chatear', 'err');

  const inp = document.getElementById('chat-inp');
  const text = inp?.value?.trim();
  if (!text) return;
  if (text.length > 300) return toast('Máximo 300 caracteres', 'err');

  // Filtro básico de contenido
  if (typeof filterContent === 'function' && filterContent(text)) {
    return toast('Mensaje con contenido no permitido', 'err');
  }

  inp.value = '';
  inp.disabled = true;

  try {
    const { db, collection, addDoc, serverTimestamp } = window._fb;
    await addDoc(collection(db, 'globalChat'), {
      text,
      uid:       u.uid,
      name:      u.displayName || u.username || 'Usuario',
      photo:     u.photoURL || '',
      isAdmin:   u.isAdmin   || false,
      isAdminJr: u.isAdminJr || false,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    toast('Error al enviar: ' + e.message, 'err');
  } finally {
    inp.disabled = false;
    inp.focus();
  }
}

async function eliminarMensajeChat(msgId) {
  if (!window._currentUser?.isAdmin) return;
  if (!confirm('¿Eliminar este mensaje?')) return;
  const { db, doc, deleteDoc } = window._fb;
  await deleteDoc(doc(db, 'globalChat', msgId));
  toast('Mensaje eliminado');
}

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.showGlobalChat      = showGlobalChat;
window.cerrarChat          = cerrarChat;
window.enviarMensajeChat   = enviarMensajeChat;
window.eliminarMensajeChat = eliminarMensajeChat;
