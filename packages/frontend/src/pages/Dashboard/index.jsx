import { useAuth } from '../../hooks/useAuth.jsx'
import Card from '../../components/Card.jsx'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-text-secondary">
          Bienvenue, {user?.email} — rôle : {user?.role}.
        </p>
      </div>
      <Card className="p-6">
        <h2 className="font-semibold text-cyan">Phase 1 terminée</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Authentification opérationnelle. Les modules onboarding, factures, audit
          et honeypot seront ajoutés dans les phases suivantes.
        </p>
      </Card>
    </div>
  )
}
