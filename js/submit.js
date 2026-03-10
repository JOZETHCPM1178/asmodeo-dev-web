// js/submit.js — Usuarios pueden subir apps para aprobación

function showSubmitPost() {
  if (!window._currentUser) return showLogin();
  setMain(`
    <div class="container" style="max-width:700px;padding-top:40px;padding-bottom:80px">
      <div class="form-card">
        <h1 style="font-family:var(--font1);font-size:1.1rem;margin-bottom:6px">📤 Subir App</h1>
        <p style="font-size:.83rem;color:var(--t3);margin-bottom:24px">Tu publicación será revisada por el admin antes de aparecer en la web</p>

        <div class="form-grid2">
          <div class="fg"><label class="lbl">Título *</label><input class="inp" id="s-title" placeholder="Nombre de la app o juego"/></div>
          <div class="fg"><label class="lbl">Categoría *</label>
            <select class="sel" id="s-cat">
              <option value="apk">📱 APK Mod</option>
              <option value="games">🎮 Juegos Mod</option>
              <option value="script">⚙️ Script</option>
              <option value="tutorials">📚 Tutorial</option>
            </select>
          </div>
        </div>

        <div class="fg"><label class="lbl">Descripción *</label><textarea class="txta" id="s-desc" rows="5" placeholder="Describe la app, versión, características..."></textarea></div>
        <div class="fg"><label class="lbl">Link de descarga</label><input class="inp" id="s-link" type="url" placeholder="https://..."/></div>

        <div class="fg">
          <label class="lbl">Imagen de portada</label>
          <div id="s-img-area">
            <div class="drop-zone" onclick="document.getElementById('s-img').click()">
              <span class="drop-ico">📁</span>
              <div class="drop-txt">Toca para subir imagen</div>
              <div class="drop-hint">PNG, JPG, WEBP hasta 10MB</div>
            </div>
          </div>
          <input type="file" id="s-img" accept="image/*" style="display:none" onchange="uploadSubmitImg(this.files[0])"/>
        </div>

        <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:var(--r);padding:14px;margin-bottom:18px;font-size:.82rem;color:var(--gold)">
          ⚠️ El admin revisará tu publicación antes de aprobarla. Puede tardar hasta 24 horas.
        </div>

        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="submitPost()">
          📤 Enviar para revisión
        </button>
      </div>
    </div>`);
}

let _submitImg = '';

async function uploadSubmitImg(file) {
  if (!file) return;
  const area = document.getElementById('s-img-area');
  area.innerHTML = `<div class="preview-wrap"><div class="prog-ov"><div class="prog-bar"><div class="prog-fill" id="sprog" style="width:0%"></div></div><span id="sprog-txt" style="color:#fff;font-size:.82rem">0%</span></div></div>`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', window.CLOUDINARY_PRESET);
  fd.append('folder', 'asmodeo-submissions');
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD}/image/upload`);
  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      const pct = Math.round(e.loaded / e.total * 100);
      const bar = document.getElementById('sprog');
      const txt = document.getElementById('sprog-txt');
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = pct + '%';
    }
  };
  xhr.onload = () => {
    if (xhr.status === 200) {
      _submitImg = JSON.parse(xhr.responseText).secure_url;
      area.innerHTML = `<div class="preview-wrap"><img src="${_submitImg}"/><button class="rm-img" onclick="_submitImg='';document.getElementById('s-img-area').innerHTML='<div class=drop-zone onclick=document.getElementById(s-img).click()><span class=drop-ico>📁</span><div class=drop-txt>Toca para subir imagen</div></div>'">✕</button></div>`;
      toast('Imagen subida ✅');
    } else {
      toast('Error al subir imagen', 'err');
    }
  };
  xhr.onerror = () => toast('Error de red', 'err');
  xhr.send(fd);
}

async function submitPost() {
  const title = document.getElementById('s-title')?.value?.trim();
  const category = document.getElementById('s-cat')?.value;
  const description = document.getElementById('s-desc')?.value?.trim();
  const downloadLink = document.getElementById('s-link')?.value?.trim() || '';

  if (!title || !description) return toast('Título y descripción son requeridos', 'err');
  if (downloadLink && tieneContenidoAdulto(downloadLink)) return toast('❌ No se permiten links de contenido adulto', 'err');
  if (tieneContenidoAdulto(description)) return toast('❌ Descripción contiene contenido no permitido', 'err');

  const u = window._currentUser;
  if (!u) return showLogin();

  try {
    const { db, collection, addDoc, serverTimestamp } = window._fb;
    await addDoc(collection(db, 'submissions'), {
      title, category, description, downloadLink,
      imageUrl: _submitImg,
      status: 'pending', // pending | approved | rejected
      submittedBy: u.uid,
      submittedByName: u.username || u.displayName || 'Usuario',
      submittedByEmail: u.email,
      createdAt: serverTimestamp()
    });
    _submitImg = '';
    toast('✅ Enviado para revisión. El admin lo revisará pronto.');
    goHome();
  } catch(e) {
    toast('Error al enviar: ' + e.message, 'err');
  }
}
