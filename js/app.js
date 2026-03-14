// ── OneSignal init ──
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: "57488b36-1bd3-4f46-9d9b-2729c0055a23",
    serviceWorkerParam: { scope: "/" },
    notifyButton: { enable: false },
    allowLocalhostAsSecureOrigin: false,
  });
  if (typeof updateNotifBtn === 'function') setTimeout(updateNotifBtn, 500);
  if (typeof saveOneSignalId === 'function') setTimeout(saveOneSignalId, 3000);

  // Escuchar cambios de suscripción
  OneSignal.User.PushSubscription.addEventListener('change', () => {
    if (typeof updateNotifBtn === 'function') updateNotifBtn();
    if (typeof saveOneSignalId === 'function') saveOneSignalId();
  });
});

// js/app.js

// ─── SOLUCIÓN AL ERROR AL CARGAR ───
// Espera a que Firebase esté listo antes de mostrar la página.
// Antes cargaba antes de que Firebase inicializara → Error al cargar.

let _appIniciado = false;

function iniciarApp() {
  if (_appIniciado) return;
  _appIniciado = true;
  renderNavAuth();
  handleURL();
  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => handleURL());
}

// Cuando Firebase confirme el estado de auth → iniciar
window.addEventListener('authchange', iniciarApp);

// Respaldo: si tarda más de 4 segundos, iniciar igual
setTimeout(iniciarApp, 4000);

// ─── COMPARTIR PUBLICACIÓN ───
// Genera el link exacto ?post=ID para que llegue a la publicación correcta
function compartirPost(id, title) {
  const url = `https://asmodeo-og.asmodeotayson.workers.dev/?post=${encodeURIComponent(id)}`;
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url)
      .then(() => toast('¡Enlace copiado! 🔗'))
      .catch(() => { prompt('Copia este enlace:', url); });
  }
}

// ─── MANEJO DE URL ───
// Lee ?post=ID o ?cat=X de la URL para abrir la publicación correcta
function handleURL() {
  const params = new URLSearchParams(location.search);
  const postId = params.get('post');
  const cat = params.get('cat');
  const userId = params.get('user');
  if (postId) showPost(postId);
  else if (cat) showCat(cat);
  else if (userId) showUserProfile(userId);
  else goHome();
}

// Actualizar botón notificaciones al cargar
window.addEventListener('authchange', () => {
  setTimeout(() => {
    if (typeof updateNotifBtn === 'function') updateNotifBtn();
  }, 500);
});
