// src/pages/HomePage.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getFeed } from '../services/posts'
import PostCard from '../components/feed/PostCard'
import SEO from '../components/ui/SEO'
import SmartSearch from '../components/search/SmartSearch'
import styles from './HomePage.module.css'

// FIXED: Función que faltaba — causaba ReferenceError que tumbaba toda la app
const getPostUrl = (post) => `/post/${post.id}`

const CATS = [
  { id: 'apk',       label: 'APK Mod',    icon: '📱', desc: 'Apps modificadas para Android', color: 'var(--p2)' },
  { id: 'games',     label: 'Juegos Mod', icon: '🎮', desc: 'Juegos con recursos ilimitados', color: 'var(--cyan)' },
  { id: 'script',    label: 'Scripts',    icon: '⚙️', desc: 'Scripts y herramientas útiles',  color: 'var(--green)' },
  { id: 'tutorials', label: 'Tutoriales', icon: '📚', desc: 'Aprende paso a paso',            color: 'var(--gold)' },
]

export default function HomePage() {
  const [popular, setPopular] = useState([])
  const [recent, setRecent] = useState([])
  const [totalPosts, setTotalPosts] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getFeed({ pageSize: 4 }).then(r => {
      setRecent(r.posts)
      setTotalPosts(r.posts.length > 0 ? '100+' : '0')
    }).catch(() => {})

    // Posts destacados/populares
    getFeed({ pageSize: 4 }).then(r => setPopular(r.posts)).catch(() => {})
  }, [])

  return (
    <div className={styles.page}>
      <SEO
        title="APK Mods, Juegos y Scripts Gratis"
        description="La plataforma #1 de mods y APKs. Descarga Minecraft, GTA, apps modificadas con recursos ilimitados. Todo gratis y verificado."
        keywords="apk mod gratis, minecraft mod, juegos modificados, scripts, descargar apk, recursos ilimitados"
        url="/"
      />
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className={styles.grid} />
        </div>
        <div className={styles.heroInner}>
          <div className={styles.heroPill}>🚀 La plataforma #1 de mods y APKs</div>
          <h1 className={styles.heroTitle}>
            ASMODEO<span>DEV</span>
          </h1>
          <p className={styles.heroSub}>APK Mod · Juegos · Scripts · Tutoriales</p>
          <p className={styles.heroDesc}>
            Descarga apps modificadas, juegos con recursos ilimitados y scripts potentes.
            Todo gratis, todo verificado por nuestra comunidad.
          </p>

          {/* Search bar */}
          <div className={styles.heroSearch}>
            <SmartSearch onResultClick={post => navigate(getPostUrl(post))} />
          </div>

          {/* Stats */}
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statN}>{totalPosts ?? '...'}</span>
              <span className={styles.statL}>Publicaciones</span>
            </div>
            <div className={styles.statDiv} />
            <div className={styles.stat}>
              <span className={styles.statN}>100%</span>
              <span className={styles.statL}>Gratis</span>
            </div>
            <div className={styles.statDiv} />
            <div className={styles.stat}>
              <span className={styles.statN}>0</span>
              <span className={styles.statL}>Esperas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHead}>
            <h2 className="section-title">🗂️ Categorías</h2>
            <p className="section-sub">Explora todo el contenido disponible</p>
          </div>
          <div className={styles.catGrid}>
            {CATS.map(cat => (
              <Link key={cat.id} to={`/feed/${cat.id}`} className={`card ${styles.catCard}`}>
                <div className={styles.catIcon} style={{ color: cat.color }}>
                  {cat.icon}
                </div>
                <div className={styles.catInfo}>
                  <div className={styles.catName}>{cat.label}</div>
                  <div className={styles.catDesc}>{cat.desc}</div>
                </div>
                <span className={styles.catArrow} style={{ color: cat.color }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Populares */}
      {popular.length > 0 && (
        <section className={`${styles.section} ${styles.sectionDark}`}>
          <div className="container">
            <div className={styles.sectionHead}>
              <h2 className="section-title">🔥 Lo más popular</h2>
              <Link to="/feed" className="btn btn-ghost btn-sm">Ver todo →</Link>
            </div>
            <div className="grid-auto">
              {popular.map(post => <PostCard key={post.id} post={post} compact />)}
            </div>
          </div>
        </section>
      )}

      {/* Recientes */}
      {recent.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHead}>
              <h2 className="section-title">⏱️ Recién añadido</h2>
              <Link to="/feed" className="btn btn-ghost btn-sm">Ver todo →</Link>
            </div>
            <div className="grid-auto">
              {recent.map(post => <PostCard key={post.id} post={post} compact />)}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className="container">
          <div className={styles.cta}>
            <h2 className={styles.ctaTitle}>¿Tienes una app o mod para compartir?</h2>
            <p className={styles.ctaDesc}>Únete a nuestra comunidad y sube tu contenido. Es gratis y fácil.</p>
            <Link to="/upload" className="btn btn-primary btn-lg">
              📤 Subir ahora
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
