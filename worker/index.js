let ONESIGNAL_APP_ID, ONESIGNAL_REST_KEY, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID;
let FIREBASE_PROJECT, ALLOWED_ORIGIN, SITE_URL, BOT_ADMINS, CORS;

const BOT_COMMANDS = [
  { command: 'start',      description: '⚡ Bienvenida' },
  { command: 'buscar',     description: '🔍 Buscar app' },
  { command: 'ranking',    description: '🏆 Top 5 populares' },
  { command: 'recomendar', description: '⭐ Recomendar mod' },
  { command: 'ia',         description: '🤖 Chat con IA' },
  { command: 'video',      description: '🎬 Descargar TikTok' },
  { command: 'miniatura',  description: '🎨 Generar miniatura (admin)' },
  { command: 'recompensas',description: '🎁 Puntos diarios' },
  { command: 'ban',        description: '🔨 Banear usuario (admin)' },
  { command: 'desban',     description: '✅ Desbanear usuario (admin)' },
  { command: 'admin',      description: '👑 Dar admin (admin)' },
];

const CATS = { apk: '📱', games: '🎮', script: '⚙️', tutorials: '📚' };
const CATS_LABEL = { apk: '📱 APK Mod', games: '🎮 Juegos Mod', script: '⚙️ Scripts', tutorials: '📚 Tutoriales' };

// ─── Firebase helpers ───
const fbUrl = path =>
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${path}`;

function toFields(obj) {
  const f = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string')        f[k] = { stringValue: v };
    else if (typeof v === 'number')   f[k] = { integerValue: String(v) };
    else if (typeof v === 'boolean')  f[k] = { booleanValue: v };
    else if (v === null)              f[k] = { nullValue: null };
    else                              f[k] = { stringValue: String(v) };
  }
  return f;
}

function fromFields(fields) {
  if (!fields) return null;
  const out = {};
  for (const [k, v] of Object.entries(fields))
    out[k] = v.stringValue ?? v.integerValue ?? v.booleanValue ?? null;
  return out;
}

async function fbGet(path) {
  const res = await fetch(fbUrl(path));
  return res.ok ? res.json() : null;
}

async function fbGetDoc(col, id) {
  const data = await fbGet(`${col}/${id}`);
  return data?.fields ? fromFields(data.fields) : null;
}

async function fbSet(col, id, fields) {
  await fetch(
    fbUrl(`${col}/${id}?`) + Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&'),
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: toFields(fields) }) }
  );
}

async function fbCreate(col, data) {
  const res = await fetch(fbUrl(col), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) })
  });
  return res.json();
}

async function fbDelete(col, id) {
  await fetch(fbUrl(`${col}/${id}`), { method: 'DELETE' });
}

// ─── Telegram helpers ───
async function tgCall(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return res.json();
}

const tgSend = (chatId, text, extra = {}) =>
  tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true, ...extra });

async function tgSendPhoto(chatId, photo, caption, extra = {}) {
  const res = await tgCall('sendPhoto', { chat_id: chatId, photo, caption, parse_mode: 'Markdown', ...extra });
  if (!res.ok) await tgSend(chatId, caption);
}

async function getUserPhoto(userId) {
  const r = await tgCall('getUserProfilePhotos', { user_id: userId, limit: 1 });
  return r.result?.photos?.[0]?.[0]?.file_id || null;
}

// ─── Auth helpers ───
async function isAdmin(chatId, userId) {
  if (!userId) return false;
  if (BOT_ADMINS.includes(String(userId))) return true;
  const check = async (cid) => {
    const r = await tgCall('getChatMember', { chat_id: cid, user_id: userId });
    return ['creator', 'administrator'].includes(r.result?.status);
  };
  if (await check(chatId)) return true;
  if (String(chatId) !== String(TELEGRAM_CHAT_ID) && TELEGRAM_CHAT_ID)
    return check(TELEGRAM_CHAT_ID);
  return false;
}

// ─── TikTok downloader ───
async function descargarTikTok(tikUrl) {
  const UA = 'Mozilla/5.0 (Linux; Android 12; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  const H  = { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' };
  const html = await fetch('https://ssstik.io/es', { headers: H }).then(r => r.text());
  const ttM  = html.match(/s_tt\s*=\s*['"]([\w+/=]+)['"]/i)
    || html.match(/name=["']tt["']\s+value=["']([^"']+)["']/i)
    || html.match(/"tt"\s*:\s*"([^"]+)"/i)
    || html.match(/value="([a-zA-Z0-9+/]{20,}={0,2})"/i);
  if (!ttM) throw new Error('ssstik.io no respondió correctamente');
  const result = await fetch('https://ssstik.io/abc?url=dl', {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://ssstik.io/es', 'Origin': 'https://ssstik.io', 'HX-Request': 'true', 'HX-Target': 'target', 'HX-Trigger': 'undefined', 'HX-Current-URL': 'https://ssstik.io/es' },
    body: new URLSearchParams({ id: tikUrl, locale: 'es', tt: ttM[1] }).toString(),
  });
  if (!result.ok) throw new Error(`ssstik error ${result.status}`);
  const html2 = await result.text();
  const videoM = html2.match(/href="(https:\/\/[^"]+)"[^>]*>\s*(?:[^<]*(?:sin marca|without|no watermark|Download)[^<]*)<\/a>/i)
    || html2.match(/href="(https:\/\/[^"]*tikcdn[^"]*\.mp4[^"]*)"/i)
    || html2.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/i)
    || html2.match(/href="(https:\/\/[^"]+)"[^>]*class="[^"]*btn[^"]*"/i);
  if (!videoM) throw new Error('Video no encontrado. Puede ser privado.');
  const audioM = html2.match(/href="(https:\/\/[^"]+\.mp3[^"]*)"/i);
  return { video: videoM[1], audio: audioM?.[1] || null };
}

async function uploadVideoToTelegram(chatId, fileUrl, caption) {
  const fileRes = await fetch(fileUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://ssstik.io/' } });
  if (!fileRes.ok) throw new Error(`No se pudo descargar: ${fileRes.status}`);
  const blob = await fileRes.blob();
  if (blob.size / 1024 / 1024 > 49) throw new Error('Archivo mayor a 50MB');
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', caption);
  form.append('parse_mode', 'Markdown');
  form.append('supports_streaming', 'true');
  form.append('video', blob, 'video.mp4');
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendVideo`, { method: 'POST', body: form }).then(r => r.json());
}

