// src/components/ui/Layout.jsx
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import GlobalChat from '../chat/GlobalChat'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <GlobalChat />
    </div>
  )
}
