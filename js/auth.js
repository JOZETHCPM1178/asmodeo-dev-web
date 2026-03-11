// js/auth.js

window.addEventListener('authchange', renderNavAuth);

function renderNavAuth() {
  const u = window._currentUser;
  const el = document.getElementById('nav-auth');
  const mob = document.getElementById('mob-auth-links');
  if (!el) return;

  if (u) {
    const photo = u.photoURL || avatarUrl(u.displayName);
    el.innerHTML = `
      <div class="av-wrap">
        <button class="av-btn" onclick="toggleAvDrop()">
          <img src="${photo}" class="av-img" onerror="this.src='${avatarUrl(u.displayName)}'"/>
          <span>${(u.username || u.displayName || '').split(' ')[0]}</span>
          <span style="font-size:.7rem;color:var(--t3)">▾</span>
        </button>
        <div class="av-drop" id="av-drop" style="display:none">
          <div class="av-head">
            <div class="av-email">${u.email}</div>
            ${u.isAdmin ? `<span class='badge b-admin'>🛡️ ${u.customRole || 'Admin'}</span>` : u.isAdminJr ? `<span class='badge b-adminjr'>⚡ ${u.customRole || 'Admin Jr'}</span>` : ''}
          </div>
          <button class="av-item" onclick="showProfile()">${t('profile')}</button>
          <button class="av-item" onclick="showSubmitPost()">${t('upload')}</button>
          ${u.isAdmin || u.isAdminJr ? '<button class="av-item" onclick="showAdmin()">${t('admin')}</button>' : ''}
          <button class="av-item red" onclick="doLogout()">🚪 Cerrar Sesión</button>
        </div>
      </div>`;
    if (mob) mob.innerHTML = `
      <button class="mob-link" onclick="showProfile()">${t('profile')}</button>
      <button class="mob-link" onclick="showSubmitPost()">${t('upload')}</button>
      ${u.isAdmin || u.isAdminJr ? '<button class="mob-link" onclick="showAdmin()">${t('admin')}</button>' : ''}`;
  } else {
    el.innerHTML = `
      <div class="auth-btns" style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="showLogin()">${t('login')}</button>
        <button class="btn btn-primary btn-sm" onclick="showRegister()">${t('register')}</button>
      </div>`;
    if (mob) mob.innerHTML = `
      <button class="mob-link" onclick="showLogin()">${t('login')}</button>
      <button class="mob-link" onclick="showRegister()">${t('register')}</button>`;
  }
}