// ─── Notificaciones ───
async function enviarOneSignal(post) {
  return fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${ONESIGNAL_REST_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['Total Subscriptions'],
      headings: { en: `${CATS[post.category] || '⚡'} ${post.name || post.title}` },
      contents: { en: (post.description || '').substring(0, 100) },
      big_picture: post.imageUrl || undefined,
      url: `${SITE_URL}/post/${post.id}`,
      chrome_web_icon: `${SITE_URL}/icon-192x192.png`,
    })
  }).then(r => r.json());
}

async function enviarOneSignalUsuario(playerId, title, message, pushUrl) {
  return fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${ONESIGNAL_REST_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [playerId],
      headings: { en: title },
      contents: { en: message || ' ' },
      url: pushUrl || SITE_URL,
      chrome_web_icon: `${SITE_URL}/icon-192x192.png`,
    })
  }).then(r => r.json());
}

async function anunciarTelegram(post) {
  const name = post.name || post.title || 'Nueva publicación';
  const desc = (post.description || '').substring(0, 200);
  const text = `⚡ *ASMODEO DEV — Nueva publicación*\n\n*${name}*\n${CATS_LABEL[post.category] || '⚡'}\n\n${desc}${desc.length >= 200 ? '...' : ''}\n\n[📥 Ver y Descargar](${SITE_URL}/post/${post.id})`;
  if (post.imageUrl) await tgSendPhoto(TELEGRAM_CHAT_ID, post.imageUrl, text);
  else await tgSend(TELEGRAM_CHAT_ID, text);
}

