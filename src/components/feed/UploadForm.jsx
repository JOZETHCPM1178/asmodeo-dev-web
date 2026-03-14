// src/components/feed/UploadForm.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { createPost } from '../../services/posts'
import { uploadImage } from '../../services/cloudinary'
import { publishToTelegram } from '../../services/notifications'
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
    name: '',
    description: '',
    category: 'apk',
    downloadUrl: '',
    youtubeUrl: '',
    version: '',
    size: '',
    tags: '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagen máximo 10MB'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!form.downloadUrl.trim()) { toast.error('El link de descarga es obligatorio'); return }
    if (!imageFile) { toast.error('La imagen es obligatoria'); return }

    setLoading(true)
    try {
      // 1. Subir imagen
      setStep('Subiendo imagen...')
      const imageData = await uploadImage(imageFile, { folder: 'posts' })

      // 2. Procesar tags
      const tagsArray = form.tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8)

      // 3. Crear post en Firestore (incluye análisis de seguridad Gemini)
      setStep('Analizando contenido con IA...')
      const postData = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        downloadUrl: form.downloadUrl.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
        version: form.version.trim(),
        size: form.size.trim(),
        tags: tagsArray,
        imageUrl: imageData.url,
        imageThumb: imageData.thumbnailUrl,
        authorId: user.uid,
        authorName: user.displayName || user.username,
        authorPhoto: user.photoURL || '',
      }

      setStep('Publicando...')
      const postId = await createPost(postData, user.uid)

      // 4. Publicar en Telegram (no bloquea)
      publishToTelegram({ id: postId, ...postData }).catch(() => {})

      toast.success('¡Publicación creada! 🎉')
      navigate(`/post/${postId}`)
    } catch (err) {
      toast.error(err.message || 'Error al publicar')
    } finally {
      setLoading(false)
      setStep('')
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
          <div className={styles.imageUpload} onClick={() => fileRef.current?.click()}>
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className={styles.imagePreview} />
            ) : (
              <div className={styles.imagePlaceholder}>
                <span className={styles.uploadIcon}>🖼️</span>
                <span>Click para subir imagen</span>
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
          {imagePreview && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setImageFile(null); setImagePreview(null) }}
            >
              Cambiar imagen
            </button>
          )}

          {/* Categoría */}
          <div className="inp-group">
            <label className="inp-label">Categoría</label>
            <div className={styles.catGrid}>
              {Object.entries(CATS).map(([id, cat]) => (
                <button
                  key={id}
                  type="button"
                  className={`${styles.catBtn} ${form.category === id ? styles.catActive : ''}`}
                  onClick={() => set('category', id)}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className={styles.col}>
          {/* Nombre */}
          <div className="inp-group">
            <label className="inp-label">Nombre de la app *</label>
            <input
              className="inp"
              placeholder="Ej: Minecraft PE Mod v1.20"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required maxLength={100}
            />
          </div>

          {/* Descripción */}
          <div className="inp-group">
            <label className="inp-label">Descripción *</label>
            <textarea
              className="inp"
              placeholder="Describe qué hace esta app, qué tiene de especial..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              maxLength={1000}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Link de descarga */}
          <div className="inp-group">
            <label className="inp-label">Link de descarga *</label>
            <input
              className="inp"
              type="url"
              placeholder="https://drive.google.com/..."
              value={form.downloadUrl}
              onChange={e => set('downloadUrl', e.target.value)}
              required
            />
          </div>

          {/* YouTube */}
          <div className="inp-group">
            <label className="inp-label">Video preview YouTube (opcional)</label>
            <input
              className="inp"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={form.youtubeUrl}
              onChange={e => set('youtubeUrl', e.target.value)}
            />
          </div>

          {/* Versión y tamaño */}
          <div className={styles.row2}>
            <div className="inp-group">
              <label className="inp-label">Versión</label>
              <input
                className="inp"
                placeholder="v1.20.0"
                value={form.version}
                onChange={e => set('version', e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="inp-group">
              <label className="inp-label">Tamaño</label>
              <input
                className="inp"
                placeholder="45 MB"
                value={form.size}
                onChange={e => set('size', e.target.value)}
                maxLength={20}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="inp-group">
            <label className="inp-label">Tags (separados por coma)</label>
            <input
              className="inp"
              placeholder="android, gratis, mod, aventura..."
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Info de seguridad */}
      <div className={styles.infoBox}>
        🛡️ Tu publicación será analizada automáticamente por IA para garantizar la seguridad de la comunidad.
        El contenido sospechoso será marcado para revisión.
      </div>

      {/* Submit */}
      <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
        {loading
          ? <><span className="spinner" style={{ width: 18, height: 18 }} /> {step || 'Publicando...'}</>
          : '🚀 Publicar ahora'}
      </button>
    </form>
  )
}
