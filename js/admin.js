// js/admin.js

let _editId = null;
let _adminPosts = [];
let _formImg = '';

function showAdmin() {
  if (!window._currentUser?.isAdmin) return toast('Acceso denegado', 'err');
  renderAdmin('create');
}

async function renderAdmin(tab = 'create') {
  const { db, collection, query, orderBy, getDocs } = window._fb;
  const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
  _adminPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  setMain(`
    <div class="admin-page">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px;flex-wrap:wrap;gap:14px">
        <div>
          <h1 class="admin-h1">🛡️ Panel Admin</h1>
          <p class="admin-s">Gestiona el contenido de ASMODEO DEV</p>
        </div>
        <div style="display:flex;gap:10px">
          <div style="text-align:center;padding:10px 18px;background:var(--card);border:1px solid var(--border);border-radius:var(--r)">
            <span style="display:block;font-family:var(--font1);font-size:1.4rem;font-weight:900;color:var(--p)">${_adminPosts.length}</span>
            <small style="font-size:.7rem;color:var(--t3)">Publicaciones</small>
          </div>
        </div>
      </div>
      <div class="tabs">
        <button class="tab ${tab === 'create' ? 'on' : ''}" onclick="renderAdmin('create')">${_editId ? '✏️ Editar' : t('new_tab')}</button>
        <button class="tab ${tab === 'posts' ? 'on' : ''}" onclick="renderAdmin('posts')">📋 Publicaciones (${_adminPosts.length})</button>
        <button class="tab ${tab === 'submissions' ? 'on' : ''}" onclick="renderAdmin('submissions')" id="sub-tab">📥 Revisión</button>
        ${window._currentUser?.isAdmin ? `<button class="tab ${tab === 'users' ? 'on' : ''}" onclick="renderAdmin('users')">${(window._t&&window._t['users_tab'])||''}</button>` : ''}
        ${window._currentUser?.isAdmin ? `<button class="tab ${tab === 'reports' ? 'on' : ''}" onclick="renderAdmin('reports')">🚩 Reportes</button>` : ''}
        ${window._currentUser?.isAdmin ? `<button class="tab ${tab === 'stats' ? 'on' : ''}" onclick="renderAdmin('stats')">📊 Stats</button>` : ''}
        ${window._currentUser?.isAdmin ? `<button class="tab ${tab === 'suspicious' ? 'on' : ''}" onclick="renderAdmin('suspicious')">🕵️ Sospechosos</button>` : ''}
      </div>
      <div id="admin-body"></div>
    </div>`);

  if (tab === 'create') renderAdminForm();
  else if (tab === 'submissions') renderSubmissions();
  else if (tab === 'users') { if (window._currentUser?.isAdmin) renderAdminUsers(); else renderAdminPosts(); }
  else if (tab === 'reports') { if (window._currentUser?.isAdmin) renderAdminReports(); else renderAdminPosts(); }
  else if (tab === 'stats') { if (window._currentUser?.isAdmin) renderAdminStats(); else renderAdminPosts(); }
  else if (tab === 'suspicious') { if (window._currentUser?.isAdmin) renderSuspiciousUsers(); else renderAdminPosts(); }
  else renderAdminPosts();
}

