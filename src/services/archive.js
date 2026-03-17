// src/services/archive.js
const ACCESS_KEY = import.meta.env.VITE_ARCHIVE_ACCESS_KEY
const SECRET_KEY = import.meta.env.VITE_ARCHIVE_SECRET_KEY

function generateIdentifier(filename) {
  const clean = filename.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
  return `asmodeodev-${clean}-${Date.now()}`
}

function getContentType(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const types = { 'apk':'application/vnd.android.package-archive','zip':'application/zip','rar':'application/x-rar-compressed','7z':'application/x-7z-compressed','tar':'application/x-tar','gz':'application/gzip' }
  return types[ext] || file.type || 'application/octet-stream'
}

export function validateApkFile(file) {
  if (!file) throw new Error('No se seleccionó archivo')
  if (file.size > 100 * 1024 * 1024 * 1024) throw new Error(`El archivo pesa ${(file.size/1024/1024/1024).toFixed(1)}GB — máximo 100GB`)
  const allowed = ['apk','zip','rar','7z','apks','xapk','tar','gz']
  const ext = file.name.split('.').pop().toLowerCase()
  if (!allowed.includes(ext)) throw new Error(`Formato .${ext} no soportado`)
  return { valid: true }
}

// Formatear bytes a texto legible
function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024*1024)   return `${(bytes/1024).toFixed(1)} KB`
  if (bytes < 1024**3)     return `${(bytes/(1024*1024)).toFixed(1)} MB`
  return `${(bytes/(1024**3)).toFixed(2)} GB`
}

// Formatear segundos a texto legible
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '...'
  if (seconds < 60)   return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds/60)}m ${Math.round(seconds%60)}s`
  return `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}m`
}

export async function uploadToArchive(file, onProgress) {
  if (!ACCESS_KEY || !SECRET_KEY) throw new Error('Archive.org keys no configuradas.')

  const identifier = generateIdentifier(file.name)
  const filename   = encodeURIComponent(file.name)
  const uploadUrl  = `https://s3.us.archive.org/${identifier}/${filename}`

  onProgress?.(5, `📦 Preparando subida de ${formatBytes(file.size)}...`)

  return new Promise((resolve, reject) => {
    const xhr       = new XMLHttpRequest()
    const startTime = Date.now()
    let lastLoaded  = 0
    let lastTime    = startTime

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return

      const now        = Date.now()
      const elapsed    = (now - startTime) / 1000       // segundos totales
      const deltaBytes = e.loaded - lastLoaded          // bytes desde último evento
      const deltaTime  = (now - lastTime) / 1000        // segundos desde último evento

      // Velocidad actual (promedio últimos eventos)
      const speed = deltaTime > 0 ? deltaBytes / deltaTime : 0
      // Velocidad promedio general (más estable)
      const avgSpeed = elapsed > 0 ? e.loaded / elapsed : 0
      // Usar promedio ponderado: 70% promedio, 30% actual
      const smoothSpeed = avgSpeed * 0.7 + speed * 0.3

      // Tiempo restante
      const remaining = e.total - e.loaded
      const eta       = smoothSpeed > 0 ? remaining / smoothSpeed : Infinity

      const pct   = Math.round((e.loaded / e.total) * 85) + 10
      const label = `📦 Subiendo a Archive.org... ${formatBytes(e.loaded)} / ${formatBytes(e.total)} · ${formatBytes(smoothSpeed)}/s · ~${formatTime(eta)}`

      onProgress?.(pct, label)

      lastLoaded = e.loaded
      lastTime   = now
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100, '✅ ¡Subida completa!')
        resolve({ url: `https://archive.org/download/${identifier}/${filename}`, identifier })
      } else {
        let msg = `Archive.org error ${xhr.status}`
        if (xhr.status === 401) msg = 'Credenciales inválidas.'
        if (xhr.status === 403) msg = 'Sin permisos. Verifica tus claves.'
        reject(new Error(msg))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Error de red con Archive.org')))

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Authorization', `LOW ${ACCESS_KEY}:${SECRET_KEY}`)
    xhr.setRequestHeader('x-archive-auto-make-bucket', '1')
    xhr.setRequestHeader('x-archive-ignore-preexisting-bucket', '1')
    xhr.setRequestHeader('x-archive-meta-mediatype', 'software')
    xhr.setRequestHeader('x-archive-meta-title', file.name.replace(/\.[^.]+$/, ''))
    xhr.setRequestHeader('x-archive-meta-subject', 'APK;Android;Mod;AsmodeoDev')
    xhr.setRequestHeader('x-archive-meta-creator', 'AsmodeoDev')
    xhr.setRequestHeader('Content-Type', getContentType(file))
    xhr.send(file)
  })
}
