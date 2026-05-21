import { useState, useEffect } from 'react'

import { api } from '../../api/client.js'
import Card from '../../components/Card.jsx'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—'

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

export default function AuditPage() {
  const [scans, setScans] = useState([])
  const [selectedScan, setSelectedScan] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadScans = () => {
    api.get('/audits').then((d) => setScans(d.scans || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadScans() }, [])

  if (selectedScan) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedScan(null)}
          className="text-sm text-brand-500 hover:text-brand-600 hover:underline transition-colors">
          ← Retour à la liste
        </button>
        <ScanReport scanId={selectedScan} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Scanner OWASP</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Analysez la sécurité d'un site web en quelques secondes.
        </p>
      </div>

      <ScanForm onScanComplete={(scan) => { setSelectedScan(scan.id); loadScans() }} />

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Historique des scans</h2>
        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Chargement…</p>
        ) : scans.length ? (
          <div className="space-y-2">
            {scans.map((s) => (
              <Card key={s.id}
                className="p-4 cursor-pointer hover:scale-[1.005] transition-transform"
                onClick={() => setSelectedScan(s.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-bold ${gradeColors[s.grade] || 'text-slate-400'}`}>{s.grade}</span>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{s.hostname}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{s.url}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-700 dark:text-slate-200">{s.score}/100</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{fmtDate(s.created_at)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Aucun scan effectué.</p>
        )}
      </section>
    </div>
  )
}

function ScanForm({ onScanComplete }) {
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setScanning(true)
    setError(null)
    try {
      const data = await api.post('/audits/scan', { url: url.trim() })
      setUrl('')
      onScanComplete(data.scan)
    } catch (err) {
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">URL du site à analyser</label>
          <div className="flex gap-3">
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com" required disabled={scanning}
              className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/40 focus:outline-none disabled:opacity-50" />
            <button type="submit" disabled={scanning}
              className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 whitespace-nowrap shadow-lg shadow-brand-500/25 transition-all">
              {scanning ? 'Analyse en cours…' : 'Lancer le scan'}
            </button>
          </div>
        </div>
        {scanning && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-block w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Analyse des headers, SSL, redirections et cookies…
          </div>
        )}
        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      </form>
    </Card>
  )
}

function ScanReport({ scanId }) {
  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/audits/${scanId}`)
      .then((d) => setScan(d.scan))
      .finally(() => setLoading(false))
  }, [scanId])

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Chargement du rapport…</p>
  if (!scan) return <p className="text-red-500 dark:text-red-400">Rapport introuvable.</p>

  const { grade, score, hostname, url, checks, summary, technologies, duration_ms, created_at } = scan

  const grouped = {}
  for (const check of checks) {
    const cat = check.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(check)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 rounded-2xl border-2 ${gradeColors[grade]} flex items-center justify-center`}>
            <span className="text-4xl font-bold">{grade}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">{hostname}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{url}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Score : <strong className="text-brand-500">{score}/100</strong></span>
              <span className="text-slate-400 dark:text-slate-500">Durée : {duration_ms} ms</span>
              <span className="text-slate-400 dark:text-slate-500">{fmtDate(created_at)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500 dark:text-green-400">{summary.passed}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Réussis</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{summary.failed}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Échoués</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{summary.critical + summary.high}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Critiques / Élevés</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-700 dark:text-white">{summary.total}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
        </Card>
      </div>

      {technologies?.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Technologies détectées</h3>
          <div className="flex flex-wrap gap-2">
            {technologies.map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-sm text-slate-700 dark:text-slate-200">{t}</span>
            ))}
          </div>
        </Card>
      )}

      {Object.entries(grouped).map(([cat, catChecks]) => (
        <section key={cat} className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{categoryLabels[cat] || cat}</h2>
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
      ))}
    </div>
  )
}
