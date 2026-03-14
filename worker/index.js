// worker/index.js
// ════════════════════════════════════════
//  CLOUDFLARE WORKER — Notificaciones + Bot Telegram
// ════════════════════════════════════════
//
//  Variables de entorno en Cloudflare Dashboard → Workers → Settings → Variables:
//    ONESIGNAL_APP_ID      - ID de tu app en OneSignal
//    ONESIGNAL_REST_KEY    - REST API Key de OneSignal
//    TELEGRAM_BOT_TOKEN    - Token del bot de Telegram
//    TELEGRAM_CHANNEL_ID   - ID del canal de Telegram (ej: -1001234567890)
//    WORKER_SECRET         - Secret para autenticar llamadas desde tu frontend
//
// ════════════════════════════════════════

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default {
  async fetch(request, env) {
    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    const url = new URL(request.url)
    const path = url.pathname

    // ─── RUTAS ───
    if (path === '/notify' && request.method === 'POST') {
      return handleNotify(request, env)
    }
    if (path === '/telegram' && request.method === 'POST') {
      return handleTelegramWebhook(request, env)
    }
    if (path === '/health') {
      return json({ status: 'ok', time: new Date().toISOString() })
    }

    return json({ error: 'Not found' }, 404)
  }
}

// ─── HANDLER: Notificaciones ───
async function handleNotify(request, env) {
  try {
    const body = await request.json()
    const { type, ...payload } = body

    switch (type) {
      case 'notify_user':
        await sendOneSignalToPlayer(env, payload.playerId, {
          title: payload.title,
          message: payload.message,
          url: payload.url,
        })
        break

      case 'notify_admins':
        await sendTelegramMessage(env,
          `⚠️ <b>Contenido sospechoso detectado</b>\n` +
          `📝 Post: ${payload.postName || payload.postId}\n` +
          `🔍 Razón: ${payload.reason || 'Sin razón'}\n` +
          `⚡ Issues: ${(payload.issues || []).join(', ')}`
        )
        break

      case 'telegram_post':
        await publishPostToTelegram(env, payload.post)
        break

      default:
        return json({ error: 'Unknown type' }, 400)
    }

    return json({ success: true })
  } catch (err) {
    console.error('notify error:', err)
    return json({ error: err.message }, 500)
  }
}

// ─── HANDLER: Webhook del Bot de Telegram ───
async function handleTelegramWebhook(request, env) {
  try {
    const update = await request.json()
    const msg = update.message || update.channel_post
    if (!msg) return json({ ok: true })

    const text = msg.text || ''
    const chatId = msg.chat.id
    const from = msg.from

    // Comandos del bot
    if (text.startsWith('/start')) {
      await sendTelegramTo(env, chatId,
        '👋 Hola! Soy el bot de <b>AsmodeoDev</b>.\n' +
        'Te mantendré al tanto de las últimas publicaciones.\n\n' +
        '📱 Visita: https://asmodeodev.com'
      )
    }
    else if (text.startsWith('/latest')) {
      await sendTelegramTo(env, chatId,
        '🔥 Ver las últimas publicaciones:\nhttps://asmodeodev.com/feed'
      )
    }
    // Comandos admin (puedes añadir validación de adminId)
    else if (text.startsWith('/ban ')) {
      const userId = text.split(' ')[1]
      await sendTelegramTo(env, chatId, `🚫 Comando ban recibido para usuario: ${userId}\n⚠️ Implementa la lógica de baneo aquí.`)
    }

    return json({ ok: true })
  } catch (err) {
    console.error('telegram webhook error:', err)
    return json({ error: err.message }, 500)
  }
}

// ─── ONESIGNAL: Notificar a un jugador específico ───
async function sendOneSignalToPlayer(env, playerId, { title, message, url }) {
  if (!env.ONESIGNAL_APP_ID || !env.ONESIGNAL_REST_KEY) {
    console.warn('OneSignal no configurado')
    return
  }

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${env.ONESIGNAL_REST_KEY}`,
    },
    body: JSON.stringify({
      app_id: env.ONESIGNAL_APP_ID,
      include_player_ids: [playerId],
      headings: { es: title, en: title },
      contents: { es: message, en: message },
      url: url || 'https://asmodeodev.com',
      chrome_web_icon: 'https://asmodeodev.com/icon-192x192.png',
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`OneSignal error: ${JSON.stringify(err)}`)
  }
  return res.json()
}

// ─── TELEGRAM: Publicar nuevo post en canal ───
async function publishPostToTelegram(env, post) {
  if (!post) return
  const msg =
    `🚀 <b>Nueva publicación en AsmodeoDev</b>\n\n` +
    `📱 <b>${escapeHtml(post.name)}</b>\n` +
    `📁 Categoría: ${post.category}\n\n` +
    `📝 ${escapeHtml((post.description || '').slice(0, 200))}\n\n` +
    `⬇️ <a href="${post.downloadUrl}">Descargar</a> | ` +
    `🔗 <a href="https://asmodeodev.com/post/${post.id}">Ver en web</a>`

  await sendTelegramMessage(env, msg, post.imageUrl)
}

// ─── TELEGRAM: Enviar mensaje al canal principal ───
async function sendTelegramMessage(env, text, photoUrl = null) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHANNEL_ID) {
    console.warn('Telegram no configurado')
    return
  }
  return sendTelegramTo(env, env.TELEGRAM_CHANNEL_ID, text, photoUrl)
}

// ─── TELEGRAM: Enviar a chat específico ───
async function sendTelegramTo(env, chatId, text, photoUrl = null) {
  const base = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`

  if (photoUrl) {
    // Enviar foto con caption
    await fetch(`${base}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: text,
        parse_mode: 'HTML',
      }),
    })
  } else {
    await fetch(`${base}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    })
  }
}

// ─── UTILS ───
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