function toggleAvDrop() {
  const d = document.getElementById('av-drop');
  if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

async function doLogout() {
  await window._fb.signOut(window._fb.auth);
  toast('Sesión cerrada');
  goHome();
}

const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.8 29.3 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/><path fill="#FF3D00" d="M6.3 15.1L13 20c1.8-5 6.5-8.5 11-8.5 3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.8 29.3 5 24 5c-7.7 0-14.4 4.4-17.7 10.1z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-1.8 13.6-4.7l-6.3-5.2C29.3 36.8 26.8 38 24 38c-5.4 0-9.6-3.1-11.3-7.5L6 36c3.3 5.8 9.9 9 18 9z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.7-2.7 5-5.3 6.3l6.3 5.2C40.7 36.3 44 31 44 25c0-1.3-.1-2.7-.4-5z"/></svg>`;

function showLogin(err = '') {
  setMain(`
    <div class="auth-page">
      <div class="orb orb1" style="position:fixed"></div>
      <div class="orb orb2" style="position:fixed"></div>
      <div class="auth-card">
        <div class="auth-logo2"><span style="font-size:1.6rem">⚡</span><br><span class="logo-t">ASMODEO<b>DEV</b></span></div>
        <h1 class="auth-title2">${t('login')}</h1>
        <p class="auth-sub2">Accede a todo el contenido</p>
        <button class="g-btn" onclick="loginGoogle()">${GOOGLE_SVG} Continuar con Google</button>
        <div class="divider">o con tu correo</div>
        ${err ? `<div class="err-msg">${err}</div>` : ''}
        <div class="fg"><label class="lbl">Correo</label><input class="inp" type="email" id="l-email" placeholder="tu@correo.com"/></div>
        <div class="fg">
          <label class="lbl">Contraseña</label>
          <input class="inp" type="password" id="l-pass" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"/>
        </div>
        <div style="text-align:right;margin-bottom:14px">
          <a style="font-size:.8rem;color:var(--p);cursor:pointer" onclick="showForgotPassword()">¿Olvidaste tu contraseña?</a>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="doLogin()">${t('login')}</button>
        <div class="auth-foot">¿No tienes cuenta? <a onclick="showRegister()">Regístrate gratis</a></div>
      </div>
    </div>`);
}

function showForgotPassword(msg = '') {
  setMain(`
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo2"><span style="font-size:1.6rem">🔐</span><br><span class="logo-t">ASMODEO<b>DEV</b></span></div>
        <h1 class="auth-title2">Recuperar Contraseña</h1>
        <p class="auth-sub2">Te enviaremos un enlace a tu correo</p>
        ${msg ? `<div class="${msg.includes('error') ? 'err-msg' : 'ok-msg'}">${msg}</div>` : ''}
        <div class="fg"><label class="lbl">Correo</label><input class="inp" type="email" id="fp-email" placeholder="tu@correo.com"/></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="doForgotPassword()">📧 Enviar enlace</button>
        <div class="auth-foot"><a onclick="showLogin()">← Volver al inicio de sesión</a></div>
      </div>
    </div>`);
}

async function doForgotPassword() {
  const email = document.getElementById('fp-email')?.value?.trim();
  if (!email) return showForgotPassword('Ingresa tu correo');
  try {
    await window._fb.sendPasswordResetEmail(window._fb.auth, email);
    showForgotPassword('✅ Enlace enviado. Revisa tu correo (también el spam)');
  } catch(e) {
    showForgotPassword('error: Correo no encontrado o inválido');
  }
}

async function doLogin() {
  const email = document.getElementById('l-email')?.value?.trim();
  const pass = document.getElementById('l-pass')?.value;
  if (!email || !pass) return showLogin('Completa todos los campos');
  try {
    await window._fb.signInWithEmailAndPassword(window._fb.auth, email, pass);
    toast('¡Bienvenido de vuelta! 👋');
    goHome();
  } catch {
    showLogin('Correo o contraseña incorrectos');
  }
}

async function loginGoogle() {
  try {
    const provider = new window._fb.GoogleAuthProvider();
    const result = await window._fb.signInWithPopup(window._fb.auth, provider);
    const u = result.user;
    const { db, doc, getDoc, setDoc } = window._fb;
    const snap = await getDoc(doc(db, 'users', u.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', u.uid), {
        uid: u.uid, email: u.email, displayName: u.displayName,
        username: u.displayName,
        role: u.email === window.ADMIN_EMAIL ? 'admin' : 'user',
        createdAt: new Date().toISOString(), photoURL: u.photoURL
      });
    }
    toast('¡Sesión iniciada! 🎉');
    goHome();
  } catch {
    toast('Error al iniciar con Google', 'err');
  }
}

function showRegister(err = '') {
  setMain(`
    <div class="auth-page">
      <div class="orb orb1" style="position:fixed"></div>
      <div class="orb orb2" style="position:fixed"></div>
      <div class="auth-card">
        <div class="auth-logo2"><span style="font-size:1.6rem">⚡</span><br><span class="logo-t">ASMODEO<b>DEV</b></span></div>
        <h1 class="auth-title2">${t('register')}</h1>
        <p class="auth-sub2">Únete a la comunidad</p>
        <button class="g-btn" onclick="loginGoogle()">${GOOGLE_SVG} Registrarse con Google</button>
        <div class="divider">o con tu correo</div>
        ${err ? `<div class="err-msg">${err}</div>` : ''}
        <div class="fg"><label class="lbl">Username</label><input class="inp" id="r-name" placeholder="Tu nombre o apodo"/></div>
        <div class="fg"><label class="lbl">Correo</label><input class="inp" type="email" id="r-email" placeholder="tu@correo.com"/></div>
        <div class="fg"><label class="lbl">Contraseña</label><input class="inp" type="password" id="r-pass" placeholder="Mínimo 6 caracteres"/></div>
        <div class="fg"><label class="lbl">Confirmar</label><input class="inp" type="password" id="r-pass2" placeholder="••••••••" onkeydown="if(event.key==='Enter')doRegister()"/></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="doRegister()">✨ Crear Cuenta Gratis</button>
        <div class="auth-foot">¿Ya tienes cuenta? <a onclick="showLogin()">Inicia sesión</a></div>
      </div>
    </div>`);
}

async function doRegister() {
  const name = document.getElementById('r-name')?.value?.trim();
  const email = document.getElementById('r-email')?.value?.trim();
  const pass = document.getElementById('r-pass')?.value;
  const pass2 = document.getElementById('r-pass2')?.value;
  if (!name || !email || !pass) return showRegister('Completa todos los campos');
  if (pass !== pass2) return showRegister('Las contraseñas no coinciden');
  if (pass.length < 6) return showRegister('Mínimo 6 caracteres');
  try {
    const { auth, createUserWithEmailAndPassword, updateProfile, db, doc, setDoc } = window._fb;
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid, email, displayName: name, username: name,
      role: email === window.ADMIN_EMAIL ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
      photoURL: avatarUrl(name)
    });
    toast('¡Cuenta creada! Bienvenido 🎉');
    goHome();
  } catch (e) {
    const msg = e.code === 'auth/email-already-in-use' ? 'Este correo ya está registrado' : 'Error al crear la cuenta';
    showRegister(msg);
  }
}

// ── Perfil de usuario ──
async function showProfile() {
  const u = window._currentUser;
  if (!u) return showLogin();
  const { db, doc, getDoc, collection, query, where, getDocs } = window._fb;
  const snap = await getDoc(doc(db, 'users', u.uid));
  const data = snap.exists() ? snap.data() : {};
  const photo = data.photoURL || u.photoURL || avatarUrl(u.displayName);

  // Contar seguidores y siguiendo
  const [follSnap, ingSnap] = await Promise.all([
    getDocs(query(collection(db, 'follows'), where('targetUid', '==', u.uid))),
    getDocs(query(collection(db, 'follows'), where('followerUid', '==', u.uid)))
  ]);
  const totalFollowers = (data.fakeFollowers || 0) + follSnap.size;
  const totalFollowing = ingSnap.size;

  setMain(`
    <div class="container" style="max-width:600px;padding-top:40px;padding-bottom:80px">
      <div class="auth-card" style="margin:0">
        <div style="text-align:center;margin-bottom:24px">
          <div style="position:relative;display:inline-block">
            <img src="${photo}" id="prof-photo" style="width:90px;height:90px;border-radius:50%;border:3px solid var(--p);object-fit:cover" onerror="this.src='${avatarUrl(u.displayName)}'"/>
            <button onclick="document.getElementById('prof-img-inp').click()" style="position:absolute;bottom:0;right:0;width:28px;height:28px;border-radius:50%;background:var(--p);border:none;color:#fff;cursor:pointer;font-size:.8rem">✏️</button>
            <input type="file" id="prof-img-inp" accept="image/*" style="display:none" onchange="uploadProfilePhoto(this.files[0])"/>
          </div>
          <div style="margin-top:10px;font-family:var(--font1);font-size:.9rem">${data.username || u.displayName}</div>
          <div style="font-size:.78rem;color:var(--t3)">${u.email}</div>
          ${u.isAdmin ? `<span class='badge b-admin' style='margin-top:6px'>🛡️ ${data.customRole || 'Admin'}</span>` : u.isAdminJr ? `<span class='badge b-adminjr' style='margin-top:6px'>⚡ ${data.customRole || 'Admin Jr'}</span>` : ''}
        </div>

        <!-- Stats de seguidores -->
        <div style="display:flex;justify-content:center;gap:32px;margin-bottom:24px;padding:16px;background:rgba(255,255,255,.04);border-radius:12px;border:1px solid var(--bord)">
          <div style="text-align:center;cursor:pointer" onclick="showMyFollowers('${u.uid}')">
            <div style="font-family:var(--font1);font-size:1.4rem;font-weight:700;color:var(--p)">${totalFollowers}</div>
            <div style="font-size:.75rem;color:var(--t3)">${t('followers')}</div>
          </div>
          <div style="width:1px;background:var(--bord)"></div>
          <div style="text-align:center;cursor:pointer" onclick="showMyFollowing('${u.uid}')">
            <div style="font-family:var(--font1);font-size:1.4rem;font-weight:700;color:var(--a)">${totalFollowing}</div>
            <div style="font-size:.75rem;color:var(--t3)">${t('following')}</div>
          </div>
        </div>

        <div class="fg"><label class="lbl">Username</label><input class="inp" id="prof-username" value="${data.username || u.displayName || ''}"/></div>
        <div class="fg"><label class="lbl">Bio</label><textarea class="txta" id="prof-bio" rows="3" placeholder="Cuéntanos algo de ti...">${data.bio || ''}</textarea></div>

        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="saveProfile()">${t('save')}</button>
        <div style="margin-top:16px;text-align:center">
          <a style="font-size:.8rem;color:var(--t3);cursor:pointer" onclick="showForgotPassword()">🔐 Cambiar contraseña</a>
        </div>
      </div>
    </div>`);
}

// ── Ver lista de seguidores propios ──
async function showMyFollowers(uid) {
  const { db, collection, query, where, getDocs, doc, getDoc } = window._fb;
  const snap = await getDocs(query(collection(db, 'follows'), where('targetUid', '==', uid)));
  if (snap.empty) return toast('Aún no tienes seguidores 😢');
  const users = await Promise.all(snap.docs.map(async d => {
    const uSnap = await getDoc(doc(db, 'users', d.data().followerUid)).catch(() => null);
    return uSnap?.exists() ? { id: uSnap.id, ...uSnap.data() } : null;
  }));
  const valid = users.filter(Boolean);
  showUserListModal('Tus seguidores', valid);
}

// ── Ver lista de a quién sigues ──
async function showMyFollowing(uid) {
  const { db, collection, query, where, getDocs, doc, getDoc } = window._fb;
  const snap = await getDocs(query(collection(db, 'follows'), where('followerUid', '==', uid)));
  if (snap.empty) return toast('No sigues a nadie aún 😢');
  const users = await Promise.all(snap.docs.map(async d => {
    const uSnap = await getDoc(doc(db, 'users', d.data().targetUid)).catch(() => null);
    return uSnap?.exists() ? { id: uSnap.id, ...uSnap.data() } : null;
  }));
  const valid = users.filter(Boolean);
  showUserListModal('Siguiendo', valid);
}

// ── Modal con lista de usuarios ──
function showUserListModal(title, users) {
  const existing = document.getElementById('user-list-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'user-list-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="background:var(--c2);border-radius:var(--r2);border:1px solid var(--bord);width:100%;max-width:400px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--bord)">
        <span style="font-family:var(--font1);font-size:.95rem;font-weight:700">${title} (${users.length})</span>
        <button onclick="document.getElementById('user-list-modal').remove()" style="background:none;border:none;color:var(--t2);font-size:1.2rem;cursor:pointer">✕</button>
      </div>
      <div style="overflow-y:auto;padding:12px">
        ${users.map(u => `
          <div onclick="document.getElementById('user-list-modal').remove();showUserProfile('${u.id}')"
            style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;cursor:pointer;transition:.2s"
            onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='none'">
            <img src="${u.photoURL || avatarUrl(u.displayName)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='${avatarUrl(u.displayName)}'"/>
            <div>
              <div style="font-weight:600;font-size:.9rem">${u.username || u.displayName || 'Usuario'}</div>
              ${u.bio ? `<div style="font-size:.75rem;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px">${u.bio}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function uploadProfilePhoto(file) {
  if (!file || !window._currentUser) return;
  toast('Subiendo foto...');
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', window.CLOUDINARY_PRESET);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD}/image/upload`,
      { method: 'POST', body: fd }
    );
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    const url = json.secure_url;
    const { db, doc, updateDoc, updateProfile, auth } = window._fb;
    await updateDoc(doc(db, 'users', window._currentUser.uid), { photoURL: url });
    if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url });
    window._currentUser.photoURL = url;
    const el = document.getElementById('prof-photo');
    if (el) el.src = url + '?t=' + Date.now();
    renderNavAuth();
    toast('✅ Foto actualizada');
  } catch(e) {
    console.error('uploadProfilePhoto error:', e);
    toast('Error subiendo foto: ' + e.message, 'err');
  }
}

async function saveProfile() {
  const username = document.getElementById('prof-username')?.value?.trim();
  const bio = document.getElementById('prof-bio')?.value?.trim() || '';
  if (!username) return toast('El nombre no puede estar vacío', 'err');
  try {
    const { db, doc, updateDoc, updateProfile, auth } = window._fb;
    await updateDoc(doc(db, 'users', window._currentUser.uid), { username, bio, displayName: username });
    if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: username });
    window._currentUser.username = username;
    window._currentUser.displayName = username;
    window._currentUser.bio = bio;
    toast('✅ Perfil actualizado');
    renderNavAuth();
    setTimeout(() => showProfile(), 400);
  } catch(e) {
    console.error('saveProfile error:', e);
    toast('Error guardando perfil: ' + e.message, 'err');
  }
}
