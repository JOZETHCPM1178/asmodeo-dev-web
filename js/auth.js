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
            ${u.isAdmin ? '<span class="badge b-admin">Admin</span>' : ''}
          </div>
          <button class="av-item" onclick="showProfile()">👤 Mi Perfil</button>
          <button class="av-item" onclick="showSubmitPost()">📤 Subir App</button>
          ${u.isAdmin ? '<button class="av-item" onclick="showAdmin()">🛡️ Panel Admin</button>' : ''}
          <button class="av-item red" onclick="doLogout()">🚪 Cerrar Sesión</button>
        </div>
      </div>`;
    if (mob) mob.innerHTML = `
      <button class="mob-link" onclick="showProfile()">👤 Mi Perfil</button>
      <button class="mob-link" onclick="showSubmitPost()">📤 Subir App</button>
      ${u.isAdmin ? '<button class="mob-link" onclick="showAdmin()">🛡️ Panel Admin</button>' : ''}`;
  } else {
    el.innerHTML = `
      <div class="auth-btns" style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="showLogin()">Entrar</button>
        <button class="btn btn-primary btn-sm" onclick="showRegister()">Registrarse</button>
      </div>`;
    if (mob) mob.innerHTML = `
      <button class="mob-link" onclick="showLogin()">🔑 Iniciar Sesión</button>
      <button class="mob-link" onclick="showRegister()">✨ Registrarse</button>`;
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
        <h1 class="auth-title2">Iniciar Sesión</h1>
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
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="doLogin()">🔑 Iniciar Sesión</button>
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
        <h1 class="auth-title2">Crear Cuenta</h1>
        <p class="auth-sub2">Únete a la comunidad</p>
        <button class="g-btn" onclick="loginGoogle()">${GOOGLE_SVG} Registrarse con Google</button>
        <div class="divider">o con tu correo</div>
        ${err ? `<div class="err-msg">${err}</div>` : ''}
        <div class="fg"><label class="lbl">Nombre de usuario</label><input class="inp" id="r-name" placeholder="Tu nombre o apodo"/></div>
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
  const { db, doc, getDoc } = window._fb;
  const snap = await getDoc(doc(db, 'users', u.uid));
  const data = snap.exists() ? snap.data() : {};
  const photo = data.photoURL || u.photoURL || avatarUrl(u.displayName);

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
          ${u.isAdmin ? '<span class="badge b-admin" style="margin-top:6px">🛡️ Admin</span>' : ''}
        </div>
        <div class="fg"><label class="lbl">Nombre de usuario</label><input class="inp" id="prof-username" value="${data.username || u.displayName || ''}"/></div>
        <div class="fg"><label class="lbl">Bio</label><textarea class="txta" id="prof-bio" rows="3" placeholder="Cuéntanos algo de ti...">${data.bio || ''}</textarea></div>
        <div class="fg"><label class="lbl">Seguidores mostrados en tu perfil</label><input class="inp" type="number" id="prof-followers" value="${data.fakeFollowers || 0}" min="0"/></div>
        <div class="fg"><label class="lbl">Seguidores (número visible en tu perfil)</label><input class="inp" type="number" id="prof-followers" value="${data.fakeFollowers || 0}" min="0"/></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="saveProfile()">💾 Guardar cambios</button>
        <div style="margin-top:16px;text-align:center">
          <a style="font-size:.8rem;color:var(--t3);cursor:pointer" onclick="showForgotPassword()">🔐 Cambiar contraseña</a>
        </div>
      </div>
    </div>`);
}

async function uploadProfilePhoto(file) {
  if (!file || !window._currentUser) return;
  toast('Subiendo foto...');
  try {
    const { storage, ref, uploadBytes, getDownloadURL, db, doc, updateDoc } = window._fb;
    const storageRef = ref(storage, `avatars/${window._currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateDoc(doc(db, 'users', window._currentUser.uid), { photoURL: url });
    await window._fb.updateProfile(window._fb.auth.currentUser, { photoURL: url });
    window._currentUser.photoURL = url;
    document.getElementById('prof-photo').src = url;
    toast('✅ Foto actualizada');
    renderNavAuth();
  } catch(e) {
    toast('Error subiendo foto', 'err');
  }
}

async function saveProfile() {
  const username = document.getElementById('prof-username')?.value?.trim();
  const bio = document.getElementById('prof-bio')?.value?.trim();
  if (!username) return toast('El nombre no puede estar vacío', 'err');
  try {
    const { db, doc, updateDoc, updateProfile, auth } = window._fb;
    const fakeFollowers = parseInt(document.getElementById('prof-followers')?.value || 0);
    await updateDoc(doc(db, 'users', window._currentUser.uid), { username, bio, fakeFollowers });
    await updateProfile(auth.currentUser, { displayName: username });
    window._currentUser.username = username;
    window._currentUser.bio = bio;
    toast('✅ Perfil actualizado');
    renderNavAuth();
  } catch(e) {
    toast('Error guardando perfil', 'err');
  }
}