function renderAdminForm() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  const f = window._adminForm || { title: '', category: 'apk', description: '', downloadLink: '', featured: false };

  el.innerHTML = `
    <div class="form-card">
      <h3 style="font-family:var(--font1);font-size:.9rem;margin-bottom:20px">${_editId ? '✏️ Editar publicación' : '➕ Nueva publicación'}</h3>
      ${_editId ? `<button class="btn btn-ghost btn-sm" style="margin-bottom:16px" onclick="cancelEdit()">← Cancelar</button>` : ''}
      <div class="form-grid2">
        <div class="fg"><label class="lbl">Título *</label><input class="inp" id="f-title" placeholder="Nombre de la app o juego" value="${f.title}"/></div>
        <div class="fg"><label class="lbl">Categoría *</label>
          <select class="sel" id="f-cat">
            <option value="apk" ${f.category === 'apk' ? 'selected' : ''}>📱 APK Mod</option>
            <option value="games" ${f.category === 'games' ? 'selected' : ''}>🎮 Juegos Mod</option>
            <option value="script" ${f.category === 'script' ? 'selected' : ''}>⚙️ Script</option>
            <option value="tutorials" ${f.category === 'tutorials' ? 'selected' : ''}>📚 Tutorial</option>
          </select>
        </div>
      </div>
      <div class="fg"><label class="lbl">Descripción *</label><textarea class="txta" id="f-desc" rows="6" placeholder="Describe la publicación...">${f.description}</textarea></div>
      <div class="fg"><label class="lbl">Link de descarga</label><input class="inp" id="f-link" type="url" placeholder="https://..." value="${f.downloadLink}"/></div>
      <div class="fg">
        <label class="lbl">Imagen de portada</label>
        <div id="img-area">
          ${_formImg
            ? `<div class="preview-wrap"><img src="${_formImg}"/><button class="rm-img" onclick="removeImg()">✕</button></div>`
            : `<div class="drop-zone" onclick="document.getElementById('f-img').click()" ondrop="handleDrop(event)" ondragover="event.preventDefault()"><span class="drop-ico">📁</span><div class="drop-txt">Toca para subir imagen</div><div class="drop-hint">PNG, JPG, WEBP hasta 10MB</div></div>`}
        </div>
        <input type="file" id="f-img" accept="image/*" style="display:none" onchange="uploadImg(this.files[0])"/>
      </div>
      <div style="display:flex;gap:10px">
        <div class="fg" style="flex:1"><label class="lbl">Versión (opcional)</label><input class="inp" id="f-version" placeholder="ej: 2.5.1" value="${f.version || ''}"/></div>
        <div class="fg" style="flex:1"><label class="lbl">Estado</label>
          <select class="sel" id="f-stability">
            <option value="stable" ${(!f.stability || f.stability === 'stable') ? 'selected' : ''}>✅ Estable</option>
            <option value="beta" ${f.stability === 'beta' ? 'selected' : ''}>🧪 Beta</option>
            <option value="experimental" ${f.stability === 'experimental' ? 'selected' : ''}>⚠️ Experimental</option>
          </select>
        </div>
      </div>
      <div class="fg"><label class="check-row"><input type="checkbox" id="f-feat" ${f.featured ? 'checked' : ''}/><span>⭐ Marcar como destacado</span></label></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="savePost()">
        ${_editId ? '✅ Actualizar' : '🚀 Publicar ahora'}
      </button>
    </div>`;
}

function renderAdminPosts() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  if (_adminPosts.length === 0) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">📭</span><h3>Sin publicaciones</h3></div>`;
    return;
  }
  el.innerHTML = _adminPosts.map(p => `
    <div class="post-row">
      ${p.imageUrl ? `<img src="${p.imageUrl}" class="pr-img" onerror="this.style.display='none'"/>` : ''}
      <div style="flex:1;min-width:0">
        <div class="pr-title">${p.title}</div>
        <div class="pr-meta">
          <span class="badge b-${p.category}">${p.category}</span>
          <span style="font-size:.72rem;color:var(--t3)">${fmtDate(p.createdAt)}</span>
          <span style="font-size:.72rem;color:var(--t3)">💬 ${p.commentCount || 0}</span>
        </div>
      </div>
      <div class="pr-actions">
        <button class="btn btn-sm ${p.featured ? 'btn-primary' : 'btn-ghost'}" onclick="toggleFeat('${p.id}',${p.featured})" title="Destacar">⭐</button>
        <button class="btn btn-ghost btn-sm" onclick="editPost('${p.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="adminDelPost('${p.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

async function uploadImg(file) {
  if (!file) return;
  const area = document.getElementById('img-area');
  area.innerHTML = `<div class="preview-wrap"><div class="prog-ov"><div class="prog-bar"><div class="prog-fill" id="prog" style="width:0%"></div></div><span id="prog-txt" style="color:#fff;font-size:.82rem">0%</span></div></div>`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', window.CLOUDINARY_PRESET);
  fd.append('folder', 'asmodeo-dev');
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD}/image/upload`);
  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      const pct = Math.round(e.loaded / e.total * 100);
      const bar = document.getElementById('prog');
      const txt = document.getElementById('prog-txt');
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = pct + '%';
    }
  };
  xhr.onload = () => {
    if (xhr.status === 200) {
      _formImg = JSON.parse(xhr.responseText).secure_url;
      area.innerHTML = `<div class="preview-wrap"><img src="${_formImg}"/><button class="rm-img" onclick="removeImg()">✕</button></div>`;
      toast('Imagen subida ✅');
    } else {
      toast('Error al subir imagen', 'err');
    }
  };
  xhr.onerror = () => toast('Error de red', 'err');
  xhr.send(fd);
}

function handleDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) uploadImg(file);
}

function removeImg() {
  _formImg = '';
  const area = document.getElementById('img-area');
  if (area) area.innerHTML = `<div class="drop-zone" onclick="document.getElementById('f-img').click()" ondrop="handleDrop(event)" ondragover="event.preventDefault()"><span class="drop-ico">📁</span><div class="drop-txt">Toca para subir imagen</div><div class="drop-hint">PNG, JPG, WEBP hasta 10MB</div></div>`;
}

async function savePost() {
  const title = document.getElementById('f-title')?.value?.trim();
  const category = document.getElementById('f-cat')?.value;
  const description = document.getElementById('f-desc')?.value?.trim();
  const downloadLink = document.getElementById('f-link')?.value?.trim() || '';
  const featured = document.getElementById('f-feat')?.checked || false;
  if (!title || !description) return toast('Título y descripción son requeridos', 'err');
  const version = document.getElementById('f-version')?.value?.trim() || '';
  const stability = document.getElementById('f-stability')?.value || 'stable';
  const data = { title, category, description, downloadLink, imageUrl: _formImg, featured, version, stability, updatedAt: window._fb.serverTimestamp() };
  const { db, collection, addDoc, doc, updateDoc, serverTimestamp } = window._fb;
  try {
    if (_editId) {
      await updateDoc(doc(db, 'posts', _editId), data);
      toast('✅ Publicación actualizada');
      _editId = null;
    } else {
      data.createdAt = serverTimestamp();
      data.commentCount = 0;
      data.authorId = window._currentUser?.uid || '';
      data.submittedBy = window._currentUser?.uid || '';
      data.submittedByName = window._currentUser?.displayName || window._currentUser?.email || 'Admin';
      // Auto-translate to EN and PT
      toast('🌍 Traduciendo publicación...');
      const translations = await traducirPost(data.title, data.description);
      if (translations) Object.assign(data, translations);
      const docRef = await addDoc(collection(db, 'posts'), data);
      toast('🚀 Publicación creada');
      // Enviar notificación push a TODOS los suscriptores
      enviarNotifATodos({
        id: docRef.id,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        category: data.category
      });
    }
    _formImg = '';
    window._adminForm = null;
    renderAdmin('posts');
  } catch (e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function editPost(id) {
  const post = _adminPosts.find(p => p.id === id);
  if (!post) return;
  _editId = id;
  _formImg = post.imageUrl || '';
  window._adminForm = { title: post.title || '', category: post.category || 'apk', description: post.description || '', downloadLink: post.downloadLink || '', featured: post.featured || false, version: post.version || '', stability: post.stability || 'stable' };
  renderAdmin('create');
}

function cancelEdit() {
  _editId = null;
  _formImg = '';
  window._adminForm = null;
  renderAdmin('create');
}

async function adminDelPost(id) {
  if (!confirm('¿Eliminar esta publicación?')) return;
  const { db, doc, deleteDoc } = window._fb;
  await deleteDoc(doc(db, 'posts', id));
  toast('Publicación eliminada');
  renderAdmin('posts');
}

async function toggleFeat(id, isFeat) {
  const { db, doc, updateDoc } = window._fb;
  await updateDoc(doc(db, 'posts', id), { featured: !isFeat });
  toast(isFeat ? 'Quitado de destacados' : '⭐ Marcado como destacado');
  renderAdmin('posts');
}

// ── Panel de revisión de submissions ──
async function renderSubmissions() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:30px"><div class="spin"></div></div>`;
  try {
    const { db, collection, query, orderBy, where, getDocs } = window._fb;
    const snap = await getDocs(query(collection(db, 'submissions'), orderBy('createdAt', 'desc')));
    const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const pending = subs.filter(s => s.status === 'pending');

    // Update tab badge
    const tab = document.getElementById('sub-tab');
    if (tab && pending.length > 0) tab.textContent = `📥 Revisión (${pending.length})`;

    if (subs.length === 0) {
      el.innerHTML = `<div class="empty"><span class="empty-ico">📭</span><h3>Sin envíos aún</h3></div>`;
      return;
    }

    el.innerHTML = subs.map(s => `
      <div class="post-row" style="flex-direction:column;align-items:stretch;gap:12px">
        <div style="display:flex;gap:12px;align-items:flex-start">
          ${s.imageUrl ? `<img src="${s.imageUrl}" style="width:70px;height:50px;object-fit:cover;border-radius:8px;flex-shrink:0"/>` : ''}
          <div style="flex:1">
            <div class="pr-title">${s.title}</div>
            <div class="pr-meta">
              <span class="badge b-${s.category}">${s.category}</span>
              <span style="font-size:.72rem;color:var(--t3)">👤 ${s.submittedByName}</span>
              <span style="font-size:.72rem;color:var(--t3)">${fmtDate(s.createdAt)}</span>
              <span class="badge" style="background:${s.status === 'pending' ? 'rgba(245,158,11,.2)' : s.status === 'approved' ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'};color:${s.status === 'pending' ? 'var(--gold)' : s.status === 'approved' ? 'var(--green)' : 'var(--red)'}">
                ${s.status === 'pending' ? '⏳ Pendiente' : s.status === 'approved' ? '✅ Aprobado' : '❌ Rechazado'}
              </span>
            </div>
            <p style="font-size:.8rem;color:var(--t2);margin-top:6px;line-height:1.5">${(s.description || '').substring(0, 120)}...</p>
            ${s.downloadLink ? `
              <div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,.04);border-radius:8px;border:1px solid rgba(255,255,255,.08)">
                <div style="font-size:.72rem;color:var(--t3);margin-bottom:4px">🔗 Link de descarga:</div>
                <div style="font-size:.78rem;color:var(--p);word-break:break-all">${s.downloadLink}</div>
                <div style="display:flex;gap:8px;margin-top:8px">
                  <a href="${s.downloadLink}" target="_blank" class="btn btn-ghost btn-sm" style="text-decoration:none;font-size:.72rem">🔗 Abrir link</a>
                  <a href="https://www.virustotal.com/gui/home/upload" target="_blank" class="btn btn-ghost btn-sm" style="text-decoration:none;font-size:.72rem;color:#4CAF50">🛡️ VirusTotal</a>
                </div>
              </div>` : '<div style="font-size:.75rem;color:var(--t3);margin-top:6px">⚠️ Sin link de descarga</div>'}
          </div>
        </div>
        ${s.status === 'pending' ? `
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center" onclick="approveSubmission('${s.id}')">${(window._t&&window._t['approve'])||''}</button>
            <button class="btn btn-danger btn-sm" style="flex:1;justify-content:center" onclick="rejectSubmission('${s.id}')">${(window._t&&window._t['reject'])||''}</button>
          </div>` : ''}
      </div>`).join('');
  } catch(e) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">⚠️</span><h3>Error al cargar</h3></div>`;
  }
}

