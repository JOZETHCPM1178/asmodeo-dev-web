// src/components/ui/Layout.jsx
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import MaintenancePage from '../../pages/MaintenancePage'
import { useAuth } from '../../context/AuthContext'
import styles from './Layout.module.css'

export default function Layout() {
  const { user, maintenance, loading } = useAuth()

  // Mostrar mantenimiento solo si está activo Y el usuario NO es owner
  if (!loading && maintenance && !user?.isOwner) {
    return <MaintenancePage />
  }

  return (
    <div className={styles.layout}>
      {/* Partículas flotantes */}
      <div className="particles" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>
      {/* Orbs carmesí */}
      <div className="orb orb3" aria-hidden="true" />
      <div className="orb orb4" aria-hidden="true" />
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
