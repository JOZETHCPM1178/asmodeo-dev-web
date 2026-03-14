// src/components/search/SmartSearch.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { searchPosts } from '../../services/posts'
import { optimizeUrl } from '../../services/cloudinary'
import styles from './SmartSearch.module.css'

// Fuse.js: búsqueda inteligente con tolerancia a errores y abreviaturas
const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'description', weight: 0.2 },
    { name: 'tags', weight: 0.2 },
    { name: 'category', weight: 0.1 },
  ],
  threshold: 0.45,       // tolerancia a errores (0=exacto, 1=todo)
  distance: 200,
  minMatchCharLength: 2,
  includeScore: true,
  useExtendedSearch: false,
}

export default function SmartSearch({ onResultClick }) {
  const [query, setQuery] = useState('')
  const [allPosts, setAllPosts] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const fuseRef = useRef(null)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  // Cargar todos los posts para búsqueda en cliente
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const posts = await searchPosts()
        if (!cancelled) {
          setAllPosts(posts)
          fuseRef.current = new Fuse(posts, FUSE_OPTIONS)
        }
      } catch (e) {
        console.error('Error cargando posts para búsqueda:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Buscar en tiempo real
  useEffect(() => {
    if (!query.trim() || !fuseRef.current) {
      setResults([])
      return
    }
    const found = fuseRef.current.search(query.trim())
    setResults(found.slice(0, 8).map(r => r.item))
  }, [query])

  function handleSelect(post) {
    setQuery('')
    setResults([])
    setFocused(false)
    if (onResultClick) onResultClick(post)
    else navigate(`/post/${post.id}`)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setQuery('')
      setResults([])
      inputRef.current?.blur()
    }
  }

  const catColors = {
    apk: 'var(--p2)',
    games: 'var(--cyan)',
    script: 'var(--green)',
    tutorials: 'var(--gold)',
  }
  const catIcons = { apk: '📱', games: '🎮', script: '⚙️', tutorials: '📚' }

  return (
    <div className={styles.wrap}>
      <div className={styles.inputWrap}>
        <span className={styles.icon}>🔍</span>
        <input
          ref={inputRef}
          className={`inp ${styles.input}`}
          placeholder='Buscar... ("mine" → Minecraft)'
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
        )}
      </div>

      {/* Resultados */}
      {focused && query.trim() && (
        <div className={styles.dropdown}>
          {results.length === 0 ? (
            <div className={styles.noResults}>
              {loading ? '🔎 Cargando...' : `Sin resultados para "${query}"`}
            </div>
          ) : results.map(post => (
            <button key={post.id} className={styles.result} onClick={() => handleSelect(post)}>
              {post.imageUrl ? (
                <img src={optimizeUrl(post.imageUrl, { width: 60, height: 60 })} alt="" className={styles.thumb} />
              ) : (
                <div className={styles.thumbPlaceholder} style={{ color: catColors[post.category] }}>
                  {catIcons[post.category] || '📦'}
                </div>
              )}
              <div className={styles.resultInfo}>
                <div className={styles.resultName}>{post.name}</div>
                <div className={styles.resultMeta}>
                  <span style={{ color: catColors[post.category] }}>{catIcons[post.category]} {post.category}</span>
                  <span>❤️ {post.likes || 0}</span>
                  <span>⬇️ {post.downloads || 0}</span>
                </div>
              </div>
            </button>
          ))}

          {/* Link a página de resultados completa */}
          {query.trim() && (
            <button
              className={styles.seeAll}
              onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
            >
              Ver todos los resultados para "{query}" →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
