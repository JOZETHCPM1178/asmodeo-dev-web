// js/stats.js — Panel de estadísticas, visitas, descargas, ranking usuarios

// ── Registrar visita ──
async function trackVisit() {
  try {
    const { db, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } = window._fb;
    const today = new Date().toISOString().split('T')[0];
    const ref = doc(db, 'stats', 'global');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { totalVisits: 1, totalDownloads: 0, lastVisit: serverTimestamp() });
    } else {
      await updateDoc(ref, { totalVisits: increment(1), lastVisit: serverTimestamp() });
    }
    // Visitas del día
    const dayRef = doc(db, 'stats', `visits_${today}`);
    const daySnap = await getDoc(dayRef);
    if (!daySnap.exists()) await setDoc(dayRef, { count: 1, date: today });
    else await updateDoc(dayRef, { count: increment(1) });
  } catch(e) {}
}

async function trackDownload(postId) {
  try {
    const { db, doc, updateDoc, increment } = window._fb;
    await updateDoc(doc(db, 'posts', postId), { downloadCount: increment(1) });
    await updateDoc(doc(db, 'stats', 'global'), { totalDownloads: increment(1) });
  } catch(e) {}
}
window.trackDownload = trackDownload;

// ── Obtener estadísticas globales ──
async function getGlobalStats() {
  try {
    const { db, doc, getDoc, collection, getDocs, query, orderBy, limit } = window._fb;
    const [statsSnap, usersSnap, postsSnap] = await Promise.all([
      getDoc(doc(db, 'stats', 'global')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'posts'))
    ]);
    const stats = statsSnap.exists() ? statsSnap.data() : {};
    return {
      totalVisits: stats.totalVisits || 0,
      totalDownloads: stats.totalDownloads || 0,
      totalUsers: usersSnap.size,
      totalPosts: postsSnap.size,
    };
  } catch(e) { return { totalVisits:0, totalDownloads:0, totalUsers:0, totalPosts:0 }; }
}

// ── Top 3 usuarios por publicaciones con más likes ──
async function getTopUsers() {
  try {
    const { db, collection, getDocs, query, where } = window._fb;
    // Obtener todos los posts aprobados
    const postsSnap = await getDocs(query(collection(db, 'posts'), where('status', '==', 'approved')));
    const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Agrupar por autor y sumar likes + descargas
    const userScore = {};
    posts.forEach(p => {
      const uid = p.authorId || p.submittedBy;
      if (!uid) return;
      if (!userScore[uid]) userScore[uid] = { uid, likes: 0, downloads: 0, posts: 0 };
      userScore[uid].likes += p.likes || 0;
      userScore[uid].downloads += p.downloadCount || 0;
      userScore[uid].posts++;
    });

    // Ordenar por score
    const sorted = Object.values(userScore)
      .sort((a, b) => (b.likes + b.downloads) - (a.likes + a.downloads))
      .slice(0, 3);

    // Obtener datos de usuarios
    const { doc, getDoc } = window._fb;
    const result = await Promise.all(sorted.map(async (s, i) => {
      const snap = await getDoc(doc(db, 'users', s.uid));
      const u = snap.exists() ? snap.data() : {};
      return {
        rank: i + 1,
        uid: s.uid,
        username: u.username || u.displayName || 'Usuario',
        photo: u.photoURL || avatarUrl(u.username || '?'),
        likes: s.likes,
        downloads: s.downloads,
        posts: s.posts,
        fakeFollowers: u.fakeFollowers || 0,
      };
    }));
    return result;
  } catch(e) { return []; }
}

// ── Renderizar sección ranking en la web ──
async function renderTopUsers() {
  const el = document.getElementById('top-users-section');
  if (!el) return;
  const tops = await getTopUsers();
  if (!tops.length) { el.innerHTML = ''; return; }

  const medals = ['🥇','🥈','🥉'];
  const colors = ['#FFD700','#C0C0C0','#CD7F32'];

  el.innerHTML = `
    <div class="section-title" style="margin-top:32px">🏆 Top Creadores</div>
    <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;margin-bottom:24px">
      ${tops.map((u, i) => `
        <div onclick="showUserProfile('${u.uid}')" style="cursor:pointer;background:var(--s1);border:2px solid ${colors[i]};border-radius:16px;padding:16px;min-width:140px;text-align:center;flex-shrink:0;transition:transform .2s" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
          <div style="font-size:1.5rem;margin-bottom:6px">${medals[i]}</div>
          <img src="${u.photo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid ${colors[i]};margin-bottom:8px" onerror="this.src='${avatarUrl(u.username)}'"/>
          <div style="font-family:var(--font1);font-size:.82rem;font-weight:700;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;margin:0 auto 4px">${u.username}</div>
          <div style="font-size:.7rem;color:var(--t3)">❤️ ${u.likes} · 📦 ${u.posts} apps</div>
        </div>`).join('')}
    </div>`;
}

// ── Inicializar stats al cargar ──
window.addEventListener('authchange', () => {
  try { trackVisit(); } catch(e) {}
  setTimeout(() => { try { renderTopUsers(); } catch(e) {} }, 1500);
}, { once: true });

window.getGlobalStats = getGlobalStats;
window.renderTopUsers = renderTopUsers;
