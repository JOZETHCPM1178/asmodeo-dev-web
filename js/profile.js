// js/profile.js — Perfiles públicos, seguidores y filtro de contenido adulto

// ══════════════════════════════════════════
// FILTRO DE CONTENIDO ADULTO
// ══════════════════════════════════════════
const ADULT_DOMAINS = [
  'pornhub','xvideos','xnxx','xhamster','redtube','youporn','onlyfans',
  'brazzers','sex','porn','xxx','adult','nsfw','hentai','nude','naked',
  'lewd','erotic','fetish','milf','anal','escorts','cam4','chaturbate',
  'stripchat','bongacams','livejasmin','myfreecams'
];

function tieneContenidoAdulto(texto) {
  const lower = texto.toLowerCase();
  // Verificar dominios adultos en URLs
  const urlRegex = /https?:\/\/([^\s/]+)/gi;
  let match;
  while ((match = urlRegex.exec(lower)) !== null) {
    const domain = match[1];
    if (ADULT_DOMAINS.some(d => domain.includes(d))) return true;
  }
  // Verificar palabras clave explícitas
  const badWords = ['pornhub.com','xvideos.com','xnxx.com','onlyfans.com','xhamster.com'];
  return badWords.some(w => lower.includes(w));
}

// ══════════════════════════════════════════
// VER PERFIL DE USUARIO
// ══════════════════════════════════════════
async function showUserProfile(uid) {
  if (!uid) return;
  try {
    const { db, doc, getDoc, collection, query, where, getDocs, orderBy } = window._fb;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return toast('Usuario no encontrado', 'err');
    const u = snap.data();
    const photo = u.photoURL || avatarUrl(u.displayName);
    const isMe = window._currentUser?.uid === uid;
    const isFollowing = await checkFollowing(uid);
    const realFollowers = await getFollowerCount(uid);
    // Formato K/M para seguidores
    const fmtK = n => {
      if (!n) return '0';
      if (n >= 1000000) return (n/1000000).toFixed(n%1000000===0?0:1) + 'M';
      if (n >= 1000) return (n/1000).toFixed(n%1000===0?0:1) + 'K';
      return n.toString();
    };
    // Base de seguidores para el admin
    const isAdmin = u.role === 'admin' || u.email === window.ADMIN_EMAIL;
    const followerCount = isAdmin ? realFollowers + 10000 : realFollowers;
    const followingCount = await getFollowingCount(uid);

    // Posts del usuario - buscar por submittedBy Y authorId
    const [snap1, snap2] = await Promise.all([
      getDocs(query(collection(db, 'posts'), where('submittedBy', '==', uid))).catch(() => ({docs:[]})),
      getDocs(query(collection(db, 'posts'), where('authorId', '==', uid))).catch(() => ({docs:[]}))
    ]);
    const allIds = new Set();
    const posts = [...snap1.docs, ...snap2.docs]
      .filter(d => { if (allIds.has(d.id)) return false; allIds.add(d.id); return true; })
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    setMain(`
      <div class="container" style="max-width:700px;padding-top:32px;padding-bottom:80px">
        <!-- Perfil header -->
        <div class="prof-pub-card">
          <div class="prof-pub-banner"></div>
          <div class="prof-pub-body">
            <div class="prof-pub-av-wrap">
              <img src="${photo}" class="prof-pub-av" onerror="this.src='${avatarUrl(u.displayName)}'"/>
            </div>
            <div class="prof-pub-info">
              <div class="prof-pub-name">${u.username || u.displayName || 'Usuario'}</div>
              ${u.isAdmin || u.role === 'admin' ? '<span class="badge b-admin">🛡️ Admin</span>' : ''}
              ${u.bio ? `<div class="prof-pub-bio">${u.bio}</div>` : ''}
              <div class="prof-pub-stats">
                <div class="pstat"><span class="pstat-n">${fmtK(followerCount)}</span><span class="pstat-l">${(window._t&&window._t['followers'])||''}</span></div>
                <div class="pstat"><span class="pstat-n">${followingCount}</span><span class="pstat-l">${(window._t&&window._t['following'])||''}</span></div>
                <div class="pstat"><span class="pstat-n">${posts.length}</span><span class="pstat-l">${(window._t&&window._t['publications'])||''}</span></div>
              </div>
            </div>
            <div class="prof-pub-actions" style="display:flex;gap:8px;flex-wrap:wrap">
              ${isMe
                ? `<button class="btn btn-ghost btn-sm" onclick="showProfile()">✏️ Editar perfil</button>`
                : `<button class="btn ${isFollowing ? 'btn-ghost' : 'btn-primary'} btn-sm" id="follow-btn" onclick="toggleFollow('${uid}')">
                    ${isFollowing ? t('unfollow') : t('follow')}
                  </button>`
              }
              <button class="btn btn-ghost btn-sm" onclick="shareProfile('${uid}','${(u.username || u.displayName || '').replace(/'/g,"\\'")}')" style="font-size:.75rem">🔗 Compartir</button>
            </div>
          </div>
        </div>

        <!-- Posts del usuario -->
        ${posts.length > 0 ? `
          <div style="margin-top:24px">
            <div class="sec-head"><h2 class="sec-title" style="font-size:1rem">📦 Publicaciones de ${u.username || u.displayName}</h2></div>
            <div class="posts-grid">${posts.map((p, i) => postCardHTML(p, i)).join('')}</div>
          </div>` : `
          <div class="empty" style="margin-top:24px">
            <span class="empty-ico">📭</span>
            <h3>Sin publicaciones aún</h3>
          </div>`}
      </div>`);
  } catch(e) {
    toast('Error cargando perfil', 'err');
    console.error(e);
  }
}

