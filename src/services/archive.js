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
  if (file.size > 500 * 1024 * 1024) throw new Error(`El archivo pesa ${(file.size/1024/1024).toFixed(0)}MB — máximo 500MB`)
  const allowed = ['apk','zip','rar','7z','apks','xapk','tar','gz']
  const ext = file.name.split('.').pop().toLowerCase()
  if (!allowed.includes(ext)) throw new Error(`Formato .${ext} no soportado`)
  return { valid: true }
}

export async function uploadToArchive(file, onProgress) {
  if (!ACCESS_KEY || !SECRET_KEY) throw new Error('Archive.org keys no configuradas.')
  const identifier  = generateIdentifier(file.name)
  const filename    = encodeURIComponent(file.name)
  const uploadUrl   = `https://s3.us.archive.org/${identifier}/${filename}`
  onProgress?.(10)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 80) + 10)
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
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
