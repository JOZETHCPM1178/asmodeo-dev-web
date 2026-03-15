// src/services/archive.js
// ════════════════════════════════════════
//  ARCHIVE.ORG — Subida de archivos APK/ZIP
// ════════════════════════════════════════

const ACCESS_KEY = import.meta.env.VITE_ARCHIVE_ACCESS_KEY
const SECRET_KEY = import.meta.env.VITE_ARCHIVE_SECRET_KEY

function generateIdentifier(filename) {
  const clean = filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  const timestamp = Date.now()
  return `asmodeodev-${clean}-${timestamp}`
}

// Detectar Content-Type correcto según extensión
function getContentType(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const types = {
    'apk':  'application/vnd.android.package-archive',
    'zip':  'application/zip',
    'rar':  'application/x-rar-compressed',
    '7z':   'application/x-7z-compressed',
    'exe':  'application/x-msdownload',
    'dmg':  'application/x-apple-diskimage',
    'tar':  'application/x-tar',
    'gz':   'application/gzip',
  }
  return types[ext] || file.type || 'application/octet-stream'
}

// Validar archivo antes de subir
export function validateApkFile(file) {
  if (!file) return { valid: false, error: 'No se seleccionó archivo' }
  const maxSize = 500 * 1024 * 1024 // 500 MB
  if (file.size > maxSize) throw new Error(`El archivo pesa ${(file.size/1024/1024).toFixed(0)}MB — máximo 500MB`)
  const allowed = ['apk','zip','rar','7z','apks','xapk','tar','gz']
  const ext = file.name.split('.').pop().toLowerCase()
  if (!allowed.includes(ext)) throw new Error(`Formato .${ext} no soportado`)
  return { valid: true }
}

  if (!ACCESS_KEY || !SECRET_KEY) {
    throw new Error('Archive.org keys no configuradas. Agrega VITE_ARCHIVE_ACCESS_KEY y VITE_ARCHIVE_SECRET_KEY en Cloudflare Pages.')
  }

  const identifier = generateIdentifier(file.name)
  const filename   = encodeURIComponent(file.name)
  const uploadUrl  = `https://s3.us.archive.org/${identifier}/${filename}`
  const contentType = getContentType(file)

  onProgress?.(10)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 80) + 10
        onProgress?.(pct)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        const directUrl = `https://archive.org/download/${identifier}/${filename}`
        resolve({ url: directUrl, identifier })
      } else {
        // Mensaje de error más claro
        let msg = `Archive.org error ${xhr.status}`
        if (xhr.status === 400) msg = 'Archive.org rechazó el archivo. Verifica que no esté vacío o corrupto.'
        if (xhr.status === 401) msg = 'Archive.org: credenciales inválidas. Revisa VITE_ARCHIVE_ACCESS_KEY y SECRET_KEY.'
        if (xhr.status === 403) msg = 'Archive.org: sin permisos. Verifica tus claves de API.'
        reject(new Error(msg))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Error de red al conectar con Archive.org'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Authorization',                    `LOW ${ACCESS_KEY}:${SECRET_KEY}`)
    xhr.setRequestHeader('x-archive-auto-make-bucket',      '1')
    xhr.setRequestHeader('x-archive-ignore-preexisting-bucket', '1')
    xhr.setRequestHeader('x-archive-meta-mediatype',        'software')
    xhr.setRequestHeader('x-archive-meta-title',            file.name.replace(/\.[^.]+$/, ''))
    xhr.setRequestHeader('x-archive-meta-subject',          'APK;Android;Mod;AsmodeoDev')
    xhr.setRequestHeader('x-archive-meta-creator',          'AsmodeoDev')
    xhr.setRequestHeader('x-archive-meta-licenseurl',       'https://creativecommons.org/licenses/by/4.0/')
    xhr.setRequestHeader('Content-Type',                    contentType)
    xhr.send(file)
  })
}
