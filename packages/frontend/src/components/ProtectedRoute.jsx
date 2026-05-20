import { Navigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.jsx'

// Bloque l'accès aux routes privées tant que l'utilisateur n'est pas authentifié.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy text-text-secondary">
        Chargement…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}
