// js/posts.js

async function goHome() {
  // Limpiar URL al volver al inicio
  history.pushState({page:'home'}, '', location.pathname);

  setMain(`
    <section id="hero">
      <div class="hero-bg"><div class="orb orb1"></div><div class="orb orb2"></div><div class="grid-bg"></div></div>
      <div class="hero-inner fu">
        <div class="hero-pill">${(window._t&&window._t['platform_tag'])||''}</div>
        <h1 class="hero-title">ASMODEO<b>DEV</b></h1>
        <p class="hero-sub">APK Mod · Juegos · Scripts · Tutoriales</p>
        <p class="hero-desc">${(window._t&&window._t['platform_desc'])||''}</p>
        <div class="hero-btns">
          <button class="btn btn-primary" onclick="showCat('apk')">${(window._t&&window._t['btn_apk'])||''}</button>
          <button class="btn btn-ghost" onclick="showCat('games')">${(window._t&&window._t['btn_games'])||''}</button>
          <button class="btn btn-ghost" onclick="showCat('script')">${(window._t&&window._t['btn_scripts'])||''}</button>
          <button class="btn btn-ghost" onclick="showCat('tutorials')">${(window._t&&window._t['btn_tuts'])||''}</button>
        </div>
        <div class="hero-stats">
          <div><span class="stat-n" id="st-posts">...</span><span class="stat-l">${(window._t&&window._t['pubs'])||''}</span></div>
          <div class="stat-div"></div>
          <div><span class="stat-n">100%</span><span class="stat-l">${(window._t&&window._t['all_free'])||''}</span></div>
          <div class="stat-div"></div>
          <div><span class="stat-n">0</span><span class="stat-l">${(window._t&&window._t['no_wait'])||''}</span></div>
        </div>
      </div>
    </section>

    <section class="sec">
      <div class="container">
        <div class="sec-head"><h2 class="sec-title">🗂️ ${(window._t&&window._t['categories'])||''}</h2><p class="sec-sub">Explora todo el contenido</p></div>
        <div class="cat-grid">
          ${Object.entries(window.CATS).map(([id, cat]) => `
            <div class="cat-card" onclick="showCat('${id}')">
              <div class="cat-ico" style="background:${cat.bg};border:1px solid ${cat.border}">${cat.icon}</div>
              <div><div class="cat-name">${cat.label}</div><div class="cat-desc">Ver publicaciones</div></div>
              <div class="cat-arr">→</div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="sec">
      <div class="container">
        <div class="sec-head"><h2 class="sec-title">${(window._t&&window._t['popular'])||''}</h2><p class="sec-sub">Las apps con más likes</p></div>
        <div id="popular-posts"><div style="text-align:center;padding:30px"><div class="spin"></div></div></div>
      </div>
    </section>

    <section class="sec sec-dark">
      <div class="container">
        <div class="sec-head"><h2 class="sec-title">${(window._t&&window._t['recent'])||'🔥 Lo más reciente'}</h2></div>
        <div id="home-posts"><div style="text-align:center;padding:50px"><div class="spin"></div></div></div>
      </div>
    </section>`);

  cargarHomePosts();
  cargarPopulares();
}

// ─── CARGAR POSTS CON REINTENTOS ───
// Reintenta hasta 5 veces con 1.5s entre intentos
// Funciona sin necesidad de iniciar sesión
function cargarHomePosts() {
  let n = 0;
  const intentar = async () => {
    n++;
    try {
      if (!window._fb) throw new Error('Firebase no listo');
      const { db, collection, query, orderBy, getDocs } = window._fb;
      const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const el = document.getElementById('st-posts');
      if (el) el.textContent = posts.length + '+';
      const grid = document.getElementById('home-posts');
      if (!grid) return;
      if (posts.length === 0) {
        grid.innerHTML = `<div class="empty"><span class="empty-ico">📭</span><h3>Sin publicaciones aún</h3></div>`;
        return;
      }
      // Carousel - show 5 at a time, swipeable
      grid.innerHTML = `<div class="posts-grid">${posts.map((p, i) => postCardHTML(p, i)).join('')}</div>`;
    } catch (e) {
      if (n < 5) {
        setTimeout(intentar, 1500);
      } else {
        const grid = document.getElementById('home-posts');
        if (grid) grid.innerHTML = `<div class="empty">
          <span class="empty-ico">⚠️</span><h3>Error al cargar</h3>
          <p style="margin-top:12px"><button class="btn btn-primary btn-sm" onclick="cargarHomePosts()">🔄 Reintentar</button></p>
        </div>`;
      }
    }
  };
  intentar();
}

async function showCat(cat) {
  history.replaceState({}, '', `${location.pathname}?cat=${cat}`);
  const c = window.CATS[cat];
  setMain(`
    <div class="cat-hero" style="background:radial-gradient(ellipse at center,${c.bg} 0%,transparent 70%)">
      <div class="grid-bg" style="position:absolute;inset:0"></div>
      <div style="position:relative">
        <span class="cat-hero-ico">${c.icon}</span>
        <h1 class="cat-hero-title">${c.label}</h1>
        <p class="cat-hero-desc">Las mejores publicaciones de ${c.label}</p>
        <span class="cat-count" id="cat-count">Cargando...</span>
      </div>
    </div>
    <div class="container" style="padding-top:24px;padding-bottom:80px">
      <div class="search-wrap">
        <input class="inp" id="cat-search" placeholder="Buscar en ${c.label}..." oninput="filterCat()" style="padding-left:18px"/>
        <button class="search-x" onclick="document.getElementById('cat-search').value='';filterCat()">✕</button>
      </div>
      <div id="cat-posts"><div style="text-align:center;padding:50px"><div class="spin"></div></div></div>
    </div>`);

  cargarCategoria(cat);
}

function cargarCategoria(cat) {
  let n = 0;
  const intentar = async () => {
    n++;
    try {
      if (!window._fb) throw new Error('Firebase no listo');
      const { db, collection, query, orderBy, where, getDocs } = window._fb;
      const snap = await getDocs(query(
        collection(db, 'posts'),
        where('category', '==', cat),
        orderBy('createdAt', 'desc')
      ));
      window._catPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const cc = document.getElementById('cat-count');
      if (cc) cc.textContent = window._catPosts.length + ' publicaciones';
      renderCatPosts();
    } catch (e) {
      if (n < 5) {
        setTimeout(intentar, 1500);
      } else {
        const el = document.getElementById('cat-posts');
        if (el) el.innerHTML = `<div class="empty">
          <span class="empty-ico">⚠️</span><h3>Error al cargar</h3>
          <p style="margin-top:12px"><button class="btn btn-primary btn-sm" onclick="cargarCategoria('${cat}')">🔄 Reintentar</button></p>
        </div>`;
      }
    }
  };
  intentar();
}

function filterCat() {
  const q = (document.getElementById('cat-search')?.value || '').toLowerCase();
  const filtered = (window._catPosts || []).filter(p =>
    p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  renderCatPosts(filtered);
}

function renderCatPosts(list) {
  const posts = list || window._catPosts || [];
  const el = document.getElementById('cat-posts');
  if (!el) return;
  el.innerHTML = posts.length === 0
    ? `<div class="empty"><span class="empty-ico">🔍</span><h3>Sin resultados</h3></div>`
    : `<div class="posts-grid">${posts.map((p, i) => postCardHTML(p, i)).join('')}</div>`;
}

async function showPost(id) {
  // ─── SOLUCIÓN COMPARTIR ───
  // Pone el ID en la URL para que al compartir llegue a esta publicación
  history.pushState({page:'post', id}, '', `${location.pathname}?post=${id}`);

  setMain(`<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding-top:80px"><div class="spin"></div></div>`);

  let n = 0;
  const intentar = async () => {
    n++;
    try {
      if (!window._fb) throw new Error('Firebase no listo');
      const { db, doc, getDoc } = window._fb;
      const snap = await getDoc(doc(db, 'posts', id));
      if (!snap.exists()) {
        setMain(`<div class="empty" style="padding-top:120px">
          <span class="empty-ico">🔍</span><h3>No encontrado</h3>
          <button class="btn btn-primary" onclick="goHome()" style="margin-top:16px">Inicio</button>
        </div>`);
        return;
      }
      const p = { id: snap.id, ...snap.data() };
      const c = window.CATS[p.category] || window.CATS.apk;
      const u = window._currentUser;

      // Load author photo and follow status
      const authorUid = p.submittedBy || p.authorId;
      if (authorUid) {
        try {
          const { doc: fbDoc, getDoc: fbGet } = window._fb;
          const authorSnap = await fbGet(fbDoc(db, 'users', authorUid));
          if (authorSnap.exists()) {
            const ad = authorSnap.data();
            p._authorPhoto = ad.photoURL || avatarUrl(ad.username || 'u');
            p.submittedByName = ad.username || p.submittedByName || 'Usuario';
          }
          if (u && u.uid !== authorUid) {
            const fSnap = await fbGet(fbDoc(db, 'follows', `${u.uid}_${authorUid}`)).catch(() => null);
            p._isFollowing = fSnap?.exists() || false;
          }
        } catch(e) {}
      }

      // Actualizar meta tags para compartir con miniatura de la publicación
      const postImg = p.imageUrl || (location.origin + '/icon-512x512.png');
      const postUrl = location.origin + location.pathname + '?post=' + id;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogImg = document.querySelector('meta[property="og:image"]');
      const ogUrl = document.querySelector('meta[property="og:url"]');
      const twImg = document.querySelector('meta[name="twitter:image"]');
      if (ogTitle) ogTitle.setAttribute('content', p.title + ' — ASMODEO DEV');
      if (ogImg) ogImg.setAttribute('content', postImg);
      if (ogUrl) ogUrl.setAttribute('content', postUrl);
      if (twImg) twImg.setAttribute('content', postImg);
      document.title = p.title + ' — ASMODEO DEV';

      setMain(`
        <div>
          <div class="detail-hero">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}">` : `<div class="detail-hero-ph">${c.icon}</div>`}
            <div class="detail-hero-ov"></div>
            <div class="detail-hero-info">
              <span class="badge ${c.bc}">${c.icon} ${c.label}</span>
              <h1 class="detail-title">${p.title || ''}</h1>
              <div style="margin-top:8px;color:var(--t3);font-size:.85rem">🗓 ${fmtDate(p.createdAt)}</div>
            </div>
          </div>
          <div class="detail-body">
            <div>
              ${u?.isAdmin ? `
                <div class="admin-bar">
                  <span class="admin-bar-lbl">🛡️ Admin</span>
                  <button class="btn btn-ghost btn-sm" onclick="editPost('${id}')">✏️ Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="deletePost('${id}')">🗑️ Eliminar</button>
                </div>` : ''}
              ${(p.submittedBy || p.authorId) ? `
              <div style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(255,255,255,.04);border-radius:12px;border:1px solid var(--bord);margin-bottom:16px;cursor:pointer" onclick="showUserProfile('${p.submittedBy || p.authorId}')">
                <img src="${p._authorPhoto || avatarUrl(p.submittedByName||'user')}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='${avatarUrl(p.submittedByName||'u')}'"/>
                <div style="flex:1">
                  <div style="font-size:.8rem;color:var(--t3)">Publicado por</div>
                  <div style="font-weight:700;font-size:.9rem">${p.submittedByName || 'Usuario'}</div>
                </div>
                ${u && u.uid !== (p.submittedBy||p.authorId) ? `<button class="btn ${p._isFollowing?'btn-ghost':'btn-primary'} btn-sm" onclick="event.stopPropagation();followFromPost('${p.submittedBy||p.authorId}',this)" style="flex-shrink:0;font-size:.75rem">${p._isFollowing?'✓ Siguiendo':'+ Seguir'}</button>` : ''}
              </div>` : ''}
              <h3 style="font-family:var(--font1);font-size:.85rem;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">📋 Descripción</h3>
              <div class="detail-desc">${(p.description || '').replace(/\n/g, '<br>')}</div>
              ${p.downloadLink ? `
                <a href="${p.downloadLink}" target="_blank" rel="noopener" class="dl-btn">
                  <span class="dl-ico">⬇️</span>
                  <div><div class="dl-lbl">DESCARGAR AHORA</div><div class="dl-sub">Enlace directo y seguro</div></div>
                  <span class="dl-arr">→</span>
                </a>
                <a href="https://www.virustotal.com/gui/url/${btoa(p.downloadLink)}" target="_blank" rel="noopener" class="vt-btn">
                  🔬 Escanear con VirusTotal
                </a>` : ''}
              <button class="share-btn2" style="width:100%;box-sizing:border-box" onclick="compartirPost('${id}','${(p.title||'').replace(/'/g,"\\'")}')">
                🔗 Compartir esta publicación
              </button>
              <div id="comments-root"></div>
            </div>
            <div>
              <div class="sidebar-card">
                <div class="s-title">ℹ️ INFORMACIÓN</div>
                <div class="s-row"><span class="key">Categoría</span><span class="badge ${c.bc}">${c.icon} ${c.label}</span></div>
                <div class="s-row"><span class="key">Fecha</span><span>${fmtDate(p.createdAt)}</span></div>
                <div class="s-row"><span class="key">Comentarios</span><span>💬 ${p.commentCount || 0}</span></div>
              </div>
              <div class="sidebar-card">
                <div class="s-title">⚠️ AVISO</div>
                <p class="s-note">Solo para fines educativos. Úsalo bajo tu responsabilidad.</p>
              </div>
              <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="history.back()">← Volver atrás</button>
            </div>
          </div>
        </div>`);

      renderComments(id);
    } catch (e) {
      if (n < 5) {
        setTimeout(intentar, 1500);
      } else {
        setMain(`<div class="empty" style="padding-top:120px">
          <span class="empty-ico">⚠️</span><h3>Error al cargar</h3>
          <button class="btn btn-primary" onclick="goHome()" style="margin-top:16px">Inicio</button>
        </div>`);
      }
    }
  };
  intentar();
}

async function deletePost(id) {
  if (!window._currentUser?.isAdmin) return;
  if (!confirm('¿Eliminar esta publicación?')) return;
  const { db, doc, deleteDoc } = window._fb;
  await deleteDoc(doc(db, 'posts', id));
  toast('Publicación eliminada');
  goHome();
}

// ── Cargar posts más populares (más likes) ──
async function cargarPopulares() {
  const el = document.getElementById('popular-posts');
  if (!el) return;
  try {
    if (!window._fb) return;
    const { db, collection, query, orderBy, limit, getDocs } = window._fb;
    const snap = await getDocs(query(
      collection(db, 'posts'),
      orderBy('likes', 'desc'),
      limit(6)
    ));
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => (p.likes || 0) > 0);
    if (!posts.length) {
      el.innerHTML = `<p style="text-align:center;color:var(--t3);padding:20px;font-size:.85rem">Aún no hay likes — ¡sé el primero! ❤️</p>`;
      return;
    }
    el.innerHTML = `<div class="posts-grid">${posts.map((p, i) => postCardHTML(p, i)).join('')}</div>`;
  } catch(e) {
    el.innerHTML = '';
  }
}

// ── Carousel para publicaciones recientes ──
let _carouselIndex = 0;

function initCarousel() {
  const track = document.getElementById('carousel-track');
  if (!track) return;
  _carouselIndex = 0;

  // Touch swipe support
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
  }, { passive: true });
}

function goToSlide(idx) {
  const track = document.getElementById('carousel-track');
  const items = track?.querySelectorAll('.carousel-item');
  if (!track || !items) return;
  const perPage = window.innerWidth < 600 ? 1 : 2;
  const maxIdx = Math.ceil(items.length / perPage) - 1;
  _carouselIndex = Math.max(0, Math.min(idx, maxIdx));
  const offset = _carouselIndex * (100 / Math.ceil(items.length / perPage));
  // Move track
  track.style.transform = `translateX(-${_carouselIndex * (window.innerWidth < 600 ? 100 : 50)}%)`;
  // Update dots
  document.querySelectorAll('.cdot').forEach((d, i) => d.classList.toggle('active', i === _carouselIndex));
}

function nextSlide() {
  const dots = document.querySelectorAll('.cdot');
  goToSlide(_carouselIndex + 1 < dots.length ? _carouselIndex + 1 : 0);
}

function prevSlide() {
  const dots = document.querySelectorAll('.cdot');
  goToSlide(_carouselIndex - 1 >= 0 ? _carouselIndex - 1 : dots.length - 1);
}

// ── Follow desde publicación ──
async function followFromPost(targetUid, btn) {
  if (!window._currentUser) return showLogin();
  if (window._currentUser.uid === targetUid) return;
  const { db, doc, setDoc, deleteDoc } = window._fb;
  const followId = `${window._currentUser.uid}_${targetUid}`;
  const isFollowing = btn.textContent.includes('Siguiendo');
  if (isFollowing) {
    await deleteDoc(doc(db, 'follows', followId));
    btn.textContent = '+ Seguir';
    btn.className = 'btn btn-primary btn-sm';
    toast('Dejaste de seguir');
  } else {
    await setDoc(doc(db, 'follows', followId), {
      followerUid: window._currentUser.uid,
      targetUid,
      createdAt: new Date().toISOString()
    });
    btn.textContent = '✓ Siguiendo';
    btn.className = 'btn btn-ghost btn-sm';
    toast('✅ Ahora sigues a este usuario');
  }
}
