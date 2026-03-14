// src/components/ui/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, requireStaff = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <span className="spinner spinner-lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />
  if (requireStaff && !user.isStaff) return <Navigate to="/" replace />

  return children
}
