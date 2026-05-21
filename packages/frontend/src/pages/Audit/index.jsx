import { useState, useEffect } from 'react'

import { api } from '../../api/client.js'
import Card from '../../components/Card.jsx'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—'

const gradeColors = {
  A: 'text-green-400 border-green-400',
  B: 'text-cyan border-cyan',
  C: 'text-yellow-400 border-yellow-400',
  D: 'text-orange-400 border-orange-400',
  F: 'text-red-400 border-red-400'
}

const severityColors = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-blue-500/20 text-blue-400',
  info: 'bg-gray-500/20 text-gray-400'
}

const severityLabels = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
  info: 'Info'
}

const categoryLabels = {
  headers: 'Headers de sécurité',
  ssl: 'Certificat SSL',
  https: 'HTTPS',
  cookies: 'Cookies'
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
        <button
          onClick={() => setSelectedScan(null)}
          className="text-sm text-cyan hover:underline"
        >
          ← Retour à la liste
        </button>
        <ScanReport scanId={selectedScan} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Scanner OWASP</h1>
        <p className="text-sm text-text-secondary">
          Analysez la sécurité d'un site web en quelques secondes.
        </p>
      </div>

      <ScanForm onScanComplete={(scan) => {
        setSelectedScan(scan.id)
        loadScans()
      }} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Historique des scans</h2>
        {loading ? (
          <p className="text-text-secondary">Chargement…</p>
        ) : scans.length ? (
          <div className="space-y-2">
            {scans.map((s) => (
              <Card
                key={s.id}
                className="p-4 cursor-pointer hover:border-cyan/40 transition-colors"
                onClick={() => setSelectedScan(s.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-bold ${gradeColors[s.grade] || 'text-gray-400'}`}>
                      {s.grade}
                    </span>
                    <div>
                      <p className="font-medium">{s.hostname}</p>
                      <p className="text-xs text-text-secondary">{s.url}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{s.score}/100</p>
                    <p className="text-xs text-text-secondary">{fmtDate(s.created_at)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-sm">Aucun scan effectué.</p>
        )}
      </section>
    </div>
  )
}

// ─── Scan Form ───────────────────────────────────────────────────
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
          <label className="block text-sm font-medium mb-2">URL du site à analyser</label>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={scanning}
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-cyan focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={scanning}
              className="px-6 py-2.5 rounded-lg bg-cyan text-navy font-medium text-sm hover:bg-cyan/90 disabled:opacity-50 whitespace-nowrap"
            >
              {scanning ? 'Analyse en cours…' : 'Lancer le scan'}
            </button>
          </div>
        </div>
        {scanning && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="inline-block w-4 h-4 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            Analyse des headers, SSL, redirections et cookies…
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </Card>
  )
}

// ─── Scan Report ─────────────────────────────────────────────────
function ScanReport({ scanId }) {
  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/audits/${scanId}`)
      .then((d) => setScan(d.scan))
      .finally(() => setLoading(false))
  }, [scanId])

  if (loading) return <p className="text-text-secondary">Chargement du rapport…</p>
  if (!scan) return <p className="text-red-400">Rapport introuvable.</p>

  const { grade, score, hostname, url, checks, summary, technologies, duration_ms, created_at } = scan

  // Group checks by category
  const grouped = {}
  for (const check of checks) {
    const cat = check.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(check)
  }

  return (
    <div className="space-y-6">
      {/* Grade header */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 rounded-xl border-2 ${gradeColors[grade]} flex items-center justify-center`}>
            <span className="text-4xl font-bold">{grade}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{hostname}</h1>
            <p className="text-sm text-text-secondary">{url}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span>Score : <strong className="text-cyan">{score}/100</strong></span>
              <span className="text-text-secondary">Durée : {duration_ms} ms</span>
              <span className="text-text-secondary">{fmtDate(created_at)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{summary.passed}</p>
          <p className="text-xs text-text-secondary">Réussis</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{summary.failed}</p>
          <p className="text-xs text-text-secondary">Échoués</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-orange-400">{summary.critical + summary.high}</p>
          <p className="text-xs text-text-secondary">Critiques / Élevés</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-text-primary">{summary.total}</p>
          <p className="text-xs text-text-secondary">Total</p>
        </Card>
      </div>

      {/* Technologies */}
      {technologies?.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-2">Technologies détectées</h3>
          <div className="flex flex-wrap gap-2">
            {technologies.map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-white/10 text-sm">{t}</span>
            ))}
          </div>
        </Card>
      )}

      {/* Checks by category */}
      {Object.entries(grouped).map(([cat, catChecks]) => (
        <section key={cat} className="space-y-2">
          <h2 className="text-lg font-semibold">{categoryLabels[cat] || cat}</h2>
          {catChecks.map((check, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={check.passed ? 'text-green-400' : 'text-red-400'}>
                  {check.passed ? '✓' : '✗'}
                </span>
                <span className="font-medium text-sm">{check.name}</span>
                {!check.passed && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[check.severity]}`}>
                    {severityLabels[check.severity]}
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary ml-6">{check.description}</p>
              <p className="text-xs text-text-secondary ml-6 mt-1 font-mono">{check.value}</p>
            </Card>
          ))}
        </section>
      ))}
    </div>
  )
}
