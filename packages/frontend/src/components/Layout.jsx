import { useAuth } from '../hooks/useAuth.jsx'
import Button from './Button.jsx'

// Coquille des pages authentifiées : barre de navigation + contenu.
export default function Layout({ children }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-navy text-text-primary">
      <header className="border-b border-cyan/15 bg-white/5 backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold">
            Dev<span className="text-cyan">Shield</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">{user?.email}</span>
            <Button variant="ghost" onClick={logout}>Déconnexion</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
