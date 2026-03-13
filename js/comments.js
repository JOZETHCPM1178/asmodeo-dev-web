// js/comments.js

async function renderComments(postId, postAuthorId) {
  const root = document.getElementById('comments-root');
  if (!root) return;
  const u = window._currentUser;
  const { db, collection, query, orderBy, getDocs } = window._fb;

  const snap = await getDocs(query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'desc')));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  all.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const roots = all.filter(c => !c.parentId);
  const replies = id => all.filter(c => c.parentId === id);

  const cmtHTML = (c, depth = 0) => `
    <div class="cmt ${c.pinned ? 'pinned' : ''} ${depth > 0 ? 'reply' : ''}">
      ${c.pinned ? `<div class="pin-tag">📌 Fijado por Admin</div>` : ''}
      <img src="${c.authorPhoto || avatarUrl(c.authorName)}" class="cmt-av-sm" onclick="showUserProfile('${c.authorId}')" style="cursor:pointer" onerror="this.src='${avatarUrl(c.authorName)}'"/>
      <div class="cmt-body">
        <div class="cmt-header"><span class="cmt-name">${c.authorName || 'Usuario'}</span><span class="cmt-date">${fmtDate(c.createdAt)}</span></div>
        <div class="cmt-text">${c.text || ''}</div>
        <div class="cmt-acts">
          <button class="cact" id="like-${c.id}" onclick="likeCmt('${postId}','${c.id}',${c.likes || 0})">❤️ ${c.likes || 0}</button>
          ${(c.adminLikes || 0) > 0 ? `<span class="admin-like-badge" title="Likes de Admin">🛡️ ${c.adminLikes}</span>` : ''}
          ${u?.isAdmin ? `<button class="cact adm-like" id="adlike-${c.id}" onclick="adminLikeCmt('${postId}','${c.id}',${c.adminLikes||0})" title="Like de Admin">🛡️ +1</button>` : ''}
          ${depth === 0 ? `<button class="cact" onclick="toggleReply('${c.id}')">${(window._t&&window._t['reply'])||'Responder'}</button>` : ''}
          ${u ? `<button class="cact report-cmt-btn" data-cid="${c.id}" title="Reportar">🚩</button>` : ''}
          ${u?.isAdmin ? `
            <button class="cact adm" onclick="pinCmt('${postId}','${c.id}',${c.pinned})">📌 ${c.pinned ? 'Desfijar' : 'Fijar'}</button>
            <button class="cact del" onclick="delCmt('${postId}','${c.id}')">🗑️</button>
            <button class="cact del" onclick="banUser('${c.authorId}')" title="Banear usuario">🔨</button>`
            : (u?.isAdminJr || u?.uid === postAuthorId) ? `
            <button class="cact del" onclick="delCmt('${postId}','${c.id}')">🗑️</button>` : ''}
        </div>
        ${depth === 0 ? `
          <div class="reply-form" id="rf-${c.id}" style="display:none">
            <textarea class="txta" id="rt-${c.id}" rows="2" placeholder="Tu respuesta..."></textarea>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" onclick="sendReply('${postId}','${c.id}')">Enviar</button>
              <button class="btn btn-ghost btn-sm" onclick="toggleReply('${c.id}')">Cancelar</button>
            </div>
          </div>` : ''}
      </div>
    </div>
    ${depth === 0 ? replies(c.id).map(r => cmtHTML(r, 1)).join('') : ''}`;

  const newCmtForm = u
    ? `<div class="new-cmt">
        <img src="${u.photoURL || avatarUrl(u.displayName)}" class="cmt-av" onerror="this.src='${avatarUrl(u.displayName)}'"/>
        <div class="cmt-inp-wrap">
          <textarea class="txta" id="new-cmt-txt" rows="3" placeholder="${(window._t&&window._t['comment_placeholder'])||'Escribe un comentario...'}"></textarea>
          <button class="btn btn-primary btn-sm" style="margin-top:7px" onclick="sendCmt('${postId}')">${(window._t&&window._t['publish_comment'])||'Publicar'}</button>
        </div>
      </div>`
    : `<div class="login-prompt">${(window._t&&window._t['login_to_comment'])||'Inicia sesión para comentar'} · <a style="color:var(--p);cursor:pointer" onclick="showLogin()">Entrar</a></div>`;

  root.innerHTML = `
    <div class="comments-sec">
      <div class="comments-title">💬 Comentarios (${all.length})</div>
      ${newCmtForm}
      <div class="cmt-list">
        ${roots.length > 0 ? roots.map(c => cmtHTML(c)).join('') : '<p style="text-align:center;color:var(--t3);padding:20px">Sé el primero en comentar 👇</p>'}
      </div>
    </div>`;

  // Wire report comment buttons
  root.querySelectorAll('.report-cmt-btn').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      if (typeof window.showReportModal === 'function') {
        window.showReportModal('comment', btn.dataset.cid, 'comentario');
      } else {
        toast('Error: recarga la página', 'err');
      }
    };
  });
}

