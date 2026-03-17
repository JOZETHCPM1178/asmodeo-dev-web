// src/pages/WatermarkPage.jsx
import { useState, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import SEO from '../components/ui/SEO'
import styles from './WatermarkPage.module.css'

const METHODS = [
  { id: 'gemini', label: '✨ Quitar marca de agua Gemini', desc: 'Reverse Alpha Blending — pixel-perfect' },
]

export default function WatermarkPage() {
  const [img, setImg]               = useState(null)      // objeto Image
  const [imgSrc, setImgSrc]         = useState(null)      // data url original
  const [resultSrc, setResultSrc]   = useState(null)
  const [resultCanvas, setResultCanvas] = useState(null)
  const [method, setMethod]         = useState('gemini')
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

  // ─── Quitar marca de agua de Gemini/Nono — Reverse Alpha Blending + Texture Synthesis ───
  async function processGemini() {
    setProgress(8); setProgressMsg('Analizando imagen...')
    await tick()

    const W = img.naturalWidth, H = img.naturalHeight

    // Gemini siempre: esquina inferior derecha
    // ≤1024px → 48×48px con margen 32px
    // >1024px → 96×96px con margen 32px
    const isLarge = W > 1024 || H > 1024
    const wmSize  = isLarge ? 96 : 48
    const margin  = 32
    const x0 = W - wmSize - margin
    const y0 = H - wmSize - margin
    const x1 = x0 + wmSize
    const y1 = y0 + wmSize

    setProgress(20); setProgressMsg('Cargando en canvas...')
    await tick()

    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, W, H)
    const d = imageData.data
    const out = new Uint8ClampedArray(d)

    setProgress(35); setProgressMsg('Paso 1: Estimando alpha del logo...')
    await tick()

    // ── PASO 1: Calcular alpha map de la zona WM ──
    // Para cada píxel en la zona, comparamos con el píxel espejo
    // (reflejado horizontalmente fuera de la zona) para estimar alpha
    const alphaMap = new Float32Array(wmSize * wmSize)

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const lx = x - x0, ly = y - y0
        const i = (y * W + x) * 4
        const r = d[i], g = d[i+1], b = d[i+2]

        // Buscar píxel de referencia: usamos el espejo horizontal
        // Si no está disponible, usamos el vecino más cercano fuera de la zona
        let refR = -1, refG = -1, refB = -1

        // Intentar espejo horizontal (mismo y, x espejado)
        const mirrorX = x0 - (lx + 1)
        if (mirrorX >= 0 && mirrorX < W) {
          const mi = (y * W + mirrorX) * 4
          refR = d[mi]; refG = d[mi+1]; refB = d[mi+2]
        }

        // Si el espejo no funciona, buscar vecino más cercano fuera de zona
        if (refR < 0) {
          let bestDist = 999999
          const checkPts = [
            [x0 - 1, y], [x1, y],       // izq / der
            [x, y0 - 1], [x, y1],        // arriba / abajo
            [x0 - 1, y0 - 1], [x1, y1],  // esquinas
          ]
          for (const [cx, cy] of checkPts) {
            if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue
            const dist = Math.abs(cx - x) + Math.abs(cy - y)
            if (dist < bestDist) {
              bestDist = dist
              const ci = (cy * W + cx) * 4
              refR = d[ci]; refG = d[ci+1]; refB = d[ci+2]
            }
          }
        }

        // Logo Gemini = chispa blanca (255,255,255)
        // alpha = (C_out - C_orig) / (255 - C_orig)
        const aR = refR < 255 ? Math.max(0, (r - refR) / (255 - refR)) : 0
        const aG = refG < 255 ? Math.max(0, (g - refG) / (255 - refG)) : 0
        const aB = refB < 255 ? Math.max(0, (b - refB) / (255 - refB)) : 0
        alphaMap[ly * wmSize + lx] = Math.min(1, (aR + aG + aB) / 3)
      }
    }

    setProgress(55); setProgressMsg('Paso 2: Revirtiendo alpha blending...')
    await tick()

    // ── PASO 2: Reverse alpha blending ──
    // C_orig = (C_out - 255 * alpha) / (1 - alpha)
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const lx = x - x0, ly = y - y0
        const alpha = alphaMap[ly * wmSize + lx]
        if (alpha < 0.03) continue  // Sin marca aquí

        const i = (y * W + x) * 4
        const inv = 1 - alpha

        if (inv < 0.03) {
          // Píxel casi 100% cubierto por la marca — copiar del vecino más cercano fuera de zona
          const srcX = x < (x0 + x1) / 2 ? x0 - 1 : x1
          const srcY = Math.max(0, Math.min(H - 1, y))
          const si   = (srcY * W + Math.max(0, Math.min(W - 1, srcX))) * 4
          out[i] = d[si]; out[i+1] = d[si+1]; out[i+2] = d[si+2]
        } else {
          // Reverse: C_orig = (C_out - 255*alpha) / (1-alpha)
          out[i]   = Math.max(0, Math.min(255, Math.round((d[i]   - 255 * alpha) / inv)))
          out[i+1] = Math.max(0, Math.min(255, Math.round((d[i+1] - 255 * alpha) / inv)))
          out[i+2] = Math.max(0, Math.min(255, Math.round((d[i+2] - 255 * alpha) / inv)))
        }
        out[i+3] = 255
      }
    }

    setProgress(72); setProgressMsg('Paso 3: Restaurando textura...')
    await tick()

    // ── PASO 3: Texture synthesis — elimina el borroso ──
    // Para píxeles con alpha alto (>0.5) que quedaron planos,
    // tomamos el patrón de textura del área vecina y lo aplicamos
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const lx = x - x0, ly = y - y0
        const alpha = alphaMap[ly * wmSize + lx]
        if (alpha < 0.4) continue  // Solo corrección en zonas muy cubiertas

        const i = (y * W + x) * 4

        // Encontrar el parche más similar en la zona limpia adyacente
        // Usamos un área 5x5 de referencia fuera de la zona WM
        // y buscamos el parche con menor diferencia de color
        let bestMatch = null
        let bestScore = Infinity
        const patchR = 2  // radio del parche de búsqueda

        // Zona de búsqueda: banda de 40px fuera de los bordes de la WM
        const searchZones = [
          // Banda izquierda
          { xs: Math.max(0, x0 - 40), xe: x0 - 1, ys: Math.max(0, y0 - 10), ye: Math.min(H-1, y1 + 10) },
          // Banda derecha  
          { xs: x1 + 1, xe: Math.min(W-1, x1 + 40), ys: Math.max(0, y0 - 10), ye: Math.min(H-1, y1 + 10) },
          // Banda inferior
          { xs: Math.max(0, x0 - 10), xe: Math.min(W-1, x1 + 10), ys: y1 + 1, ye: Math.min(H-1, y1 + 40) },
        ]

        for (const zone of searchZones) {
          for (let sy = zone.ys; sy <= zone.ye; sy += 3) {
            for (let sx = zone.xs; sx <= zone.xe; sx += 3) {
              // Calcular diferencia de color entre current y candidate
              const ci = (sy * W + sx) * 4
              const dr = out[i] - d[ci], dg = out[i+1] - d[ci+1], db = out[i+2] - d[ci+2]
              const score = dr*dr + dg*dg + db*db
              if (score < bestScore) {
                bestScore = score
                bestMatch = { y: sy, x: sx }
              }
            }
          }
          if (bestScore < 50) break  // Encontramos match casi exacto
        }

        if (bestMatch && bestScore < 2000) {
          // Blend: mezcla el resultado del reverse con la textura del match
          // El peso del blend depende de qué tan cubierto estaba (alpha)
          const blendW = Math.min(0.7, (alpha - 0.4) * 2)
          const mi = (bestMatch.y * W + bestMatch.x) * 4
          out[i]   = Math.round(out[i]   * (1-blendW) + d[mi]   * blendW)
          out[i+1] = Math.round(out[i+1] * (1-blendW) + d[mi+1] * blendW)
          out[i+2] = Math.round(out[i+2] * (1-blendW) + d[mi+2] * blendW)
        }
      }
    }

    setProgress(90); setProgressMsg('Finalizando...')
    await tick()

    const outData = new ImageData(out, W, H)
    const rc = document.createElement('canvas')
    rc.width = W; rc.height = H
    rc.getContext('2d').putImageData(outData, 0, 0)
    setResultCanvas(rc)
    setResultSrc(rc.toDataURL('image/png'))
    setStats({ w: W, h: H, pct: `${wmSize}×${wmSize}px`, gemini: true })
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
      if (method === 'gemini') await processGemini()
      else if (method === 'ai') await processClipDrop()
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

          {/* Info card Gemini */}
          <div className={styles.geminiCard}>
            <span style={{ fontSize: '1.6rem' }}>✨</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--t1)', marginBottom: '0.3rem' }}>
                Optimizado para Gemini · Nono Banana · Imagen 3
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--t2)', lineHeight: 1.5 }}>
                Usa <strong>Reverse Alpha Blending + Texture Synthesis</strong> en 3 pasos para eliminar el logo de la esquina inferior derecha sin dejar borroso ni manchas.
              </p>
              <p style={{ fontSize: '0.73rem', color: 'var(--t3)', marginTop: '0.4rem' }}>
                ✅ Gratis e ilimitado · ✅ Sin API · ✅ La imagen no sale de tu dispositivo
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className={styles.actionRow}>
            <button className="btn btn-primary" onClick={process} disabled={processing}>
              {processing
                ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Procesando...</>
                : '✨ Quitar marca de agua Gemini'}
            </button>
            <button className="btn btn-ghost" onClick={reset} disabled={processing}>
              🗑️ Cambiar imagen
            </button>
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
                        {stats.w} × {stats.h}px · zona {stats.pct} · pixel-perfect
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
        <h3>ℹ️ ¿Cómo funciona?</h3>
        <ol className={styles.steps}>
          <li><strong>Paso 1:</strong> Detecta el logo de Gemini en la esquina inferior derecha (48×48px o 96×96px)</li>
          <li><strong>Paso 2:</strong> Calcula el alpha real de cada píxel del logo y revierte la mezcla matemáticamente</li>
          <li><strong>Paso 3:</strong> Texture Synthesis — busca el parche de textura más similar en la zona adyacente y lo aplica para eliminar el borroso</li>
        </ol>
        <p className={styles.infoNote}>
          Funciona con imágenes generadas por Gemini, Imagen 3, Nono Banana y cualquier app que use el logo de chispa de Google IA.
        </p>
      </div>
    </div>
  )
}
