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
    const followerCount = await getFollowerCount(uid);
    const followingCount = await getFollowingCount(uid);

    // Posts del usuario
    const postsSnap = await getDocs(query(
      collection(db, 'posts'),
      where('submittedBy', '==', uid),
      orderBy('createdAt', 'desc')
    )).catch(() => ({ docs: [] }));
    const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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
                <div class="pstat"><span class="pstat-n">${followerCount}</span><span class="pstat-l">Seguidores</span></div>
                <div class="pstat"><span class="pstat-n">${followingCount}</span><span class="pstat-l">Siguiendo</span></div>
                <div class="pstat"><span class="pstat-n">${posts.length}</span><span class="pstat-l">Publicaciones</span></div>
              </div>
            </div>
            <div class="prof-pub-actions">
              ${isMe
                ? `<button class="btn btn-ghost btn-sm" onclick="showProfile()">✏️ Editar perfil</button>`
                : `<button class="btn ${isFollowing ? 'btn-ghost' : 'btn-primary'} btn-sm" id="follow-btn" onclick="toggleFollow('${uid}')">
                    ${isFollowing ? '✓ Siguiendo' : '+ Seguir'}
                  </button>`
              }
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
    if (btn) { btn.textContent = '+ Seguir'; btn.className = 'btn btn-primary btn-sm'; }
  } else {
    await setDoc(doc(db, 'follows', followId), {
      followerUid: myUid,
      targetUid,
      createdAt: new Date().toISOString()
    });
    toast('✅ Ahora sigues a este usuario');
    if (btn) { btn.textContent = '✓ Siguiendo'; btn.className = 'btn btn-ghost btn-sm'; }
  }
}
