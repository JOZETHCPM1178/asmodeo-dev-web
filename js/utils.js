
// ── Obtener texto en idioma activo ──
function localText(p, field) {
  const lang = window._lang || 'es';
  if (lang === 'en' && p[field + '_en']) return p[field + '_en'];
  if (lang === 'pt' && p[field + '_pt']) return p[field + '_pt'];
  return p[field] || '';
}

// js/utils.js

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = (type === 'ok' ? '✅ ' : '❌ ') + msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function avatarUrl(name) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'user')}`;
}

function setMain(html) {
  document.getElementById('main').innerHTML = html;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeMobileMenu();
}

function closeMobileMenu() {
  document.getElementById('mob-menu').classList.remove('open');
}

function toggleMenu() {
  document.getElementById('mob-menu').classList.toggle('open');
}

function postCardHTML(p, i = 0) {
  const c = window.CATS[p.category] || window.CATS.apk;
  const date = fmtDate(p.createdAt);
  const img = p.imageUrl
    ? `<img src="${p.imageUrl}" alt="${p.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=pcard-ph>${c.icon}</div>'">`
    : `<div class="pcard-ph">${c.icon}</div>`;
  return `
    <div class="card pcard" style="animation-delay:${i * 0.07}s" onclick="showPost('${p.id}')">
      <div class="pcard-img">
        ${img}
        <div class="img-ov"></div>
        <span class="badge ${c.bc} img-badge">${c.icon} ${c.label}</span>
        ${p.featured ? `<span class="feat-badge">⭐ Destacado</span>` : ''}
      </div>
      <div class="pcard-body">
        <div class="pcard-title">${localText(p,'title') || ''}</div>
        <div class="pcard-desc">${localText(p,'description') || ''}</div>
        <div class="pcard-foot">
          <div>
            <span class="pcard-date">🗓 ${date}</span>
            ${p.submittedByName ? `<span style="font-size:.7rem;color:var(--t3);display:block;margin-top:2px">👤 ${p.submittedByName}</span>` : ''}
          </div>
          <div class="pcard-actions">
            <button class="like-btn ${p._liked ? 'liked' : ''}" onclick="toggleLikePost(event,'${p.id}',this)">
              <span class="like-icon">❤️</span> <span class="like-count">${p.likes || 0}</span>
            </button>
            <button class="share-ico" onclick="sharePost(event,'${p.id}','${(p.title || '').replace(/'/g, "\\'")}')">🔗</button>
            <span style="font-size:.73rem;color:var(--t3)">💬 ${p.commentCount || 0}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function sharePost(e, id, title) {
  e.stopPropagation();
  const url = `${location.origin}${location.pathname}?post=${id}`;
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url)
      .then(() => toast('¡Enlace copiado!'))
      .catch(() => toast('Copia el enlace de la barra de URL'));
  }
}

window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 20);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.av-wrap')) {
    const d = document.getElementById('av-drop');
    if (d) d.style.display = 'none';
  }
});

// ── Compartir publicación con miniatura ──
function sharePost(e, id, title, imageUrl) {
  e.stopPropagation();
  const url = `${location.origin}${location.pathname}?post=${id}`;
  if (navigator.share) {
    navigator.share({
      title: `⚡ ${title} — ASMODEO DEV`,
      text: '¡Mira esto en ASMODEO DEV! APKs Mod, Juegos y más gratis 🔥',
      url
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url)
      .then(() => toast('¡Enlace copiado! 🔗'))
      .catch(() => toast('Copia el enlace de la barra de URL'));
  }
}

// ── Toggle notificaciones ──
function toggleNotif() {
  if (notifActivadas()) {
    desactivarNotificaciones();
  } else {
    suscribirNotificaciones();
  }
}

// ── Like a publicación ──
function getLikeIcon() {
  const u = window._currentUser;
  if (!u) return '❤️';
  if ((u.isAdmin || u.isAdminJr) && u.photoURL) {
    return `<img src="${u.photoURL}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:2px" onerror="this.style.display='none'"/>`;
  }
  return '❤️';
}

async function toggleLikePost(e, postId, btn) {
  e.stopPropagation();
  if (!window._currentUser) { toast('Inicia sesión para dar like', 'err'); return; }
  if (!window._fb) return;
  const { db, doc, getDoc, setDoc, deleteDoc, updateDoc, increment } = window._fb;
  const likeId = `${window._currentUser.uid}_${postId}`;
  const likeRef = doc(db, 'postLikes', likeId);
  const snap = await getDoc(likeRef);
  const countEl = btn.querySelector('.like-count');
  if (snap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) });
    btn.classList.remove('liked');
    if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
  } else {
    const u = window._currentUser;
    const likeData = {
      uid: u.uid, postId, createdAt: new Date().toISOString(),
      isAdmin: u.isAdmin || false, isAdminJr: u.isAdminJr || false,
      likerPhoto: u.photoURL || null, likerName: u.username || u.displayName || ''
    };
    await setDoc(likeRef, likeData);
    await updateDoc(doc(db, 'posts', postId), { likes: increment(1) });
    btn.classList.add('liked');
    const iconEl = btn.querySelector('.like-icon');
    if (iconEl) iconEl.innerHTML = getLikeIcon();
    if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
    // Notificar al autor del post
    try {
      const postSnap = await getDoc(doc(db, 'posts', postId));
      if (postSnap.exists()) {
        const postData = postSnap.data();
        const authorId = postData.authorId || postData.submittedBy;
        if (authorId && typeof notifyPostLike === 'function') {
          notifyPostLike(authorId, postId, postData.title || '');
        }
      }
    } catch(e) {}
  }
}
