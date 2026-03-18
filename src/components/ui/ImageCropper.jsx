// src/components/ui/ImageCropper.jsx
import { useState, useRef, useEffect } from 'react'
import styles from './ImageCropper.module.css'

export default function ImageCropper({ imageSrc, aspectRatio = 16/9, onCrop, onCancel, circleMode = false }) {
  const canvasRef  = useRef(null)
  const wrapRef    = useRef(null)
  const imgObj     = useRef(new Image())
  const stateRef   = useRef({ drag: false, resize: null, startX: 0, startY: 0 })

  const [box, setBox]         = useState(null)
  const [imgLoaded, setLoaded] = useState(false)
  const [cw, setCw]           = useState(340)
  const [ch, setCh]           = useState(220)

  // ── Calcular dimensiones del canvas según ancho real disponible ──
  useEffect(() => {
    function measure() {
      const w = Math.min(window.innerWidth - 48, 600)
      const h = circleMode ? w : Math.round(w * 0.65)
      setCw(w); setCh(h)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [circleMode])

  // ── Cargar imagen ──
  useEffect(() => {
    setLoaded(false)
    imgObj.current = new Image()
    imgObj.current.onload = () => setLoaded(true)
    imgObj.current.src = imageSrc
  }, [imageSrc])

  // ── Inicializar box cuando imagen y dimensiones estén listas ──
  useEffect(() => {
    if (!imgLoaded || !cw || !ch) return
    const { dw, dh, ox, oy } = getImgRect()
    let bw = dw * 0.95
    let bh = bw / aspectRatio
    if (bh > dh * 0.95) { bh = dh * 0.95; bw = bh * aspectRatio }
    setBox({
      x: ox + (dw - bw) / 2,
      y: oy + (dh - bh) / 2,
      w: bw, h: bh,
    })
  }, [imgLoaded, cw, ch, aspectRatio])

  // ── Calcular donde se pinta la imagen en el canvas ──
  function getImgRect() {
    const iw = imgObj.current.naturalWidth  || 1
    const ih = imgObj.current.naturalHeight || 1
    const scale = Math.min(cw / iw, ch / ih)
    const dw = iw * scale, dh = ih * scale
    const ox = (cw - dw) / 2, oy = (ch - dh) / 2
    return { scale, dw, dh, ox, oy }
  }

  // ── Dibujar ──
  useEffect(() => {
    if (!imgLoaded || !box || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const { dw, dh, ox, oy } = getImgRect()

    ctx.clearRect(0, 0, cw, ch)

    // Fondo
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, cw, ch)

    // Imagen completa oscurecida
    ctx.globalAlpha = 1
    ctx.drawImage(imgObj.current, ox, oy, dw, dh)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, cw, ch)

    // Zona recortada — nítida
    ctx.save()
    if (circleMode) {
      ctx.beginPath()
      ctx.arc(box.x + box.w/2, box.y + box.h/2, Math.min(box.w, box.h)/2, 0, Math.PI*2)
    } else {
      ctx.beginPath()
      ctx.rect(box.x, box.y, box.w, box.h)
    }
    ctx.clip()
    ctx.drawImage(imgObj.current, ox, oy, dw, dh)
    ctx.restore()

    // Borde
    ctx.strokeStyle = '#a855f7'
    ctx.lineWidth = 2
    if (circleMode) {
      ctx.beginPath()
      ctx.arc(box.x + box.w/2, box.y + box.h/2, Math.min(box.w, box.h)/2, 0, Math.PI*2)
      ctx.stroke()
    } else {
      ctx.strokeRect(box.x, box.y, box.w, box.h)
      // Regla de tercios
      ctx.strokeStyle = 'rgba(168,85,247,0.4)'
      ctx.lineWidth = 1
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(box.x + box.w*i/3, box.y);       ctx.lineTo(box.x + box.w*i/3, box.y+box.h); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(box.x, box.y + box.h*i/3);       ctx.lineTo(box.x+box.w, box.y + box.h*i/3); ctx.stroke()
      }
    }

    // Handles esquinas — círculos blancos con borde morado
    const HR = 7
    const corners = circleMode ? [] : [
      [box.x,       box.y      ],
      [box.x+box.w, box.y      ],
      [box.x,       box.y+box.h],
      [box.x+box.w, box.y+box.h],
    ]
    corners.forEach(([cx, cy]) => {
      ctx.beginPath(); ctx.arc(cx, cy, HR, 0, Math.PI*2)
      ctx.fillStyle = '#fff'; ctx.fill()
      ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.stroke()
    })

    // En modo círculo — handles en 4 puntos cardinales
    if (circleMode) {
      const r = Math.min(box.w, box.h) / 2
      const cx0 = box.x + box.w/2, cy0 = box.y + box.h/2
      [[cx0, cy0-r],[cx0+r, cy0],[cx0, cy0+r],[cx0-r, cy0]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.arc(cx, cy, HR, 0, Math.PI*2)
        ctx.fillStyle = '#fff'; ctx.fill()
        ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.stroke()
      })
    }
  }, [box, imgLoaded, cw, ch, circleMode])

  // ── Obtener posición relativa al canvas con scaling CSS ──
  function getPos(e) {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const scaleX = cw / rect.width
    const scaleY = ch / rect.height
    const touch  = e.touches?.[0] || e.changedTouches?.[0]
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    }
  }

  function getHandle(pos) {
    if (!box) return null
    const HIT = 20
    if (circleMode) {
      const r  = Math.min(box.w, box.h) / 2
      const cx = box.x + box.w/2, cy = box.y + box.h/2
      const pts = [[cx, cy-r],[cx+r, cy],[cx, cy+r],[cx-r, cy]]
      for (const [px, py] of pts) {
        if (Math.hypot(pos.x-px, pos.y-py) < HIT) return 'circle'
      }
    } else {
      const { x, y, w, h } = box
      if (Math.hypot(pos.x-x,     pos.y-y    ) < HIT) return 'tl'
      if (Math.hypot(pos.x-(x+w), pos.y-y    ) < HIT) return 'tr'
      if (Math.hypot(pos.x-x,     pos.y-(y+h)) < HIT) return 'bl'
      if (Math.hypot(pos.x-(x+w), pos.y-(y+h)) < HIT) return 'br'
    }
    return null
  }

  function onDown(e) {
    e.preventDefault()
    if (!box) return
    const pos    = getPos(e)
    const handle = getHandle(pos)
    const inside = pos.x > box.x && pos.x < box.x+box.w && pos.y > box.y && pos.y < box.y+box.h
    stateRef.current = {
      drag: !handle && inside,
      resize: handle || null,
      startX: pos.x, startY: pos.y,
    }
  }

  function onMove(e) {
    e.preventDefault()
    const { drag, resize, startX, startY } = stateRef.current
    if (!drag && !resize) return
    const pos = getPos(e)
    const dx = pos.x - startX
    const dy = pos.y - startY
    stateRef.current.startX = pos.x
    stateRef.current.startY = pos.y

    setBox(b => {
      if (!b) return b
      let { x, y, w, h } = b

      if (drag) {
        x = Math.max(0, Math.min(cw - w, x + dx))
        y = Math.max(0, Math.min(ch - h, y + dy))
        return { x, y, w, h }
      }

      if (resize === 'circle') {
        // Escalar el círculo desde cualquier handle cardinal
        const delta = Math.max(Math.abs(dx), Math.abs(dy)) * Math.sign(dx + dy)
        const newW  = Math.max(40, w + delta * 2)
        const newH  = newW
        const nx    = x + (w - newW) / 2
        const ny    = y + (h - newH) / 2
        return {
          x: Math.max(0, nx), y: Math.max(0, ny),
          w: Math.min(newW, cw), h: Math.min(newH, ch),
        }
      }

      // Resize rectangular manteniendo aspect ratio
      let nw = w, nh = h, nx = x, ny = y
      if (resize === 'br') { nw = Math.max(60, w + dx); nh = nw / aspectRatio }
      if (resize === 'tr') { nw = Math.max(60, w + dx); nh = nw / aspectRatio; ny = y + h - nh }
      if (resize === 'bl') { nw = Math.max(60, w - dx); nh = nw / aspectRatio; nx = x + w - nw }
      if (resize === 'tl') { nw = Math.max(60, w - dx); nh = nw / aspectRatio; nx = x + w - nw; ny = y + h - nh }

      return {
        x: Math.max(0, nx),
        y: Math.max(0, ny),
        w: Math.min(nw, cw - Math.max(0, nx)),
        h: Math.min(nh, ch - Math.max(0, ny)),
      }
    })
  }

  function onUp() {
    stateRef.current.drag   = false
    stateRef.current.resize = null
  }

  // ── Aplicar recorte ──
  function applyCrop() {
    if (!box) return
    const { scale, ox, oy } = getImgRect()
    const iw = imgObj.current.naturalWidth
    const ih = imgObj.current.naturalHeight

    // Convertir coordenadas del canvas a coordenadas de la imagen original
    const sx = Math.max(0, (box.x - ox) / scale)
    const sy = Math.max(0, (box.y - oy) / scale)
    const sw = Math.min(box.w / scale, iw - sx)
    const sh = Math.min(box.h / scale, ih - sy)

    const out = document.createElement('canvas')
    out.width  = Math.round(sw)
    out.height = Math.round(sh)
    const ctx  = out.getContext('2d')

    if (circleMode) {
      ctx.beginPath()
      ctx.arc(sw/2, sh/2, Math.min(sw, sh)/2, 0, Math.PI*2)
      ctx.clip()
    }
    ctx.drawImage(imgObj.current, sx, sy, sw, sh, 0, 0, sw, sh)
    out.toBlob(blob => onCrop(blob, out.toDataURL('image/png')), 'image/png', 0.95)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} ref={wrapRef}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {circleMode ? '🖼️ Recortar foto de perfil' : '✂️ Recortar miniatura'}
          </h3>
          <button className={styles.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <p className={styles.hint}>
          {circleMode
            ? 'Mueve y ajusta el círculo sobre tu foto'
            : 'Arrastra para mover · Esquinas para redimensionar'}
        </p>

        <div className={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            width={cw}
            height={ch}
            className={styles.canvas}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
            onTouchStart={onDown}
            onTouchMove={onMove}
            onTouchEnd={onUp}
            style={{ touchAction: 'none', cursor: 'crosshair' }}
          />
        </div>

        <div className={styles.actions}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={applyCrop}>
            ✅ {circleMode ? 'Usar esta foto' : 'Aplicar recorte'}
          </button>
        </div>
      </div>
    </div>
  )
}
