import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import { useAuth } from '../../hooks/useAuth.jsx'
import { api } from '../../api/client.js'
import Card from '../../components/Card.jsx'

// Format date for display
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
const fmtMs = (ms) => ms != null ? `${ms} ms` : '—'

// Color helpers
const typeColors = {
  maintenance: 'bg-blue-500/20 text-blue-400',
  update: 'bg-cyan/20 text-cyan',
  fix: 'bg-orange-500/20 text-orange-400',
  security: 'bg-red-500/20 text-red-400',
  other: 'bg-gray-500/20 text-gray-400'
}

const typeLabels = {
  maintenance: 'Maintenance',
  update: 'Mise à jour',
  fix: 'Correction',
  security: 'Sécurité',
  other: 'Autre'
}

// ─── Main Dashboard Switch ───────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()

  if (user?.role === 'admin') return <AdminDashboard />
  return <ClientDashboard />
}

// ─── Admin Dashboard ─────────────────────────────────────────────
function AdminDashboard() {
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/clients').then((d) => setClients(d.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-text-secondary">Chargement…</p>

  if (selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-cyan hover:underline"
        >
          ← Retour à la liste des clients
        </button>
        <ClientOverview clientId={selected.id} clientName={selected.company_name} isAdmin />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <p className="text-sm text-text-secondary">
        Sélectionnez un client pour voir son dashboard.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <Card
            key={c.id}
            className="p-4 cursor-pointer hover:border-cyan/40 transition-colors"
            onClick={() => setSelected(c)}
          >
            <h3 className="font-semibold text-text-primary">{c.company_name}</h3>
            <p className="text-sm text-text-secondary">{c.contact_name}</p>
            <p className="text-xs text-text-secondary mt-1">{c.email}</p>
          </Card>
        ))}
        {!clients.length && (
          <p className="text-text-secondary col-span-full">Aucun client enregistré.</p>
        )}
      </div>
    </div>
  )
}

// ─── Client Dashboard (auto-resolve via client_users) ────────────
function ClientDashboard() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/dashboard/overview')
      .then(setOverview)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <Card className="p-6">
          <p className="text-red-400">{error}</p>
        </Card>
      </div>
    )
  }

  if (!overview) return <p className="text-text-secondary">Chargement…</p>

  return (
    <ClientOverview
      clientId={overview.client.id}
      clientName={overview.client.company_name}
      initialData={overview}
    />
  )
}