async function approveSubmission(id) {
  try {
    const { db, doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } = window._fb;
    const snap = await getDoc(doc(db, 'submissions', id));
    if (!snap.exists()) return;
    const s = snap.data();

    // Auto-traducir antes de publicar
    toast('🌍 Traduciendo publicación...');
    const translations = await traducirPost(s.title, s.description);
    // Crear el post real
    const postRef = await addDoc(collection(db, 'posts'), {
      title: s.title,
      category: s.category,
      description: s.description,
      downloadLink: s.downloadLink || '',
      imageUrl: s.imageUrl || '',
      featured: false,
      commentCount: 0,
      submittedBy: s.submittedBy,
      submittedByName: s.submittedByName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(translations || {})
    });

    // Marcar submission como aprobada
    await updateDoc(doc(db, 'submissions', id), { status: 'approved', postId: postRef.id });

    // Enviar notificación a todos
    enviarNotifATodos({
      id: postRef.id,
      title: s.title,
      description: s.description,
      imageUrl: s.imageUrl,
      category: s.category
    });

    toast('✅ Publicado y notificado a todos los usuarios');
    renderAdmin('submissions');
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function rejectSubmission(id) {
  if (!confirm('¿Rechazar esta publicación?')) return;
  const { db, doc, updateDoc } = window._fb;
  await updateDoc(doc(db, 'submissions', id), { status: 'rejected' });
  toast('Publicación rechazada');
  renderAdmin('submissions');
}

// ── Panel de estadísticas ──
async function renderAdminStats() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:40px"><div class="spin"></div></div>';
  try {
    if (typeof window.getGlobalStats !== 'function') {
      el.innerHTML = '<div class="empty"><span class="empty-ico">⚠️</span><h3>Cargando stats... recarga la página</h3></div>';
      return;
    }
    const stats = await window.getGlobalStats();
    const fmtK = n => {
      if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n/1000).toFixed(1) + 'K';
      return n.toString();
    };
    el.innerHTML = `
      <div style="font-family:var(--font1);font-size:.95rem;font-weight:700;margin-bottom:16px">📊 Estadísticas Globales</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
        <div class="form-card" style="text-align:center">
          <div style="font-size:1.8rem;font-family:var(--font1);color:var(--p)">${fmtK(stats.totalVisits)}</div>
          <div style="font-size:.78rem;color:var(--t3)">👁️ Visitas totales</div>
        </div>
        <div class="form-card" style="text-align:center">
          <div style="font-size:1.8rem;font-family:var(--font1);color:var(--p)">${fmtK(stats.totalDownloads)}</div>
          <div style="font-size:.78rem;color:var(--t3)">📥 Descargas totales</div>
        </div>
        <div class="form-card" style="text-align:center">
          <div style="font-size:1.8rem;font-family:var(--font1);color:var(--p)">${fmtK(stats.totalUsers)}</div>
          <div style="font-size:.78rem;color:var(--t3)">👥 Usuarios registrados</div>
        </div>
        <div class="form-card" style="text-align:center">
          <div style="font-size:1.8rem;font-family:var(--font1);color:var(--p)">${fmtK(stats.totalPosts)}</div>
          <div style="font-size:.78rem;color:var(--t3)">📦 Publicaciones</div>
        </div>
      </div>`;
  } catch(e) {
    el.innerHTML = '<div class="empty"><span class="empty-ico">⚠️</span><h3>Error al cargar</h3></div>';
  }
}

