// js/admin-jr.js — Panel Admin Junior (JR)
// Solo ve y edita SUS PROPIAS publicaciones
// Ve stats y reportes de SUS publicaciones

async function renderAdminJr(tab = 'create') {
  const u = window._currentUser;
  if (!u) return toast('Debes iniciar sesión', 'err');
  if (!u.isAdminJr) {
    toast(`Tu rol es: ${u.role} — necesitas admin_jr`, 'err');
    return;
  }
  toast('Cargando panel JR...');
  const { db, collection, query, where, getDocs } = window._fb;

  try {
    // Solo where sin orderBy para evitar requerir índice compuesto
    const snap = await getDocs(query(
      collection(db, 'posts'),
      where('authorId', '==', u.uid)
    ));
    // Ordenar en el cliente
    window._jrPosts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
  } catch(e) {
    console.error('Admin Jr query error:', e);
    toast('Error al cargar: ' + e.message, 'err');
    window._jrPosts = [];
  }

  setMain(`
    <div class="admin-page">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px;flex-wrap:wrap;gap:14px">
        <div>
          <h1 class="admin-h1">⚡ Panel Admin <span style="color:var(--p)">JR</span></h1>
          <p class="admin-s">Gestiona tus publicaciones en ASMODEO DEV</p>
        </div>
        <div style="text-align:center;padding:10px 18px;background:var(--card);border:1px solid var(--border);border-radius:var(--r)">
          <span style="display:block;font-family:var(--font1);font-size:1.4rem;font-weight:900;color:var(--p)">${window._jrPosts.length}</span>
          <small style="font-size:.7rem;color:var(--t3)">Mis publicaciones</small>
        </div>
      </div>
      <div class="tabs">
        <button class="tab ${tab === 'create' ? 'on' : ''}" onclick="renderAdminJr('create')">➕ Nueva</button>
        <button class="tab ${tab === 'posts' ? 'on' : ''}" onclick="renderAdminJr('posts')">📋 Mis posts (${window._jrPosts.length})</button>
        <button class="tab ${tab === 'stats' ? 'on' : ''}" onclick="renderAdminJr('stats')">📊 Mis stats</button>
        <button class="tab ${tab === 'reports' ? 'on' : ''}" onclick="renderAdminJr('reports')" id="jr-reports-tab">🚩 Reportes</button>
      </div>
      <div id="admin-body"></div>
    </div>`);

  if (tab === 'create')  renderJrForm();
  else if (tab === 'posts')   renderJrPosts();
  else if (tab === 'stats')   renderJrStats();
  else if (tab === 'reports') renderJrReports();
}

// ── Formulario nueva/editar publicación ──
function renderJrForm() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  const f = window._jrForm || { title: '', category: 'apk', description: '', downloadLink: '' };
  const isEdit = !!window._jrEditId;

  el.innerHTML = `
    <div class="form-card">
      <h3 style="font-family:var(--font1);font-size:.9rem;margin-bottom:20px">${isEdit ? '✏️ Editar publicación' : '➕ Nueva publicación'}</h3>
      ${isEdit ? `<button class="btn btn-ghost btn-sm" style="margin-bottom:16px" onclick="cancelJrEdit()">← Cancelar</button>` : ''}
      <div class="form-grid2">
        <div class="fg">
          <label class="lbl">Título *</label>
          <input class="inp" id="jf-title" placeholder="Nombre de la app o juego" value="${f.title}"/>
        </div>
        <div class="fg">
          <label class="lbl">Categoría *</label>
          <select class="sel" id="jf-cat">
            <option value="apk"       ${f.category === 'apk'       ? 'selected' : ''}>📱 APK Mod</option>
            <option value="games"     ${f.category === 'games'     ? 'selected' : ''}>🎮 Juegos Mod</option>
            <option value="script"    ${f.category === 'script'    ? 'selected' : ''}>⚙️ Script</option>
            <option value="tutorials" ${f.category === 'tutorials' ? 'selected' : ''}>📚 Tutorial</option>
          </select>
        </div>
      </div>
      <div class="fg">
        <label class="lbl">Descripción *</label>
        <textarea class="txta" id="jf-desc" rows="6" placeholder="Describe la publicación...">${f.description}</textarea>
      </div>
      <div class="fg">
        <label class="lbl">Link de descarga</label>
        <input class="inp" id="jf-link" type="url" placeholder="https://..." value="${f.downloadLink}"/>
      </div>
      <div class="fg">
        <label class="lbl">Imagen de portada</label>
        <div id="jr-img-area">
          ${window._jrFormImg
            ? `<div class="preview-wrap"><img src="${window._jrFormImg}"/><button class="rm-img" onclick="removeJrImg()">✕</button></div>`
            : `<div class="drop-zone" onclick="document.getElementById('jf-img').click()" ondrop="handleJrDrop(event)" ondragover="event.preventDefault()">
                <span class="drop-ico">📁</span>
                <div class="drop-txt">Toca para subir imagen</div>
                <div class="drop-hint">PNG, JPG, WEBP hasta 10MB</div>
               </div>`}
        </div>
        <input type="file" id="jf-img" accept="image/*" style="display:none" onchange="uploadJrImg(this.files[0])"/>
      </div>
      <div style="display:flex;gap:10px">
        <div class="fg" style="flex:1">
          <label class="lbl">Versión (opcional)</label>
          <input class="inp" id="jf-version" placeholder="ej: 2.5.1" value="${f.version || ''}"/>
        </div>
        <div class="fg" style="flex:1">
          <label class="lbl">Estado</label>
          <select class="sel" id="jf-stability">
            <option value="stable"       ${(!f.stability || f.stability === 'stable')       ? 'selected' : ''}>✅ Estable</option>
            <option value="beta"         ${f.stability === 'beta'                            ? 'selected' : ''}>🧪 Beta</option>
            <option value="experimental" ${f.stability === 'experimental'                   ? 'selected' : ''}>⚠️ Experimental</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="saveJrPost()">
        ${isEdit ? '✅ Actualizar publicación' : '🚀 Publicar ahora'}
      </button>
    </div>`;
}

