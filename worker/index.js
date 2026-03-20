// Cloudflare Worker — ASMODEO DEV
// Bot Telegram + OneSignal + Google + Subir apps + Login + Descarga videos

const ONESIGNAL_APP_ID   = '57488b36-1bd3-4f46-9d9b-2729c0055a23';
const ONESIGNAL_REST_KEY = 'os_v2_app_k5eiwnq32nhunhm3e4u4abk2enhd4hhrv4eekquijnincjjlmmdwptixxi3iyt7ybt4ldk4mqsaomemlb5p4dzmlfaevwn6tugk3jdy';
const TELEGRAM_TOKEN     = '8756414415:AAFR-Uwks3cyr_RJHTPdhvFHCHXvXomIs94';
const TELEGRAM_CHAT_ID   = '-1003857525980';
const FIREBASE_PROJECT   = 'modzone-asmodeo';
const ALLOWED_ORIGIN     = 'https://asmodeo-dev-web.pages.dev';
const SITE_URL           = 'https://asmodeo-dev-web.pages.dev';
const BOT_ADMINS         = ['8015489755'];

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── Comandos con autocompletado ───
const BOT_COMMANDS = [
  { command: 'start',         description: '⚡ Bienvenida e información del bot' },
  { command: 'ayuda',         description: '📋 Ver todos los comandos' },
  { command: 'publicaciones', description: '📦 Últimas apps subidas' },
  { command: 'buscar',        description: '🔍 Buscar en ASMODEO DEV' },
  { command: 'google',        description: '🌐 Buscar en Google' },
  { command: 'ranking',       description: '🏆 Top 5 más populares' },
  { command: 'recomendar',    description: '⭐ App destacada del día' },
  { command: 'video',         description: '🎬 Descargar video TikTok/YouTube/etc' },
  { command: 'scan',          description: '🔬 Verificar app en VirusTotal' },
  { command: 'subir',         description: '📤 Subir app con link' },
  { command: 'login',         description: '🔐 Vincular cuenta con la web' },
  { command: 'recompensas',   description: '🎁 Recoger puntos diarios' },
];

// ─── Firebase helpers para códigos de login y recompensas ───
// Guarda los códigos en Firestore colección "loginCodes"
// Guarda las recompensas en Firestore colección "rewards"

async function fbSet(collection, docId, fields) {
  const body = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string')       body[k] = { stringValue: v };
    else if (typeof v === 'number')  body[k] = { integerValue: String(v) };
    else if (typeof v === 'boolean') body[k] = { booleanValue: v };
    else                             body[k] = { stringValue: String(v) };
  }
  await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${collection}/${docId}?` +
    Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&'),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: body })
    }
  );
}

async function fbGetDoc(collection, docId) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${collection}/${docId}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.fields) return null;
  // Desserializar campos Firestore
  const out = {};
  for (const [k, v] of Object.entries(data.fields)) {
    out[k] = v.stringValue ?? v.integerValue ?? v.booleanValue ?? null;
  }
  return out;
}

async function fbDelete(collection, docId) {
  await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${collection}/${docId}`,
    { method: 'DELETE' }
  );
}

function getTodayKey(uid) { return `${uid}_${new Date().toISOString().slice(0,10)}`; }

// ─── Helpers Telegram ───
async function tgSend(chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true, ...extra })
  });
}

async function tgSendPhoto(chatId, photo, caption, extra = {}) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo, caption, parse_mode: 'Markdown', ...extra })
  });
  if (!res.ok) await tgSend(chatId, caption);
}

