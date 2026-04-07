// src/components/feed/UploadForm.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { createPost, getPostUrl } from '../../services/posts'
import { uploadImage } from '../../services/cloudinary'
import { uploadToArchive, validateApkFile } from '../../services/archive'
import { notifyTelegramNewPost } from '../../services/notifications'
import styles from './UploadForm.module.css'

const CATS = {
  apk:       { label: 'APK Mod',    icon: '📱', color: 'var(--p2)' },
  games:     { label: 'Juegos Mod', icon: '🎮', color: 'var(--cyan)' },
  script:    { label: 'Scripts',    icon: '⚙️', color: 'var(--green)' },
  tutorials: { label: 'Tutoriales', icon: '📚', color: 'var(--gold)' },
}

const RISK_OPTS = [
  { value: 'low',  label: 'Bajo',  desc: 'App offline, sin cuenta vinculada',    color: 'var(--green)' },
  { value: 'med',  label: 'Medio', desc: 'Necesita cuenta propia / streaming',   color: 'var(--gold)' },
  { value: 'high', label: 'Alto',  desc: 'Contiene datos sensibles o bancarios', color: 'var(--red)' },
]

const WORKER_URL = import.meta.env.VITE_WORKER_URL

// Aviso legal que se agrega automáticamente
const LEGAL_NOTICE = `⚠️ AVISO: Este contenido no es legal ni ético. Úsalo bajo tu propio riesgo. Verifica en VirusTotal antes de instalar en tu dispositivo. Si encuentras algo sospechoso, reporta la publicación.`

