// src/pages/SearchPage.jsx
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Fuse from 'fuse.js'
import { searchPosts } from '../services/posts'
import PostCard from '../components/feed/PostCard'
import SmartSearch from '../components/search/SmartSearch'
import styles from './SearchPage.module.css'

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'description', weight: 0.2 },
    { name: 'tags', weight: 0.2 },
    { name: 'category', weight: 0.1 },
  ],
  threshold: 0.45,
  minMatchCharLength: 2,
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
    const fuse = new Fuse(allPosts, FUSE_OPTIONS)
    setResults(fuse.search(q).map(r => r.item))
  }, [q, allPosts])

  const CATS = { apk: '📱', games: '🎮', script: '⚙️', tutorials: '📚' }

  return (
    <div className={styles.page}>
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
