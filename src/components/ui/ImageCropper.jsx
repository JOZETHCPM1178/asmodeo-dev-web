// src/components/ui/ImageCropper.jsx
// Recortador de imagen — sin librerías externas, solo Canvas
import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './ImageCropper.module.css'

export default function ImageCropper({ imageSrc, aspectRatio = 16/9, onCrop, onCancel, circleMode = false }) {
  const canvasRef   = useRef(null)
  const imgRef      = useRef(null)
  const containerRef = useRef(null)

  const [drag, setDrag]       = useState(false)
  const [resize, setResize]   = useState(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [imgLoaded, setImgLoaded] = useState(false)

  // Crop box en coordenadas del canvas
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 })

  // Tamaño del canvas display
  const DISPLAY_W = 340
  const DISPLAY_H = 280

  // Imagen real
  const img = useRef(new Image())

  useEffect(() => {
    img.current.onload = () => {
      setImgLoaded(true)
      // Inicializar box centrado con aspect ratio correcto
      const iw = img.current.naturalWidth
      const ih = img.current.naturalHeight
      const scale = Math.min(DISPLAY_W / iw, DISPLAY_H / ih)
      const dw = iw * scale
      const dh = ih * scale
      const ox = (DISPLAY_W - dw) / 2
      const oy = (DISPLAY_H - dh) / 2

      let bw = dw * 0.8
      let bh = bw / aspectRatio
      if (bh > dh * 0.8) { bh = dh * 0.8; bw = bh * aspectRatio }
      const bx = ox + (dw - bw) / 2
      const by = oy + (dh - bh) / 2
      setBox({ x: bx, y: by, w: bw, h: bh })
    }
    img.current.src = imageSrc
  }, [imageSrc, aspectRatio])

  // Dibujar canvas
  useEffect(() => {
    if (!imgLoaded) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H)

    // Fondo oscuro
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H)

    // Imagen
    const iw = img.current.naturalWidth
    const ih = img.current.naturalHeight
    const scale = Math.min(DISPLAY_W / iw, DISPLAY_H / ih)
    const dw = iw * scale, dh = ih * scale
    const ox = (DISPLAY_W - dw) / 2, oy = (DISPLAY_H - dh) / 2
    ctx.drawImage(img.current, ox, oy, dw, dh)

    // Oscurecer fuera del crop
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H)

    // Recortar área visible
    ctx.save()
    if (circleMode) {
      ctx.beginPath()
      ctx.ellipse(box.x + box.w/2, box.y + box.h/2, box.w/2, box.h/2, 0, 0, Math.PI*2)
      ctx.clip()
    } else {
      ctx.beginPath()
      ctx.rect(box.x, box.y, box.w, box.h)
      ctx.clip()
    }
    ctx.drawImage(img.current, ox, oy, dw, dh)
    ctx.restore()

    // Borde del crop
    ctx.strokeStyle = '#a855f7'
    ctx.lineWidth = 2
    if (circleMode) {
      ctx.beginPath()
      ctx.ellipse(box.x + box.w/2, box.y + box.h/2, box.w/2, box.h/2, 0, 0, Math.PI*2)
      ctx.stroke()
    } else {
      ctx.strokeRect(box.x, box.y, box.w, box.h)
      // Regla de tercios
      ctx.strokeStyle = 'rgba(168,85,247,0.35)'
      ctx.lineWidth = 1
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(box.x + box.w*i/3, box.y); ctx.lineTo(box.x + box.w*i/3, box.y+box.h); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(box.x, box.y + box.h*i/3); ctx.lineTo(box.x+box.w, box.y + box.h*i/3); ctx.stroke()
      }
    }

    // Handles en las esquinas
    const hSize = 10
    ctx.fillStyle = '#a855f7'
    const corners = [
      [box.x, box.y], [box.x+box.w-hSize, box.y],
      [box.x, box.y+box.h-hSize], [box.x+box.w-hSize, box.y+box.h-hSize]
    ]
    corners.forEach(([cx, cy]) => ctx.fillRect(cx, cy, hSize, hSize))

  }, [box, imgLoaded, circleMode])

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function getHandle(pos) {
    const hSize = 14
    if (Math.abs(pos.x - box.x) < hSize && Math.abs(pos.y - box.y) < hSize) return 'tl'
    if (Math.abs(pos.x - (box.x+box.w)) < hSize && Math.abs(pos.y - box.y) < hSize) return 'tr'
    if (Math.abs(pos.x - box.x) < hSize && Math.abs(pos.y - (box.y+box.h)) < hSize) return 'bl'
    if (Math.abs(pos.x - (box.x+box.w)) < hSize && Math.abs(pos.y - (box.y+box.h)) < hSize) return 'br'
    return null
  }

  function onMouseDown(e) {
    e.preventDefault()
    const pos = getPos(e)
    const handle = getHandle(pos)
    if (handle) {
      setResize(handle)
    } else if (pos.x > box.x && pos.x < box.x+box.w && pos.y > box.y && pos.y < box.y+box.h) {
      setDrag(true)
    }
    setStartPos(pos)
  }

  function onMouseMove(e) {
    e.preventDefault()
    if (!drag && !resize) return
    const pos = getPos(e)
    const dx = pos.x - startPos.x
    const dy = pos.y - startPos.y

    setBox(b => {
      let { x, y, w, h } = b
      if (drag) {
        x = Math.max(0, Math.min(DISPLAY_W - w, x + dx))
        y = Math.max(0, Math.min(DISPLAY_H - h, y + dy))
      } else if (resize) {
        let nx = x, ny = y, nw = w, nh = h
        if (resize.includes('r')) nw = Math.max(40, w + dx)
        if (resize.includes('l')) { nx = Math.min(x + dx, x + w - 40); nw = w - (nx - x) }
        if (resize.includes('b')) nh = Math.max(30, nw / aspectRatio)
        if (resize.includes('t')) { ny = Math.min(y + dy, y + h - 30); nh = h - (ny - y); nw = nh * aspectRatio }
        // Mantener aspect ratio
        nh = nw / aspectRatio
        x = Math.max(0, nx)
        y = Math.max(0, ny)
        w = Math.min(nw, DISPLAY_W - x)
        h = Math.min(nh, DISPLAY_H - y)
      }
      return { x, y, w, h }
    })
    setStartPos(pos)
  }

  function onMouseUp() { setDrag(false); setResize(null) }

  function applyCrop() {
    const canvas = document.createElement('canvas')
    const iw = img.current.naturalWidth
    const ih = img.current.naturalHeight
    const scale = Math.min(DISPLAY_W / iw, DISPLAY_H / ih)
    const dw = iw * scale, dh = ih * scale
    const ox = (DISPLAY_W - dw) / 2, oy = (DISPLAY_H - dh) / 2

    // Coordenadas reales en la imagen original
    const sx = (box.x - ox) / scale
    const sy = (box.y - oy) / scale
    const sw = box.w / scale
    const sh = box.h / scale

    const outW = Math.min(sw, iw)
    const outH = Math.min(sh, ih)
    canvas.width  = outW
    canvas.height = outH

    const ctx = canvas.getContext('2d')
    if (circleMode) {
      ctx.beginPath()
      ctx.ellipse(outW/2, outH/2, outW/2, outH/2, 0, 0, Math.PI*2)
      ctx.clip()
    }
    ctx.drawImage(img.current, Math.max(0,sx), Math.max(0,sy), sw, sh, 0, 0, outW, outH)

    canvas.toBlob(blob => onCrop(blob, canvas.toDataURL('image/png')), 'image/png', 0.95)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>✂️ Recortar imagen</h3>
          <button className={styles.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <p className={styles.hint}>Arrastra el recuadro para moverlo · Esquinas para redimensionar</p>

        <div className={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            width={DISPLAY_W}
            height={DISPLAY_H}
            className={styles.canvas}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onMouseDown}
            onTouchMove={onMouseMove}
            onTouchEnd={onMouseUp}
            style={{ touchAction: 'none' }}
          />
        </div>

        <div className={styles.actions}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={applyCrop}>✅ Aplicar recorte</button>
        </div>
      </div>
    </div>
  )
}

