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
        <button class="tab ${tab === 'create' ? 'on' : ''}" onclick="renderAdmin('create')">${_editId ? '✏️ Editar' : '➕ Nueva'}</button>
        <button class="tab ${tab === 'posts' ? 'on' : ''}" onclick="renderAdmin('posts')">📋 Publicaciones (${_adminPosts.length})</button>
      </div>
      <div id="admin-body"></div>
    </div>`);

  if (tab === 'create') renderAdminForm();
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
  const data = { title, category, description, downloadLink, imageUrl: _formImg, featured, updatedAt: window._fb.serverTimestamp() };
  const { db, collection, addDoc, doc, updateDoc, serverTimestamp } = window._fb;
  try {
    if (_editId) {
      await updateDoc(doc(db, 'posts', _editId), data);
      toast('✅ Publicación actualizada');
      _editId = null;
    } else {
      data.createdAt = serverTimestamp();
      data.commentCount = 0;
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
  window._adminForm = { title: post.title || '', category: post.category || 'apk', description: post.description || '', downloadLink: post.downloadLink || '', featured: post.featured || false };
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
