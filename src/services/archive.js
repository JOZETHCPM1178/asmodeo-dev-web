// src/services/archive.js
// ════════════════════════════════════════
//  ARCHIVE.ORG — Subida de archivos APK/ZIP
//  Links directos, gratis, sin límite de almacenamiento
// ════════════════════════════════════════

const ACCESS_KEY = import.meta.env.VITE_ARCHIVE_ACCESS_KEY
const SECRET_KEY = import.meta.env.VITE_ARCHIVE_SECRET_KEY

// Genera un identificador único para el item en Archive.org
function generateIdentifier(filename) {
  const clean = filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')           // quitar extensión
    .replace(/[^a-z0-9]+/g, '-')      // solo letras, números y guiones
    .replace(/^-+|-+$/g, '')          // quitar guiones al inicio/fin
    .slice(0, 50)                      // máx 50 chars
  const timestamp = Date.now()
  return `asmodeodev-${clean}-${timestamp}`
}

/**
 * Sube un archivo a Archive.org
 * @param {File} file - El archivo a subir (APK, ZIP, etc.)
 * @param {Function} onProgress - Callback de progreso (0-100)
 * @returns {Promise<{url: string, identifier: string}>}
 */
export async function uploadToArchive(file, onProgress) {
  if (!ACCESS_KEY || !SECRET_KEY) {
    throw new Error('Archive.org keys no configuradas. Revisa las variables de entorno.')
  }

  const identifier = generateIdentifier(file.name)
  const filename   = encodeURIComponent(file.name)
  const uploadUrl  = `https://s3.us.archive.org/${identifier}/${filename}`

  onProgress?.(10)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Progreso de subida
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 80) + 10 // 10→90%
        onProgress?.(pct)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        // URL directa de descarga
        const directUrl = `https://archive.org/download/${identifier}/${filename}`
        resolve({ url: directUrl, identifier })
      } else {
        reject(new Error(`Archive.org error ${xhr.status}: ${xhr.responseText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Error de red al subir a Archive.org'))
    })

    xhr.open('PUT', uploadUrl)

    // Headers requeridos por Archive.org S3 API
    xhr.setRequestHeader('Authorization',        `LOW ${ACCESS_KEY}:${SECRET_KEY}`)
    xhr.setRequestHeader('x-archive-auto-make-bucket', '1')
    xhr.setRequestHeader('x-archive-meta-mediatype',   'software')
    xhr.setRequestHeader('x-archive-meta-subject',     'APK;Android;Mod;AsmodeoDev')
    xhr.setRequestHeader('x-archive-meta-creator',     'AsmodeoDev')
    xhr.setRequestHeader('x-archive-ignore-preexisting-bucket', '1')
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('Content-Length', file.size.toString())

    xhr.send(file)
  })
}

/**
 * Valida que el archivo sea un APK, ZIP u otro archivo permitido
 */
export function validateApkFile(file) {
  const MAX_SIZE = 500 * 1024 * 1024 // 500 MB
  const ALLOWED  = [
    'application/vnd.android.package-archive', // APK
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ]
  const ALLOWED_EXT = ['.apk', '.zip', '.rar', '.7z', '.tar', '.gz']

  if (file.size > MAX_SIZE) {
    throw new Error(`El archivo es demasiado grande. Máximo 500 MB.`)
  }

  const ext = '.' + file.name.split('.').pop().toLowerCase()
  const validExt  = ALLOWED_EXT.includes(ext)
  const validType = ALLOWED.includes(file.type)

  if (!validExt && !validType) {
    throw new Error(`Tipo de archivo no permitido. Solo APK, ZIP, RAR.`)
  }

  return true
}
