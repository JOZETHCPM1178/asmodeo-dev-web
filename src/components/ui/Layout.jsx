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
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
