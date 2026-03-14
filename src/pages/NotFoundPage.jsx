// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="empty" style={{ paddingTop: '6rem', paddingBottom: '6rem' }}>
      <div className="empty-icon" style={{ fontSize: '5rem' }}>404</div>
      <h3 style={{ fontSize: '1.5rem' }}>Página no encontrada</h3>
      <p>La página que buscas no existe o fue eliminada.</p>
      <Link to="/" className="btn btn-primary btn-lg" style={{ marginTop: '1rem' }}>
        🏠 Volver al inicio
      </Link>
    </div>
  )
}
