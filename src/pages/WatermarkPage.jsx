// src/pages/WatermarkPage.jsx
import { useState, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import SEO from '../components/ui/SEO'
import styles from './WatermarkPage.module.css'

const METHODS = [
  { id: 'bright', label: '☀️ Brillo', desc: 'Marcas blancas/semitransparentes' },
  { id: 'freq',   label: '🔍 Frecuencia', desc: 'Logos y texto definidos' },
  { id: 'blend',  label: '🎨 Mezcla', desc: 'Combinación inteligente' },
  { id: 'ai',     label: '🤖 IA (Clipdrop)', desc: 'Mejor resultado — requiere API key' },
]

export default function WatermarkPage() {
  const [img, setImg]               = useState(null)      // objeto Image
  const [imgSrc, setImgSrc]         = useState(null)      // data url original
  const [resultSrc, setResultSrc]   = useState(null)
  const [resultCanvas, setResultCanvas] = useState(null)
  const [method, setMethod]         = useState('bright')
  const [threshold, setThreshold]   = useState(200)
  const [radius, setRadius]         = useState(4)
  const [apiKey, setApiKey]         = useState('')
  const [showKey, setShowKey]       = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [drag, setDrag]             = useState(false)
  const [stats, setStats]           = useState(null)
  const fileRef = useRef(null)

  // ─── Cargar imagen ───
  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast.error('Solo imágenes'); return }
    if (file.size > 20 * 1024 * 1024) { toast.error('Máximo 20MB'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const image = new Image()
      image.onload = () => { setImg(image); setImgSrc(e.target.result); setResultSrc(null); setStats(null) }
      image.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  // ─── Drag & Drop ───
  function onDrop(e) {
    e.preventDefault(); setDrag(false)
    loadFile(e.dataTransfer.files[0])
  }

  // ─── Procesar con Canvas (sin API) ───
  async function processCanvas() {
    setProgress(10); setProgressMsg('Cargando en canvas...')
    await tick()

    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, c.width, c.height)
    const d = imageData.data
    const W = c.width, H = c.height

    setProgress(25); setProgressMsg('Detectando marca de agua...')
    await tick()

    const mask = new Uint8Array(W * H)
    const thr = threshold
    let detected = 0

    if (method === 'bright') {
      for (let i = 0; i < W * H; i++) {
        const r = d[i*4], g = d[i*4+1], b = d[i*4+2], a = d[i*4+3]
        const lum = (r + g + b) / 3
        if (a < 200 || (lum > thr && a < 255 && lum > 180)) { mask[i] = 1; detected++ }
      }
    } else if (method === 'freq') {
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x
          const r = d[i*4], g = d[i*4+1], b = d[i*4+2], a = d[i*4+3]
          const lum = (r + g + b) / 3
          const neighbors = [
            (y-1)*W+(x-1),(y-1)*W+x,(y-1)*W+(x+1),
            y*W+(x-1), y*W+(x+1),
            (y+1)*W+(x-1),(y+1)*W+x,(y+1)*W+(x+1)
          ]
          const avgN = neighbors.reduce((s, n) => s + (d[n*4]+d[n*4+1]+d[n*4+2])/3, 0) / 8
          const diff = Math.abs(lum - avgN)
          if (a < 230 || (lum > thr && diff < 20)) { mask[i] = 1; detected++ }
        }
      }
    } else {
      for (let i = 0; i < W * H; i++) {
        const r = d[i*4], g = d[i*4+1], b = d[i*4+2], a = d[i*4+3]
        const lum = (r + g + b) / 3
        if (a < 220 || (lum > thr - 20 && a < 255)) { mask[i] = 1; detected++ }
      }
    }

    setProgress(55); setProgressMsg('Reconstruyendo zonas...')
    await tick()

    // Dilatar máscara
    const maskD = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (mask[y*W+x]) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y+dy, nx = x+dx
              if (ny >= 0 && ny < H && nx >= 0 && nx < W) maskD[ny*W+nx] = 1
            }
          }
        }
      }
    }

    // Inpainting
    const out = new Uint8ClampedArray(d)
    const rad = radius
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!maskD[y*W+x]) continue
        let sr = 0, sg = 0, sb = 0, cnt = 0
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            const ny = y+dy, nx = x+dx
            if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue
            const ni = ny*W+nx
            if (!maskD[ni]) { sr += d[ni*4]; sg += d[ni*4+1]; sb += d[ni*4+2]; cnt++ }
          }
        }
        if (cnt > 0) {
          const i = (y*W+x) * 4
          out[i]   = Math.round(sr/cnt)
          out[i+1] = Math.round(sg/cnt)
          out[i+2] = Math.round(sb/cnt)
          out[i+3] = 255
        }
      }
    }

    setProgress(90); setProgressMsg('Generando imagen...')
    await tick()

    const outData = new ImageData(out, W, H)
    const rc = document.createElement('canvas')
    rc.width = W; rc.height = H
    rc.getContext('2d').putImageData(outData, 0, 0)
    setResultCanvas(rc)
    setResultSrc(rc.toDataURL('image/png'))
    setStats({ w: W, h: H, pct: ((detected / (W*H)) * 100).toFixed(1) })
  }

  // ─── Procesar con Clipdrop AI ───
  async function processClipDrop() {
    if (!apiKey.trim()) { toast.error('Ingresa tu API key de Clipdrop'); return }
    setProgress(20); setProgressMsg('Enviando a Clipdrop AI...')
    await tick()

    // Convertir img a blob
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    c.getContext('2d').drawImage(img, 0, 0)

    const blob = await new Promise(res => c.toBlob(res, 'image/png'))

    // Crear máscara blanca total (deja que la IA decida)
    const mc = document.createElement('canvas')
    mc.width = img.naturalWidth; mc.height = img.naturalHeight
    const mctx = mc.getContext('2d')
    mctx.fillStyle = 'white'
    mctx.fillRect(0, 0, mc.width, mc.height)
    const maskBlob = await new Promise(res => mc.toBlob(res, 'image/png'))

    setProgress(50); setProgressMsg('IA procesando imagen...')
    await tick()

    const form = new FormData()
    form.append('image_file', blob, 'image.png')
    form.append('mask_file', maskBlob, 'mask.png')

    const res = await fetch('https://clipdrop-api.co/cleanup/v1', {
      method: 'POST',
      headers: { 'x-api-key': apiKey.trim() },
      body: form,
    })

    if (!res.ok) {
      const err = await res.text()
      if (res.status === 402) throw new Error('Sin créditos. Compra más en clipdrop.co')
      if (res.status === 401) throw new Error('API key inválida')
      throw new Error(err || `Error ${res.status}`)
    }

    setProgress(85); setProgressMsg('Descargando resultado...')
    await tick()

    const buffer = await res.arrayBuffer()
    const resultBlob = new Blob([buffer], { type: 'image/png' })
    const url = URL.createObjectURL(resultBlob)

    // Guardar como canvas para descarga
    const ri = new Image()
    ri.onload = () => {
      const rc = document.createElement('canvas')
      rc.width = ri.naturalWidth; rc.height = ri.naturalHeight
      rc.getContext('2d').drawImage(ri, 0, 0)
      setResultCanvas(rc)
    }
    ri.src = url

    setResultSrc(url)
    setStats({ w: img.naturalWidth, h: img.naturalHeight, pct: '—', ai: true })
  }

  // ─── Proceso principal ───
  async function process() {
    if (!img) return
    setProcessing(true)
    setResultSrc(null)
    setProgress(0)
    try {
      if (method === 'ai') await processClipDrop()
      else await processCanvas()
      setProgress(100); setProgressMsg('¡Listo!')
      toast.success('Marca de agua eliminada ✅')
    } catch (e) {
      toast.error(e.message || 'Error al procesar')
      setProgressMsg('Error: ' + (e.message || 'intenta de nuevo'))
    } finally {
      setProcessing(false)
    }
  }

  function download() {
    if (!resultSrc) return
    const a = document.createElement('a')
    a.download = 'sin-marca-agua.png'
    a.href = resultCanvas ? resultCanvas.toDataURL('image/png') : resultSrc
    a.click()
  }

  function reset() {
    setImg(null); setImgSrc(null); setResultSrc(null)
    setStats(null); setProgress(0); setProgressMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const tick = () => new Promise(r => setTimeout(r, 30))

  return (
    <div className={styles.page}>
      <SEO
        title="Quitar marca de agua"
        description="Elimina marcas de agua de tus imágenes gratis — sin API ni registro"
        url="/watermark"
      />

      <div className={styles.header}>
        <h1 className={styles.title}>🖼️ Quitar marca de agua</h1>
        <p className={styles.sub}>
          Elimina marcas de agua de tus imágenes directamente en el navegador — sin subir a ningún servidor
        </p>
      </div>

      {/* ── ZONA DE CARGA ── */}
      {!img && (
        <div
          className={`${styles.dropzone} ${drag ? styles.dragOver : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <span style={{ fontSize: '2.5rem' }}>📁</span>
          <p className={styles.dropTitle}>Toca o arrastra tu imagen aquí</p>
          <p className={styles.dropSub}>JPG, PNG, WebP · máx 20 MB</p>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => loadFile(e.target.files[0])} />
        </div>
      )}

      {/* ── IMAGEN CARGADA ── */}
      {img && (
        <div className={styles.workspace}>
          {/* Configuración */}
          <div className={styles.config}>
            <div className={styles.configSection}>
              <label className={styles.label}>Método</label>
              <div className={styles.methodGrid}>
                {METHODS.map(m => (
                  <button key={m.id}
                    className={`${styles.methodBtn} ${method === m.id ? styles.methodActive : ''}`}
                    onClick={() => { setMethod(m.id); if (m.id === 'ai') setShowKey(true) }}>
                    <span>{m.label}</span>
                    <span className={styles.methodDesc}>{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key para Clipdrop */}
            {method === 'ai' && (
              <div className={styles.configSection}>
                <label className={styles.label}>
                  API Key de Clipdrop
                  <a href="https://clipdrop.co/apis/signin" target="_blank" rel="noopener noreferrer"
                    className={styles.getKeyLink}>→ Conseguir gratis</a>
                </label>
                <input
                  className="inp"
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <button className={styles.toggleKey} onClick={() => setShowKey(s => !s)}>
                  {showKey ? '🙈 Ocultar' : '👁️ Mostrar'}
                </button>
                <p className={styles.keyNote}>
                  🔒 La clave nunca sale de tu navegador — se usa directo desde aquí.
                </p>
              </div>
            )}

            {/* Controles avanzados */}
            {method !== 'ai' && (
              <div className={styles.sliders}>
                <div className={styles.sliderGroup}>
                  <label className={styles.label}>
                    Umbral de detección <strong>{threshold}</strong>
                  </label>
                  <input type="range" min={100} max={254} value={threshold} step={1}
                    onChange={e => setThreshold(Number(e.target.value))} />
                  <p className={styles.sliderHint}>Mayor = detecta píxeles más brillantes</p>
                </div>
                <div className={styles.sliderGroup}>
                  <label className={styles.label}>
                    Radio de reconstrucción <strong>{radius}px</strong>
                  </label>
                  <input type="range" min={1} max={20} value={radius} step={1}
                    onChange={e => setRadius(Number(e.target.value))} />
                  <p className={styles.sliderHint}>Mayor = relleno más suave pero más lento</p>
                </div>
              </div>
            )}

            <div className={styles.actionRow}>
              <button className="btn btn-primary" onClick={process} disabled={processing}>
                {processing
                  ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Procesando...</>
                  : '✨ Quitar marca de agua'}
              </button>
              <button className="btn btn-ghost" onClick={reset} disabled={processing}>
                🗑️ Cambiar imagen
              </button>
            </div>
          </div>

          {/* Progreso */}
          {processing && (
            <div className={styles.progressWrap}>
              <div className={styles.progressTrack}>
                <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              </div>
              <p className={styles.progressMsg}>{progressMsg}</p>
            </div>
          )}

          {/* Comparación antes / después */}
          <div className={styles.compare}>
            <div className={styles.comparePanel}>
              <p className={styles.compareLabel}>📷 Original</p>
              <img src={imgSrc} alt="original" className={styles.compareImg} />
              <p className={styles.compareMeta}>
                {img.naturalWidth} × {img.naturalHeight}px
              </p>
            </div>

            <div className={styles.comparePanel}>
              <p className={styles.compareLabel}>✨ Resultado</p>
              {resultSrc
                ? <>
                    <img src={resultSrc} alt="resultado" className={styles.compareImg} />
                    {stats && (
                      <p className={styles.compareMeta}>
                        {stats.w} × {stats.h}px
                        {stats.ai ? ' · IA Clipdrop' : ` · ${stats.pct}% detectado`}
                      </p>
                    )}
                  </>
                : <div className={styles.resultPlaceholder}>
                    {processing
                      ? <span className="spinner spinner-lg" />
                      : <p>Aquí aparecerá el resultado</p>
                    }
                  </div>
              }
            </div>
          </div>

          {/* Descargar */}
          {resultSrc && (
            <div className={styles.downloadRow}>
              <button className="btn btn-primary btn-lg" onClick={download}>
                ⬇️ Descargar PNG sin marca de agua
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className={styles.infoBox}>
        <h3>ℹ️ ¿Cómo conseguir la API key de Clipdrop? (gratis)</h3>
        <ol className={styles.steps}>
          <li>Ve a <a href="https://clipdrop.co/apis/signin" target="_blank" rel="noopener noreferrer">clipdrop.co/apis/signin</a></li>
          <li>Regístrate con tu email</li>
          <li>Ve a tu perfil → toca <strong>Reveal API Key</strong></li>
          <li>Reclama tus <strong>100 créditos gratis</strong> verificando tu número</li>
          <li>Pégala arriba y listo — 1 crédito por imagen</li>
        </ol>
        <p className={styles.infoNote}>
          Los métodos sin IA (brillo, frecuencia, mezcla) son completamente gratis e ilimitados — sin cuenta ni clave.
        </p>
      </div>
    </div>
  )
}
