import { useEffect, useState } from 'react'

import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../api/client.js'

const STATUS_LABELS = {
  draft: { label: 'Brouillon', color: 'text-text-secondary border-white/20 bg-white/5' },
  sent: { label: 'Envoyé', color: 'text-cyan border-cyan/30 bg-cyan/10' },
  paid: { label: 'Payé', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  cancelled: { label: 'Annulé', color: 'text-red-400 border-red-400/30 bg-red-400/10' }
}

const STATUS_OPTIONS = ['draft', 'sent', 'paid', 'cancelled']

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ type: '', status: '' })
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.type) params.set('type', filter.type)
      if (filter.status) params.set('status', filter.status)
      const qs = params.toString() ? `?${params}` : ''
      const data = await api.get(`/invoices${qs}`)
      setInvoices(data.invoices)
    } catch { /* empty */ }
    finally { setLoading(false) }
  }

  const loadClients = async () => {
    try {
      const data = await api.get('/clients')
      setClients(data.clients)
    } catch { /* empty */ }
  }

  useEffect(() => { load(); loadClients() }, [])
  useEffect(() => { load() }, [filter.type, filter.status])

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status })
      load()
      if (selected?.id === id) setSelected((prev) => ({ ...prev, status }))
    } catch { /* empty */ }
  }

  const downloadPdf = (id) => {
    window.open(`/api/v1/invoices/${id}/pdf`, '_blank')
  }

  const formatAmount = (cents) => `${(cents / 100).toFixed(2)} €`
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

  if (creating) {
    return (
      <CreateInvoice
        clients={clients}
        onCreated={() => { setCreating(false); load() }}
        onCancel={() => setCreating(false)}
      />
    )
  }

  if (selected) {
    return (
      <InvoiceDetail
        invoice={selected}
        onBack={() => { setSelected(null); load() }}
        onStatusChange={updateStatus}
        onDownload={downloadPdf}
        formatAmount={formatAmount}
        formatDate={formatDate}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Devis & Factures</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>+ Nouveau</Button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <FilterBtn label="Tous" active={!filter.type} onClick={() => setFilter((f) => ({ ...f, type: '' }))} />
        <FilterBtn label="Devis" active={filter.type === 'devis'} onClick={() => setFilter((f) => ({ ...f, type: 'devis' }))} />
        <FilterBtn label="Factures" active={filter.type === 'facture'} onClick={() => setFilter((f) => ({ ...f, type: 'facture' }))} />
        <span className="mx-2 border-l border-white/10" />
        <FilterBtn label="Tous statuts" active={!filter.status} onClick={() => setFilter((f) => ({ ...f, status: '' }))} />
        {STATUS_OPTIONS.map((s) => (
          <FilterBtn key={s} label={STATUS_LABELS[s].label} active={filter.status === s}
            onClick={() => setFilter((f) => ({ ...f, status: s }))} />
        ))}
      </div>

      {loading ? (
        <p className="text-text-secondary text-sm">Chargement…</p>
      ) : invoices.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-text-secondary">Aucun document</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card
              key={inv.id}
              className="p-4 cursor-pointer hover:border-cyan/30 transition-colors"
              onClick={() => setSelected(inv)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase text-text-secondary">{inv.type}</span>
                    <h3 className="font-medium text-text-primary">{inv.number}</h3>
                  </div>
                  <p className="text-sm text-text-secondary">{inv.client_name}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="font-medium text-text-primary">{formatAmount(inv.amount_ttc)}</p>
                    <p className="text-xs text-text-secondary">{formatDate(inv.issued_at)}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Sub-components ---

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.draft
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${s.color}`}>{s.label}</span>
}

function FilterBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20'
      }`}>{label}</button>
  )
}

function CreateInvoice({ clients, onCreated, onCancel }) {
  const [form, setForm] = useState({
    clientId: '', type: 'devis', pack: 'essentiel',
    description: '', amountHt: 70000, taxRate: 0, notes: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => {
    const val = e.target ? e.target.value : e
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  const setPack = (pack) => {
    const amounts = { essentiel: 70000, optimal: 85000, custom: form.amountHt }
    setForm((prev) => ({ ...prev, pack, amountHt: amounts[pack] || prev.amountHt }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.clientId) return setError('Sélectionnez un client')
    setError('')
    setSubmitting(true)
    try {
      await api.post('/invoices', { ...form, amountHt: Number(form.amountHt) })
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Button variant="ghost" onClick={onCancel} className="mb-4">← Retour</Button>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Nouveau devis / facture</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Client *</label>
            <select value={form.clientId} onChange={set('clientId')}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-cyan/50 focus:outline-none">
              <option value="">— Sélectionner un client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name} ({c.contact_name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Type *</label>
            <div className="flex gap-3">
              {['devis', 'facture'].map((t) => (
                <button key={t} type="button" onClick={() => set('type')(t)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm capitalize transition-colors ${
                    form.type === t ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-white/10 bg-white/5 text-text-secondary'
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Pack *</label>
            <div className="flex gap-3">
              {[{ k: 'essentiel', label: 'Essentiel', price: '700 €' },
                { k: 'optimal', label: 'Optimal', price: '850 €' },
                { k: 'custom', label: 'Personnalisé', price: '—' }
              ].map((p) => (
                <button key={p.k} type="button" onClick={() => setPack(p.k)}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors ${
                    form.pack === p.k ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-white/10 bg-white/5 text-text-secondary'
                  }`}>
                  <span className="font-medium">{p.label}</span>
                  <span className="block text-xs mt-1 opacity-70">{p.price}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-text-secondary">Montant HT (centimes) *</label>
              <input type="number" value={form.amountHt} onChange={set('amountHt')} min="1"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-cyan/50 focus:outline-none" />
              <span className="text-xs text-text-secondary">{(form.amountHt / 100).toFixed(2)} €</span>
            </div>
            <div className="w-32">
              <label className="mb-1 block text-sm text-text-secondary">TVA %</label>
              <input type="number" value={form.taxRate} onChange={set('taxRate')} min="0" max="100"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-cyan/50 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={3}
              placeholder="Détail de la prestation…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-cyan/50 focus:outline-none" />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Création…' : 'Créer le document'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

function InvoiceDetail({ invoice: inv, onBack, onStatusChange, onDownload, formatAmount, formatDate }) {
  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-4">← Retour</Button>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs uppercase text-text-secondary">{inv.type}</span>
            <h2 className="text-lg font-semibold text-text-primary">{inv.number}</h2>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={inv.status} />
            <Button variant="primary" onClick={() => onDownload(inv.id)}>
              Télécharger PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Field label="Client" value={inv.client_name} />
          <Field label="Email" value={inv.client_email} />
          <Field label="Pack" value={inv.pack} />
          <Field label="Date" value={formatDate(inv.issued_at)} />
          <Field label="Échéance" value={formatDate(inv.due_at)} />
          {inv.paid_at && <Field label="Payé le" value={formatDate(inv.paid_at)} />}
        </div>

        <div className="border-t border-white/10 pt-4 mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">Montant HT</span>
            <span className="text-text-primary">{formatAmount(inv.amount_ht)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">TVA ({inv.tax_rate}%)</span>
            <span className="text-text-primary">{formatAmount(inv.amount_ttc - inv.amount_ht)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-white/10">
            <span className="text-cyan">Total TTC</span>
            <span className="text-cyan">{formatAmount(inv.amount_ttc)}</span>
          </div>
        </div>

        {inv.description && (
          <div className="mb-6">
            <span className="text-xs text-text-secondary">Description</span>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{inv.description}</p>
          </div>
        )}

        <div>
          <span className="text-xs text-text-secondary block mb-2">Changer le statut</span>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} onClick={() => onStatusChange(inv.id, s)} disabled={inv.status === s}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  inv.status === s ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20'
                }`}>{STATUS_LABELS[s].label}</button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-xs text-text-secondary">{label}</span>
      <p className="text-sm text-text-primary">{value || '—'}</p>
    </div>
  )
}
