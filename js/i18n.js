// js/i18n.js — Multi-idioma (ES / EN / PT)

const LANGS = {
  es: {
    name: '🇪🇸 ES', flag: '🇪🇸',
    login: 'Entrar', register: 'Registrarse', logout: 'Cerrar Sesión',
    profile: 'Mi Perfil', upload: 'Subir App', admin: 'Panel Admin',
    recent: '🔥 Lo más reciente', popular: '🏆 Más populares',
    noposts: 'Sin publicaciones aún', categories: 'Categorías',
    followers: 'Seguidores', following: 'Siguiendo', publications: 'Publicaciones',
    follow: '+ Seguir', unfollow: '✓ Siguiendo', edit_profile: '✏️ Editar perfil',
    save: '💾 Guardar cambios', download: '⬇️ Descargar', share: 'Compartir',
    comment_placeholder: 'Escribe un comentario...', publish_comment: 'Publicar comentario',
    login_to_comment: 'Inicia sesión para comentar', reply: '💬 Responder',
    platform_tag: '⚡ La plataforma más completa de mods',
    platform_desc: 'Descarga las mejores apps y juegos modificados. Gratis, actualizados y seguros.',
    all_free: '100% Gratis', no_wait: 'Sin espera', pubs: 'Publicaciones',
    btn_apk: '📱 APK Mod', btn_games: '🎮 Juegos', btn_scripts: '⚙️ Scripts', btn_tuts: '📚 Tutoriales',
    approve: '✅ Aprobar y publicar', reject: '❌ Rechazar',
    pending: '⏳ Pendiente', approved: '✅ Aprobado', rejected: '❌ Rechazado',
    review_tab: '📥 Revisión', users_tab: '👥 Usuarios', posts_tab: '📋 Posts', new_tab: '➕ Nueva',
    forgot: '¿Olvidaste tu contraseña?', send_reset: '📧 Enviar enlace',
    welcome: '¡Bienvenido de vuelta! 👋', registered: '¡Cuenta creada! Bienvenido 🎉',
    share_profile: '🔗 Compartir perfil'
  },
  en: {
    name: '🇺🇸 EN', flag: '🇺🇸',
    login: 'Login', register: 'Sign Up', logout: 'Logout',
    profile: 'My Profile', upload: 'Upload App', admin: 'Admin Panel',
    recent: '🔥 Latest', popular: '🏆 Most Popular',
    noposts: 'No posts yet', categories: 'Categories',
    followers: 'Followers', following: 'Following', publications: 'Posts',
    follow: '+ Follow', unfollow: '✓ Following', edit_profile: '✏️ Edit profile',
    save: '💾 Save changes', download: '⬇️ Download', share: 'Share',
    comment_placeholder: 'Write a comment...', publish_comment: 'Post comment',
    login_to_comment: 'Login to comment', reply: '💬 Reply',
    platform_tag: '⚡ The most complete mods platform',
    platform_desc: 'Download the best modified apps and games. Free, updated and safe.',
    all_free: '100% Free', no_wait: 'No wait', pubs: 'Publications',
    btn_apk: '📱 APK Mod', btn_games: '🎮 Games', btn_scripts: '⚙️ Scripts', btn_tuts: '📚 Tutorials',
    approve: '✅ Approve & publish', reject: '❌ Reject',
    pending: '⏳ Pending', approved: '✅ Approved', rejected: '❌ Rejected',
    review_tab: '📥 Review', users_tab: '👥 Users', posts_tab: '📋 Posts', new_tab: '➕ New',
    forgot: 'Forgot your password?', send_reset: '📧 Send link',
    welcome: 'Welcome back! 👋', registered: 'Account created! Welcome 🎉',
    share_profile: '🔗 Share profile'
  },
  pt: {
    name: '🇧🇷 PT', flag: '🇧🇷',
    login: 'Entrar', register: 'Cadastrar', logout: 'Sair',
    profile: 'Meu Perfil', upload: 'Enviar App', admin: 'Painel Admin',
    recent: '🔥 Mais recentes', popular: '🏆 Mais populares',
    noposts: 'Sem publicações ainda', categories: 'Categorias',
    followers: 'Seguidores', following: 'Seguindo', publications: 'Publicações',
    follow: '+ Seguir', unfollow: '✓ Seguindo', edit_profile: '✏️ Editar perfil',
    save: '💾 Salvar alterações', download: '⬇️ Baixar', share: 'Compartilhar',
    comment_placeholder: 'Escreva um comentário...', publish_comment: 'Publicar comentário',
    login_to_comment: 'Faça login para comentar', reply: '💬 Responder',
    platform_tag: '⚡ A plataforma mais completa de mods',
    platform_desc: 'Baixe os melhores apps e jogos modificados. Grátis, atualizados e seguros.',
    all_free: '100% Grátis', no_wait: 'Sem espera', pubs: 'Publicações',
    btn_apk: '📱 APK Mod', btn_games: '🎮 Jogos', btn_scripts: '⚙️ Scripts', btn_tuts: '📚 Tutoriais',
    approve: '✅ Aprovar e publicar', reject: '❌ Rejeitar',
    pending: '⏳ Pendente', approved: '✅ Aprovado', rejected: '❌ Rejeitado',
    review_tab: '📥 Revisão', users_tab: '👥 Usuários', posts_tab: '📋 Publicações', new_tab: '➕ Novo',
    forgot: 'Esqueceu sua senha?', send_reset: '📧 Enviar link',
    welcome: 'Bem-vindo de volta! 👋', registered: 'Conta criada! Bem-vindo 🎉',
    share_profile: '🔗 Compartilhar perfil'
  }
};

// Inicializar idioma
(function initLang() {
  const saved = localStorage.getItem('asmodeo_lang');
  const browser = (navigator.language || 'es').substring(0, 2);
  const detected = saved || (LANGS[browser] ? browser : 'es');
  window._lang = detected;
  window._t = LANGS[detected] || LANGS.es;
  document.documentElement.lang = detected;
})();

function t(key) {
  return (window._t && window._t[key]) || (LANGS.es[key]) || key;
}

function setLang(lang) {
  if (!LANGS[lang]) return;
  localStorage.setItem('asmodeo_lang', lang);
  window._lang = lang;
  window._t = LANGS[lang];
  document.documentElement.lang = lang;
  location.reload();
}

// Render selector de idioma en nav
function renderLangSelector() {
  const el = document.getElementById('lang-nav');
  if (!el) return;
  el.innerHTML = Object.entries(LANGS).map(([code, l]) => `
    <button onclick="setLang('${code}')" style="
      background:${window._lang === code ? 'rgba(124,58,237,.3)' : 'rgba(255,255,255,.07)'};
      border:1px solid ${window._lang === code ? 'var(--p)' : 'rgba(255,255,255,.1)'};
      color:var(--t1); border-radius:6px; padding:4px 8px; font-size:.72rem;
      cursor:pointer; transition:.2s">
      ${l.name}
    </button>`).join('');
}

window.addEventListener('authchange', renderLangSelector);
window.addEventListener('load', renderLangSelector);
