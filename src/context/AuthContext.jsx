// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { auth, onAuthStateChanged } from '../services/firebase'
import { buildUserObject } from '../services/auth'
import { saveOneSignalId } from '../services/notifications'
import { getMaintenanceMode } from '../services/social'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(undefined)
  const [loading, setLoading]     = useState(true)
  const [maintenance, setMaintenance] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState('')

  useEffect(() => {
    // Chequear modo mantenimiento
    getMaintenanceMode().then(r => { setMaintenance(r.active); setMaintenanceMsg(r.message) }).catch(() => {})
    // Polling cada 30s para detectar cambios
    const interval = setInterval(() => {
      getMaintenanceMode().then(r => { setMaintenance(r.active); setMaintenanceMsg(r.message) }).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const fullUser = await buildUserObject(firebaseUser)
        setUser(fullUser)
        setTimeout(() => saveOneSignalId(firebaseUser.uid), 3000)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const refreshUser = async () => {
    if (auth.currentUser) {
      const fullUser = await buildUserObject(auth.currentUser)
      setUser(fullUser)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, maintenance, maintenanceMsg, setMaintenance, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
      }