// ── Usuarios sospechosos ──
async function renderSuspiciousUsers() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:40px"><div class="spin"></div></div>';
  try {
    const { db, collection, getDocs, query, where, orderBy } = window._fb;
    const snap = await getDocs(collection(db, 'users'));
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Detectar sospechosos: creados hace menos de 1 día, sin foto, con muchas advertencias, o nombre genérico
    const now = Date.now();
    const suspicious = users.filter(u => {
      const created = u.createdAt?.seconds ? u.createdAt.seconds * 1000 : now;
      const isNew = (now - created) < 86400000;
      const noPhoto = !u.photoURL;
      const hasWarnings = (u.warnings || 0) >= 3;
      const genericName = /^user|^usuario|^\d+$/i.test(u.username || u.displayName || '');
      return hasWarnings || (isNew && noPhoto && genericName);
    });
    if (!suspicious.length) {
      el.innerHTML = '<div class="empty"><span class="empty-ico">✅</span><h3>Sin usuarios sospechosos</h3></div>';
      return;
    }
    el.innerHTML = `
      <div style="font-family:var(--font1);font-size:.95rem;font-weight:700;margin-bottom:16px">🕵️ Usuarios Sospechosos (${suspicious.length})</div>
      ${suspicious.map(u => `
        <div class="post-row" style="align-items:center;gap:12px;margin-bottom:8px">
          <img src="${u.photoURL || avatarUrl(u.displayName)}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='${avatarUrl(u.displayName)}'"/>
          <div style="flex:1;min-width:0">
            <div class="pr-title" style="font-size:.88rem">${u.username || u.displayName || 'Sin nombre'}</div>
            <div style="font-size:.72rem;color:var(--t3)">${u.email}</div>
            <div style="font-size:.7rem;color:#ff6b6b">⚠️ ${u.warnings || 0} advertencias ${u.banned ? '· 🔨 Baneado' : ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button class="btn btn-danger btn-sm" style="font-size:.7rem" onclick="banUser('${u.id}', true)">🔨 Ban</button>
            <button class="btn btn-ghost btn-sm" style="font-size:.7rem" onclick="unbanUser('${u.id}')">✅ Desbanear</button>
          </div>
        </div>`).join('')}`;
  } catch(e) {
    el.innerHTML = '<div class="empty"><span class="empty-ico">⚠️</span><h3>Error</h3></div>';
  }
}