// ─── Helper Firestore REST ───
async function fbGet(path) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${path}`
  );
  if (!res.ok) return null;
  return res.json();
}

async function fbCreate(collection, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string')  fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = { integerValue: String(v) };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (v === null) fields[k] = { nullValue: null };
    else fields[k] = { stringValue: String(v) };
  }
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${collection}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    }
  );
  return res.json();
}

// ─── Verificar si usuario está vinculado ───
async function getLinkedUser(telegramId) {
  try {
    const res = await fbGet(`users?pageSize=200`);
    const docs = res?.documents || [];
    return docs.find(d => d.fields?.telegramId?.stringValue === String(telegramId)) || null;
  } catch { return null; }
}

// ─── Verificar admin ───
async function isAdmin(chatId, userId) {
  if (BOT_ADMINS.includes(String(userId))) return true;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: userId })
    });
    const d = await res.json();
    return ['creator', 'administrator'].includes(d.result?.status);
  } catch { return false; }
}

// ─── Registrar comandos ───
async function registrarComandos() {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands: BOT_COMMANDS })
  });
}

// ─── Búsqueda Google via DuckDuckGo ───
async function buscarGoogle(query) {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } }
    );
    const html = await res.text();
    const results = [];
    // Regex más robusto para extraer resultados
    const linkRx   = /class="result__a"[^>]*href="([^"]+)"/g;
    const titleRx  = /class="result__a"[^>]*>([^<]+)<\/a>/g;
    const snippRx  = /class="result__snippet"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/g;

    const links   = [...html.matchAll(/result__a[^>]+href="([^"]+)"/g)].map(m => m[1]);
    const titles  = [...html.matchAll(/result__a[^>]*>([^<]+)<\/a>/g)].map(m => m[1].trim());
    const snippets= [...html.matchAll(/result__snippet[^>]*>([^<]+)</g)].map(m => m[1].trim());

    for (let i = 0; i < Math.min(links.length, 5); i++) {
      let url = links[i];
      // Decodificar URLs de DuckDuckGo
      if (url.includes('uddg=')) {
        url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
      }
      if (url.startsWith('http') && titles[i]) {
        results.push({
          url,
          title:   titles[i].replace(/&amp;/g,'&').replace(/&#x27;/g,"'"),
          snippet: (snippets[i] || '').replace(/&amp;/g,'&').substring(0, 100),
        });
      }
    }
    return results;
  } catch (e) { return []; }
}

// ─── Descarga de videos con múltiples APIs de fallback ───
async function descargarVideo(link) {
  // API 1: cobalt.tools (versión actualizada)
  try {
    const res = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        url: link,
        videoQuality: '720',
        audioFormat: 'mp3',
        filenameStyle: 'pretty',
        downloadMode: 'auto',
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'redirect' || data.status === 'stream' || data.status === 'tunnel') {
        return { url: data.url, source: 'cobalt' };
      }
      if (data.status === 'picker' && data.picker?.length) {
        return { url: data.picker[0].url, source: 'cobalt' };
      }
    }
  } catch {}

  // API 2: Para TikTok específicamente — tikwm
  if (link.includes('tiktok')) {
    try {
      const encoded = encodeURIComponent(link);
      const res = await fetch(`https://www.tikwm.com/api/?url=${encoded}&hd=1`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        const videoUrl = data.data.hdplay || data.data.play || data.data.wmplay;
        if (videoUrl) return { url: videoUrl, source: 'tikwm' };
      }
    } catch {}
  }

  // API 3: Para YouTube — y2mate alternativa
  if (link.includes('youtube') || link.includes('youtu.be')) {
    try {
      const videoId = link.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        return {
          url: `https://www.y2mate.com/youtube/${videoId}`,
          source: 'y2mate',
          isPage: true
        };
      }
    } catch {}
  }

  return null;
}

