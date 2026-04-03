// src/pages/HomePage.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getFeed } from '../services/posts'
import PostCard from '../components/feed/PostCard'
import SEO from '../components/ui/SEO'
import SmartSearch from '../components/search/SmartSearch'
import styles from './HomePage.module.css'

const getPostUrl = (post) => `/post/${post.id}`

const CATS = [
  { id: 'apk',       label: 'APK Mod',    icon: '📱', desc: 'Apps modificadas para Android', color: 'var(--p2)',    bar: 'var(--p)' },
  { id: 'games',     label: 'Juegos Mod', icon: '🎮', desc: 'Juegos con recursos ilimitados', color: 'var(--cyan)',  bar: 'var(--cyan)' },
  { id: 'script',    label: 'Scripts',    icon: '⚙️', desc: 'Scripts y herramientas útiles',  color: 'var(--green)', bar: 'var(--green)' },
  { id: 'tutorials', label: 'Tutoriales', icon: '📚', desc: 'Aprende paso a paso',            color: 'var(--gold)',  bar: 'var(--gold)' },
]

const TRUST = [
  { icon: '🛡️', label: 'Verificado por la comunidad' },
  { icon: '⚡', label: 'Descarga directa desde este dominio' },
  { icon: '0️⃣',  label: 'Sin anuncios, sin esperas' },
  { icon: '📋', label: 'Transparencia total en cada mod' },
]

export default function HomePage() {
  const [popular, setPopular]     = useState([])
  const [recent, setRecent]       = useState([])
  const [totalPosts, setTotalPosts] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getFeed({ pageSize: 4 }).then(r => {
      setRecent(r.posts)
      setTotalPosts(r.posts.length > 0 ? '100+' : '0')
    }).catch(() => {})

    getFeed({ pageSize: 4 }).then(r => setPopular(r.posts)).catch(() => {})
  }, [])

  return (
    <div className={styles.page}>
      <SEO
        title="APK Mods, Juegos y Scripts Gratis"
        description="La plataforma #1 de mods y APKs. Descarga Minecraft, GTA, apps modificadas con recursos ilimitados. Descarga directa, sin redirigir, sin anuncios."
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
          <div className={styles.heroPill}>
            <div className={styles.heroPillDot} />
            {totalPosts ? `${totalPosts} mods verificados disponibles` : 'La plataforma #1 de mods y APKs'}
          </div>
          <h1 className={styles.heroTitle}>
            Mods premium.<br /><span>100% gratis.</span>
          </h1>
          <p className={styles.heroSub}>APK Mod · Juegos · Scripts · Tutoriales</p>
          <p className={styles.heroDesc}>
            Descarga directa desde nuestro servidor. Sin salir a MediaFire, sin esperas,
            sin anuncios. Todo verificado por nuestra comunidad.
          </p>

          <div className={styles.heroSearch}>
            <SmartSearch onResultClick={post => navigate(getPostUrl(post))} />
          </div>

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
              <span className={styles.statN}>Directo</span>
              <span className={styles.statL}>Sin redirigir</span>
            </div>
            <div className={styles.statDiv} />
            <div className={styles.stat}>
              <span className={styles.statN}>0</span>
              <span className={styles.statL}>Anuncios</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className={styles.trustStrip}>
        <div className="container">
          <div className={styles.trustInner}>
            {TRUST.map(t => (
              <div key={t.label} className={styles.trustItem}>
                <span className={styles.trustIcon}>{t.icon}</span>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categorías */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHead}>
            <div>
              <h2 className="section-title">Categorías</h2>
              <p className="section-sub">Explora todo el contenido disponible</p>
            </div>
          </div>
          <div className={styles.catGrid}>
            {CATS.map(cat => (
              <Link key={cat.id} to={`/feed/${cat.id}`} className={`card ${styles.catCard}`}>
                <div className={styles.catIcon} style={{ color: cat.color }}>{cat.icon}</div>
                <div className={styles.catInfo}>
                  <div className={styles.catName}>{cat.label}</div>
                  <div className={styles.catDesc}>{cat.desc}</div>
                </div>
                <span className={styles.catArrow}>→</span>
                <div className={styles.catBar} style={{ background: cat.bar }} />
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
              <div>
                <h2 className="section-title">🔥 Lo más popular</h2>
                <p className="section-sub">Los mods que más descarga la comunidad</p>
              </div>
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
              <div>
                <h2 className="section-title">⏱️ Recién añadido</h2>
                <p className="section-sub">Los últimos mods subidos a la plataforma</p>
              </div>
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
            <p className={styles.ctaDesc}>
              Únete a nuestra comunidad y sube tu contenido. Es gratis, fácil y llega
              a miles de usuarios en minutos.
            </p>
            <Link to="/upload" className="btn btn-primary btn-lg">
              📤 Subir ahora
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
