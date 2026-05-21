import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../hooks/useTheme.jsx'
import Button from './Button.jsx'
import logoIcon from '../assets/logo-icon.png'

const NAV_LINKS = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/admin/clients', label: 'Clients', adminOnly: true },
  { to: '/admin/invoices', label: 'Factures', adminOnly: true },
  { to: '/admin/audits', label: 'Audit', adminOnly: true },
  { to: '/admin/honeypot', label: 'Honeypot', adminOnly: true },
  { to: '/admin/onboarding', label: 'Onboarding', adminOnly: true }
]

// Shell for authenticated pages: nav bar + animated background + content.
export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen relative">
      {/* Animated background blobs */}
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Navigation */}
      <header className="glass-panel sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
              <img src={logoIcon} alt="DevShield" className="h-8 w-8" />
              Dev<span className="text-brand-500">Shield</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS
                .filter((link) => !link.adminOnly || user?.role === 'admin')
                .map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      pathname === link.to
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">{user?.email}</span>

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              {dark ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.36A88,88,0,0,1,65.64,67.09,89,89,0,0,1,96,48.67,104.09,104.09,0,0,0,207.33,160,89,89,0,0,1,188.9,190.36Z" />
                </svg>
              )}
            </button>

            <Button variant="ghost" onClick={logout}>Déconnexion</Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