async function sendCmt(postId) {
  const u = window._currentUser;
  if (!u) return toast('Inicia sesión', 'err');

  // Check ban
  const ban = await isBanned(u.uid);
  if (ban?.permanent) return toast('🔨 Tu cuenta está baneada permanentemente', 'err');
  if (ban?.temporary) return toast(`⏱️ Estás baneado por ${ban.hours}h más`, 'err');

  const txt = document.getElementById('new-cmt-txt')?.value?.trim();
  if (!txt) return;

  // Rate limit
  if (!checkRateLimit(postId)) return;

  // Filtro link adultos
  if (tieneContenidoAdulto(txt)) {
    await addWarning(u.uid, 'Link de contenido adulto en comentario');
    return toast('⚠️ No se pudo publicar: incumple las normas de la comunidad', 'err');
  }

  // Filtro link peligroso
  if (tieneLinkPeligroso(txt)) {
    await addWarning(u.uid, 'Link potencialmente peligroso en comentario');
    return toast('⚠️ Link bloqueado: puede ser peligroso', 'err');
  }

  const { db, collection, addDoc, doc, updateDoc, serverTimestamp, increment } = window._fb;
  await addDoc(collection(db, 'posts', postId, 'comments'), {
    text: txt, authorId: u.uid, authorName: u.displayName || 'Usuario',
    authorPhoto: u.photoURL || '', parentId: null, likes: 0, pinned: false, createdAt: serverTimestamp()
  });
  const postSnap = await (async () => { try { const {doc:d, getDoc} = window._fb; return await getDoc(d(db,'posts',postId)); } catch(e){return null;} })();
  if (postSnap?.exists()) {
    const postData = postSnap.data();
    const authorId = postData.authorId || postData.submittedBy;
    if (authorId && typeof createNotification === 'function') {
      createNotification(authorId, 'comment', { postId, postTitle: postData.title || '' });
    }
  }
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
  incrementRateLimit(postId);
  toast('Comentario publicado');
  document.getElementById('new-cmt-txt').value = '';
  renderComments(postId);
}

function toggleReply(cid) {
  const rf = document.getElementById(`rf-${cid}`);
  if (rf) rf.style.display = rf.style.display === 'none' ? 'flex' : 'none';
}

async function sendReply(postId, parentId) {
  const u = window._currentUser;
  if (!u) return toast('Inicia sesión', 'err');

  const ban = await isBanned(u.uid);
  if (ban?.permanent) return toast('🔨 Tu cuenta está baneada', 'err');
  if (ban?.temporary) return toast(`⏱️ Baneado por ${ban.hours}h más`, 'err');

  const txt = document.getElementById(`rt-${parentId}`)?.value?.trim();
  if (!txt) return;
  if (!checkRateLimit(postId)) return;
  if (tieneContenidoAdulto(txt)) {
    await addWarning(u.uid, 'Link adulto en respuesta');
    return toast('⚠️ No se pudo publicar: incumple las normas', 'err');
  }
  if (tieneLinkPeligroso(txt)) {
    await addWarning(u.uid, 'Link peligroso en respuesta');
    return toast('⚠️ Link bloqueado: puede ser peligroso', 'err');
  }
  const { db, collection, addDoc, serverTimestamp } = window._fb;
  await addDoc(collection(db, 'posts', postId, 'comments'), {
    text: txt, authorId: u.uid, authorName: u.displayName || 'Usuario',
    authorPhoto: u.photoURL || '', parentId, likes: 0, pinned: false, createdAt: serverTimestamp()
  });
  incrementRateLimit(postId);
  toast('Respuesta enviada');
  renderComments(postId);
}

async function likeCmt(postId, cid, currentLikes) {
  if (!window._currentUser) return toast('Inicia sesión para dar like', 'err');
  const { db, doc, updateDoc } = window._fb;
  const btn = document.getElementById(`like-${cid}`);
  const isLiked = btn?.classList.contains('liked');
  const newLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
  await updateDoc(doc(db, 'posts', postId, 'comments', cid), { likes: newLikes });
  if (btn) { btn.textContent = `❤️ ${newLikes}`; btn.classList.toggle('liked', !isLiked); }
}

async function pinCmt(postId, cid, isPinned) {
  if (!window._currentUser?.isAdmin) return;
  const { db, doc, updateDoc } = window._fb;
  await updateDoc(doc(db, 'posts', postId, 'comments', cid), { pinned: !isPinned });
  toast(isPinned ? 'Comentario desfijado' : 'Comentario fijado ⭐');
  renderComments(postId);
}

async function delCmt(postId, cid, postAuthorId) {
  const u = window._currentUser;
  if (!u) return;
  if (!u.isAdmin && !u.isAdminJr && u.uid !== postAuthorId) return toast('Sin permisos', 'err');
  if (!confirm('¿Eliminar comentario?')) return;
  const { db, doc, deleteDoc } = window._fb;
  await deleteDoc(doc(db, 'posts', postId, 'comments', cid));
  toast('Comentario eliminado');
  renderComments(postId, postAuthorId);
}

async function adminLikeCmt(postId, cid, current) {
  if (!window._currentUser?.isAdmin) return;
  const { db, doc, updateDoc } = window._fb;
  const newVal = current + 1;
  await updateDoc(doc(db, 'posts', postId, 'comments', cid), { adminLikes: newVal });
  toast('🛡️ Like de admin agregado');
  renderComments(postId);
}