// ─── Handler de comandos ───
async function handleCommand(msg, env = {}) {
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id);
  const parts  = (msg.text || '').trim().split(/\s+/);
  const cmd    = parts[0].split('@')[0].toLowerCase();
  const args   = parts.slice(1).join(' ');

  if (cmd === '/start') {
    await tgSend(chatId,
      `⚡ *¡Bienvenido a ASMODEO DEV Bot!*\n\nTu fuente de APKs Mod, Juegos y Scripts gratis.\n\n📌 Escribe */* para ver todos los comandos.\n\n🌐 [Visitar web](${SITE_URL})`
    );
    return;
  }

  if (cmd === '/buscar') {
    if (!args) { await tgSend(chatId, '❓ Uso: `/buscar nombre`'); return; }
    try {
      const docs = (await fbGet('posts?pageSize=100'))?.documents || [];
      const q = args.toLowerCase();
      const matches = docs.filter(d => {
        const n = d.fields?.name?.stringValue || '';
        const desc = d.fields?.description?.stringValue || '';
        return n.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      }).slice(0, 5);
      if (!matches.length) { await tgSend(chatId, `🔍 Sin resultados para "*${args}*".`); return; }
      const lines = matches.map(d => {
        const cat = d.fields?.category?.stringValue || '';
        const id  = d.name.split('/').pop();
        return `${CATS[cat] || '⚡'} *${d.fields?.name?.stringValue || 'Sin título'}*\n[Ver](${SITE_URL}/post/${id})`;
      });
      await tgSend(chatId, `🔍 *Resultados para "${args}":*\n\n${lines.join('\n\n')}`);
    } catch { await tgSend(chatId, '❌ Error al buscar.'); }
    return;
  }

  if (cmd === '/ranking') {
    try {
      const docs = (await fbGet('posts?pageSize=50'))?.documents || [];
      const sorted = docs
        .map(d => ({ ...d.fields, id: d.name.split('/').pop() }))
        .sort((a, b) => parseInt(b.likes?.integerValue || 0) - parseInt(a.likes?.integerValue || 0))
        .slice(0, 5);
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      const lines  = sorted.map((p, i) =>
        `${medals[i]} *${p.name?.stringValue || 'Sin título'}*\n❤️ ${p.likes?.integerValue || 0}\n[Ver](${SITE_URL}/post/${p.id})`
      );
      await tgSend(chatId, `🏆 *Top 5:*\n\n${lines.join('\n\n')}`);
    } catch { await tgSend(chatId, '❌ Error.'); }
    return;
  }

  if (cmd === '/recomendar') {
    try {
      const docs = (await fbGet('posts?pageSize=50'))?.documents || [];
      const top = docs
        .map(d => ({
          id:        d.name.split('/').pop(),
          slug:      d.fields?.slug?.stringValue || d.name.split('/').pop(),
          name:      d.fields?.name?.stringValue || '',
          img:       d.fields?.imageUrl?.stringValue || null,
          likes:     parseInt(d.fields?.likes?.integerValue || 0),
          downloads: parseInt(d.fields?.downloads?.integerValue || 0),
          views:     parseInt(d.fields?.views?.integerValue || 0),
        }))
        .filter(p => p.name)
        .sort((a, b) => (b.likes * 3 + b.downloads * 2 + b.views) - (a.likes * 3 + a.downloads * 2 + a.views))
        .slice(0, 5);
      if (!top.length) { await tgSend(chatId, '📭 Sin publicaciones aún.'); return; }
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      const lines  = top.map((p, i) =>
        `${medals[i]} *${p.name}*\n❤️ ${p.likes}  ⬇️ ${p.downloads}  👁️ ${p.views}\n[📥 Descargar](${SITE_URL}/post/${p.slug})`
      );
      const caption = `🔥 *Top 5 más populares en ASMODEO DEV:*\n\n${lines.join('\n\n')}`;
      if (top[0].img) await tgSendPhoto(chatId, top[0].img, caption);
      else await tgSend(chatId, caption);
    } catch { await tgSend(chatId, '❌ Error.'); }
    return;
  }

  if (cmd === '/ia') {
    if (!args) { await tgSend(chatId, `🤖 Uso: /ia <pregunta>\nEj: /ia recomienda mods de minecraft`); return; }
    await tgSend(chatId, '🤖 Pensando...');
    try {
      let postsContext = '';
      if (args.toLowerCase().match(/recomiend|sugier|mejor|popular|top|que.*mod|que.*app/i)) {
        const docs = (await fbGet('posts?pageSize=50'))?.documents || [];
        const top = docs
          .map(d => ({
            name:      d.fields?.name?.stringValue || '',
            category:  d.fields?.category?.stringValue || '',
            likes:     parseInt(d.fields?.likes?.integerValue || 0),
            downloads: parseInt(d.fields?.downloads?.integerValue || 0),
            slug:      d.fields?.slug?.stringValue || d.name.split('/').pop(),
          }))
          .filter(p => p.name)
          .sort((a, b) => (b.likes + b.downloads) - (a.likes + a.downloads))
          .slice(0, 10);
        if (top.length)
          postsContext = '\n\nPublicaciones disponibles (ordenadas por popularidad):\n' +
            top.map((p, i) => `${i+1}. ${p.name} (${p.category}) — URL: ${SITE_URL}/post/${p.slug}`).join('\n');
      }
      if (!env?.AI) { await tgSend(chatId, '❌ IA no disponible.'); return; }
      const result = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: `Eres el asistente oficial de ASMODEO DEV, plataforma de APK Mods y scripts para Android en Latinoamérica. Responde en español latinoamericano informal. Máx 5 oraciones. Si piden recomendaciones SOLO menciona publicaciones de ASMODEO DEV con sus links.${postsContext}` },
          { role: 'user', content: args },
        ],
        max_tokens: 400,
      });
      const text = result?.response?.trim();
      if (!text) { await tgSend(chatId, '❌ La IA no respondió. Intenta de nuevo.'); return; }
      await tgSend(chatId, `🤖 *IA:*\n\n${text}`);
    } catch(e) { await tgSend(chatId, `❌ Error con la IA: ${e.message}`); }
    return;
  }

  if (cmd === '/video') {
    if (!args || !args.startsWith('http')) {
      await tgSend(chatId, `🎬 *Descargador TikTok*\n\nUso: /video <link>\nEjemplo: /video https://vm.tiktok.com/xxxxx`);
      return;
    }
    await tgSend(chatId, '⏳ Descargando TikTok sin marca de agua...');
    try {
      const info = await descargarTikTok(args.trim());
      const caption = '📱 *TikTok*\n🤖 _Sin marca de agua · ASMODEO DEV_';
      const r = await uploadVideoToTelegram(chatId, info.video, caption);
      if (!r.ok) {
        let m = `✅ Video listo:\n\n${caption}\n\n[⬇️ Descargar video](${info.video})`;
        if (info.audio) m += `\n[🎵 Descargar MP3](${info.audio})`;
        await tgSend(chatId, m);
      }
    } catch(e) { await tgSend(chatId, `❌ No se pudo descargar: ${e.message}\n\nVerifica que el video no sea privado.`); }
    return;
  }

  if (cmd === '/recompensas') {
    const key = `${userId}_${new Date().toISOString().slice(0, 10)}`;
    const already = await fbGetDoc('rewards', key);
    if (already) await tgSend(chatId, `🎁 Ya recogiste tus puntos hoy ✅\nVuelve mañana.`);
    else {
      await fbSet('rewards', key, { uid: String(userId), date: key, claimed: true });
      await tgSend(chatId, `🎁 *¡+1 punto ganado!*\n\nAcumula 10 y canjéalos por acceso VIP.\n_Vuelve mañana._`);
    }
    return;
  }

  if (cmd === '/ban') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins.'); return; }
    if (!msg.reply_to_message) { await tgSend(chatId, '↩️ Responde el mensaje del usuario a banear.'); return; }
    const t  = msg.reply_to_message.from;
    const tun = t.username ? `@${t.username}` : t.first_name;
    const banRes = await tgCall('banChatMember', { chat_id: chatId, user_id: t.id, revoke_messages: true });
    if (banRes.ok) {
      const caption = `🔨 *USUARIO BANEADO*\n\n👤 *${t.first_name}* (${tun})\n🆔 \`${t.id}\`\n📋 *Razón:* ${args || 'Violación de reglas'}\n👮 *Por:* ${msg.from.first_name}`;
      const fileId = await getUserPhoto(t.id);
      if (fileId) await tgSendPhoto(chatId, fileId, caption);
      else await tgSend(chatId, caption);
    } else await tgSend(chatId, `❌ No se pudo banear: ${banRes.description}`);
    return;
  }

  if (cmd === '/desban') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins.'); return; }
    if (!msg.reply_to_message) { await tgSend(chatId, '↩️ Responde el mensaje del usuario a desbanear.'); return; }
    const t   = msg.reply_to_message.from;
    const tun = t.username ? `@${t.username}` : t.first_name;
    const res = await tgCall('unbanChatMember', { chat_id: chatId, user_id: t.id, only_if_banned: true });
    if (res.ok) await tgSend(chatId, `✅ *USUARIO DESBANEADO*\n\n👤 *${t.first_name}* (${tun})\n🆔 \`${t.id}\`\n👮 *Por:* ${msg.from.first_name}`);
    else await tgSend(chatId, `❌ No se pudo desbanear: ${res.description}`);
    return;
  }

  if (cmd === '/admin') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins.'); return; }
    if (!msg.reply_to_message) { await tgSend(chatId, '↩️ Responde el mensaje del usuario.'); return; }
    const t   = msg.reply_to_message.from;
    const tun = t.username ? `@${t.username}` : t.first_name;
    const res = await tgCall('promoteChatMember', {
      chat_id: chatId, user_id: t.id,
      can_delete_messages: true, can_restrict_members: true,
      can_invite_users: true, can_pin_messages: true,
    });
    if (res.ok) {
      const caption = `👑 *NUEVO ADMIN*\n\n👤 *${t.first_name}* (${tun})\n🆔 \`${t.id}\`\n👮 *Promovido por:* ${msg.from.first_name}`;
      const fileId  = await getUserPhoto(t.id);
      if (fileId) await tgSendPhoto(chatId, fileId, caption);
      else await tgSend(chatId, caption);
    } else await tgSend(chatId, `❌ No se pudo dar admin: ${res.description}`);
    return;
  }

  if (cmd === '/miniatura') {
    if (!await isAdmin(chatId, userId)) { await tgSend(chatId, '⛔ Solo admins pueden generar miniaturas.'); return; }
    if (!args) { await tgSend(chatId, '❓ Uso: `/miniatura Nombre de la app`'); return; }
    await tgSend(chatId, '🎨 Generando miniatura con IA...');
    try {
      if (!env.AI) throw new Error('Workers AI no está habilitado');
      const prompt = `Android app thumbnail for "${args}", dark gaming style, purple and black gradient background, glowing neon lights, dramatic lighting, high quality, professional design, no text, no watermark`;
      const result = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', { prompt });
      if (!result) throw new Error('No se generó imagen');
      const imgBytes = result instanceof Uint8Array ? result : new Uint8Array(result.image);
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('caption', `🎨 *${args}*\n_Generada con Workers AI_`);
      form.append('parse_mode', 'Markdown');
      form.append('photo', new Blob([imgBytes], { type: 'image/png' }), 'miniatura.png');
      const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, { method: 'POST', body: form }).then(r => r.json());
      if (!r.ok) throw new Error(r.description || 'Error enviando imagen');
    } catch(e) { await tgSend(chatId, `❌ Error: ${e.message}`); }
    return;
  }
}

