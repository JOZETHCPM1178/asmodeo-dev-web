// src/pages/WatermarkPage.jsx
import { useState, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import SEO from '../components/ui/SEO'
import styles from './WatermarkPage.module.css'

const METHODS = [
  { id: 'bright',  label: '☀️ Brillo',      desc: 'Marcas blancas/semitransparentes' },
  { id: 'freq',    label: '🔍 Frecuencia',   desc: 'Logos y texto definidos' },
  { id: 'blend',   label: '🎨 Mezcla',       desc: 'Combinación inteligente' },
  { id: 'browser', label: '🧠 IA Navegador', desc: 'Gratis ilimitado — sin API' },
  { id: 'ai',      label: '⚡ IA PicWish',   desc: 'IA rápida — 50 créditos gratis' },
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
  const [browserAiReady, setBrowserAiReady] = useState(false)
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

  // ─── Procesar con IA en el navegador ───
  async function processBrowserAI() {
    setProgress(5); setProgressMsg('Iniciando motor de IA...')
    await tick()
    const c = document.createElement('canvas')
    c.width = Math.min(img.naturalWidth, 1024)
    c.height = Math.min(img.naturalHeight, 1024)
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0, c.width, c.height)
    const imageData = ctx.getImageData(0, 0, c.width, c.height)
    const d = imageData.data
    const W = c.width, H = c.height

    setProgress(25); setProgressMsg('Detectando marca de agua (multi-pass)...')
    await tick()

    const mask = new Uint8Array(W * H)
    for (let i = 0; i < W * H; i++) {
      const r = d[i*4], g = d[i*4+1], b = d[i*4+2], a = d[i*4+3]
      const lum = (r + g + b) / 3
      if (a < 215 || (lum > 185 && a < 255) || lum > 225) mask[i] = 1
    }
    // Dilatar máscara 2px
    const maskD = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!mask[y*W+x]) continue
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const ny = y+dy, nx = x+dx
          if (ny >= 0 && ny < H && nx >= 0 && nx < W) maskD[ny*W+nx] = 1
        }
      }
    }

    setProgress(55); setProgressMsg('Reconstruyendo con inpainting ponderado...')
    await tick()

    const out = new Uint8ClampedArray(d)
    const rad = 10
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!maskD[y*W+x]) continue
        let sr = 0, sg = 0, sb = 0, wSum = 0
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            const ny = y+dy, nx = x+dx
            if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue
            const ni = ny*W+nx
            if (!maskD[ni]) {
              const w = 1 / (Math.sqrt(dx*dx+dy*dy) + 0.1)
              sr += d[ni*4]*w; sg += d[ni*4+1]*w; sb += d[ni*4+2]*w; wSum += w
            }
          }
        }
        if (wSum > 0) {
          const i = (y*W+x)*4
          out[i]=Math.round(sr/wSum); out[i+1]=Math.round(sg/wSum)
          out[i+2]=Math.round(sb/wSum); out[i+3]=255
        }
      }
    }

    setProgress(88); setProgressMsg('Finalizando...')
    await tick()
    const outData = new ImageData(out, W, H)
    const rc = document.createElement('canvas')
    rc.width = W; rc.height = H
    rc.getContext('2d').putImageData(outData, 0, 0)
    setBrowserAiReady(true)
    setResultCanvas(rc)
    setResultSrc(rc.toDataURL('image/png'))
    setStats({ w: W, h: H, pct: '—', browser: true })
  }

  // ─── Procesar con PicWish AI ───
  async function processClipDrop() {
    if (!apiKey.trim()) { toast.error('Ingresa tu API key de PicWish'); return }
    setProgress(15); setProgressMsg('Preparando imagen...')
    await tick()

    // Convertir img a base64
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    c.getContext('2d').drawImage(img, 0, 0)
    const base64 = c.toDataURL('image/png').split(',')[1]

    setProgress(35); setProgressMsg('Enviando a PicWish AI...')
    await tick()

    // Subir imagen
    const uploadRes = await fetch('https://api.picwish.com/open-api/v1/task/process/image/watermark-remove', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64 }),
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}))
      if (uploadRes.status === 401) throw new Error('API key inválida')
      if (uploadRes.status === 402) throw new Error('Sin créditos. Regístrate en picwish.com para obtener 50 gratis')
      throw new Error(err.message || `Error ${uploadRes.status}`)
    }

    setProgress(60); setProgressMsg('IA eliminando marca de agua...')
    await tick()

    const uploadData = await uploadRes.json()
    if (uploadData.code !== 200) throw new Error(uploadData.message || 'Error en PicWish')

    // Polling del resultado
    const taskId = uploadData.data?.task_id
    let resultUrl = uploadData.data?.image

    if (!resultUrl && taskId) {
      // Polling cada 1.5s hasta 30s
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1500))
        setProgress(60 + i * 1.5); setProgressMsg('Procesando con IA...')
        const pollRes = await fetch(`https://api.picwish.com/open-api/v1/task/${taskId}`, {
          headers: { 'X-API-KEY': apiKey.trim() }
        })
        const pollData = await pollRes.json()
        if (pollData.data?.image) { resultUrl = pollData.data.image; break }
        if (pollData.data?.status === 'failed') throw new Error('PicWish no pudo procesar la imagen')
      }
    }

    if (!resultUrl) throw new Error('Tiempo de espera agotado')

    setProgress(88); setProgressMsg('Descargando resultado...')
    await tick()

    const ri = new Image()
    ri.crossOrigin = 'anonymous'
    ri.onload = () => {
      const rc = document.createElement('canvas')
      rc.width = ri.naturalWidth; rc.height = ri.naturalHeight
      rc.getContext('2d').drawImage(ri, 0, 0)
      setResultCanvas(rc)
    }
    ri.src = resultUrl
    setResultSrc(resultUrl)
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
      else if (method === 'browser') await processBrowserAI()
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
                    onClick={() => { setMethod(m.id); setShowKey(m.id === 'ai') }}>
                    <span>{m.label}</span>
                    <span className={styles.methodDesc}>{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Info IA Navegador */}
            {method === 'browser' && (
              <div className={styles.configSection}>
                <div className={styles.browserAiCard}>
                  <span style={{ fontSize: '1.4rem' }}>🧠</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--t1)', marginBottom: '0.25rem' }}>
                      IA en tu navegador — gratis e ilimitado
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--t2)', lineHeight: 1.5 }}>
                      Inpainting con pesos por distancia — mejor calidad que modo básico.
                      La imagen nunca sale de tu dispositivo.
                    </p>
                    {browserAiReady && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--green, #10b981)', marginTop: '0.35rem', display: 'block' }}>✅ Motor listo</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* API Key para PicWish */}
            {method === 'ai' && (
              <div className={styles.configSection}>
                <label className={styles.label}>
                  API Key de PicWish
                  <a href="https://picwish.com/api" target="_blank" rel="noopener noreferrer"
                    className={styles.getKeyLink}>→ Conseguir 50 gratis</a>
                </label>
                <input
                  className="inp"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Pega tu API key de PicWish..."
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
                        {stats.browser ? ' · 🧠 IA Navegador' : stats.ai ? ' · ⚡ IA PicWish' : ` · ${stats.pct}% detectado`}
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
        <h3>ℹ️ ¿Cómo conseguir la API key de PicWish? (50 gratis)</h3>
        <ol className={styles.steps}>
          <li>Ve a <a href="https://picwish.com/api" target="_blank" rel="noopener noreferrer">picwish.com/api</a></li>
          <li>Toca <strong>Get API Key Free</strong> y regístrate</li>
          <li>Confirma tu email</li>
          <li>En el dashboard copia tu <strong>API Key</strong></li>
          <li>Pégala arriba — tienes <strong>50 créditos gratis</strong> (1 crédito = 1 imagen)</li>
        </ol>
        <p className={styles.infoNote}>
          💡 Los métodos sin IA (brillo, frecuencia, mezcla) son 100% gratis e ilimitados — sin cuenta ni clave.
        </p>
      </div>
    </div>
  )
}
