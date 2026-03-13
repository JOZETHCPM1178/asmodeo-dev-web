// js/moderation.js — Rate limit, reportes, ban, advertencias, links peligrosos

// ── Dominios peligrosos conocidos ──
const DANGEROUS_DOMAINS = [
  'bit.ly','tinyurl.com','shorte.st','adf.ly','bc.vc','sh.st',
  'exe.io','ouo.io','linkvertise.com','up-to-down.net',
  'apkpure.io','happymod.io','rexdl.io',
  'malware','virus','hack','crack','keygen','warez'
];

const ADULT_DOMAINS = [
  'porn','xxx','sex','adult','onlyfans','xvideos','xnxx',
  'pornhub','redtube','youporn','brazzers','playboy'
];

function tieneContenidoAdulto(texto) {
  if (!texto) return false;
  const t = texto.toLowerCase();
  return ADULT_DOMAINS.some(d => t.includes(d));
}
window.tieneContenidoAdulto = tieneContenidoAdulto;

function tieneLinkPeligroso(texto) {
  if (!texto) return false;
  const t = texto.toLowerCase();
  // Detectar URLs
  const urlMatch = t.match(/https?:\/\/([^\s/]+)/g);
  if (!urlMatch) return false;
  return urlMatch.some(url => DANGEROUS_DOMAINS.some(d => url.includes(d)));
}
window.tieneLinkPeligroso = tieneLinkPeligroso;

// ── Rate limit comentarios (20 por hora por post) ──
function getRateLimitKey(postId) {
  return `rl_${postId}_${window._currentUser?.uid}`;
}

function checkRateLimit(postId) {
  const key = getRateLimitKey(postId);
  const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"reset":0}');
  const now = Date.now();
  if (now > data.reset) {
    localStorage.setItem(key, JSON.stringify({ count: 0, reset: now + 3600000 }));
    return true;
  }
  if (data.count >= 20) {
    const mins = Math.ceil((data.reset - now) / 60000);
    toast(`⏱️ Límite de comentarios alcanzado. Espera ${mins} min.`, 'err');
    return false;
  }
  return true;
}

function incrementRateLimit(postId) {
  const key = getRateLimitKey(postId);
  const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"reset":0}');
  data.count++;
  localStorage.setItem(key, JSON.stringify(data));
}

window.checkRateLimit = checkRateLimit;
window.incrementRateLimit = incrementRateLimit;

// ── Sistema de advertencias ──
async function addWarning(uid, reason) {
  const { db, doc, getDoc, updateDoc, setDoc, serverTimestamp } = window._fb;
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const u = snap.data();
  const warnings = (u.warnings || 0) + 1;
  const now = Date.now();
  let banned = u.banned || false;
  let bannedUntil = u.bannedUntil || null;
  let banCount = u.banCount || 0;

  // 10 advertencias = ban de 1 día
  if (warnings >= 10 && warnings % 10 === 0) {
    banCount++;
    if (banCount >= 3) {
      // Ban permanente
      banned = true;
      bannedUntil = null;
      toast('🔨 Usuario baneado permanentemente', 'err');
    } else {
      bannedUntil = now + 86400000; // 1 día
    }
  }

  await updateDoc(ref, { warnings, banned, bannedUntil, banCount });

  // Guardar en colección de advertencias para el panel
  await setDoc(doc(db, 'warnings', `${uid}_${now}`), {
    uid, reason, warnings, createdAt: serverTimestamp()
  });
}
window.addWarning = addWarning;

async function isBanned(uid) {
  const { db, doc, getDoc } = window._fb;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return false;
  const u = snap.data();
  if (u.banned) return { permanent: true };
  if (u.bannedUntil && Date.now() < u.bannedUntil) {
    const hrs = Math.ceil((u.bannedUntil - Date.now()) / 3600000);
    return { temporary: true, hours: hrs };
  }
  return false;
}
window.isBanned = isBanned;

