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
          <span>${(u.displayName || '').split(' ')[0]}</span>
          <span style="font-size:.7rem;color:var(--t3)">▾</span>
        </button>
        <div class="av-drop" id="av-drop" style="display:none">
          <div class="av-head">
            <div class="av-email">${u.email}</div>
            ${u.isAdmin ? '<span class="badge b-admin">Admin</span>' : ''}
          </div>
          ${u.isAdmin ? '<button class="av-item" onclick="showAdmin()">🛡️ Panel Admin</button>' : ''}
          <button class="av-item red" onclick="doLogout()">🚪 Cerrar Sesión</button>
        </div>
      </div>`;
    if (mob) mob.innerHTML = u.isAdmin
      ? `<button class="mob-link" onclick="showAdmin()">🛡️ Panel Admin</button>` : '';
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
        <div class="fg"><label class="lbl">Contraseña</label><input class="inp" type="password" id="l-pass" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"/></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="doLogin()">🔑 Iniciar Sesión</button>
        <div class="auth-foot">¿No tienes cuenta? <a onclick="showRegister()">Regístrate gratis</a></div>
      </div>
    </div>`);
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
        <div class="fg"><label class="lbl">Nombre</label><input class="inp" id="r-name" placeholder="Tu nombre"/></div>
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
      uid: result.user.uid, email, displayName: name,
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
