let ONESIGNAL_APP_ID, ONESIGNAL_REST_KEY, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID;
let FIREBASE_PROJECT, ALLOWED_ORIGIN, SITE_URL, BOT_ADMINS, CORS;

// ─── Comandos con autocompletado ───
const BOT_COMMANDS = [
  { command: 'start',         description: '⚡ Bienvenida' },
  { command: 'ayuda',         description: '📋 Comandos' },
  { command: 'publicaciones', description: '📦 Últimas apps' },
  { command: 'buscar',        description: '🔍 Buscar app' },
  { command: 'ranking',       description: '🏆 Top 5 populares' },
  { command: 'recomendar',    description: '⭐ Recomendar mod' },
  { command: 'ia',            description: '🤖 Chat con IA' },
  { command: 'video',         description: '🎬 Descargar TikTok' },
  { command: 'miniatura',     description: '🎨 Generar miniatura (admin)' },
  { command: 'scan',          description: '🔬 VirusTotal' },
  { command: 'subir',         description: '📤 Subir app' },
  { command: 'login',         description: '🔐 Vincular cuenta' },
  { command: 'recompensas',   description: '🎁 Puntos diarios' },
  { command: 'ban',           description: '🔨 Banear usuario (admin)' },
  { command: 'desban',        description: '✅ Desbanear usuario (admin)' },
  { command: 'admin',         description: '👑 Dar admin (admin)' },
];

// ─── Firebase helpers para códigos de login y recompensas ───

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
  if (!userId) return false;
  if (BOT_ADMINS.includes(String(userId))) return true;
  try {
    // Check in current chat
    const r1 = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: userId })
    }).then(r => r.json());
    if (['creator', 'administrator'].includes(r1.result?.status)) return true;
    // Also check in main group/channel if different
    if (String(chatId) !== String(TELEGRAM_CHAT_ID) && TELEGRAM_CHAT_ID) {
      const r2 = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, user_id: userId })
      }).then(r => r.json());
      if (['creator', 'administrator'].includes(r2.result?.status)) return true;
    }
    return false;
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

// ─── Descarga TikTok via ssstik.io ───
async function descargarTikTok(tikUrl) {
  const UA = 'Mozilla/5.0 (Linux; Android 12; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' };

  // Paso 1: obtener token tt
  const page = await fetch('https://ssstik.io/es', { headers: HEADERS });
  const html = await page.text();
  const ttMatch = html.match(/s_tt\s*=\s*['"]([\w+/=]+)['"]/i)
    || html.match(/name=["']tt["']\s+value=["']([^"']+)["']/i)
    || html.match(/"tt"\s*:\s*"([^"]+)"/i)
    || html.match(/value="([a-zA-Z0-9+/]{20,}={0,2})"/i);
  if (!ttMatch) throw new Error('ssstik.io no respondió correctamente');
  const tt = ttMatch[1];

  // Paso 2: solicitar descarga
  const formBody = new URLSearchParams({ id: tikUrl, locale: 'es', tt });
  const apiRes = await fetch('https://ssstik.io/abc?url=dl', {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer':        'https://ssstik.io/es',
      'Origin':         'https://ssstik.io',
      'HX-Request':     'true',
      'HX-Target':      'target',
      'HX-Trigger':     'undefined',
      'HX-Current-URL': 'https://ssstik.io/es',
    },
    body: formBody.toString(),
  });
  if (!apiRes.ok) throw new Error(`ssstik error ${apiRes.status}`);
  const result = await apiRes.text();

  // Extraer video: buscar primero sin watermark, luego cualquier mp4
  const videoMatch =
    result.match(/href="(https:\/\/[^"]+)"[^>]*>\s*(?:[^<]*(?:sin marca|without|no watermark|Download)[^<]*)<\/a>/i) ||
    result.match(/href="(https:\/\/[^"]*tikcdn[^"]*\.mp4[^"]*)"/i) ||
    result.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/i) ||
    result.match(/href="(https:\/\/[^"]+)"[^>]*class="[^"]*btn[^"]*"/i);
  const audioMatch = result.match(/href="(https:\/\/[^"]+\.mp3[^"]*)"/i);

  if (!videoMatch) throw new Error('Video no encontrado. Puede ser privado.');
  return { video: videoMatch[1], audio: audioMatch?.[1] || null };
}

