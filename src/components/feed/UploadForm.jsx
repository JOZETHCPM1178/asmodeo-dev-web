// src/components/feed/UploadForm.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { createPost } from '../../services/posts'
import { uploadImage } from '../../services/cloudinary'
import styles from './UploadForm.module.css'

const CATS = {
  apk:       { label: 'APK Mod',    icon: '📱' },
  games:     { label: 'Juegos Mod', icon: '🎮' },
  script:    { label: 'Scripts',    icon: '⚙️' },
  tutorials: { label: 'Tutoriales', icon: '📚' },
}

export default function UploadForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    name: '', description: '', category: 'apk',
    downloadUrl: '', youtubeUrl: '', version: '', size: '', tags: '',
  })
  const [imageFile, setImageFile]     = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [progress, setProgress]       = useState(0) // 0-100

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagen máximo 10MB'); return }
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim())        { toast.error('El nombre es obligatorio'); return }
    if (!form.downloadUrl.trim()) { toast.error('El link de descarga es obligatorio'); return }
    if (!imageFile)               { toast.error('Sube una imagen'); return }

    setLoading(true)
    setProgress(10)

    try {
      // 1. Subir imagen a Cloudinary
      setProgress(20)
      let imageData
      try {
        imageData = await uploadImage(imageFile, { folder: 'posts' })
      } catch (imgErr) {
        throw new Error('Error subiendo imagen: ' + imgErr.message)
      }
      setProgress(60)

      // 2. Procesar tags
      const tagsArray = form.tags
        .split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 8)

      // 3. Crear post
      setProgress(80)
      const postData = {
        name:        form.name.trim(),
        description: form.description.trim(),
        category:    form.category,
        downloadUrl: form.downloadUrl.trim(),
        youtubeUrl:  form.youtubeUrl.trim(),
        version:     form.version.trim(),
        size:        form.size.trim(),
        tags:        tagsArray,
        imageUrl:    imageData.url,
        imageThumb:  imageData.thumbnailUrl,
        authorId:    user.uid,
        authorName:  user.displayName || user.username || 'Usuario',
        authorPhoto: user.photoURL || '',
        authorVerified: user.verified || false,
      }

      const postId = await createPost(postData, user.uid)
      setProgress(100)

      toast.success('¡Publicación creada! 🎉')
      navigate(`/post/${postId}`)
    } catch (err) {
      console.error('Upload error:', err)
      toast.error(err.message || 'Error al publicar. Intenta de nuevo.')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h1 className={styles.title}>📤 Nueva publicación</h1>
        <p className={styles.sub}>Comparte una app, mod o script con la comunidad</p>
      </div>

      <div className={styles.grid}>
        {/* Columna izquierda */}
        <div className={styles.col}>
          {/* Imagen */}
          <div
            className={styles.imageUpload}
            onClick={() => !loading && fileRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className={styles.imagePreview} />
            ) : (
              <div className={styles.imagePlaceholder}>
                <span style={{ fontSize: '2.5rem' }}>🖼️</span>
                <span>Toca para subir imagen</span>
                <span className={styles.imageHint}>JPG, PNG, WebP • máx 10MB</span>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>
          {imagePreview && !loading && (
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => { setImageFile(null); setImagePreview(null) }}>
              🔄 Cambiar imagen
            </button>
          )}

          {/* Categoría */}
          <div className="inp-group">
            <label className="inp-label">Categoría</label>
            <div className={styles.catGrid}>
              {Object.entries(CATS).map(([id, cat]) => (
                <button key={id} type="button"
                  className={`${styles.catBtn} ${form.category === id ? styles.catActive : ''}`}
                  onClick={() => set('category', id)} disabled={loading}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className={styles.col}>
          <div className="inp-group">
            <label className="inp-label">Nombre de la app *</label>
            <input className="inp" placeholder="Ej: Minecraft PE Mod v1.20"
              value={form.name} onChange={e => set('name', e.target.value)}
              required maxLength={100} disabled={loading} />
          </div>

          <div className="inp-group">
            <label className="inp-label">Descripción</label>
            <textarea className="inp"
              placeholder="Describe qué hace esta app, qué tiene de especial..."
              value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} maxLength={1000} style={{ resize: 'vertical' }} disabled={loading} />
          </div>

          {/* Link descarga — SIN type="url" para aceptar cualquier link */}
          <div className="inp-group">
            <label className="inp-label">Link de descarga *</label>
            <input className="inp"
              placeholder="https://mega.nz/... o cualquier link"
              value={form.downloadUrl} onChange={e => set('downloadUrl', e.target.value)}
              required disabled={loading} />
          </div>

          <div className="inp-group">
            <label className="inp-label">Video YouTube (opcional)</label>
            <input className="inp"
              placeholder="https://www.youtube.com/watch?v=..."
              value={form.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)}
              disabled={loading} />
          </div>

          <div className={styles.row2}>
            <div className="inp-group">
              <label className="inp-label">Versión</label>
              <input className="inp" placeholder="v1.21" value={form.version}
                onChange={e => set('version', e.target.value)} maxLength={20} disabled={loading} />
            </div>
            <div className="inp-group">
              <label className="inp-label">Tamaño</label>
              <input className="inp" placeholder="414 MB" value={form.size}
                onChange={e => set('size', e.target.value)} maxLength={20} disabled={loading} />
            </div>
          </div>

          <div className="inp-group">
            <label className="inp-label">Tags (separados por coma)</label>
            <input className="inp" placeholder="minecraft, mod, gratis..."
              value={form.tags} onChange={e => set('tags', e.target.value)} disabled={loading} />
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      {loading && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          <span className={styles.progressText}>
            {progress < 60 ? '📤 Subiendo imagen...' : progress < 90 ? '💾 Guardando publicación...' : '✅ Casi listo...'}
          </span>
        </div>
      )}

      <button className="btn btn-primary btn-lg" type="submit"
        disabled={loading || !imageFile} style={{ width: '100%' }}>
        {loading
          ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Publicando...</>
          : '🚀 Publicar ahora'}
      </button>
    </form>
  )
}
