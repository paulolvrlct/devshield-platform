import { useState } from 'react'

import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import logoIcon from '../assets/logo-icon.png'
import { api } from '../api/client.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'

const gradeColors = {
  A: 'text-emerald-500 dark:text-green-400 border-emerald-400 dark:border-green-400',
  B: 'text-brand-500 dark:text-brand-400 border-brand-400 dark:border-brand-400',
  C: 'text-yellow-500 dark:text-yellow-400 border-yellow-400 dark:border-yellow-400',
  D: 'text-orange-500 dark:text-orange-400 border-orange-400 dark:border-orange-400',
  F: 'text-red-500 dark:text-red-400 border-red-400 dark:border-red-400'
}

const severityColors = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  info: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400'
}

const severityLabels = {
  critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible', info: 'Info'
}

const categoryLabels = {
  headers: 'Headers de sécurité', ssl: 'Certificat SSL', https: 'HTTPS', cookies: 'Cookies'
}

export default function PublicScan() {
  useDocumentTitle('Scanner OWASP gratuit')
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setScanning(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.post('/public/scan', { url: url.trim() })
      setResult(data.scan)
    } catch (err) {
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setUrl('')
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-navy p-6 relative">
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <a href="https://devshield.fr" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logoIcon} alt="DevShield" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                Dev<span className="text-brand-500">Shield</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Scanner de sécurité OWASP</p>
            </div>
          </a>
          <a
            href="https://devshield.fr"
            className="text-sm text-brand-500 hover:text-brand-600 hover:underline transition-colors"
          >
            ← Retour au site
          </a>
        </div>

        {/* Scan form */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
            Analysez la sécurité de votre site
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Vérifiez les headers HTTP, le certificat SSL, les cookies et les redirections HTTPS en quelques secondes.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={scanning}
                className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/40 focus:outline-none disabled:opacity-50"
              />
              <Button type="submit" variant="primary" disabled={scanning}>
                {scanning ? 'Analyse…' : 'Scanner'}
              </Button>
            </div>
            {scanning && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-block w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Analyse des headers, SSL, redirections et cookies…
              </div>
            )}
            {error && (
              <p className="rounded-xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                {error}
              </p>
            )}
          </form>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Résultat</h2>
              <button onClick={reset} className="text-sm text-brand-500 hover:text-brand-600 hover:underline transition-colors">
                Nouveau scan
              </button>
            </div>

            {/* Grade + score */}
            <Card className="p-6">
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-2xl border-2 ${gradeColors[result.grade]} flex items-center justify-center`}>
                  <span className="text-4xl font-bold">{result.grade}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{result.hostname}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{result.url}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-slate-700 dark:text-slate-200">Score : <strong className="text-brand-500">{result.score}/100</strong></span>
                    <span className="text-slate-400 dark:text-slate-500">Durée : {result.duration_ms} ms</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-500 dark:text-green-400">{result.summary.passed}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Réussis</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-red-500 dark:text-red-400">{result.summary.failed}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Échoués</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{result.summary.critical + result.summary.high}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Critiques / Élevés</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-700 dark:text-white">{result.summary.total}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
              </Card>
            </div>

            {/* Technologies */}
            {result.technologies?.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Technologies détectées</h3>
                <div className="flex flex-wrap gap-2">
                  {result.technologies.map((t, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-sm text-slate-700 dark:text-slate-200">{t}</span>
                  ))}
                </div>
              </Card>
            )}

            {/* Checks by category */}
            {(() => {
              const grouped = {}
              for (const check of result.checks) {
                const cat = check.category || 'other'
                if (!grouped[cat]) grouped[cat] = []
                grouped[cat].push(check)
              }
              return Object.entries(grouped).map(([cat, catChecks]) => (
                <section key={cat} className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{categoryLabels[cat] || cat}</h3>
                  {catChecks.map((check, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={check.passed ? 'text-emerald-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
                          {check.passed ? '✓' : '✗'}
                        </span>
                        <span className="font-medium text-sm text-slate-800 dark:text-white">{check.name}</span>
                        {!check.passed && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColors[check.severity]}`}>
                            {severityLabels[check.severity]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 ml-6">{check.description}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 ml-6 mt-1 font-mono">{check.value}</p>
                    </Card>
                  ))}
                </section>
              ))
            })()}

            {/* CTA */}
            <Card className="p-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Besoin d'un audit complet ou d'une correction de ces vulnérabilités ?
              </p>
              <a
                href="https://devshield.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 shadow-lg shadow-brand-500/25 transition-all"
              >
                Découvrir nos offres
              </a>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8 space-y-1">
          <p>DevShield — Web & Cybersécurité</p>
          <p>
            <a href="https://devshield.fr/mentions-legales" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition-colors">Mentions légales</a>
            {' · '}
            <a href="https://devshield.fr/cgv" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition-colors">CGV</a>
          </p>
        </div>
      </div>
    </main>
  )
}