// ── Panel de gestión de usuarios ──
function fmtK(n) {
  if (n >= 1000000) return (n/1000000).toFixed(n%1000000===0?0:1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(n%1000===0?0:1) + 'K';
  return n.toString();
}
async function renderAdminUsers() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  el.innerHTML = `
    <div style="margin-bottom:20px">
      <h3 style="font-family:var(--font1);font-size:.95rem;margin-bottom:14px">👥 Gestionar Usuarios</h3>
      <div class="form-card" style="margin-bottom:16px">
        <p style="font-size:.82rem;color:var(--t3);margin-bottom:14px">Busca un usuario por correo para editar sus seguidores o rol</p>
        <div style="display:flex;gap:8px">
          <input class="inp" id="user-search-email" placeholder="correo@ejemplo.com" style="flex:1"/>
          <button class="btn btn-primary btn-sm" onclick="searchUserByEmail()">🔍 Buscar</button>
        </div>
      </div>
      <div id="user-result"></div>
    </div>
    <div>
      <h3 style="font-family:var(--font1);font-size:.95rem;margin-bottom:14px">📋 Todos los usuarios</h3>
      <div id="users-list"><div style="text-align:center;padding:30px"><div class="spin"></div></div></div>
    </div>`;
  loadAllUsers();
}

async function loadAllUsers() {
  const el = document.getElementById('users-list');
  if (!el) return;
  try {
    const { db, collection, getDocs, orderBy, query } = window._fb;
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!users.length) { el.innerHTML = '<div class="empty"><span class="empty-ico">👤</span><h3>Sin usuarios</h3></div>'; return; }
    el.innerHTML = users.map(u => `
      <div class="post-row" style="align-items:center;gap:12px">
        <img src="${u.photoURL || avatarUrl(u.displayName)}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='${avatarUrl(u.displayName)}'"/>
        <div style="flex:1;min-width:0">
          <div class="pr-title" style="font-size:.88rem">${u.username || u.displayName || 'Sin nombre'}</div>
          <div style="font-size:.72rem;color:var(--t3)">${u.email}</div>
          <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
            <span class="badge ${u.role === 'admin' ? 'b-admin' : 'b-apk'}" style="font-size:.65rem">${u.role === 'admin' ? '🛡️ Admin' : '👤 Usuario'}</span>
            <span style="font-size:.7rem;color:var(--t3)">⭐ ${fmtK(u.fakeFollowers || 0)} seguidores</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="flex-shrink:0;font-size:.72rem" onclick="editUserFollowers('${u.id}','${(u.username || u.displayName || '').replace(/'/g,"\\'")}',${u.fakeFollowers || 0},'${u.role || 'user'}','${(u.customRole||'').replace(/'/g,'')}')">✏️ Editar</button>
      </div>`).join('');
  } catch(e) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">⚠️</span><h3>Error al cargar</h3></div>`;
  }
}

async function searchUserByEmail() {
  const email = document.getElementById('user-search-email')?.value?.trim();
  if (!email) return toast('Ingresa un correo', 'err');
  const el = document.getElementById('user-result');
  el.innerHTML = `<div style="text-align:center;padding:20px"><div class="spin"></div></div>`;
  try {
    const { db, collection, query, where, getDocs } = window._fb;
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
    if (snap.empty) { el.innerHTML = `<div class="empty"><span class="empty-ico">🔍</span><h3>Usuario no encontrado</h3></div>`; return; }
    const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
    el.innerHTML = `
      <div class="form-card" style="border:1px solid var(--p)">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <img src="${u.photoURL || avatarUrl(u.displayName)}" style="width:50px;height:50px;border-radius:50%;object-fit:cover"/>
          <div>
            <div style="font-weight:700">${u.username || u.displayName}</div>
            <div style="font-size:.78rem;color:var(--t3)">${u.email}</div>
          </div>
        </div>
        <div class="fg">
          <label class="lbl">Seguidores mostrados</label>
          <input class="inp" type="number" id="edit-followers-${u.id}" value="${u.fakeFollowers || 0}" min="0"/>
        </div>
        <div class="fg">
          <label class="lbl">Rol</label>
          <select class="sel" id="edit-role-${u.id}">
            <option value="user" ${(!u.role || u.role === 'user') ? 'selected' : ''}>👤 Usuario</option>
            <option value="admin_jr" ${u.role === 'admin_jr' ? 'selected' : ''}>⚡ Admin Jr</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>🛡️ Admin</option>
          </select>
        </div>
        <div class="fg" id="custom-role-wrap-${u.id}">
          <label class="lbl">Nombre personalizado del rol (ej: "Moderador", "Editor")</label>
          <input class="inp" id="edit-customrole-${u.id}" value="${u.customRole || ''}" placeholder="Dejar vacío para usar el nombre por defecto"/>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px" onclick="saveUserEdit('${u.id}')">💾 Guardar cambios</button>
      </div>`;
  } catch(e) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">⚠️</span><h3>Error: ${e.message}</h3></div>`;
  }
}