async function uploadVideoToTelegram(chatId, fileUrl, caption) {
  const fileRes = await fetch(fileUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://ssstik.io/' }
  });
  if (!fileRes.ok) throw new Error(`No se pudo descargar: ${fileRes.status}`);
  const blob = await fileRes.blob();
  if (blob.size / 1024 / 1024 > 49) throw new Error('Archivo mayor a 50MB');
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', caption);
  form.append('parse_mode', 'Markdown');
  form.append('supports_streaming', 'true');
  form.append('video', blob, 'video.mp4');
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendVideo`, {
    method: 'POST', body: form,
  });
  return res.json();
}

async function handleCommand(msg, env = {}) {
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
      `⚡ *ASMODEO DEV Bot*\n\n` +
      `📦 /publicaciones · /buscar · /ranking · /recomendar\n` +
      `🤖 /ia — Chat con IA y recomendaciones\n` +
      `🎬 /video — Descargar TikTok sin marca de agua\n` +
      `🎨 /miniatura — Generar miniatura con IA _(admin)_\n` +
      `🔬 /scan — VirusTotal\n` +
      `📤 /subir — Subir app\n` +
      `🔐 /login · /recompensas\n` +
      `🛡️ /ban · /desban · /admin _(admin)_`
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

    const code = String(Math.floor(100000 + Math.random() * 900000));

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
        `📤 *Subir app — formato:*\n\`\`\`\n/subir\nNOMBRE: ...\nIMAGEN: https://...\nCATEGORIA: apk\nDESCRIPCION: ...\nLINK: https://...\nYOUTUBE: https://... (opcional)\nTAG: tag1, tag2 (opcional)\n\`\`\`\nCategorías: apk · games · script · tutorials`
      );
      return;
    }

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

  // ══ /video — Descarga TikTok via ssstik.io ══
  if (cmd === '/video') {
    if (!args) {
      await tgSend(chatId,
        `🎬 *Descargador TikTok*\n\n` +
        `Uso: /video <link de TikTok>\n\n` +
        `Ejemplo: /video https://vm.tiktok.com/xxxxx`
      );
      return;
    }
    const link = args.trim();
    if (!link.startsWith('http')) {
      await tgSend(chatId, '❌ Manda un link válido que empiece con https://');
      return;
    }
    await tgSend(chatId, '⏳ Descargando TikTok sin marca de agua...');
    try {
      const info = await descargarTikTok(link);
      const caption = '📱 *TikTok*\n🤖 _Sin marca de agua · ASMODEO DEV_';
      const r = await uploadVideoToTelegram(chatId, info.video, caption);
      if (!r.ok) {
        let msg = `✅ Video listo:\n\n${caption}\n\n[⬇️ Descargar video](${info.video})`;
        if (info.audio) msg += `\n[🎵 Descargar MP3](${info.audio})`;
        await tgSend(chatId, msg);
      }
    } catch(e) {
      await tgSend(chatId, `❌ No se pudo descargar: ${e.message}\n\nVerifica que el video no sea privado.`);
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
        await tgSend(chatId, `🔍 Sin resultados para "*${args}*" en ASMODEO DEV.\n\nIntenta con otra búsqueda.`);
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

  // ══ /ia ══
  if (cmd === '/ia') {
    if (!args) {
      await tgSend(chatId, `🤖 Uso: /ia <pregunta>\nEj: /ia recomienda mods de minecraft`);
      return;
    }

    await tgSend(chatId, '🤖 Pensando...');

    try {
      let postsContext = '';
      const isRecomendacion = args.toLowerCase().match(/recomiend|sugier|mejor|popular|top|que.*mod|que.*app/i);

      if (isRecomendacion) {
        const res  = await fbGet('posts?pageSize=50');
        const docs = res?.documents || [];
        const topPosts = docs
          .map(d => ({
            name:      d.fields?.name?.stringValue || '',
            category:  d.fields?.category?.stringValue || '',
            likes:     parseInt(d.fields?.likes?.integerValue || 0),
            downloads: parseInt(d.fields?.downloads?.integerValue || 0),
            slug:      d.fields?.slug?.stringValue || d.name.split('/').pop(),
            id:        d.name.split('/').pop(),
          }))
          .filter(p => p.name)
          .sort((a, b) => (b.likes + b.downloads) - (a.likes + a.downloads))
          .slice(0, 10);

        if (topPosts.length > 0) {
          postsContext = '\n\nPublicaciones disponibles en ASMODEO DEV (ordenadas por popularidad):\n' +
            topPosts.map((p, i) =>
              `${i+1}. ${p.name} (${p.category}) — ${p.likes} likes, ${p.downloads} descargas — URL: ${SITE_URL}/post/${p.slug || p.id}`
            ).join('\n');
        }
      }

      let respText = '';
      if (env?.AI) {
        const result = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            {
              role: 'system',
              content: `Eres el asistente oficial de ASMODEO DEV, la plataforma #1 de APK Mods, juegos y scripts para Android en Latinoamérica. Responde en español latinoamericano informal y amigable. Máx 5 oraciones. Si piden recomendaciones de mods o apps, SOLO menciona publicaciones de ASMODEO DEV con sus links directos.${postsContext}`,
            },
            { role: 'user', content: args },
          ],
          max_tokens: 400,
        });
        respText = result?.response || '';
      }

      if (!respText) {
        await tgSend(chatId, '❌ La IA no está disponible en este momento. Intenta de nuevo.');
        return;
      }

      await tgSend(chatId, `🤖 *IA:*\n\n${respText.trim()}`);

    } catch(e) {
      await tgSend(chatId, `❌ Error con la IA: ${e.message}`);
    }
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
      const topPosts = docs
        .map(d => ({
          id:        d.name.split('/').pop(),
          slug:      d.fields?.slug?.stringValue || d.name.split('/').pop(),
          name:      d.fields?.name?.stringValue || 'Sin título',
          desc:      (d.fields?.description?.stringValue || '').substring(0, 150),
          img:       d.fields?.imageUrl?.stringValue || null,
          likes:     parseInt(d.fields?.likes?.integerValue || 0),
          downloads: parseInt(d.fields?.downloads?.integerValue || 0),
          views:     parseInt(d.fields?.views?.integerValue || 0),
          category:  d.fields?.category?.stringValue || '',
        }))
        .filter(p => p.name !== 'Sin título')
        .sort((a,b) => (b.likes*3 + b.downloads*2 + b.views) - (a.likes*3 + a.downloads*2 + a.views))
        .slice(0, 5);

      if (!topPosts.length) { await tgSend(chatId, '📭 Sin publicaciones aún.'); return; }

      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      const lines  = topPosts.map((p, i) =>
        `${medals[i]} *${p.name}*\n` +
        `❤️ ${p.likes}  ⬇️ ${p.downloads}  👁️ ${p.views}\n` +
        `[📥 Descargar](${SITE_URL}/post/${p.slug})`
      );

      const top1 = topPosts[0];
      const caption = `🔥 *Top 5 más populares en ASMODEO DEV:*\n\n${lines.join('\n\n')}`;
      if (top1.img) {
        await tgSendPhoto(chatId, top1.img, caption);
      } else {
        await tgSend(chatId, caption);
      }
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

  // ══ /ban ══
  if (cmd === '/ban') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins.'); return; }
    if (!msg.reply_to_message) { await tgSend(chatId, '↩️ Responde el mensaje del usuario a banear.'); return; }
    const tid   = msg.reply_to_message.from.id;
    const tn    = msg.reply_to_message.from.first_name;
    const tun   = msg.reply_to_message.from.username ? `@${msg.reply_to_message.from.username}` : tn;
    const razon = args || 'Violación de reglas';
    const banRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/banChatMember`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: tid, revoke_messages: true }),
    }).then(r => r.json());
    if (banRes.ok) {
      const caption =
        `🔨 *USUARIO BANEADO*\n\n` +
        `👤 *${tn}* (${tun})\n` +
        `🆔 \`${tid}\`\n` +
        `📋 *Razón:* ${razon}\n` +
        `👮 *Por:* ${msg.from.first_name}`;
      try {
        const photosRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: tid, limit: 1 }),
        }).then(r => r.json());
        const fileId = photosRes.result?.photos?.[0]?.[0]?.file_id;
        if (fileId) await tgSendPhoto(chatId, fileId, caption);
        else await tgSend(chatId, caption);
      } catch { await tgSend(chatId, caption); }
    } else {
      await tgSend(chatId, `❌ No se pudo banear: ${banRes.description}`);
    }
    return;
  }

  // ══ /desban ══
  if (cmd === '/desban') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins.'); return; }
    if (!msg.reply_to_message) { await tgSend(chatId, '↩️ Responde el mensaje del usuario a desbanear.'); return; }
    const tid = msg.reply_to_message.from.id;
    const tn  = msg.reply_to_message.from.first_name;
    const tun = msg.reply_to_message.from.username ? `@${msg.reply_to_message.from.username}` : tn;
    const unbanRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/unbanChatMember`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: tid, only_if_banned: true }),
    }).then(r => r.json());
    if (unbanRes.ok) {
      await tgSend(chatId,
        `✅ *USUARIO DESBANEADO*\n\n` +
        `👤 *${tn}* (${tun})\n` +
        `🆔 \`${tid}\`\n` +
        `👮 *Por:* ${msg.from.first_name}`
      );
    } else {
      await tgSend(chatId, `❌ No se pudo desbanear: ${unbanRes.description}`);
    }
    return;
  }

  // ══ /admin ══
  if (cmd === '/admin') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins.'); return; }
    if (!msg.reply_to_message) { await tgSend(chatId, '↩️ Responde el mensaje del usuario.'); return; }
    const tid = msg.reply_to_message.from.id;
    const tn  = msg.reply_to_message.from.first_name;
    const tun = msg.reply_to_message.from.username ? `@${msg.reply_to_message.from.username}` : tn;
    const promRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/promoteChatMember`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, user_id: tid,
        can_delete_messages: true, can_restrict_members: true,
        can_invite_users: true, can_pin_messages: true,
      }),
    }).then(r => r.json());
    if (promRes.ok) {
      const caption =
        `👑 *NUEVO ADMIN*\n\n` +
        `👤 *${tn}* (${tun})\n` +
        `🆔 \`${tid}\`\n` +
        `👮 *Promovido por:* ${msg.from.first_name}`;
      try {
        const photosRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: tid, limit: 1 }),
        }).then(r => r.json());
        const fileId = photosRes.result?.photos?.[0]?.[0]?.file_id;
        if (fileId) await tgSendPhoto(chatId, fileId, caption);
        else await tgSend(chatId, caption);
      } catch { await tgSend(chatId, caption); }
    } else {
      await tgSend(chatId, `❌ No se pudo dar admin: ${promRes.description}`);
    }
    return;
  }

  // ══ /miniatura ══ (solo admins del grupo)
  if (cmd === '/miniatura') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins pueden generar miniaturas.'); return; }
    if (!args) { await tgSend(chatId, '❓ Uso: `/miniatura Nombre de la app`'); return; }
    await tgSend(chatId, '🎨 Generando miniatura con IA...');
    try {
      if (!env.AI) throw new Error('Workers AI no está habilitado en el Worker');
      const prompt = `Android app thumbnail for "${args}", dark gaming style, purple and black gradient background, glowing neon lights, dramatic lighting, high quality, professional design, no text, no watermark`;
      const result = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', { prompt });
      if (!result || !(result instanceof Uint8Array) && !result.image) throw new Error('No se generó imagen');
      const imgBytes = result instanceof Uint8Array ? result : new Uint8Array(result.image);
      const blob = new Blob([imgBytes], { type: 'image/png' });
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('caption', `🎨 *${args}*\n_Generada con Workers AI_`);
      form.append('parse_mode', 'Markdown');
      form.append('photo', blob, 'miniatura.png');
      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, { method: 'POST', body: form }).then(r => r.json());
      if (!tgRes.ok) throw new Error(tgRes.description || 'Error enviando imagen');
    } catch(e) {
      await tgSend(chatId, `❌ Error: ${e.message}`);
    }
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
    ONESIGNAL_APP_ID  = env.ONESIGNAL_APP_ID  || '';
    ONESIGNAL_REST_KEY= env.ONESIGNAL_REST_KEY || '';
    TELEGRAM_TOKEN    = env.TELEGRAM_TOKEN     || '';
    TELEGRAM_CHAT_ID  = env.TELEGRAM_CHAT_ID   || '';
    FIREBASE_PROJECT  = env.FIREBASE_PROJECT   || '';
    ALLOWED_ORIGIN    = env.ALLOWED_ORIGIN     || '';
    SITE_URL          = env.SITE_URL           || '';
    const envAdmins = (env.BOT_ADMINS || '').split(',').map(s => s.trim()).filter(Boolean);
    BOT_ADMINS = envAdmins.length ? envAdmins : ['8015489755'];
    CORS = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);

    if (url.pathname === '/telegram') {
      try {
        const update = await request.json();
        const msg    = update.message || update.channel_post;
        if (msg?.text?.startsWith('/')) await handleCommand(msg, env);
      } catch(e) {}
      return new Response('ok');
    }

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

        if (Date.now() > parseInt(entry.expires || '0')) {
          await fbDelete('loginCodes', code);
          return new Response(JSON.stringify({ ok: false, error: 'El código expiró. Usa /login en el bot para obtener uno nuevo.' }), {
            headers: { 'Content-Type': 'application/json', ...CORS }
          });
        }

        await fbDelete('loginCodes', code);

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

    if (url.pathname === '/setup') {
      await registrarComandos();
      return new Response(JSON.stringify({ ok: true, msg: 'Comandos registrados ✅' }), {
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    if (url.pathname === '/list-models') {
      const GEMINI_KEY = env.GEMINI_KEY;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
      const data = await res.json();
      const names = (data.models || []).map(m => m.name);
      return new Response(JSON.stringify({ models: names }), {
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

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

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    if (request.method === 'POST') {
      const origin = request.headers.get('Origin') || '';

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

      // ── Endpoints públicos de IA — no requieren origin check ──
      if (url.pathname === '/generate-description') {
        try {
          const { name, category } = await request.json();
          const catLabels = { apk:'APK Mod', games:'Juego Mod', script:'Script', tutorials:'Tutorial' };
          const cat = catLabels[category] || category;
          const ai = env.AI;
          if (!ai) throw new Error('Workers AI no está habilitado');

          const descResult = await ai.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
              { role: 'system', content: 'Escribe SOLO la descripción pedida. Sin JSON, sin etiquetas, sin explicaciones. Máximo 3 oraciones. Máximo 5 emojis en total.' },
              { role: 'user', content: `Descripción para "${name}" (${cat}) en español latinoamericano informal. Menciona que es mod/desbloqueado y tiene todo premium gratis. Termina invitando a descargar.` }
            ],
            max_tokens: 150,
          });
          let description = (descResult?.response || '').trim();
          description = description.replace(/([\u{1F300}-\u{1FFFF}][\s]*){6,}/gu, '✨ ');
          description = description.slice(0, 400);

          const tagsResult = await ai.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
              { role: 'system', content: 'Responde SOLO con 5 palabras clave separadas por comas. Sin puntos, sin explicaciones, sin emojis.' },
              { role: 'user', content: `5 tags en minúsculas para "${name}" (${cat}). Incluye el nombre de la app, tipo de mod y términos de búsqueda. Ejemplo: spotify,musica-gratis,sin-anuncios,premium,mod-apk` }
            ],
            max_tokens: 40,
          });
          const tagsRaw = (tagsResult?.response || '').trim();
          const tags = tagsRaw
            .split(',')
            .map(t => t.trim().toLowerCase().replace(/[^a-z0-9\-áéíóúñ]/g, '').slice(0, 20))
            .filter(t => t.length > 1)
            .slice(0, 5);

          return new Response(JSON.stringify({ ok: true, text: description, tags }), {
            headers: { 'Content-Type': 'application/json', ...CORS }
          });
        } catch(e) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
          });
        }
      }

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

      if (origin !== ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403 });

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

    return new Response('ASMODEO DEV Bot activo ⚡');
  }
};
