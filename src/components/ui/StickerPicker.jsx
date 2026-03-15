// src/components/ui/StickerPicker.jsx
// ════════════════════════════════════════
//  STICKER PICKER — Estilo TikTok con Giphy
// ════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'
import { searchStickers, trendingStickers } from '../../services/giphy'
import styles from './StickerPicker.module.css'

const CATEGORIES = [
  { label: '🔥 Trending',  query: null },
  { label: '😂 Humor',     query: 'funny' },
  { label: '❤️ Amor',      query: 'love' },
  { label: '🎮 Gaming',    query: 'gaming' },
  { label: '💀 Dark',      query: 'skull' },
  { label: '🎉 Fiesta',    query: 'party' },
  { label: '😤 Enojado',   query: 'angry' },
  { label: '🤩 Hype',      query: 'hype' },
]

export default function StickerPicker({ onSelect, onClose }) {
  const [stickers, setStickers]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [activeCategory, setActiveCategory] = useState(0)
  const searchTimer = useRef(null)
  const wrapRef     = useRef(null)

  // Cerrar al click fuera
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose?.() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // Cargar stickers al cambiar categoría
  useEffect(() => {
    if (search) return
    loadCategory(activeCategory)
  }, [activeCategory])

  async function loadCategory(idx) {
    setLoading(true)
    setStickers([])
    try {
      const cat = CATEGORIES[idx]
      const data = cat.query
        ? await searchStickers(cat.query)
        : await trendingStickers()
      setStickers(data)
    } catch {
      setStickers([])
    } finally {
      setLoading(false)
    }
  }

  // Búsqueda con debounce
  function handleSearch(e) {
    const val = e.target.value
    setSearch(val)
    clearTimeout(searchTimer.current)
    if (!val.trim()) { loadCategory(activeCategory); return }
    searchTimer.current = setTimeout(async () => {
      setLoading(true)
      setStickers([])
      try {
        const data = await searchStickers(val.trim())
        setStickers(data)
      } catch {
        setStickers([])
      } finally {
        setLoading(false)
      }
    }, 500)
  }

  return (
    <div className={styles.picker} ref={wrapRef}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>🎭 Stickers</span>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Búsqueda */}
      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          placeholder="🔍 Buscar stickers..."
          value={search}
          onChange={handleSearch}
          autoFocus
        />
      </div>

      {/* Categorías */}
      {!search && (
        <div className={styles.cats}>
          {CATEGORIES.map((cat, i) => (
            <button
              key={i}
              className={`${styles.catBtn} ${activeCategory === i ? styles.catActive : ''}`}
              onClick={() => { setActiveCategory(i); setSearch('') }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid de stickers */}
      <div className={styles.grid}>
        {loading ? (
          <div className={styles.loadingWrap}>
            <span className="spinner" />
          </div>
        ) : stickers.length === 0 ? (
          <div className={styles.empty}>Sin resultados 😅</div>
        ) : (
          stickers.map(s => (
            <button
              key={s.id}
              className={styles.stickerBtn}
              onClick={() => onSelect(s)}
              title={s.title}
            >
              <img
                src={s.preview}
                data-src={s.url}
                alt={s.title}
                className={styles.stickerImg}
                loading="lazy"
                onMouseEnter={e => { e.currentTarget.src = e.currentTarget.dataset.src }}
                onMouseLeave={e => { e.currentTarget.src = e.currentTarget.getAttribute('data-preview') || s.preview }}
              />
            </button>
          ))
        )}
      </div>

      {/* Giphy attribution */}
      <div className={styles.attribution}>
        Powered by <strong>GIPHY</strong>
      </div>
    </div>
  )
}