function editUserFollowers(uid, name, currentFollowers, currentRole, currentCustomRole) {
  const el = document.getElementById('user-result');
  if (!el) return;
  el.innerHTML = `
    <div class="form-card" style="border:1px solid var(--p);margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:14px">✏️ Editando: ${name}</div>
      <div class="fg">
        <label class="lbl">Seguidores mostrados</label>
        <input class="inp" type="number" id="edit-followers-${uid}" value="${currentFollowers}" min="0"/>
      </div>
      <div class="fg">
        <label class="lbl">Rol</label>
        <select class="sel" id="edit-role-${uid}">
          <option value="user" ${(!currentRole || currentRole === 'user') ? 'selected' : ''}>👤 Usuario</option>
          <option value="admin_jr" ${currentRole === 'admin_jr' ? 'selected' : ''}>⚡ Admin Jr</option>
          <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>🛡️ Admin</option>
        </select>
      </div>
      <div class="fg">
        <label class="lbl">Nombre personalizado del rol (opcional)</label>
        <input class="inp" id="edit-customrole-${uid}" value="${currentCustomRole || ''}" placeholder="Ej: Moderador, Editor..."/>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center" onclick="saveUserEdit('${uid}')">💾 Guardar</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('user-result').innerHTML=''">Cancelar</button>
      </div>
    </div>`;
  el.scrollIntoView({ behavior: 'smooth' });
}

async function saveUserFollowers(uid) {
  try {
    const val = parseInt(document.getElementById(`edit-followers-${uid}`)?.value || 0);
    const { db, doc, updateDoc } = window._fb;
    await updateDoc(doc(db, 'users', uid), { fakeFollowers: val });
    toast('✅ Seguidores actualizados');
    const el = document.getElementById('user-result');
    if (el) el.innerHTML = '';
    loadAllUsers();
  } catch(e) {
    console.error('saveUserFollowers error:', e);
    toast('Error al guardar: ' + e.message, 'err');
  }
}

async function saveUserEdit(uid) {
  if (!window._currentUser?.isAdmin) return toast('Sin permisos para editar usuarios', 'err');
  const followers = parseInt(document.getElementById(`edit-followers-${uid}`)?.value || 0);
  const role = document.getElementById(`edit-role-${uid}`)?.value;
  const customRole = document.getElementById(`edit-customrole-${uid}`)?.value?.trim() || '';
  if (!role) return toast('Selecciona un rol', 'err');
  try {
    const { db, doc, updateDoc } = window._fb;
    await updateDoc(doc(db, 'users', uid), { fakeFollowers: followers, role, customRole });
    toast('✅ Usuario actualizado');
    const el = document.getElementById('user-result');
    if (el) el.innerHTML = '';
    loadAllUsers();
  } catch(e) {
    console.error('saveUserEdit error:', e);
    toast('Error al guardar: ' + e.message, 'err');
  }
}