// ─── Handler principal de comandos ───
async function handleCommand(msg) {
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id);
  const text   = msg.text || '';
  const parts  = text.trim().split(/\s+/);
  const cmd    = parts[0].split('@')[0].toLowerCase();
  const args   = parts.slice(1).join(' ');

  // ══ /start ══
  if (cmd === '/start') {
    await tgSend(chatId,
      `⚡ *¡Bienvenido a ASMODEO DEV Bot!*\n\n` +
      `Tu fuente de APKs Mod, Juegos y Scripts gratis.\n\n` +
      `📌 Escribe */* para ver todos los comandos.\n` +
      `🔐 Usa /login para vincular tu cuenta.\n\n` +
      `🌐 [Visitar web](${SITE_URL})`
    );
    return;
  }

  // ══ /ayuda ══
  if (cmd === '/ayuda') {
    await tgSend(chatId,
      `⚡ *ASMODEO DEV Bot — Comandos*\n\n` +
      `📦 *Publicaciones*\n` +
      `/publicaciones — Últimas apps subidas\n` +
      `/buscar <nombre> — Buscar en la web\n` +
      `/ranking — Top 5 más populares\n` +
      `/recomendar — App destacada del día\n\n` +
      `🌐 *Búsqueda*\n` +
      `/google <consulta> — Buscar en Google\n\n` +
      `🎬 *Videos*\n` +
      `/video <link> — Descargar sin marca de agua\n` +
      `_(TikTok, YouTube, Instagram, Twitter...)_\n\n` +
      `📤 *Subir contenido*\n` +
      `/subir <nombre> | <link> | <categoría>\n` +
      `_Requiere cuenta vinculada_\n\n` +
      `🔐 *Cuenta*\n` +
      `/login — Vincular cuenta con la web\n` +
      `/recompensas — Puntos diarios\n\n` +
      `🔒 *Seguridad*\n` +
      `/scan <nombre> — Verificar en VirusTotal\n\n` +
      `🛡️ *Admin*\n` +
      `/admin — Dar admin · /ban — Banear`
    );
    return;
  }

  // ══ /login — Genera código de 6 dígitos para vincular con la web ══
  if (cmd === '/login') {
    const linked = await getLinkedUser(userId);
    if (linked) {
      const name = linked.fields?.displayName?.stringValue || 'Usuario';
      await tgSend(chatId,
        `✅ *Ya tienes una cuenta vinculada*\n\n` +
        `👤 ${name}\n\n` +
        `Tu Telegram ya está conectado con ASMODEO DEV.\n\n` +
        `🌐 [Ver mi perfil](${SITE_URL})`
      );
      return;
    }

    // Generar código de 6 dígitos único (colisión improbable en KV)
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Guardar código en Firestore (colección loginCodes)
    await fbSet('loginCodes', code, {
      chatId:    String(chatId),
      userId:    String(userId),
      firstName: msg.from?.first_name || 'Usuario',
      expires:   String(Date.now() + 10 * 60 * 1000),
    });

    await tgSend(chatId,
      `🔐 *Tu código de verificación:*\n\n` +
      `\`${code}\`\n\n` +
      `*Pasos:*\n` +
      `1️⃣ Ve a tu perfil en ASMODEO DEV\n` +
      `2️⃣ Toca *Editar perfil* → *Vincular Telegram*\n` +
      `3️⃣ Ingresa el código de 6 dígitos\n\n` +
      `⏱️ _Expira en 10 minutos_\n` +
      `🌐 [Abrir web](${SITE_URL})`
    );
    return;
  }

  // ══ /subir — Subir app con link ══
  if (cmd === '/subir') {
    // Verificar que esté vinculado
    const linked = await getLinkedUser(userId);
    if (!linked) {
      await tgSend(chatId,
        `🔐 *Necesitas vincular tu cuenta primero*\n\n` +
        `Usa /login para vincular tu cuenta de ASMODEO DEV con Telegram.`
      );
      return;
    }

    if (!args) {
      await tgSend(chatId,
        `📤 *Subir app a ASMODEO DEV*\n\n` +
        `Completa todos los campos con este formato exacto:\n\n` +
        `\`\`\`\n` +
        `/subir\n` +
        `NOMBRE: Minecraft PE Mod v1.21\n` +
        `IMAGEN: https://i.imgur.com/ejemplo.jpg\n` +
        `CATEGORIA: apk\n` +
        `DESCRIPCION: Descripción de la app...\n` +
        `LINK: https://mediafire.com/xxx\n` +
        `YOUTUBE: https://youtube.com/watch?v=xxx\n` +
        `TAG: minecraft, mod, gratis\n` +
        `\`\`\`\n\n` +
        `📂 *Categorías válidas:*\n` +
        `▸ \`apk\` — APK Mods\n` +
        `▸ \`games\` — Juegos Mod\n` +
        `▸ \`script\` — Scripts\n` +
        `▸ \`tutorials\` — Tutoriales\n\n` +
        `ℹ️ YOUTUBE y TAG son opcionales.`
      );
      return;
    }

    // Parsear campos del mensaje
    const lines = args.split('\n').map(l => l.trim());
    const getField = (key) => {
      const line = lines.find(l => l.toUpperCase().startsWith(key.toUpperCase() + ':'));
      return line ? line.slice(key.length + 1).trim() : '';
    };

    const nombre    = getField('NOMBRE');
    const imagen    = getField('IMAGEN');
    const categoria = getField('CATEGORIA').toLowerCase();
    const desc      = getField('DESCRIPCION');
    const linkUrl   = getField('LINK');
    const youtube   = getField('YOUTUBE');
    const tags      = getField('TAG');

    // Validaciones
    const errores = [];
    if (!nombre)   errores.push('❌ Falta *NOMBRE*');
    if (!linkUrl)  errores.push('❌ Falta *LINK*');
    if (!desc)     errores.push('❌ Falta *DESCRIPCION*');

    const catsValidas = ['apk', 'games', 'script', 'tutorials'];
    const catFinal = catsValidas.includes(categoria) ? categoria : 'apk';

    if (errores.length) {
      await tgSend(chatId,
        `⚠️ *Campos incompletos:*\n\n${errores.join('\n')}\n\n` +
        `Escribe /subir sin texto para ver el formato correcto.`
      );
      return;
    }

    if (!linkUrl.startsWith('http')) {
      await tgSend(chatId, `❌ El LINK debe empezar con https://`);
      return;
    }

    if (imagen && !imagen.startsWith('http')) {
      await tgSend(chatId, `❌ La IMAGEN debe ser un link que empiece con https://`);
      return;
    }

    const authorId   = linked.name.split('/').pop();
    const authorName = linked.fields?.displayName?.stringValue || 'Usuario';

    await tgSend(chatId, `⏳ Subiendo *${nombre}*...`);

    try {
      const tagsArray = tags ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];

      const doc = await fbCreate('posts', {
        name:        nombre,
        category:    catFinal,
        downloadUrl: linkUrl,
        imageUrl:    imagen || '',
        youtubeUrl:  youtube || '',
        description: desc,
        tags:        tagsArray.join(','),
        authorId,
        authorName,
        status:      'active',
        likes:       0,
        downloads:   0,
        commentCount:0,
        views:       0,
        score:       0,
        featured:    false,
        verified:    false,
        source:      'telegram_bot',
      });

      const postId = doc.name?.split('/').pop();
      const cats   = { apk:'📱 APK Mod', games:'🎮 Juegos Mod', script:'⚙️ Scripts', tutorials:'📚 Tutoriales' };

      await tgSend(chatId,
        `✅ *¡Publicación creada exitosamente!*\n\n` +
        `${cats[catFinal] || '⚡'} *${nombre}*\n` +
        `👤 Por: ${authorName}\n` +
        (tagsArray.length ? `🏷️ Tags: ${tagsArray.join(', ')}\n` : '') +
        `\n[🔗 Ver publicación](${SITE_URL}/post/${postId})`
      );

      // Anunciar en el canal con imagen si tiene
      await anunciarTelegram({
        id:          postId,
        name:        nombre,
        category:    catFinal,
        downloadUrl: linkUrl,
        imageUrl:    imagen || '',
        description: desc,
      });

    } catch(e) {
      await tgSend(chatId, `❌ Error al crear la publicación: ${e.message}`);
    }
    return;
  }

  // ══ /video — Descarga de videos con múltiples APIs ══
  if (cmd === '/video') {
    if (!args) {
      await tgSend(chatId,
        `🎬 *Descargador de Videos ASMODEO DEV*\n\nUso: /video <link>\n\n` +
        `✅ Soporta:\n` +
        `📱 TikTok — sin marca de agua\n` +
        `▶️ YouTube — hasta 720p\n` +
        `📸 Instagram — reels y posts\n` +
        `🐦 Twitter/X\n` +
        `🎵 SoundCloud\n` +
        `📌 Pinterest`
      );
      return;
    }

    const link = args.trim();
    if (!link.startsWith('http')) {
      await tgSend(chatId, `❌ Manda un link válido que empiece con https://`);
      return;
    }

    await tgSend(chatId, `⏳ Procesando video, espera un momento...`);

    const result = await descargarVideo(link);

    if (!result) {
      // Fallback: dar links alternativos según plataforma
      let alternativa = '';
      if (link.includes('tiktok')) {
        alternativa = `\n\n*Alternativas para TikTok:*\n[snaptik.app](https://snaptik.app) · [tikmate.online](https://tikmate.online)`;
      } else if (link.includes('youtube') || link.includes('youtu.be')) {
        alternativa = `\n\n*Alternativas para YouTube:*\n[y2mate.com](https://y2mate.com) · [savefrom.net](https://en.savefrom.net)`;
      } else if (link.includes('instagram')) {
        alternativa = `\n\n*Alternativas para Instagram:*\n[instafinsta.com](https://instafinsta.com)`;
      }
      await tgSend(chatId,
        `❌ No se pudo descargar automáticamente.${alternativa}\n\n` +
        `_Pega el link en cualquiera de esas webs para descargarlo._`,
        { disable_web_page_preview: false }
      );
      return;
    }

    const platform = link.includes('tiktok') ? '📱 TikTok'
      : link.includes('youtube') || link.includes('youtu.be') ? '▶️ YouTube'
      : link.includes('instagram') ? '📸 Instagram'
      : link.includes('twitter') || link.includes('x.com') ? '🐦 Twitter/X'
      : link.includes('soundcloud') ? '🎵 SoundCloud'
      : '🎬 Video';

    if (result.isPage) {
      // Para YouTube — dar link a página de descarga
      await tgSend(chatId,
        `${platform}\n\n` +
        `[⬇️ Descargar en y2mate](${result.url})\n\n` +
        `_Abre el link y toca "Download"_`,
        { disable_web_page_preview: false }
      );
    } else {
      await tgSend(chatId,
        `${platform} ✅\n\n` +
        `[⬇️ Toca para descargar](${result.url})\n\n` +
        `_Sin marca de agua · @asmodeoDEVbot_`,
        { disable_web_page_preview: false }
      );
    }
    return;
  }

  // ══ /publicaciones ══
  if (cmd === '/publicaciones') {
    try {
      const res  = await fbGet('posts?pageSize=5');
      const docs = res?.documents || [];
      if (!docs.length) { await tgSend(chatId, '📭 No hay publicaciones aún.'); return; }
      const cats = { apk:'📱', games:'🎮', script:'⚙️', tutorials:'📚' };
      const lines = docs.map((d, i) => {
        const f     = d.fields || {};
        const title = f.name?.stringValue || 'Sin título';
        const cat   = f.category?.stringValue || '';
        const id    = d.name.split('/').pop();
        return `${i+1}. ${cats[cat]||'⚡'} *${title}*\n   [Ver](${SITE_URL}/post/${id})`;
      });
      await tgSend(chatId, `📦 *Últimas publicaciones:*\n\n${lines.join('\n\n')}\n\n🌐 [Ver todas](${SITE_URL}/feed)`);
    } catch(e) { await tgSend(chatId, '❌ Error al obtener publicaciones.'); }
    return;
  }

  // ══ /buscar ══
  if (cmd === '/buscar') {
    if (!args) { await tgSend(chatId, '❓ Uso: `/buscar nombre`'); return; }
    try {
      const res  = await fbGet('posts?pageSize=100');
      const docs = res?.documents || [];
      const q    = args.toLowerCase();
      const matches = docs.filter(d => {
        const name = d.fields?.name?.stringValue || '';
        const desc = d.fields?.description?.stringValue || '';
        return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      }).slice(0, 5);
      if (!matches.length) {
        await tgSend(chatId, `🔍 Sin resultados para "*${args}*" en ASMODEO DEV.\n\nPrueba: /google ${args}`);
        return;
      }
      const cats  = { apk:'📱', games:'🎮', script:'⚙️', tutorials:'📚' };
      const lines = matches.map(d => {
        const f   = d.fields || {};
        const cat = f.category?.stringValue || '';
        const id  = d.name.split('/').pop();
        return `${cats[cat]||'⚡'} *${f.name?.stringValue||'Sin título'}*\n[Ver](${SITE_URL}/post/${id})`;
      });
      await tgSend(chatId, `🔍 *Resultados para "${args}":*\n\n${lines.join('\n\n')}`);
    } catch(e) { await tgSend(chatId, '❌ Error al buscar.'); }
    return;
  }

  // ══ /google ══
  if (cmd === '/google') {
    if (!args) {
      await tgSend(chatId, `🌐 Uso: /google <consulta>\n\nEjemplo: /google minecraft mod gratis 2026`);
      return;
    }
    await tgSend(chatId, `🔍 Buscando "*${args}*"...`);
    const results = await buscarGoogle(args);
    if (!results.length) {
      await tgSend(chatId,
        `❌ Sin resultados.\n[Buscar en Google](https://www.google.com/search?q=${encodeURIComponent(args)})`,
        { disable_web_page_preview: false }
      );
      return;
    }
    const lines = results.map((r, i) =>
      `${i+1}. *${r.title}*\n${r.snippet ? `_${r.snippet}_\n` : ''}[🔗 Abrir](${r.url})`
    );
    await tgSend(chatId,
      `🌐 *Google — "${args}":*\n\n${lines.join('\n\n')}\n\n[Ver más](https://www.google.com/search?q=${encodeURIComponent(args)})`
    );
    return;
  }

  // ══ /ranking ══
  if (cmd === '/ranking') {
    try {
      const res  = await fbGet('posts?pageSize=50');
      const docs = res?.documents || [];
      const sorted = docs
        .map(d => ({ ...d.fields, id: d.name.split('/').pop() }))
        .sort((a,b) => (parseInt(b.likes?.integerValue||0)) - (parseInt(a.likes?.integerValue||0)))
        .slice(0, 5);
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      const lines  = sorted.map((p,i) =>
        `${medals[i]} *${p.name?.stringValue||'Sin título'}*\n❤️ ${p.likes?.integerValue||0}\n[Ver](${SITE_URL}/post/${p.id})`
      );
      await tgSend(chatId, `🏆 *Top 5:*\n\n${lines.join('\n\n')}`);
    } catch(e) { await tgSend(chatId, '❌ Error.'); }
    return;
  }

  // ══ /recomendar ══
  if (cmd === '/recomendar') {
    try {
      const res  = await fbGet('posts?pageSize=50');
      const docs = res?.documents || [];
      const top  = docs.map(d => ({ ...d.fields, id: d.name.split('/').pop() }))
        .sort((a,b) => parseInt(b.likes?.integerValue||0) - parseInt(a.likes?.integerValue||0))[0];
      if (!top) { await tgSend(chatId, '📭 Sin publicaciones aún.'); return; }
      const title   = top.name?.stringValue || 'Sin título';
      const desc    = (top.description?.stringValue || '').substring(0, 200);
      const img     = top.imageUrl?.stringValue || null;
      const caption = `⭐ *Recomendación:*\n\n*${title}*\n\n${desc}\n\n[📥 Ver y Descargar](${SITE_URL}/post/${top.id})`;
      if (img) await tgSendPhoto(chatId, img, caption);
      else await tgSend(chatId, caption);
    } catch(e) { await tgSend(chatId, '❌ Error.'); }
    return;
  }

  // ══ /scan ══
  if (cmd === '/scan') {
    if (!args) { await tgSend(chatId, '❓ Uso: `/scan nombre_app`'); return; }
    const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(args)}`;
    await tgSend(chatId,
      `🔬 *VirusTotal — ${args}*\n\n[🔗 Ver análisis](${vtUrl})\n\n_Verifica antes de instalar._`,
      { disable_web_page_preview: false }
    );
    return;
  }

  // ══ /recompensas ══
  if (cmd === '/recompensas') {
    const key = getTodayKey(userId);
    const already = await fbGetDoc('rewards', key);
    if (already) {
      await tgSend(chatId, `🎁 Ya recogiste tus puntos hoy ✅\nVuelve mañana.`);
    } else {
      await fbSet('rewards', key, { uid: String(userId), date: key, claimed: true });
      await tgSend(chatId, `🎁 *¡+1 punto ganado!*\n\nAcumula 10 y canjéalos por acceso VIP.\n_Vuelve mañana._`);
    }
    return;
  }

  // ══ /admin ══
  if (cmd === '/admin') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins.'); return; }
    if (!msg.reply_to_message) { await tgSend(chatId, '↩️ Responde un mensaje para dar admin.'); return; }
    const tid = msg.reply_to_message.from.id;
    const tn  = msg.reply_to_message.from.first_name;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/promoteChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: tid, can_post_messages: true, can_delete_messages: true, can_invite_users: true })
    });
    await tgSend(chatId, `✅ *${tn}* ahora es admin.`);
    return;
  }

  // ══ /ban ══
  if (cmd === '/ban') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins.'); return; }
    if (!msg.reply_to_message) { await tgSend(chatId, '↩️ Responde un mensaje para banear.'); return; }
    const tid = msg.reply_to_message.from.id;
    const tn  = msg.reply_to_message.from.first_name;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/banChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: tid })
    });
    await tgSend(chatId, `🔨 *${tn}* baneado.`);
    return;
  }
}

// ─── OneSignal: todos los usuarios ───
async function enviarOneSignal(post) {
  const cats  = { apk:'📱', games:'🎮', script:'⚙️', tutorials:'📚' };
  const emoji = cats[post.category] || '⚡';
  const res   = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${ONESIGNAL_REST_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['Total Subscriptions'],
      headings: { en: `${emoji} ${post.name || post.title}` },
      contents: { en: (post.description || '').substring(0, 100) },
      big_picture: post.imageUrl || undefined,
      url: `${SITE_URL}/post/${post.id}`,
      chrome_web_icon: `${SITE_URL}/icon-192x192.png`,
    })
  });
  return res.json();
}

// ─── OneSignal: usuario específico ───
async function enviarOneSignalUsuario(playerId, title, message, pushUrl) {
  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${ONESIGNAL_REST_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [playerId],
      headings: { en: title },
      contents: { en: message || ' ' },
      url: pushUrl || SITE_URL,
      chrome_web_icon: `${SITE_URL}/icon-192x192.png`
    })
  });
  return res.json();
}

// ─── Telegram: anunciar nuevo post en canal ───
async function anunciarTelegram(post) {
  const cats = { apk:'📱 APK Mod', games:'🎮 Juegos Mod', script:'⚙️ Scripts', tutorials:'📚 Tutoriales' };
  const cat  = cats[post.category] || '⚡';
  const name = post.name || post.title || 'Nueva publicación';
  const desc = (post.description || '').substring(0, 200);
  const text = `⚡ *ASMODEO DEV — Nueva publicación*\n\n*${name}*\n${cat}\n\n${desc}${desc.length>=200?'...':''}\n\n[📥 Ver y Descargar](${SITE_URL}/post/${post.id})`;
  if (post.imageUrl) await tgSendPhoto(TELEGRAM_CHAT_ID, post.imageUrl, text);
  else await tgSend(TELEGRAM_CHAT_ID, text);
}

// ─── Export principal ───
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);

    // Webhook Telegram
    if (url.pathname === '/telegram') {
      try {
        const update = await request.json();
        const msg    = update.message || update.channel_post;
        if (msg?.text?.startsWith('/')) await handleCommand(msg);
      } catch(e) {}
      return new Response('ok');
    }

    // Verificar código de login desde la web
    if (url.pathname === '/verify-login' && request.method === 'POST') {
      try {
        const { uid, code } = await request.json();
        if (!uid || !code) {
          return new Response(JSON.stringify({ ok: false, error: 'Faltan datos.' }), {
            headers: { 'Content-Type': 'application/json', ...CORS }
          });
        }

        const entry = await fbGetDoc('loginCodes', code);

        if (!entry) {
          return new Response(JSON.stringify({ ok: false, error: 'Código incorrecto o ya usado.' }), {
            headers: { 'Content-Type': 'application/json', ...CORS }
          });
        }

        // Verificar expiración (10 minutos)
        if (Date.now() > parseInt(entry.expires || '0')) {
          await fbDelete('loginCodes', code);
          return new Response(JSON.stringify({ ok: false, error: 'El código expiró. Usa /login en el bot para obtener uno nuevo.' }), {
            headers: { 'Content-Type': 'application/json', ...CORS }
          });
        }

        // Código válido — borrar para que sea de un solo uso
        await fbDelete('loginCodes', code);

        // Notificar al usuario por Telegram
        try {
          await tgSend(entry.chatId,
            `✅ *¡Cuenta vinculada exitosamente!*\n\n` +
            `Tu Telegram está ahora conectado con ASMODEO DEV.\n\n` +
            `Puedes usar /subir para publicar apps directamente desde aquí.\n\n` +
            `🌐 [Ver mi perfil](${SITE_URL})`
          );
        } catch {}

        return new Response(JSON.stringify({
          ok:           true,
          telegramId:   entry.userId,
          telegramName: entry.firstName,
          chatId:       entry.chatId,
        }), { headers: { 'Content-Type': 'application/json', ...CORS } });

      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
      }
    }

    // Setup — registrar comandos
    if (url.pathname === '/setup') {
      await registrarComandos();
      return new Response(JSON.stringify({ ok: true, msg: 'Comandos registrados ✅' }), {
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    // Listar modelos Gemini disponibles (temporal para debug)
    if (url.pathname === '/list-models') {
      const GEMINI_KEY = env.GEMINI_KEY;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
      const data = await res.json();
      const names = (data.models || []).map(m => m.name);
      return new Response(JSON.stringify({ models: names }), {
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    // Sitemap dinámico — incluye todos los posts para que Google los indexe
    if (url.pathname === '/sitemap.xml') {
      try {
        const res   = await fbGet('posts?pageSize=500')
        const docs  = res.documents || []
        const posts = docs
          .filter(d => d.fields?.status?.stringValue === 'active')
          .map(d => ({
            id:        d.name.split('/').pop(),
            name:      d.fields?.name?.stringValue || '',
            updatedAt: d.updateTime || d.createTime || '',
          }))

        const staticUrls = [
          { loc: SITE_URL,                  priority: '1.0', freq: 'daily'  },
          { loc: `${SITE_URL}/feed`,        priority: '0.9', freq: 'hourly' },
          { loc: `${SITE_URL}/feed/apk`,    priority: '0.8', freq: 'hourly' },
          { loc: `${SITE_URL}/feed/games`,  priority: '0.8', freq: 'hourly' },
          { loc: `${SITE_URL}/feed/script`, priority: '0.7', freq: 'daily'  },
          { loc: `${SITE_URL}/search`,      priority: '0.6', freq: 'daily'  },
        ]

        const postUrls = posts.map(p => ({
          loc:      `${SITE_URL}/post/${p.id}`,
          priority: '0.8',
          freq:     'weekly',
          lastmod:  p.updatedAt ? p.updatedAt.split('T')[0] : '',
        }))

        const allUrls = [...staticUrls, ...postUrls]

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          }
        })
      } catch(e) {
        return new Response(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
          { headers: { 'Content-Type': 'application/xml' } })
      }
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    if (request.method === 'POST') {
      const origin = request.headers.get('Origin') || '';

      // Nuevo post → Telegram + OneSignal (sin restricción de origin para permitir llamadas del worker/server)
      if (url.pathname === '/notify' || url.pathname === '/') {
        try {
          const body = await request.json();
          const post = body.post || body;
          await Promise.all([enviarOneSignal(post), anunciarTelegram(post)]);
          return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...CORS } });
        } catch(e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
        }
      }

      if (origin !== ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403 });

      // Push a usuario específico
      if (url.pathname === '/push-user') {
        try {
          const { playerId, title, message, url: pushUrl } = await request.json();
          if (!playerId) return new Response('Missing playerId', { status: 400, headers: CORS });
          const data = await enviarOneSignalUsuario(playerId, title, message, pushUrl);
          return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', ...CORS } });
        } catch(e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
        }
      }
      // Generar descripción de app con IA (Cloudflare Workers AI — 100% gratis)
      if (url.pathname === '/generate-description') {
        try {
          const { name, category } = await request.json();
          const catLabels = { apk:'APK Mod', games:'Juego Mod', script:'Script', tutorials:'Tutorial' };
          const cat = catLabels[category] || category;

          const prompt = `Eres un asistente para una comunidad de mods Android en español latinoamericano.