// ─── Client Overview (shared between admin & client) ─────────────
function ClientOverview({ clientId, clientName, isAdmin = false, initialData }) {
  const [data, setData] = useState(initialData || null)
  const [loading, setLoading] = useState(!initialData)

  const refresh = useCallback(() => {
    api.get(`/dashboard/overview?clientId=${clientId}`)
      .then(setData)
      .catch(() => {})
  }, [clientId])

  useEffect(() => {
    if (!initialData) {
      setLoading(true)
      api.get(`/dashboard/overview?clientId=${clientId}`)
        .then(setData)
        .finally(() => setLoading(false))
    }
  }, [clientId, initialData])

  if (loading || !data) return <p className="text-text-secondary">Chargement…</p>

  const { sites, invoiceStats, recentInterventions } = data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{clientName}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-cyan">{sites?.length || 0}</p>
          <p className="text-sm text-text-secondary">Sites monitorés</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-orange-400">{invoiceStats?.pending || 0}</p>
          <p className="text-sm text-text-secondary">Factures en attente</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{invoiceStats?.paid || 0}</p>
          <p className="text-sm text-text-secondary">Factures payées</p>
        </Card>
      </div>

      {/* Sites with uptime */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Sites</h2>
        {sites?.length ? (
          sites.map((s) => <SiteCard key={s.id} site={s} />)
        ) : (
          <p className="text-text-secondary text-sm">Aucun site monitoré.</p>
        )}
        {isAdmin && <AddSiteForm clientId={clientId} onAdded={refresh} />}
      </section>

      {/* Interventions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Dernières interventions</h2>
        {recentInterventions?.length ? (
          <div className="space-y-2">
            {recentInterventions.map((i, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[i.type] || typeColors.other}`}>
                    {typeLabels[i.type] || i.type}
                  </span>
                  <span className="ml-2 text-sm">{i.title}</span>
                </div>
                <span className="text-xs text-text-secondary">{fmtDate(i.performed_at)}</span>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-sm">Aucune intervention enregistrée.</p>
        )}
        {isAdmin && <AddInterventionForm clientId={clientId} onAdded={refresh} />}
      </section>

      {/* Invoices */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Factures</h2>
        <InvoicesList clientId={clientId} />
      </section>
    </div>
  )
}

// ─── Site Card (expandable, with uptime chart + SSL) ─────────────
function SiteCard({ site }) {
  const [open, setOpen] = useState(false)
  const [uptime, setUptime] = useState(null)
  const [ssl, setSsl] = useState(null)

  useEffect(() => {
    if (!open) return
    api.get(`/dashboard/sites/${site.id}/uptime?hours=24`).then(setUptime).catch(() => {})
    api.get(`/dashboard/sites/${site.id}/ssl`).then((d) => setSsl(d.ssl)).catch(() => {})
  }, [open, site.id])

  const isUp = site.last_up
  const statusColor = isUp === true ? 'bg-green-500' : isUp === false ? 'bg-red-500' : 'bg-gray-500'

  return (
    <Card className="overflow-hidden">
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${statusColor}`} />
          <div>
            <p className="font-medium">{site.label || site.url}</p>
            {site.label && <p className="text-xs text-text-secondary">{site.url}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">{fmtMs(site.last_response_ms)}</span>
          <span className="text-text-secondary">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="p-4 pt-0 space-y-4 border-t border-white/10">
          {/* Uptime summary */}
          {uptime && (
            <div className="flex gap-4 text-sm">
              <span>
                Uptime : <strong className="text-cyan">{uptime.uptimePercent ?? '—'}%</strong>
              </span>
              <span>
                Temps moyen : <strong>{fmtMs(uptime.avgResponseMs)}</strong>
              </span>
              <span className="text-text-secondary">
                ({uptime.total} checks / 24h)
              </span>
            </div>
          )}

          {/* Response time chart */}
          {uptime?.checks?.length > 1 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={uptime.checks.map((c) => ({
                    time: new Date(c.checked_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    ms: c.response_time_ms
                  }))}
                >
                  <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} unit=" ms" />
                  <Tooltip
                    contentStyle={{ background: '#0A1628', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8 }}
                    labelStyle={{ color: '#E2E8F0' }}
                    itemStyle={{ color: '#00D4FF' }}
                  />
                  <Line type="monotone" dataKey="ms" stroke="#00D4FF" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* SSL info */}
          {ssl && (
            <Card className="p-3 space-y-1 text-sm">
              <p className="font-medium text-cyan">Certificat SSL</p>
              <p>Émetteur : {ssl.issuer}</p>
              <p>Valide jusqu'au : {fmtDate(ssl.validTo)}</p>
              <p>
                Jours restants :{' '}
                <span className={ssl.daysRemaining < 30 ? 'text-red-400 font-bold' : 'text-green-400'}>
                  {ssl.daysRemaining}
                </span>
              </p>
            </Card>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Add Site Form (admin) ───────────────────────────────────────
function AddSiteForm({ clientId, onAdded }) {
  const [show, setShow] = useState(false)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setSaving(true)
    try {
      await api.post('/dashboard/sites', { clientId, url: url.trim(), label: label.trim() })
      setUrl('')
      setLabel('')
      setShow(false)
      onAdded()
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="text-sm text-cyan hover:underline">
        + Ajouter un site
      </button>
    )
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-text-secondary mb-1">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-text-secondary mb-1">Label (optionnel)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Mon site"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-cyan text-navy font-medium text-sm hover:bg-cyan/90 disabled:opacity-50"
        >
          {saving ? 'Ajout…' : 'Ajouter'}
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5"
        >
          Annuler
        </button>
      </form>
    </Card>
  )
}

// ─── Add Intervention Form (admin) ───────────────────────────────
function AddInterventionForm({ clientId, onAdded }) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'maintenance' })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await api.post('/dashboard/interventions', { clientId, ...form })
      setForm({ title: '', description: '', type: 'maintenance' })
      setShow(false)
      onAdded()
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="text-sm text-cyan hover:underline">
        + Ajouter une intervention
      </button>
    )
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-text-secondary mb-1">Titre</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Description (optionnel)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-cyan text-navy font-medium text-sm hover:bg-cyan/90 disabled:opacity-50"
          >
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5"
          >
            Annuler
          </button>
        </div>
      </form>
    </Card>
  )
}

// ─── Invoices List (client-visible) ──────────────────────────────
function InvoicesList({ clientId }) {
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    api.get(`/dashboard/invoices?clientId=${clientId}`)
      .then((d) => setInvoices(d.invoices || []))
      .catch(() => {})
  }, [clientId])

  const statusBadge = {
    sent: 'bg-orange-500/20 text-orange-400',
    paid: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400'
  }

  const statusLabels = {
    sent: 'Envoyée',
    paid: 'Payée',
    cancelled: 'Annulée'
  }

  if (!invoices.length) {
    return <p className="text-text-secondary text-sm">Aucune facture.</p>
  }

  return (
    <div className="space-y-2">
      {invoices.map((inv) => (
        <Card key={inv.id} className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge[inv.status] || ''}`}>
              {statusLabels[inv.status] || inv.status}
            </span>
            <span className="text-sm font-medium">{inv.number}</span>
            <span className="text-xs text-text-secondary capitalize">{inv.type} — {inv.pack}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">{(inv.amount_ttc / 100).toFixed(2)} €</span>
            <span className="text-xs text-text-secondary">{fmtDate(inv.issued_at)}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