// ── Panel de reportes ──
async function renderAdminReports() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:30px"><div class="spin"></div></div>`;
  try {
    const { db, collection, getDocs, query, orderBy } = window._fb;
    const snap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc')));
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!reports.length) { el.innerHTML = '<div class="empty"><span class="empty-ico">✅</span><h3>Sin reportes pendientes</h3></div>'; return; }
    const typeIcon = { post:'📦', comment:'💬', profile:'👤' };
    el.innerHTML = `
      <h3 style="font-family:var(--font1);font-size:.95rem;margin-bottom:16px">🚩 Reportes (${reports.length})</h3>
      ${reports.map(r => `
        <div class="post-row" style="flex-direction:column;gap:8px;align-items:flex-start;margin-bottom:12px">
          <div style="display:flex;gap:8px;align-items:center;width:100%">
            <span style="font-size:1.2rem">${typeIcon[r.type]||'⚠️'}</span>
            <div style="flex:1">
              <div style="font-size:.85rem;font-weight:700">${r.type === 'post' ? 'Publicación' : r.type === 'comment' ? 'Comentario' : 'Perfil'}</div>
              <div style="font-size:.75rem;color:var(--t3)">Por: ${r.reportedByName} · ${r.reason}</div>
              ${r.adminResponse ? `<div style="font-size:.75rem;color:var(--p);margin-top:4px">📋 Respuesta enviada: ${r.adminResponse}</div>` : ''}
            </div>
            <span class="badge ${r.status === 'pending' ? 'b-apk' : 'b-admin'}" style="font-size:.65rem">${r.status === 'pending' ? '⏳ Pendiente' : '✅ Revisado'}</span>
          </div>
          <div style="display:flex;gap:6px;width:100%;flex-wrap:wrap">
            ${r.type === 'post' ? `<button class="btn btn-ghost btn-sm" onclick="showPost('${r.targetId}')">👁️ Ver</button>` : ''}
            ${r.type === 'profile' ? `<button class="btn btn-ghost btn-sm" onclick="showUserProfile('${r.targetId}')">👁️ Ver perfil</button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="showReportResponseForm('${r.id}','${r.reportedBy}')">📋 Responder</button>
            <button class="btn btn-ghost btn-sm" onclick="markReportDone('${r.id}')">✅ Revisado</button>
            <button class="btn btn-ghost btn-sm" style="color:#ef4444" onclick="banReportedUser('${r.targetId}','${r.id}')">🔨 Banear</button>
          </div>
          <div id="resp-form-${r.id}" style="display:none;width:100%">
            <textarea class="txta" id="resp-txt-${r.id}" rows="2" placeholder="Escribe tu respuesta al usuario..."></textarea>
            <div style="display:flex;gap:8px;margin-top:6px">
              <button class="btn btn-primary btn-sm" onclick="sendReportResponse('${r.id}','${r.reportedBy}')">📤 Enviar</button>
              <button class="btn btn-ghost btn-sm" onclick="document.getElementById('resp-form-${r.id}').style.display='none'">Cancelar</button>
            </div>
          </div>
        </div>`).join('')}`;
  } catch(e) { el.innerHTML = `<div class="empty"><span class="empty-ico">⚠️</span><h3>Error: ${e.message}</h3></div>`; }
}

function showReportResponseForm(reportId, reportedBy) {
  const form = document.getElementById(`resp-form-${reportId}`);
  if (form) form.style.display = form.style.display === 'none' ? 'flex' : 'none';
  if (form) form.style.flexDirection = 'column';
}

async function sendReportResponse(reportId, reportedByUid) {
  const txt = document.getElementById(`resp-txt-${reportId}`)?.value?.trim();
  if (!txt) return toast('Escribe una respuesta', 'err');
  if (!reportedByUid || reportedByUid === 'undefined') return toast('Error: UID del usuario no encontrado', 'err');
  try {
    const { db, doc, updateDoc, collection, addDoc, serverTimestamp } = window._fb;
    // Marcar reporte como revisado con respuesta
    await updateDoc(doc(db, 'reports', reportId), { status: 'reviewed', adminResponse: txt });
    // Enviar notificación al usuario que reportó
    await addDoc(collection(db, 'notifications'), {
      type: 'report_response',
      toUid: reportedByUid,
      fromUid: window._currentUser.uid,
      fromName: 'ASMODEO DEV Admin',
      fromPhoto: window._currentUser.photoURL || '',
      response: txt,
      read: false,
      createdAt: serverTimestamp()
    });
    toast('✅ Respuesta enviada al usuario');
    renderAdminReports();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function markReportDone(reportId) {
  const { db, doc, updateDoc } = window._fb;
  await updateDoc(doc(db, 'reports', reportId), { status: 'reviewed' });
  toast('✅ Reporte marcado como revisado');
  renderAdminReports();
}

async function banReportedUser(targetId, reportId) {
  if (!confirm('¿Banear a este usuario?')) return;
  await banUser(targetId, false);
  await markReportDone(reportId);
}

window.markReportDone = markReportDone;
window.banReportedUser = banReportedUser;