// ══════════════════════════════════════════
// SISTEMA DE SEGUIDORES
// ══════════════════════════════════════════
async function checkFollowing(targetUid) {
  if (!window._currentUser) return false;
  const { db, doc, getDoc } = window._fb;
  try {
    const snap = await getDoc(doc(db, 'follows', `${window._currentUser.uid}_${targetUid}`));
    return snap.exists();
  } catch { return false; }
}

async function getFollowerCount(uid) {
  const { db, collection, query, where, getDocs } = window._fb;
  try {
    const snap = await getDocs(query(collection(db, 'follows'), where('targetUid', '==', uid)));
    return snap.size;
  } catch { return 0; }
}

async function getFollowingCount(uid) {
  const { db, collection, query, where, getDocs } = window._fb;
  try {
    const snap = await getDocs(query(collection(db, 'follows'), where('followerUid', '==', uid)));
    return snap.size;
  } catch { return 0; }
}

async function toggleFollow(targetUid) {
  if (!window._currentUser) return showLogin();
  const myUid = window._currentUser.uid;
  if (myUid === targetUid) return;
  const { db, doc, setDoc, deleteDoc } = window._fb;
  const followId = `${myUid}_${targetUid}`;
  const isFollowing = await checkFollowing(targetUid);
  const btn = document.getElementById('follow-btn');

  if (isFollowing) {
    await deleteDoc(doc(db, 'follows', followId));
    toast('Dejaste de seguir a este usuario');
    if (btn) { btn.textContent = t('follow'); btn.className = 'btn btn-primary btn-sm'; }
  } else {
    await setDoc(doc(db, 'follows', followId), {
      followerUid: myUid,
      targetUid,
      createdAt: new Date().toISOString()
    });
    toast('✅ Ahora sigues a este usuario');
    if (btn) { btn.textContent = t('unfollow'); btn.className = 'btn btn-ghost btn-sm'; }
  }
}

// ── Compartir perfil de usuario ──
function shareProfile(uid, name) {
  const url = `https://asmodeo-og.asmodeotayson.workers.dev/?user=${uid}`;
  if (navigator.share) {
    navigator.share({ title: `${name} — ASMODEO DEV`, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url)
      .then(() => toast('¡Link del perfil copiado! 🔗'))
      .catch(() => toast('Copia el link: ' + url));
  }
}
