// src/services/cloudinary.js
// ════════════════════════════════════════
//  CLOUDINARY SERVICE — Subida y optimización de imágenes
// ════════════════════════════════════════

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET
const BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD}`

/**
 * Sube una imagen a Cloudinary con compresión automática
 * @param {File} file - Archivo de imagen
 * @param {Object} options - Opciones de transformación
 * @returns {Promise<{url: string, thumbnailUrl: string, publicId: string}>}
 */
export async function uploadImage(file, options = {}) {
  const { folder = 'posts', maxWidth = 1200, quality = 'auto' } = options

  // Validar tamaño (máx 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('La imagen no puede superar 10MB')
  }

  // Validar tipo
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', PRESET)
  formData.append('folder', folder)
  // Transformaciones automáticas en el preset o aquí
  formData.append('transformation', JSON.stringify([
    { width: maxWidth, crop: 'limit', quality, fetch_format: 'auto' }
  ]))

  const res = await fetch(`${BASE_URL}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Error al subir imagen')
  }

  const data = await res.json()

  // Generar URL de miniatura (300x300, recortada al centro)
  const thumbnailUrl = data.secure_url.replace(
    '/upload/',
    '/upload/w_300,h_300,c_fill,q_auto,f_auto/'
  )

  return {
    url: data.secure_url,
    thumbnailUrl,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
  }
}

/**
 * Sube avatar de usuario (cuadrado, 200x200)
 */
export async function uploadAvatar(file) {
  return uploadImage(file, { folder: 'avatars', maxWidth: 400 })
}

/**
 * Construye una URL optimizada de Cloudinary
 */
export function optimizeUrl(url, { width, height, quality = 'auto' } = {}) {
  if (!url || !url.includes('cloudinary.com')) return url
  const transforms = [`q_${quality}`, 'f_auto']
  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height},c_fill`)
  return url.replace('/upload/', `/upload/${transforms.join(',')}/`)
}
