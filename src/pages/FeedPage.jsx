// src/pages/FeedPage.jsx
import { useParams, Link } from 'react-router-dom'
import Feed from '../components/feed/Feed'
import SEO from '../components/ui/SEO'
import styles from './FeedPage.module.css'

const CATS = {
  apk:       { label: 'APK Mod',    icon: '📱', desc: 'Apps modificadas para Android' },
  games:     { label: 'Juegos Mod', icon: '🎮', desc: 'Juegos con recursos ilimitados' },
  script:    { label: 'Scripts',    icon: '⚙️', desc: 'Scripts y herramientas útiles' },
  tutorials: { label: 'Tutoriales', icon: '📚', desc: 'Guías y tutoriales paso a paso' },
}

export default function FeedPage() {
  const { category } = useParams()
  const cat = category ? CATS[category] : null

  return (
    <div className={styles.page}>
      <SEO
        title={cat ? `${cat.label} Gratis` : 'Feed — Todo el contenido'}
        description={cat
          ? `Descarga ${cat.label} gratis. ${cat.desc}. Verificado por la comunidad de AsmodeoDev.`
          : 'Explora todo el contenido de AsmodeoDev — APK Mods, Juegos, Scripts y Tutoriales gratis.'
        }
        keywords={cat
          ? `${cat.label.toLowerCase()}, descargar gratis, mod, apk`
          : 'apk mod, juegos mod, scripts, tutoriales gratis'
        }
        url={category ? `/feed/${category}` : '/feed'}
      />
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              {cat ? `${cat.icon} ${cat.label}` : '📱 Feed completo'}
            </h1>
            <p className={styles.sub}>{cat?.desc ?? 'Todo el contenido de la plataforma'}</p>
          </div>
          <Link to="/upload" className="btn btn-primary">+ Subir</Link>
        </div>

        {/* Filtros de categoría */}
        <div className={styles.filters}>
          <Link
            to="/feed"
            className={`cat-pill ${!category ? 'active' : ''}`}
          >
            🔥 Todo
          </Link>
          {Object.entries(CATS).map(([id, c]) => (
            <Link
              key={id}
              to={`/feed/${id}`}
              className={`cat-pill ${id} ${category === id ? 'active' : ''}`}
            >
              {c.icon} {c.label}
            </Link>
          ))}
        </div>

        {/* Feed */}
        <Feed category={category || null} columns={2} />
      </div>
    </div>
  )
}
