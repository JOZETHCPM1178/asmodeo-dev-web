// src/pages/SearchPage.jsx
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Fuse from 'fuse.js'
import { searchPosts } from '../services/posts'
import SEO from '../components/ui/SEO'
import PostCard from '../components/feed/PostCard'
import SmartSearch from '../components/search/SmartSearch'
import styles from './SearchPage.module.css'

const FUSE_OPTIONS = {
  keys: [
    { name: 'name',        weight: 0.6 },
    { name: 'tags',        weight: 0.25 },
    { name: 'description', weight: 0.1 },
    { name: 'category',    weight: 0.05 },
  ],
  threshold: 0.4,       // más flexible — encuentra similares y abreviaciones
  distance: 200,        // busca en más del texto
  minMatchCharLength: 2,
  includeScore: true,
  useExtendedSearch: true, // permite búsquedas con operadores
  ignoreLocation: true,    // busca en todo el campo, no solo al inicio
}

// Búsqueda de respaldo para cuando Fuse no encuentra — coincidencia parcial manual
function fallbackSearch(posts, q) {
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return posts.filter(p => {
    const hay = [p.name, ...(p.tags || []), p.description, p.category]
      .join(' ').toLowerCase()
    // Cada término debe aparecer en algún lugar del texto
    return terms.every(t => hay.includes(t))
  })
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [allPosts, setAllPosts] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    searchPosts().then(posts => {
      setAllPosts(posts)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!q || allPosts.length === 0) { setResults(allPosts); return }
    try {
      const fuse = new Fuse(allPosts, FUSE_OPTIONS)
      let found = fuse.search(q).map(r => r.item)
      // Si Fuse no encontró nada, intentar búsqueda parcial manual
      if (found.length === 0) found = fallbackSearch(allPosts, q)
      setResults(found)
    } catch {
      // Fallback total si Fuse falla
      setResults(fallbackSearch(allPosts, q))
    }
  }, [q, allPosts])

  const CATS = { apk: '📱', games: '🎮', script: '⚙️', tutorials: '📚' }

  return (
    <div className={styles.page}>
      <SEO
        title={q ? `Buscar "${q}"` : 'Buscar mods y APKs'}
        description={q
          ? `Resultados para "${q}" en AsmodeoDev — APK mods, juegos y scripts gratis.`
          : 'Busca entre miles de APK mods, juegos modificados y scripts gratis en AsmodeoDev.'
        }
        keywords={q ? `${q}, mod, apk, gratis` : 'buscar apk mod, juegos mod gratis, scripts'}
        url={q ? `/search?q=${encodeURIComponent(q)}` : '/search'}
      />
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>🔍 Búsqueda</h1>
          <p className={styles.sub}>
            {q
              ? `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${q}"`
              : 'Busca apps, mods y scripts'}
          </p>
        </div>

        <div className={styles.searchBar}>
          <SmartSearch />
        </div>

        {/* Category quick filters */}
        <div className={styles.catFilters}>
          {Object.entries(CATS).map(([id, icon]) => (
            <button
              key={id}
              className={`cat-pill ${id}`}
              onClick={() => setSearchParams({ q: id })}
            >
              {icon} {id}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <span className="spinner spinner-lg" />
          </div>
        ) : results.length === 0 ? (
          <div className="empty" style={{ paddingTop: '3rem' }}>
            <div className="empty-icon">🔎</div>
            <h3>Sin resultados</h3>
            <p>Prueba con otros términos o revisa la ortografía.</p>
          </div>
        ) : (
          <div className="grid-auto">
            {results.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </div>
    </div>
  )
}