// ─── Export principal ───
export default {
  async fetch(request, env) {
    ONESIGNAL_APP_ID   = env.ONESIGNAL_APP_ID  || '';
    ONESIGNAL_REST_KEY = env.ONESIGNAL_REST_KEY || '';
    TELEGRAM_TOKEN     = env.TELEGRAM_TOKEN     || '';
    TELEGRAM_CHAT_ID   = env.TELEGRAM_CHAT_ID   || '';
    FIREBASE_PROJECT   = env.FIREBASE_PROJECT   || '';
    ALLOWED_ORIGIN     = env.ALLOWED_ORIGIN     || '';
    SITE_URL           = env.SITE_URL           || '';
    const envAdmins = (env.BOT_ADMINS || '').split(',').map(s => s.trim()).filter(Boolean);
    BOT_ADMINS = envAdmins.length ? envAdmins : ['8015489755'];
    CORS = {
      'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);

    if (url.pathname === '/telegram') {
      try {
        const update = await request.json();
        const msg = update.message || update.channel_post;
        if (msg?.text?.startsWith('/')) await handleCommand(msg, env);
      } catch {}
      return new Response('ok');
    }

    if (url.pathname === '/verify-login' && request.method === 'POST') {
      try {
        const { uid, code } = await request.json();
        if (!uid || !code) return new Response(JSON.stringify({ ok: false, error: 'Faltan datos.' }), { headers: { 'Content-Type': 'application/json', ...CORS } });
        const entry = await fbGetDoc('loginCodes', code);
        if (!entry) return new Response(JSON.stringify({ ok: false, error: 'Código incorrecto o ya usado.' }), { headers: { 'Content-Type': 'application/json', ...CORS } });
        if (Date.now() > parseInt(entry.expires || '0')) {
          await fbDelete('loginCodes', code);
          return new Response(JSON.stringify({ ok: false, error: 'El código expiró. Usa /login en el bot.' }), { headers: { 'Content-Type': 'application/json', ...CORS } });
        }
        await fbDelete('loginCodes', code);
        try { await tgSend(entry.chatId, `✅ *¡Cuenta vinculada exitosamente!*\n\nTu Telegram está conectado con ASMODEO DEV.\n\n🌐 [Ver mi perfil](${SITE_URL})`); } catch {}
        return new Response(JSON.stringify({ ok: true, telegramId: entry.userId, telegramName: entry.firstName, chatId: entry.chatId }), { headers: { 'Content-Type': 'application/json', ...CORS } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
      }
    }

    if (url.pathname === '/setup') {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setMyCommands`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: BOT_COMMANDS })
      });
      return new Response(JSON.stringify({ ok: true, msg: 'Comandos registrados ✅' }), { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    if (url.pathname === '/sitemap.xml') {
      try {
        const docs = (await fbGet('posts?pageSize=500'))?.documents || [];
        const posts = docs
          .filter(d => d.fields?.status?.stringValue === 'active')
          .map(d => ({ id: d.name.split('/').pop(), updatedAt: d.updateTime || d.createTime || '' }));
        const staticUrls = [
          { loc: SITE_URL,                  priority: '1.0', freq: 'daily'  },
          { loc: `${SITE_URL}/feed`,        priority: '0.9', freq: 'hourly' },
          { loc: `${SITE_URL}/feed/apk`,    priority: '0.8', freq: 'hourly' },
          { loc: `${SITE_URL}/feed/games`,  priority: '0.8', freq: 'hourly' },
          { loc: `${SITE_URL}/feed/script`, priority: '0.7', freq: 'daily'  },
          { loc: `${SITE_URL}/search`,      priority: '0.6', freq: 'daily'  },
        ];
        const all = [
          ...staticUrls,
          ...posts.map(p => ({ loc: `${SITE_URL}/post/${p.id}`, priority: '0.8', freq: 'weekly', lastmod: p.updatedAt.split('T')[0] || '' }))
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>\n    ` : ''}<changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}\n</urlset>`;
        return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' } });
      } catch {
        return new Response('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', { headers: { 'Content-Type': 'application/xml' } });
      }
    }

    if (url.pathname === '/health')
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), { headers: { 'Content-Type': 'application/json', ...CORS } });

    if (request.method === 'POST') {
      if (url.pathname === '/notify' || url.pathname === '/') {
        try {
          const body = await request.json();
          const post = body.post || body;
          await Promise.all([enviarOneSignal(post), anunciarTelegram(post)]);
          return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...CORS } });
        } catch(e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS }); }
      }

      if (url.pathname === '/generate-description') {
        try {
          const { name, category } = await request.json();
          const ai = env.AI;
          if (!ai) throw new Error('Workers AI no está habilitado');
          const catLabel = { apk:'APK Mod', games:'Juego Mod', script:'Script', tutorials:'Tutorial' }[category] || category;
          const [descResult, tagsResult] = await Promise.all([
            ai.run('@cf/meta/llama-3-8b-instruct', {
              messages: [
                { role: 'system', content: 'Escribe SOLO la descripción pedida. Sin JSON, sin etiquetas, sin explicaciones. Máximo 3 oraciones. Máximo 5 emojis en total.' },
                { role: 'user',   content: `Descripción para "${name}" (${catLabel}) en español latinoamericano informal. Menciona que es mod/desbloqueado y tiene todo premium gratis. Termina invitando a descargar.` }
              ], max_tokens: 150,
            }),
            ai.run('@cf/meta/llama-3-8b-instruct', {
              messages: [
                { role: 'system', content: 'Responde SOLO con 5 palabras clave separadas por comas. Sin puntos, sin explicaciones, sin emojis.' },
                { role: 'user',   content: `5 tags en minúsculas para "${name}" (${catLabel}). Incluye el nombre, tipo de mod y términos de búsqueda. Ejemplo: spotify,musica-gratis,sin-anuncios,premium,mod-apk` }
              ], max_tokens: 40,
            }),
          ]);
          let description = (descResult?.response || '').trim().replace(/([\u{1F300}-\u{1FFFF}][\s]*){6,}/gu, '✨ ').slice(0, 400);
          const tags = (tagsResult?.response || '').trim().split(',').map(t => t.trim().toLowerCase().replace(/[^a-z0-9\-áéíóúñ]/g, '').slice(0, 20)).filter(t => t.length > 1).slice(0, 5);
          return new Response(JSON.stringify({ ok: true, text: description, tags }), { headers: { 'Content-Type': 'application/json', ...CORS } });
        } catch(e) { return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }); }
      }

      if (url.pathname === '/generate-comments') {
        try {
          const { postName, postDescription, postCategory, username } = await request.json();
          const ai = env.AI;
          if (!ai) throw new Error('Workers AI no está habilitado');
          const catLabel = { apk:'APK Mod', games:'Juego Mod', script:'Script', tutorials:'Tutorial' }[postCategory] || postCategory;
          const result = await ai.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
              { role: 'system', content: 'Eres un usuario latinoamericano real en una comunidad de mods Android. Escribes comentarios cortos y naturales en español informal.' },
              { role: 'user',   content: `Eres ${username}, usuario latinoamericano. Escribe UN comentario corto (máx 2 oraciones, 20-40 palabras) sobre este post. Natural, informal, sin comillas.\n\nPost: "${postName}" (${catLabel})\n${postDescription ? `Descripción: ${postDescription.slice(0, 150)}` : ''}` }
            ], max_tokens: 120,
          });
          const text = result?.response?.trim();
          if (!text) throw new Error('La IA no generó respuesta');
          return new Response(JSON.stringify({ ok: true, text }), { headers: { 'Content-Type': 'application/json', ...CORS } });
        } catch(e) { return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }); }
      }

      if (request.headers.get('Origin') !== ALLOWED_ORIGIN)
        return new Response('Forbidden', { status: 403 });

      if (url.pathname === '/push-user') {
        try {
          const { playerId, title, message, url: pushUrl } = await request.json();
          if (!playerId) return new Response('Missing playerId', { status: 400, headers: CORS });
          const data = await enviarOneSignalUsuario(playerId, title, message, pushUrl);
          return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', ...CORS } });
        } catch(e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS }); }
      }
    }

    return new Response('ASMODEO DEV Bot activo ⚡');
  }
};
