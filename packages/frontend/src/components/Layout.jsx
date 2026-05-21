import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.jsx'
import Button from './Button.jsx'

const NAV_LINKS = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/admin/clients', label: 'Clients', adminOnly: true },
  { to: '/admin/invoices', label: 'Factures', adminOnly: true },
  { to: '/admin/onboarding', label: 'Onboarding', adminOnly: true }
]

// Coquille des pages authentifiées : barre de navigation + contenu.
export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-navy text-text-primary">
      <header className="border-b border-cyan/15 bg-white/5 backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold">
              Dev<span className="text-cyan">Shield</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4">
              {NAV_LINKS
                .filter((link) => !link.adminOnly || user?.role === 'admin')
                .map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-sm transition-colors ${
                      pathname === link.to
                        ? 'text-cyan'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
            </nav>
          </div>
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
