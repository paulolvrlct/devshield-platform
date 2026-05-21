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
  maintenance: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  update: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400',
  fix: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  security: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'
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

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Chargement…</p>

  if (selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-brand-500 hover:text-brand-600 hover:underline transition-colors"
        >
          ← Retour à la liste des clients
        </button>
        <ClientOverview clientId={selected.id} clientName={selected.company_name} isAdmin />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tableau de bord</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Sélectionnez un client pour voir son dashboard.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <Card
            key={c.id}
            className="p-5 cursor-pointer hover:scale-[1.01] transition-transform"
            onClick={() => setSelected(c)}
          >
            <h3 className="font-semibold text-slate-800 dark:text-white">{c.company_name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{c.contact_name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{c.email}</p>
          </Card>
        ))}
        {!clients.length && (
          <p className="text-slate-500 dark:text-slate-400 col-span-full">Aucun client enregistré.</p>
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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tableau de bord</h1>
        <Card className="p-6">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </Card>
      </div>
    )
  }

  if (!overview) return <p className="text-slate-500 dark:text-slate-400">Chargement…</p>

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

  if (loading || !data) return <p className="text-slate-500 dark:text-slate-400">Chargement…</p>

  const { sites, invoiceStats, recentInterventions } = data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{clientName}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-brand-500">{sites?.length || 0}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sites monitorés</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">{invoiceStats?.pending || 0}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Factures en attente</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-emerald-500 dark:text-green-400">{invoiceStats?.paid || 0}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Factures payées</p>
        </Card>
      </div>

      {/* Sites with uptime */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Sites</h2>
        {sites?.length ? (
          sites.map((s) => <SiteCard key={s.id} site={s} />)
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Aucun site monitoré.</p>
        )}
        {isAdmin && <AddSiteForm clientId={clientId} onAdded={refresh} />}
      </section>

      {/* Interventions */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Dernières interventions</h2>
        {recentInterventions?.length ? (
          <div className="space-y-2">
            {recentInterventions.map((i, idx) => (
              <Card key={idx} className="p-4 flex items-center justify-between">
                <div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${typeColors[i.type] || typeColors.other}`}>
                    {typeLabels[i.type] || i.type}
                  </span>
                  <span className="ml-2 text-sm text-slate-700 dark:text-slate-200">{i.title}</span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">{fmtDate(i.performed_at)}</span>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Aucune intervention enregistrée.</p>
        )}
        {isAdmin && <AddInterventionForm clientId={clientId} onAdded={refresh} />}
      </section>

      {/* Invoices */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Factures</h2>
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
  const statusColor = isUp === true ? 'bg-emerald-500' : isUp === false ? 'bg-red-500' : 'bg-slate-400'

  return (
    <Card className="overflow-hidden">
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/20 dark:hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${statusColor}`} />
          <div>
            <p className="font-medium text-slate-800 dark:text-white">{site.label || site.url}</p>
            {site.label && <p className="text-xs text-slate-400 dark:text-slate-500">{site.url}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">{fmtMs(site.last_response_ms)}</span>
          <span className="text-slate-400 dark:text-slate-500">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="p-4 pt-0 space-y-4 border-t border-slate-200/50 dark:border-white/10">
          {uptime && (
            <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-300">
              <span>Uptime : <strong className="text-brand-500">{uptime.uptimePercent ?? '—'}%</strong></span>
              <span>Temps moyen : <strong>{fmtMs(uptime.avgResponseMs)}</strong></span>
              <span className="text-slate-400 dark:text-slate-500">({uptime.total} checks / 24h)</span>
            </div>
          )}

          {uptime?.checks?.length > 1 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={uptime.checks.map((c) => ({
                  time: new Date(c.checked_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                  ms: c.response_time_ms
                }))}>
                  <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} unit=" ms" />
                  <Tooltip
                    contentStyle={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 12, backdropFilter: 'blur(8px)' }}
                    labelStyle={{ color: '#E2E8F0' }}
                    itemStyle={{ color: '#0ea5e9' }}
                  />
                  <Line type="monotone" dataKey="ms" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {ssl && (
            <Card className="p-4 space-y-1 text-sm">
              <p className="font-semibold text-brand-500">Certificat SSL</p>
              <p className="text-slate-600 dark:text-slate-300">Émetteur : {ssl.issuer}</p>
              <p className="text-slate-600 dark:text-slate-300">Valide jusqu'au : {fmtDate(ssl.validTo)}</p>
              <p>
                Jours restants :{' '}
                <span className={ssl.daysRemaining < 30 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-emerald-500 dark:text-green-400'}>
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
      <button onClick={() => setShow(true)} className="text-sm text-brand-500 hover:text-brand-600 hover:underline">
        + Ajouter un site
      </button>
    )
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">URL</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" required
            className="glass-input w-full rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/40 focus:outline-none" />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Label (optionnel)</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mon site"
            className="glass-input w-full rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/40 focus:outline-none" />
        </div>
        <button type="submit" disabled={saving}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors">
          {saving ? 'Ajout…' : 'Ajouter'}
        </button>
        <button type="button" onClick={() => setShow(false)}
          className="px-4 py-2 rounded-xl glass-input text-sm text-slate-600 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-white/5">
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
      <button onClick={() => setShow(true)} className="text-sm text-brand-500 hover:text-brand-600 hover:underline">
        + Ajouter une intervention
      </button>
    )
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Titre</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
              className="glass-input w-full rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/40 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="glass-input rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/40 focus:outline-none">
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Description (optionnel)</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
            className="glass-input w-full rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/40 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors">
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
          <button type="button" onClick={() => setShow(false)}
            className="px-4 py-2 rounded-xl glass-input text-sm text-slate-600 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-white/5">
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
    sent: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-green-500/20 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
  }

  const statusLabels = { sent: 'Envoyée', paid: 'Payée', cancelled: 'Annulée' }

  if (!invoices.length) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm">Aucune facture.</p>
  }

  return (
    <div className="space-y-2">
      {invoices.map((inv) => (
        <Card key={inv.id} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadge[inv.status] || ''}`}>
              {statusLabels[inv.status] || inv.status}
            </span>
            <span className="text-sm font-medium text-slate-800 dark:text-white">{inv.number}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{inv.type} — {inv.pack}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-800 dark:text-white">{(inv.amount_ttc / 100).toFixed(2)} €</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{fmtDate(inv.issued_at)}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
