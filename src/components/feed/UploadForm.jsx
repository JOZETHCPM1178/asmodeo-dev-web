// src/components/feed/UploadForm.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { createPost } from '../../services/posts'
import { uploadImage } from '../../services/cloudinary'
import { uploadToArchive, validateApkFile } from '../../services/archive'
import styles from './UploadForm.module.css'

const CATS = {
  apk:       { label: 'APK Mod',    icon: '📱' },
  games:     { label: 'Juegos Mod', icon: '🎮' },
  script:    { label: 'Scripts',    icon: '⚙️' },
  tutorials: { label: 'Tutoriales', icon: '📚' },
}

export default function UploadForm() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const imageRef   = useRef(null)
  const apkRef     = useRef(null)

  const [form, setForm] = useState({
    name: '', description: '', category: 'apk',
    youtubeUrl: '', version: '', size: '', tags: '',
    downloadUrl: '',
  })
  const [imageFile, setImageFile]         = useState(null)
  const [imagePreview, setImagePreview]   = useState(null)
  const [apkFile, setApkFile]             = useState(null)
  const [uploadMode, setUploadMode]       = useState('file')
  const [loading, setLoading]             = useState(false)
  const [progress, setProgress]           = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

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

  function handleApkChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      validateApkFile(file)
      setApkFile(file)
      const mb = (file.size / (1024 * 1024)).toFixed(1)
      set('size', `${mb} MB`)
      toast.success(`✅ ${file.name} seleccionado`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!imageFile)        { toast.error('Sube una imagen de portada'); return }
    if (uploadMode === 'file' && !apkFile) { toast.error('Selecciona el archivo APK'); return }
    if (uploadMode === 'link' && !form.downloadUrl.trim()) { toast.error('Ingresa el link'); return }

    setLoading(true); setProgress(5)

    try {
      // 1. Subir imagen
      setProgressLabel('📸 Subiendo imagen...')
      setProgress(10)
      const imageData = await uploadImage(imageFile, { folder: 'posts' })
      setProgress(35)

      // 2. Subir APK a Archive.org si es modo archivo
      let finalDownloadUrl = form.downloadUrl.trim()
      if (uploadMode === 'file' && apkFile) {
        setProgressLabel('📦 Subiendo APK a Archive.org...')
        const archiveResult = await uploadToArchive(apkFile, (pct) => {
          setProgress(35 + Math.round(pct * 0.55))
        })
        finalDownloadUrl = archiveResult.url
      }

      setProgress(92)
      setProgressLabel('💾 Guardando publicación...')

      const tagsArray = form.tags
        .split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 8)

      const postData = {
        name:           form.name.trim(),
        description:    form.description.trim(),
        category:       form.category,
        downloadUrl:    finalDownloadUrl,
        youtubeUrl:     form.youtubeUrl.trim(),
        version:        form.version.trim(),
        size:           form.size.trim(),
        tags:           tagsArray,
        imageUrl:       imageData.url,
        imageThumb:     imageData.thumbnailUrl,
        authorId:       user.uid,
        authorName:     user.displayName || user.username || 'Usuario',
        authorPhoto:    user.photoURL || '',
        authorVerified: user.verified || false,
        directDownload: uploadMode === 'file',
      }

      const postId = await createPost(postData, user.uid)
      setProgress(100)
      setProgressLabel('🎉 ¡Publicado!')
      toast.success('¡Publicación creada! 🎉')
      navigate(`/post/${postId}`)
    } catch (err) {
      console.error('Upload error:', err)
      toast.error(err.message || 'Error al publicar')
    } finally {
      setLoading(false); setProgress(0); setProgressLabel('')
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h1 className={styles.title}>📤 Nueva publicación</h1>
        <p className={styles.sub}>Comparte una app, mod o script con la comunidad</p>
      </div>

      <div className={styles.grid}>
        {/* ── IZQUIERDA ── */}
        <div className={styles.col}>
          {/* Imagen */}
          <div className={styles.imageUpload} onClick={() => !loading && imageRef.current?.click()}>
            {imagePreview
              ? <img src={imagePreview} alt="preview" className={styles.imagePreview} />
              : <div className={styles.imagePlaceholder}>
                  <span style={{ fontSize: '2.5rem' }}>🖼️</span>
                  <span>Toca para subir imagen</span>
                  <span className={styles.imageHint}>JPG, PNG, WebP • máx 10MB</span>
                </div>
            }
            <input ref={imageRef} type="file" accept="image/*"
              onChange={handleImageChange} style={{ display: 'none' }} />
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

        {/* ── DERECHA ── */}
        <div className={styles.col}>
          <div className="inp-group">
            <label className="inp-label">Nombre *</label>
            <input className="inp" placeholder="Ej: Minecraft PE Mod v1.20"
              value={form.name} onChange={e => set('name', e.target.value)}
              required maxLength={100} disabled={loading} />
          </div>

          <div className="inp-group">
            <label className="inp-label">Descripción</label>
            <textarea className="inp"
              placeholder="Describe qué hace esta app..."
              value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} maxLength={1000} style={{ resize: 'vertical' }} disabled={loading} />
          </div>

          {/* ── DESCARGA ── */}
          <div className="inp-group">
            <label className="inp-label">Archivo de descarga *</label>
            <div className={styles.modeToggle}>
              <button type="button"
                className={`${styles.modeBtn} ${uploadMode === 'file' ? styles.modeBtnActive : ''}`}
                onClick={() => setUploadMode('file')} disabled={loading}>
                📦 Subir APK directo
              </button>
              <button type="button"
                className={`${styles.modeBtn} ${uploadMode === 'link' ? styles.modeBtnActive : ''}`}
                onClick={() => setUploadMode('link')} disabled={loading}>
                🔗 Link externo
              </button>
            </div>

            {uploadMode === 'file' && (
              <div className={`${styles.apkUpload} ${apkFile ? styles.apkReady : ''}`}
                onClick={() => !loading && apkRef.current?.click()}>
                {apkFile ? (
                  <div className={styles.apkSelected}>
                    <span style={{ fontSize: '1.8rem' }}>📱</span>
                    <div style={{ flex: 1 }}>
                      <div className={styles.apkName}>{apkFile.name}</div>
                      <div className={styles.apkMeta}>
                        {(apkFile.size / (1024 * 1024)).toFixed(1)} MB · Se subirá a Archive.org
                      </div>
                    </div>
                    {!loading && (
                      <button type="button" className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); setApkFile(null); set('size', '') }}>✕</button>
                    )}
                  </div>
                ) : (
                  <div className={styles.apkPlaceholder}>
                    <span style={{ fontSize: '2.2rem' }}>📦</span>
                    <span className={styles.apkPlaceholderText}>Toca para seleccionar APK</span>
                    <span className={styles.apkHint}>APK, ZIP, RAR · máx 500 MB · Descarga directa gratis</span>
                  </div>
                )}
                <input ref={apkRef} type="file"
                  accept=".apk,.zip,.rar,.7z,.apks,.xapk"
                  onChange={handleApkChange} style={{ display: 'none' }} />
              </div>
            )}

            {uploadMode === 'link' && (
              <input className="inp" style={{ marginTop: '0.5rem' }}
                placeholder="https://mediafire.com/... o cualquier link"
                value={form.downloadUrl} onChange={e => set('downloadUrl', e.target.value)}
                disabled={loading} />
            )}
          </div>

          <div className="inp-group">
            <label className="inp-label">Video YouTube (opcional)</label>
            <input className="inp" placeholder="https://youtube.com/watch?v=..."
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
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.progressInfo}>
            <span className={styles.progressText}>{progressLabel || 'Procesando...'}</span>
            <span className={styles.progressPct}>{progress}%</span>
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-lg" type="submit"
        disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
        {loading
          ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Publicando...</>
          : '🚀 Publicar ahora'}
      </button>
    </form>
  )
}
