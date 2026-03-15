// src/components/ui/StickerPicker.jsx
// Stickers sin API key — colecciones fijas de Giphy embeds públicos
import { useState } from 'react'
import styles from './StickerPicker.module.css'

// Stickers públicos de Giphy — no requieren API key
const STICKERS = {
  '😂 Humor': [
    { id: 's1', url: 'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif', preview: 'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy_s.gif' },
    { id: 's2', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy_s.gif' },
    { id: 's3', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy_s.gif' },
    { id: 's4', url: 'https://media.giphy.com/media/gVoBC0SuaHStO/giphy.gif', preview: 'https://media.giphy.com/media/gVoBC0SuaHStO/giphy_s.gif' },
    { id: 's5', url: 'https://media.giphy.com/media/yJFeycRK2DB4c/giphy.gif', preview: 'https://media.giphy.com/media/yJFeycRK2DB4c/giphy_s.gif' },
    { id: 's6', url: 'https://media.giphy.com/media/10UeedrT5MIfPG/giphy.gif', preview: 'https://media.giphy.com/media/10UeedrT5MIfPG/giphy_s.gif' },
  ],
  '❤️ Amor': [
    { id: 'l1', url: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif', preview: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy_s.gif' },
    { id: 'l2', url: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif', preview: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy_s.gif' },
    { id: 'l3', url: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy_s.gif' },
    { id: 'l4', url: 'https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif', preview: 'https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy_s.gif' },
    { id: 'l5', url: 'https://media.giphy.com/media/l4pTibO1cY4d5aeyI/giphy.gif', preview: 'https://media.giphy.com/media/l4pTibO1cY4d5aeyI/giphy_s.gif' },
    { id: 'l6', url: 'https://media.giphy.com/media/3oz8xtBx06mcZWoNJm/giphy.gif', preview: 'https://media.giphy.com/media/3oz8xtBx06mcZWoNJm/giphy_s.gif' },
  ],
  '🎮 Gaming': [
    { id: 'g1', url: 'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif', preview: 'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy_s.gif' },
    { id: 'g2', url: 'https://media.giphy.com/media/xT9IgG50Lg7ruszbOU/giphy.gif', preview: 'https://media.giphy.com/media/xT9IgG50Lg7ruszbOU/giphy_s.gif' },
    { id: 'g3', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', preview: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy_s.gif' },
    { id: 'g4', url: 'https://media.giphy.com/media/QWwEdgDbGCFHa/giphy.gif', preview: 'https://media.giphy.com/media/QWwEdgDbGCFHa/giphy_s.gif' },
    { id: 'g5', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', preview: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy_s.gif' },
    { id: 'g6', url: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif', preview: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy_s.gif' },
  ],
  '😤 React': [
    { id: 'r1', url: 'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif', preview: 'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy_s.gif' },
    { id: 'r2', url: 'https://media.giphy.com/media/l1J9R1Q7HrnxnpbKo/giphy.gif', preview: 'https://media.giphy.com/media/l1J9R1Q7HrnxnpbKo/giphy_s.gif' },
    { id: 'r3', url: 'https://media.giphy.com/media/26n6WywJyh39n1pBu/giphy.gif', preview: 'https://media.giphy.com/media/26n6WywJyh39n1pBu/giphy_s.gif' },
    { id: 'r4', url: 'https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif', preview: 'https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy_s.gif' },
    { id: 'r5', url: 'https://media.giphy.com/media/l4Ep5mLAqkGpFZnDG/giphy.gif', preview: 'https://media.giphy.com/media/l4Ep5mLAqkGpFZnDG/giphy_s.gif' },
    { id: 'r6', url: 'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif', preview: 'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy_s.gif' },
  ],
  '🎉 Fiesta': [
    { id: 'p1', url: 'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif', preview: 'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy_s.gif' },
    { id: 'p2', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', preview: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy_s.gif' },
    { id: 'p3', url: 'https://media.giphy.com/media/26tknCqiJrBQG6bxC/giphy.gif', preview: 'https://media.giphy.com/media/26tknCqiJrBQG6bxC/giphy_s.gif' },
    { id: 'p4', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', preview: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy_s.gif' },
    { id: 'p5', url: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif', preview: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy_s.gif' },
    { id: 'p6', url: 'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif', preview: 'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy_s.gif' },
  ],
  '🐱 Memes': [
    { id: 'm1', url: 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif', preview: 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy_s.gif' },
    { id: 'm2', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', preview: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy_s.gif' },
    { id: 'm3', url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', preview: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy_s.gif' },
    { id: 'm4', url: 'https://media.giphy.com/media/LHZyixOnHwDDy/giphy.gif', preview: 'https://media.giphy.com/media/LHZyixOnHwDDy/giphy_s.gif' },
    { id: 'm5', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', preview: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy_s.gif' },
    { id: 'm6', url: 'https://media.giphy.com/media/GeimqsH0TLDt4tScGw/giphy.gif', preview: 'https://media.giphy.com/media/GeimqsH0TLDt4tScGw/giphy_s.gif' },
  ],
}

const CATEGORIES = Object.keys(STICKERS)

export default function StickerPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])

  return (
    <div className={styles.picker}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>🎭 Stickers</span>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Categorías */}
      <div className={styles.cats}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`${styles.catBtn} ${activeCategory === cat ? styles.catActive : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {STICKERS[activeCategory].map(s => (
          <button
            key={s.id}
            className={styles.stickerBtn}
            onClick={() => { onSelect(s); onClose() }}
            title="Enviar sticker"
          >
            <img
              src={s.preview}
              alt="sticker"
              className={styles.stickerImg}
              loading="lazy"
              onMouseEnter={e => { e.currentTarget.src = s.url }}
              onMouseLeave={e => { e.currentTarget.src = s.preview }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </button>
        ))}
      </div>

      <div className={styles.attribution}>Powered by GIPHY</div>
    </div>
  )
}