// ── Subir imagen ──
async function uploadJrImg(file) {
  if (!file) return;
  const area = document.getElementById('jr-img-area');
  area.innerHTML = `<div class="preview-wrap"><div class="prog-ov"><div class="prog-bar"><div class="prog-fill" id="jr-prog" style="width:0%"></div></div><span id="jr-prog-txt" style="color:#fff;font-size:.82rem">0%</span></div></div>`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', window.CLOUDINARY_PRESET);
  fd.append('folder', 'asmodeo-dev');
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD}/image/upload`);
  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      const pct = Math.round(e.loaded / e.total * 100);
      const bar = document.getElementById('jr-prog');
      const txt = document.getElementById('jr-prog-txt');
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = pct + '%';
    }
  };
  xhr.onload = () => {
    if (xhr.status === 200) {
      window._jrFormImg = JSON.parse(xhr.responseText).secure_url;
      area.innerHTML = `<div class="preview-wrap"><img src="${window._jrFormImg}"/><button class="rm-img" onclick="removeJrImg()">✕</button></div>`;
      toast('Imagen subida ✅');
    } else {
      toast('Error al subir imagen', 'err');
    }
  };
  xhr.onerror = () => toast('Error de red', 'err');
  xhr.send(fd);
}

function handleJrDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) uploadJrImg(file);
}

function removeJrImg() {
  window._jrFormImg = '';
  const area = document.getElementById('jr-img-area');
  if (area) area.innerHTML = `<div class="drop-zone" onclick="document.getElementById('jf-img').click()" ondrop="handleJrDrop(event)" ondragover="event.preventDefault()"><span class="drop-ico">📁</span><div class="drop-txt">Toca para subir imagen</div><div class="drop-hint">PNG, JPG, WEBP hasta 10MB</div></div>`;
}

// ── Guardar publicación ──
async function saveJrPost() {
  const u = window._currentUser;
  const title       = document.getElementById('jf-title')?.value?.trim();
  const category    = document.getElementById('jf-cat')?.value;
  const description = document.getElementById('jf-desc')?.value?.trim();
  const downloadLink = document.getElementById('jf-link')?.value?.trim() || '';
  const version     = document.getElementById('jf-version')?.value?.trim() || '';
  const stability   = document.getElementById('jf-stability')?.value || 'stable';

  if (!title || !description) return toast('Título y descripción son requeridos', 'err');

  const data = {
    title, category, description, downloadLink,
    imageUrl: window._jrFormImg || '',
    version, stability,
    updatedAt: window._fb.serverTimestamp()
  };

  const { db, collection, addDoc, doc, updateDoc, serverTimestamp } = window._fb;

  try {
    if (window._jrEditId) {
      // Solo puede editar SUS publicaciones
      const post = window._jrPosts.find(p => p.id === window._jrEditId);
      if (!post || post.authorId !== u.uid) return toast('No puedes editar esta publicación', 'err');

      await updateDoc(doc(db, 'posts', window._jrEditId), data);
      toast('✅ Publicación actualizada');
      window._jrEditId = null;
    } else {
      data.createdAt     = serverTimestamp();
      data.commentCount  = 0;
      data.authorId      = u.uid;
      data.submittedBy   = u.uid;
      data.submittedByName = u.displayName || u.email || 'Admin Jr';

      toast('🌍 Traduciendo publicación...');
      const translations = await traducirPost(data.title, data.description);
      if (translations) Object.assign(data, translations);

      const docRef = await addDoc(collection(db, 'posts'), data);
      toast('🚀 Publicación creada');

      enviarNotifATodos({
        id: docRef.id, title: data.title,
        description: data.description,
        imageUrl: data.imageUrl, category: data.category
      });
    }

    window._jrFormImg = '';
    window._jrForm = null;
    renderAdminJr('posts');
  } catch (e) {
    toast('Error: ' + e.message, 'err');
  }
}

// ── Lista de MIS publicaciones ──
function renderJrPosts() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  const posts = window._jrPosts || [];

  if (!posts.length) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">📭</span><h3>Aún no tienes publicaciones</h3><p style="color:var(--t3);font-size:.85rem;margin-top:8px">Crea tu primera publicación en la pestaña ➕ Nueva</p></div>`;
    return;
  }

  el.innerHTML = posts.map(p => `
    <div class="post-row">
      ${p.imageUrl ? `<img src="${p.imageUrl}" class="pr-img" onerror="this.style.display='none'"/>` : ''}
      <div style="flex:1;min-width:0">
        <div class="pr-title">${p.title}</div>
        <div class="pr-meta">
          <span class="badge b-${p.category}">${p.category}</span>
          <span style="font-size:.72rem;color:var(--t3)">${fmtDate(p.createdAt)}</span>
          <span style="font-size:.72rem;color:var(--t3)">💬 ${p.commentCount || 0}</span>
          <span style="font-size:.72rem;color:var(--t3)">❤️ ${p.likes || 0}</span>
        </div>
      </div>
      <div class="pr-actions">
        <button class="btn btn-ghost btn-sm" onclick="editJrPost('${p.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteJrPost('${p.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

function editJrPost(id) {
  const post = window._jrPosts.find(p => p.id === id);
  if (!post) return;
  // Solo puede editar sus propias
  if (post.authorId !== window._currentUser?.uid) return toast('No puedes editar publicaciones de otros Admin Jr', 'err');
  window._jrEditId  = id;
  window._jrFormImg = post.imageUrl || '';
  window._jrForm    = {
    title: post.title || '', category: post.category || 'apk',
    description: post.description || '', downloadLink: post.downloadLink || '',
    version: post.version || '', stability: post.stability || 'stable'
  };
  renderAdminJr('create');
}

function cancelJrEdit() {
  window._jrEditId  = null;
  window._jrFormImg = '';
  window._jrForm    = null;
  renderAdminJr('create');
}

async function deleteJrPost(id) {
  const post = window._jrPosts.find(p => p.id === id);
  if (!post) return;
  if (post.authorId !== window._currentUser?.uid) return toast('No puedes eliminar publicaciones de otros Admin Jr', 'err');
  if (!confirm('¿Eliminar esta publicación?')) return;
  const { db, doc, deleteDoc } = window._fb;
  await deleteDoc(doc(db, 'posts', id));
  toast('Publicación eliminada');
  renderAdminJr('posts');
}

// ── Stats de MIS publicaciones ──
async function renderJrStats() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:40px"><div class="spin"></div></div>';

  const posts = window._jrPosts || [];
  const totalLikes    = posts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.commentCount || 0), 0);
  const totalDownloads = posts.reduce((s, p) => s + (p.downloads || 0), 0);
  const topPost = posts.sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];

  const fmtK = n => n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString();

  el.innerHTML = `
    <div style="font-family:var(--font1);font-size:.95rem;font-weight:700;margin-bottom:16px">📊 Mis Estadísticas</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="form-card" style="text-align:center">
        <div style="font-size:1.8rem;font-family:var(--font1);color:var(--p)">${posts.length}</div>
        <div style="font-size:.78rem;color:var(--t3)">📦 Publicaciones</div>
      </div>
      <div class="form-card" style="text-align:center">
        <div style="font-size:1.8rem;font-family:var(--font1);color:var(--p)">${fmtK(totalLikes)}</div>
        <div style="font-size:.78rem;color:var(--t3)">❤️ Likes totales</div>
      </div>
      <div class="form-card" style="text-align:center">
        <div style="font-size:1.8rem;font-family:var(--font1);color:var(--p)">${fmtK(totalComments)}</div>
        <div style="font-size:.78rem;color:var(--t3)">💬 Comentarios</div>
      </div>
      <div class="form-card" style="text-align:center">
        <div style="font-size:1.8rem;font-family:var(--font1);color:var(--p)">${fmtK(totalDownloads)}</div>
        <div style="font-size:.78rem;color:var(--t3)">📥 Descargas</div>
      </div>
    </div>
    ${topPost ? `
      <div class="form-card">
        <div style="font-size:.82rem;color:var(--t3);margin-bottom:10px">🏆 Tu publicación más popular</div>
        <div style="display:flex;gap:12px;align-items:center">
          ${topPost.imageUrl ? `<img src="${topPost.imageUrl}" style="width:56px;height:42px;object-fit:cover;border-radius:8px;flex-shrink:0"/>` : ''}
          <div>
            <div style="font-weight:700;font-size:.88rem">${topPost.title}</div>
            <div style="font-size:.75rem;color:var(--t3)">❤️ ${topPost.likes || 0} likes · 💬 ${topPost.commentCount || 0} comentarios</div>
          </div>
        </div>
      </div>` : ''}

    <div style="font-family:var(--font1);font-size:.88rem;font-weight:700;margin:20px 0 12px">📋 Detalle por publicación</div>
    ${posts.map(p => `
      <div class="post-row" style="margin-bottom:8px">
        ${p.imageUrl ? `<img src="${p.imageUrl}" class="pr-img" onerror="this.style.display='none'"/>` : ''}
        <div style="flex:1;min-width:0">
          <div class="pr-title" style="font-size:.85rem">${p.title}</div>
          <div class="pr-meta">
            <span style="font-size:.72rem;color:var(--t3)">❤️ ${p.likes || 0}</span>
            <span style="font-size:.72rem;color:var(--t3)">💬 ${p.commentCount || 0}</span>
            <span style="font-size:.72rem;color:var(--t3)">📥 ${p.downloads || 0}</span>
          </div>
        </div>
      </div>`).join('')}`;
}

// ── Reportes de MIS publicaciones ──
async function renderJrReports() {
  const el = document.getElementById('admin-body');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:30px"><div class="spin"></div></div>';

  try {
    const u = window._currentUser;
    const { db, collection, getDocs, query, orderBy, where } = window._fb;

    // Solo reportes de sus publicaciones o comentarios en sus publicaciones
    const myPostIds = (window._jrPosts || []).map(p => p.id);

    const snap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc')));
    const allReports = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filtrar: reportes de sus posts o comentarios en sus posts
    const reports = allReports.filter(r =>
      (r.type === 'post' && myPostIds.includes(r.targetId)) ||
      (r.type === 'comment' && myPostIds.includes(r.postId))
    );

    const tab = document.getElementById('jr-reports-tab');
    if (tab && reports.length > 0) tab.textContent = `🚩 Reportes (${reports.length})`;

    if (!reports.length) {
      el.innerHTML = '<div class="empty"><span class="empty-ico">✅</span><h3>Sin reportes en tus publicaciones</h3></div>';
      return;
    }

    const typeIcon = { post: '📦', comment: '💬' };

    el.innerHTML = `
      <div style="font-family:var(--font1);font-size:.88rem;font-weight:700;margin-bottom:16px">🚩 Reportes en mis publicaciones (${reports.length})</div>
      <div style="font-size:.78rem;color:var(--t3);margin-bottom:16px;padding:10px;background:rgba(255,255,255,.04);border-radius:8px">
        ℹ️ Puedes ver los reportes de tus publicaciones y comentarios. Para tomar acciones de baneo contacta a un Admin puro.
      </div>
      ${reports.map(r => `
        <div class="post-row" style="flex-direction:column;gap:8px;align-items:flex-start;margin-bottom:12px">
          <div style="display:flex;gap:8px;align-items:center;width:100%">
            <span style="font-size:1.2rem">${typeIcon[r.type] || '⚠️'}</span>
            <div style="flex:1">
              <div style="font-size:.85rem;font-weight:700">${r.type === 'post' ? 'Publicación reportada' : 'Comentario reportado'}</div>
              <div style="font-size:.75rem;color:var(--t3)">Motivo: ${r.reason}</div>
              <div style="font-size:.72rem;color:var(--t3)">${fmtDate(r.createdAt)}</div>
            </div>
            <span class="badge ${r.status === 'pending' ? 'b-apk' : 'b-admin'}" style="font-size:.65rem">
              ${r.status === 'pending' ? '⏳ Pendiente' : '✅ Revisado'}
            </span>
          </div>
          ${r.type === 'post' ? `<button class="btn btn-ghost btn-sm" onclick="showPost('${r.targetId}')">👁️ Ver publicación</button>` : ''}
        </div>`).join('')}`;
  } catch (e) {
    el.innerHTML = `<div class="empty"><span class="empty-ico">⚠️</span><h3>Error: ${e.message}</h3></div>`;
  }
}

// ── Exportar al global ──
window.renderAdminJr  = renderAdminJr;
window.renderJrForm   = renderJrForm;
window.renderJrPosts  = renderJrPosts;
window.renderJrStats  = renderJrStats;
window.renderJrReports = renderJrReports;
window.saveJrPost     = saveJrPost;
window.editJrPost     = editJrPost;
window.cancelJrEdit   = cancelJrEdit;
window.deleteJrPost   = deleteJrPost;
window.uploadJrImg    = uploadJrImg;
window.handleJrDrop   = handleJrDrop;
window.removeJrImg    = removeJrImg;
