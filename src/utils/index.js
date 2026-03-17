// src/utils/index.js
// ════════════════════════════════════════
//  UTILIDADES GENERALES
// ════════════════════════════════════════

/**
 * Extrae el ID de YouTube de una URL
 */
export function getYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  return m ? m[1] : null
}

/**
 * Genera miniatura de YouTube
 */
export function getYouTubeThumbnail(url, quality = 'hqdefault') {
  const id = getYouTubeId(url)
  if (!id) return null
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`
}

/**
 * Formatea número grande:
 * 1_000_000_000 → "1B"  |  1_500_000_000 → "1.5B"
 * 1_000_000     → "1M"  |  1_500_000     → "1.5M"
 * 5_000         → "5K"  |  5_400         → "5.4K"
 * 999           → "999"
 */
export function formatNumber(n) {
  if (!n || isNaN(n)) return '0'
  const num = Number(n)
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace('.0', '') + 'B'
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (num >= 5_000)         return (num / 1_000).toFixed(1).replace('.0', '') + 'K'
  return num.toLocaleString('es')
}

/**
 * Trunca texto a N caracteres con "..."
 */
export function truncate(text, max = 120) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

/**
 * Valida si una URL es de un dominio conocido y seguro para descargas
 */
export function isSafeDownloadUrl(url) {
  if (!url) return false
  try {
    const { hostname } = new URL(url)
    const SAFE_HOSTS = [
      'drive.google.com', 'docs.google.com',
      'mega.nz', 'mega.co.nz',
      'mediafire.com', 'www.mediafire.com',
      'dropbox.com', 'www.dropbox.com',
      'github.com', 'raw.githubusercontent.com',
      'gitlab.com',
      'archive.org',
      'sourceforge.net',
    ]
    return SAFE_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))
  } catch {
    return false
  }
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Genera un ID de color desde un string (para avatares sin foto)
 */
export function stringToColor(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = hash % 360
  return `hsl(${h}, 65%, 45%)`
}

/**
 * Copia texto al portapapeles
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fallback
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return true
  }
}

/**
 * Valida que un link de YouTube sea válido
 */
export function isValidYouTubeUrl(url) {
  if (!url) return true // opcional
  return !!getYouTubeId(url)
}
