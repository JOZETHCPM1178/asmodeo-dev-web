// src/services/giphy.js
// ════════════════════════════════════════
//  GIPHY — Búsqueda de stickers animados
// ════════════════════════════════════════

const API_KEY = import.meta.env.VITE_GIPHY_API_KEY
const BASE    = 'https://api.giphy.com/v1/stickers'

/**
 * Busca stickers por término
 */
export async function searchStickers(query, limit = 20) {
  if (!API_KEY) throw new Error('VITE_GIPHY_API_KEY no configurada')
  const url = `${BASE}/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g&lang=es`
  const res  = await fetch(url)
  if (!res.ok) throw new Error('Error al buscar stickers')
  const json = await res.json()
  return json.data.map(s => ({
    id:      s.id,
    url:     s.images.fixed_height_small.url,    // GIF animado pequeño
    preview: s.images.fixed_height_small_still.url, // preview estático
    title:   s.title,
  }))
}

/**
 * Stickers trending (para mostrar por defecto)
 */
export async function trendingStickers(limit = 20) {
  if (!API_KEY) throw new Error('VITE_GIPHY_API_KEY no configurada')
  const url = `${BASE}/trending?api_key=${API_KEY}&limit=${limit}&rating=g`
  const res  = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar stickers')
  const json = await res.json()
  return json.data.map(s => ({
    id:      s.id,
    url:     s.images.fixed_height_small.url,
    preview: s.images.fixed_height_small_still.url,
    title:   s.title,
  }))
}