Para la app "${name}" (${cat}), genera DOS cosas y devuélvelas en formato JSON exactamente así:
{
  "description": "descripción aquí",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Reglas para la descripción:
- 3-4 oraciones máx en español informal latinoamericano
- Incluye 3-5 emojis distribuidos naturalmente
- Menciona características de la versión mod/desbloqueada
- Termina invitando a descargar

Reglas para los tags:
- Exactamente 5 tags en minúsculas sin espacios (usa guión si necesitas)
- Incluye el nombre de la app, la categoría y términos de búsqueda populares
- Ejemplo: ["spotify", "musica-gratis", "sin-anuncios", "premium", "mod-apk"]

Solo responde con el JSON, sin texto adicional ni comillas extra.`;

          const ai = env.AI;
          if (!ai) throw new Error('Workers AI no está habilitado en este Worker');
          const result = await ai.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
              { role: 'system', content: 'Eres un asistente que responde SOLO con JSON válido, sin texto adicional.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 350,
          });

          const raw = result?.response?.trim();
          if (!raw) throw new Error('La IA no generó respuesta');

          // Parsear el JSON de la respuesta
          let parsed;
          try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
          } catch {
            // Si no es JSON válido, devolver solo texto como descripción
            return new Response(JSON.stringify({ ok: true, text: raw, tags: [] }), {
              headers: { 'Content-Type': 'application/json', ...CORS }
            });
          }

          return new Response(JSON.stringify({
            ok:   true,
            text: parsed.description || raw,
            tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
          }), { headers: { 'Content-Type': 'application/json', ...CORS } });

        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
          });
        }
      }

      // Generar comentarios bot con IA (Cloudflare Workers AI — 100% gratis)
      if (url.pathname === '/generate-comments') {
        try {
          const { postName, postDescription, postCategory, username } = await request.json();
          const categoryLabels = { apk: 'APK Mod', games: 'Juego Mod', script: 'Script', tutorials: 'Tutorial' };
          const catLabel = categoryLabels[postCategory] || postCategory;
          const prompt = `Eres ${username}, un usuario latinoamericano en una comunidad de APKs y mods para Android. Escribe UN comentario corto (máx 2 oraciones, 20-40 palabras) sobre este post. Debe sonar 100% natural, como un usuario real. Usa español informal latinoamericano, puedes usar algún emoji ocasionalmente. NO uses frases genéricas. Sé específico y creativo. Solo escribe el comentario, sin comillas ni explicaciones.\n\nPost: "${postName}" (${catLabel})\n${postDescription ? `Descripción: ${postDescription.slice(0, 150)}` : ''}`;
          const ai = env.AI;
          if (!ai) throw new Error('Workers AI no está habilitado en este Worker');
          const result = await ai.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
              { role: 'system', content: 'Eres un usuario latinoamericano real en una comunidad de mods Android. Escribes comentarios cortos y naturales en español informal.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 120,
          });
          const text = result?.response?.trim();
          if (!text) throw new Error('La IA no generó respuesta');
          return new Response(JSON.stringify({ ok: true, text }), {
            headers: { 'Content-Type': 'application/json', ...CORS }
          });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
          });
        }
      }
    }

    // ── Sitemap dinámico con todas las publicaciones ──
    if (url.pathname === '/sitemap.xml') {
      try {
        const SITE = 'https://asmodeo-dev-web.pages.dev'
        // Usar fbGet que ya existe en el worker — no necesita token especial
        const data  = await fbGet('posts?pageSize=500')
        const docs  = data.documents || []
        const posts = docs
          .filter(d => d.fields?.status?.stringValue === 'active')
          .map(d => ({
            id:   d.name.split('/').pop(),
            slug: d.fields?.slug?.stringValue || '',
            name: d.fields?.name?.stringValue || '',
            date: d.updateTime ? d.updateTime.split('T')[0] : '',
          }))

        const staticUrls = [
          { loc:`${SITE}/`,               changefreq:'daily',  priority:'1.0' },
          { loc:`${SITE}/feed`,           changefreq:'hourly', priority:'0.9' },
          { loc:`${SITE}/feed/apk`,       changefreq:'hourly', priority:'0.8' },
          { loc:`${SITE}/feed/games`,     changefreq:'hourly', priority:'0.8' },
          { loc:`${SITE}/feed/script`,    changefreq:'weekly', priority:'0.7' },
          { loc:`${SITE}/feed/tutorials`, changefreq:'weekly', priority:'0.7' },
          { loc:`${SITE}/search`,         changefreq:'daily',  priority:'0.6' },
        ]
        const postUrls = posts.map(p => ({
          loc: `${SITE}/post/${p.slug || p.id}`,
          lastmod: p.date,
          changefreq: 'weekly',
          priority: '0.8'
        }))

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
          [...staticUrls, ...postUrls].map(u =>
            `  <url>\n    <loc>${u.loc}</loc>\n    ${u.lastmod?`<lastmod>${u.lastmod}</lastmod>\n    `:''}<changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
          ).join('\n')
        }\n</urlset>`

        return new Response(xml, {
          headers: { 'Content-Type':'application/xml; charset=utf-8', 'Cache-Control':'public, max-age=3600', 'Access-Control-Allow-Origin':'*' }
        })
      } catch(e) {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
          headers: { 'Content-Type':'application/xml' }
        })
      }
    }

    return new Response('ASMODEO DEV Bot activo ⚡');
  }
};