export default function UploadForm() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const imageRef  = useRef(null)
  const apkRef    = useRef(null)

  const [form, setForm] = useState({
    name: '', description: '', category: 'apk',
    youtubeUrl: '', version: '', size: '', tags: '',
    downloadUrl: '', riskLevel: 'low',
    whatModifies: '',   // qué modifica exactamente
    onlineWarning: '',  // advertencia específica si es app online
  })
  const [imageFile, setImageFile]         = useState(null)
  const [imagePreview, setImagePreview]   = useState(null)
  const [apkFile, setApkFile]             = useState(null)
  const [uploadMode, setUploadMode]       = useState('file')
  const [loading, setLoading]             = useState(false)
  const [progress, setProgress]           = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [aiLoading, setAiLoading]         = useState(false)
  const [step, setStep]                   = useState(1)  // 1=info, 2=archivo, 3=extras

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
      toast.success(`✅ ${file.name} listo`)
    } catch (err) { toast.error(err.message) }
  }

  async function handleGenerateAI() {
    if (!form.name.trim()) { toast.error('Primero escribe el nombre'); return }
    // Si no hay Worker configurado, simplemente no hacer nada
    if (!WORKER_URL || WORKER_URL.includes('your-worker') || !WORKER_URL.startsWith('http')) {
      toast.error('IA no disponible — escribe la descripción manualmente')
      return
    }
    setAiLoading(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(`${WORKER_URL}/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), category: form.category }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (data.ok && data.text) {
        set('description', data.text)
        if (data.tags?.length) set('tags', data.tags.join(', '))
        toast.success('🤖 Descripción generada')
      } else {
        toast.error(data.error || 'La IA no respondió — escribe la descripción manualmente')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        toast.error('La IA tardó demasiado — escribe la descripción manualmente')
      } else {
        toast.error('IA no disponible — puedes continuar sin ella')
      }
    } finally { setAiLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim())   { toast.error('El nombre es obligatorio'); return }
    if (!imageFile)          { toast.error('Sube una imagen de portada'); return }
    if (uploadMode === 'file' && !apkFile)            { toast.error('Selecciona el archivo APK'); return }
    if (uploadMode === 'link' && !form.downloadUrl.trim()) { toast.error('Ingresa el link de descarga'); return }

    setLoading(true); setProgress(5)
    try {
      setProgressLabel('📸 Subiendo imagen...')
      setProgress(10)
      const imageData = await uploadImage(imageFile, { folder: 'posts' })
      setProgress(35)

      let finalDownloadUrl = form.downloadUrl.trim()
      if (uploadMode === 'file' && apkFile) {
        setProgressLabel('📦 Subiendo archivo...')
        const archiveResult = await uploadToArchive(apkFile, (pct) => {
          setProgress(35 + Math.round(pct * 0.55))
        })
        finalDownloadUrl = archiveResult.url
      }

      setProgress(92)
      setProgressLabel('💾 Guardando publicación...')

      const tagsArray = form.tags
        .split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 8)

      // El aviso legal se agrega automáticamente a la descripción
      const fullDescription = [form.description.trim(), LEGAL_NOTICE].filter(Boolean).join('\n\n')

      const postData = {
        name:           form.name.trim(),
        description:    fullDescription,
        category:       form.category,
        downloadUrl:    finalDownloadUrl,
        youtubeUrl:     form.youtubeUrl.trim(),
        version:        form.version.trim(),
        size:           form.size.trim(),
        tags:           tagsArray,
        imageUrl:       imageData.url,
        imageThumb:     imageData.thumbnailUrl,
        riskLevel:      form.riskLevel,
        whatModifies:   form.whatModifies.trim(),
        onlineWarning:  form.onlineWarning.trim(),
        authorId:       user.uid,
        authorName:     user.displayName || user.username || 'Usuario',
        authorPhoto:    user.photoURL || '',
        authorVerified: user.verified === true,
        authorIsStaff:  user.isStaff === true,
        directDownload: uploadMode === 'file',
      }

      const result = await createPost(postData, user.uid)
      const postId = result.id || result
      const status = result.status || 'active'

      setProgress(100)
      if (status === 'pending') {
        toast.success('✅ Enviada para revisión')
        navigate('/')
      } else {
        toast.success('¡Publicado! 🎉')
        notifyTelegramNewPost({ id: postId, ...postData }).catch(() => {})
        navigate(getPostUrl({ id: postId, slug: result.slug }))
      }
    } catch (err) {
      toast.error(err.message || 'Error al publicar')
    } finally { setLoading(false); setProgress(0); setProgressLabel('') }
  }

  const steps = [
    { n: 1, label: 'Info básica' },
    { n: 2, label: 'Archivo' },
    { n: 3, label: 'Detalles' },
  ]

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      {/* Stepper */}
      <div className={styles.stepper}>
        {steps.map((s, i) => (
          <div key={s.n} className={styles.stepperRow}>
            <button type="button"
              className={`${styles.stepBtn} ${step === s.n ? styles.stepActive : step > s.n ? styles.stepDone : ''}`}
              onClick={() => !loading && setStep(s.n)}>
              <span className={styles.stepNum}>{step > s.n ? '✓' : s.n}</span>
              <span className={styles.stepLabel}>{s.label}</span>
            </button>
            {i < steps.length - 1 && <div className={`${styles.stepLine} ${step > s.n ? styles.stepLineDone : ''}`} />}
          </div>
        ))}
      </div>

      {/* ══ PASO 1: Info básica ══ */}
      {step === 1 && (
        <div className={styles.stepContent}>
          <div className={styles.twoCol}>
            {/* Imagen */}
            <div className={styles.imageCol}>
              <div className={styles.imageBox} onClick={() => !loading && imageRef.current?.click()}>
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className={styles.imagePreview} />
                  : <div className={styles.imagePlaceholder}>
                      <span className={styles.imageIcon}>🖼️</span>
                      <span className={styles.imageLabel}>Subir imagen de portada</span>
                      <span className={styles.imageHint}>JPG, PNG, WebP · máx 10 MB</span>
                    </div>
                }
                <input ref={imageRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </div>
              {imagePreview && !loading && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '.4rem' }}
                  onClick={() => { setImageFile(null); setImagePreview(null) }}>
                  🔄 Cambiar
                </button>
              )}
            </div>

            {/* Campos */}
            <div className={styles.fieldsCol}>
              <div className="inp-group">
                <label className="inp-label">Nombre *</label>
                <input className="inp" placeholder="Ej: Minecraft PE Mod v1.21"
                  value={form.name} onChange={e => set('name', e.target.value)}
                  required maxLength={100} disabled={loading} />
              </div>

              {/* Descripción + IA */}
              <div className="inp-group">
                <div className={styles.labelRow}>
                  <span className="inp-label" style={{ margin: 0 }}>Descripción</span>
                  <button type="button" className={styles.aiBtn}
                    onClick={handleGenerateAI}
                    disabled={loading || aiLoading || !form.name.trim()}>
                    {aiLoading
                      ? <><span className="spinner" style={{ width: 11, height: 11 }} /> Generando...</>
                      : '🤖 Generar con IA'}
                  </button>
                </div>
                <textarea className="inp"
                  placeholder="Describe qué hace esta app..."
                  value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} maxLength={1000} style={{ resize: 'vertical' }} disabled={loading} />
              </div>

              {/* Categoría */}
              <div className="inp-group">
                <label className="inp-label">Categoría</label>
                <div className={styles.catGrid}>
                  {Object.entries(CATS).map(([id, cat]) => (
                    <button key={id} type="button"
                      className={`${styles.catBtn} ${form.category === id ? styles.catActive : ''}`}
                      style={form.category === id ? { borderColor: cat.color, color: cat.color } : {}}
                      onClick={() => set('category', id)} disabled={loading}>
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}
            onClick={() => {
              if (!form.name.trim()) { toast.error('Escribe el nombre'); return }
              setStep(2)
            }}>
            Continuar →
          </button>
        </div>
      )}

      {/* ══ PASO 2: Archivo de descarga ══ */}
      {step === 2 && (
        <div className={styles.stepContent}>
          <div className={styles.modeToggle}>
            <button type="button"
              className={`${styles.modeBtn} ${uploadMode === 'file' ? styles.modeBtnActive : ''}`}
              onClick={() => setUploadMode('file')} disabled={loading}>
              📦 Subir APK directo
            </button>
            <button type="button"
              className={`${styles.modeBtn} ${uploadMode === 'link' ? styles.modeBtnActive : ''}`}
              onClick={() => setUploadMode('link')} disabled={loading}>
              🔗 Link externo (MediaFire, etc.)
            </button>
          </div>

          {uploadMode === 'file' && (
            <div className={`${styles.apkBox} ${apkFile ? styles.apkReady : ''}`}
              onClick={() => !loading && apkRef.current?.click()}>
              {apkFile ? (
                <div className={styles.apkSelected}>
                  <span style={{ fontSize: '2rem' }}>📱</span>
                  <div style={{ flex: 1 }}>
                    <div className={styles.apkName}>{apkFile.name}</div>
                    <div className={styles.apkMeta}>{(apkFile.size / (1024 * 1024)).toFixed(1)} MB · Se subirá a Archive.org</div>
                  </div>
                  {!loading && (
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); setApkFile(null); set('size', '') }}>✕</button>
                  )}
                </div>
              ) : (
                <div className={styles.apkPlaceholder}>
                  <span style={{ fontSize: '2.5rem' }}>📦</span>
                  <span className={styles.apkLabel}>Toca para seleccionar archivo</span>
                  <span className={styles.apkHint}>APK, ZIP, RAR · hasta 100 GB · Descarga directa gratis</span>
                </div>
              )}
              <input ref={apkRef} type="file" accept=".apk,.zip,.rar,.7z,.apks,.xapk"
                onChange={handleApkChange} style={{ display: 'none' }} />
            </div>
          )}

          {uploadMode === 'link' && (
            <div className="inp-group">
              <label className="inp-label">Link de descarga *</label>
              <input className="inp"
                placeholder="https://mediafire.com/... o cualquier link directo"
                value={form.downloadUrl} onChange={e => set('downloadUrl', e.target.value)}
                disabled={loading} />
              <span style={{ fontSize: '.72rem', color: 'var(--t3)', marginTop: '.25rem', display: 'block' }}>
                💡 Si es MediaFire o archive.org, la descarga pasará por AsmodeoDev automáticamente
              </span>
            </div>
          )}

          <div className={styles.rowTwo}>
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

          <div className={styles.navRow}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Atrás</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>Continuar →</button>
          </div>
        </div>
      )}

      {/* ══ PASO 3: Detalles y seguridad ══ */}
      {step === 3 && (
        <div className={styles.stepContent}>

          {/* Nivel de riesgo */}
          <div className="inp-group">
            <label className="inp-label">Nivel de riesgo *</label>
            <div className={styles.riskGrid}>
              {RISK_OPTS.map(r => (
                <button key={r.value} type="button"
                  className={`${styles.riskBtn} ${form.riskLevel === r.value ? styles.riskActive : ''}`}
                  style={form.riskLevel === r.value ? { borderColor: r.color, color: r.color, background: `${r.color}11` } : {}}
                  onClick={() => set('riskLevel', r.value)} disabled={loading}>
                  <span className={styles.riskLabel}>{r.label}</span>
                  <span className={styles.riskDesc}>{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Qué modifica */}
          <div className="inp-group">
            <label className="inp-label">¿Qué modifica exactamente? <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(una por línea)</span></label>
            <textarea className="inp"
              placeholder={"Premium desbloqueado\nRecursos ilimitados\nSin anuncios\nTodos los skins disponibles"}
              value={form.whatModifies}
              onChange={e => set('whatModifies', e.target.value)}
              rows={4} style={{ resize: 'vertical' }} disabled={loading} />
          </div>

          {/* Advertencia online (si aplica) */}
          <div className="inp-group">
            <label className="inp-label">Advertencia adicional <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(opcional)</span></label>
            <input className="inp"
              placeholder="Ej: Usar con cuenta secundaria para evitar ban"
              value={form.onlineWarning}
              onChange={e => set('onlineWarning', e.target.value)}
              maxLength={200} disabled={loading} />
          </div>

          {/* YouTube */}
          <div className="inp-group">
            <label className="inp-label">Video YouTube (opcional)</label>
            <input className="inp" placeholder="https://youtube.com/watch?v=..."
              value={form.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)} disabled={loading} />
          </div>

          {/* Tags */}
          <div className="inp-group">
            <label className="inp-label">Tags (separados por coma)</label>
            <input className="inp" placeholder="minecraft, mod, gratis, recursos ilimitados..."
              value={form.tags} onChange={e => set('tags', e.target.value)} disabled={loading} />
          </div>

          {/* Aviso legal que se publicará */}
          <div className={styles.legalPreview}>
            <div className={styles.legalTitle}>⚠️ Este aviso se añadirá automáticamente a la publicación</div>
            <div className={styles.legalText}>{LEGAL_NOTICE}</div>
          </div>

          {/* Progress */}
          {loading && (
            <div className={styles.progressWrap}>
              <div className={styles.progressTrack}>
                <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              </div>
              <div className={styles.progressInfo}>
                <span>{progressLabel || 'Procesando...'}</span>
                <span className={styles.progressPct}>{progress}%</span>
              </div>
            </div>
          )}

          <div className={styles.navRow}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(2)} disabled={loading}>← Atrás</button>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading
                ? <><span className="spinner" style={{ width: 17, height: 17 }} /> Publicando...</>
                : '🚀 Publicar ahora'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
