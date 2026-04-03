// functions/dl.js — Cloudflare Pages Function
// Proxy de descargas: sirve archivos de archive.org y MediaFire
// desde tu propio dominio sin que el usuario salga de la web.
//
// Uso: GET /dl?url=https://archive.org/download/...
//      GET /dl?url=https://www.mediafire.com/file/...

const ALLOWED_DOMAINS = [
  'archive.org',
  'ia800100.us.archive.org',
  'ia801300.us.archive.org',
  'ia803202.us.archive.org',
  'ia902606.us.archive.org',
  'mediafire.com',
  'download1337.mediafire.com',
  'download1526.mediafire.com',
  'download2389.mediafire.com',
]

function domainAllowed(urlStr) {
  try {
    const { hostname } = new URL(urlStr)
    return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  } catch { return false }
}

export async function onRequest(context) {
  const { request } = context
  const reqUrl = new URL(request.url)

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': 'Range',
      }
    })
  }

  const target = reqUrl.searchParams.get('url')

  if (!target) {
    return new Response('Falta el parámetro url', { status: 400 })
  }

  if (!domainAllowed(target)) {
    return new Response('Dominio no permitido', { status: 403 })
  }

  try {
    // Pasar header Range para soportar reanudación de descargas
    const upstreamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    }
    const range = request.headers.get('Range')
    if (range) upstreamHeaders['Range'] = range

    const upstream = await fetch(target, {
      method: 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
    })

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`Error del servidor origen: ${upstream.status}`, {
        status: upstream.status
      })
    }

    // Construir headers de respuesta
    const resHeaders = new Headers()
    resHeaders.set('Access-Control-Allow-Origin', '*')

    const ct = upstream.headers.get('Content-Type') || 'application/octet-stream'
    resHeaders.set('Content-Type', ct)

    const cl = upstream.headers.get('Content-Length')
    if (cl) resHeaders.set('Content-Length', cl)

    const cr = upstream.headers.get('Content-Range')
    if (cr) resHeaders.set('Content-Range', cr)

    // Forzar descarga — si upstream no lo trae, lo añadimos nosotros
    const cd = upstream.headers.get('Content-Disposition') || 'attachment'
    resHeaders.set('Content-Disposition', cd)

    // Cache 1 hora
    resHeaders.set('Cache-Control', 'public, max-age=3600')

    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    })

  } catch (err) {
    return new Response(`Error de proxy: ${err.message}`, { status: 502 })
  }
}
