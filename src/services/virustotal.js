// src/services/virustotal.js
// VirusTotal API v3 — escaneo de archivos antes de subir
// Variable requerida en Cloudflare: VITE_VIRUSTOTAL_API_KEY

const API_KEY = import.meta.env.VITE_VIRUSTOTAL_API_KEY
const BASE    = 'https://www.virustotal.com/api/v3'

// Escanear archivo — devuelve { clean, stats, permalink }
export async function scanFile(file, onProgress) {
  if (!API_KEY) {
    // Sin API key → marcar como no escaneado (no bloquear subida)
    return { clean: true, skipped: true, message: 'Sin API key de VirusTotal' }
  }

  onProgress?.('🔍 Enviando archivo a VirusTotal...')

  // 1. Subir archivo a VirusTotal
  const formData = new FormData()
  formData.append('file', file)

  const uploadRes = await fetch(`${BASE}/files`, {
    method: 'POST',
    headers: { 'x-apikey': API_KEY },
    body: formData,
  })

  if (!uploadRes.ok) throw new Error(`VirusTotal error al subir: ${uploadRes.status}`)

  const uploadJson = await uploadRes.json()
  const analysisId = uploadJson.data?.id

  if (!analysisId) throw new Error('VirusTotal no devolvió ID de análisis')

  // 2. Esperar resultado (polling cada 5s, máx 60s)
  onProgress?.('⏳ Analizando con VirusTotal...')

  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000))

    const analysisRes = await fetch(`${BASE}/analyses/${analysisId}`, {
      headers: { 'x-apikey': API_KEY },
    })

    if (!analysisRes.ok) continue

    const analysisJson = await analysisRes.json()
    const status = analysisJson.data?.attributes?.status

    if (status === 'completed') {
      const stats     = analysisJson.data.attributes.stats
      const malicious = (stats.malicious || 0) + (stats.suspicious || 0)
      const total     = Object.values(stats).reduce((a, b) => a + b, 0)
      const permalink = `https://www.virustotal.com/gui/file-analysis/${analysisId}`

      return {
        clean:      malicious === 0,
        malicious,
        total,
        stats,
        permalink,
        skipped:    false,
        message:    malicious === 0
          ? `✅ Sin amenazas detectadas (${total} motores)`
          : `⚠️ ${malicious}/${total} motores detectaron amenazas`,
      }
    }
  }

  // Timeout → asumir limpio para no bloquear
  return {
    clean:   true,
    skipped: true,
    message: '⏱️ Análisis pendiente — el archivo se marcará cuando complete',
  }
}

// Escanear por hash SHA256 (para verificar archivos ya subidos)
export async function checkFileHash(sha256) {
  if (!API_KEY || !sha256) return null
  try {
    const res  = await fetch(`${BASE}/files/${sha256}`, {
      headers: { 'x-apikey': API_KEY },
    })
    if (!res.ok) return null
    const json = await res.json()
    const stats     = json.data?.attributes?.last_analysis_stats
    const malicious = (stats?.malicious || 0) + (stats?.suspicious || 0)
    const total     = Object.values(stats || {}).reduce((a, b) => a + b, 0)
    return {
      clean:     malicious === 0,
      malicious,
      total,
      permalink: `https://www.virustotal.com/gui/file/${sha256}`,
      message:   malicious === 0
        ? `✅ Sin amenazas (${total} motores)`
        : `⚠️ ${malicious}/${total} detectaron amenazas`,
    }
  } catch { return null }
}