async function banUser(uid, permanent = false) {
  const { db, doc, updateDoc } = window._fb;
  if (!window._currentUser?.isAdmin) return toast('Sin permisos', 'err');
  const bannedUntil = permanent ? null : Date.now() + 86400000;
  await updateDoc(doc(db, 'users', uid), {
    banned: permanent,
    bannedUntil: permanent ? null : bannedUntil,
    banCount: 99
  });
  toast(permanent ? '🔨 Usuario baneado permanentemente' : '⏱️ Usuario baneado por 24h');
}
window.banUser = banUser;

async function unbanUser(uid) {
  const { db, doc, updateDoc } = window._fb;
  if (!window._currentUser?.isAdmin) return toast('Sin permisos', 'err');
  await updateDoc(doc(db, 'users', uid), { banned: false, bannedUntil: null, warnings: 0, banCount: 0 });
  toast('✅ Usuario desbaneado');
}
window.unbanUser = unbanUser;

// ── Sistema de reportes ──
async function reportContent(type, id, reason, extraData = {}) {
  const u = window._currentUser;
  if (!u) return toast('Inicia sesión para reportar', 'err');
  const { db, collection, addDoc, serverTimestamp } = window._fb;
  await addDoc(collection(db, 'reports'), {
    type, // 'post' | 'comment' | 'profile'
    targetId: id,
    reportedBy: u.uid,
    reportedByName: u.displayName || 'Usuario',
    reason,
    status: 'pending',
    createdAt: serverTimestamp(),
    ...extraData
  });
  toast('✅ Reporte enviado. Lo revisaremos pronto.');
}
window.reportContent = reportContent;

// ── Modal de reporte ──
function showReportModal(type, id, name) {
  name = name || '';
  const u = window._currentUser;
  if (!u) { if (typeof showLogin === 'function') showLogin(); else toast('Inicia sesión para reportar', 'err'); return; }

  document.getElementById('report-modal')?.remove();

  const reasons = type === 'post'
    ? ['App con errores / no funciona', 'Contenido inapropiado', 'Link malicioso', 'Spam', 'Información falsa']
    : type === 'comment'
    ? ['Spam', 'Link peligroso', 'Contenido inapropiado', 'Acoso']
    : ['Perfil falso / bot', 'Contenido inapropiado', 'Spam', 'Suplantación de identidad'];

  const typeName = type === 'post' ? 'publicación' : type === 'comment' ? 'comentario' : 'perfil';

  const modal = document.createElement('div');
  modal.id = 'report-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const btns = reasons.map(r =>
    `<button class="btn btn-ghost btn-sm" style="justify-content:flex-start;text-align:left;width:100%" data-reason="${r.replace(/"/g,'&quot;')}" data-type="${type}" data-id="${id}">${r}</button>`
  ).join('');

  modal.innerHTML = `
    <div style="background:var(--s1);border-radius:16px;padding:24px;max-width:400px;width:100%;border:1px solid var(--p)">
      <div style="font-family:var(--font1);font-size:1rem;font-weight:700;margin-bottom:8px">🚩 Reportar ${typeName}</div>
      ${name ? `<div style="font-size:.8rem;color:var(--t3);margin-bottom:14px">${name}</div>` : ''}
      <div style="font-size:.82rem;color:var(--t3);margin-bottom:14px">¿Por qué quieres reportar este contenido?</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px" id="report-reasons">${btns}</div>
      <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center" id="report-cancel">Cancelar</button>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById('report-cancel').onclick = () => modal.remove();
  document.getElementById('report-reasons').querySelectorAll('button').forEach(btn => {
    btn.onclick = async () => {
      modal.remove();
      try {
        await reportContent(btn.dataset.type, btn.dataset.id, btn.dataset.reason);
      } catch(e) {
        toast('Error al reportar: ' + e.message, 'err');
      }
    };
  });
}
window.showReportModal = showReportModal;

async function submitReport(type, id, reason) {
  document.getElementById('report-modal')?.remove();
  await reportContent(type, id, reason);
}
window.submitReport = submitReport;