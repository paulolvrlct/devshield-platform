import { useEffect, useState } from 'react'

import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import Input from '../../components/Input.jsx'
import { api } from '../../api/client.js'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const data = await api.get(`/clients${params}`)
      setClients(data.clients)
    } catch { /* empty */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    load()
  }

  if (editing) {
    return (
      <ClientForm
        client={editing === 'new' ? null : editing}
        onSaved={() => { setEditing(null); load() }}
        onCancel={() => setEditing(null)}
        onDeleted={() => { setEditing(null); load() }}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Clients</h1>
        <Button variant="primary" onClick={() => setEditing('new')}>+ Nouveau client</Button>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client…"
          className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400/60 dark:placeholder:text-slate-500/50 focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
        />
        <Button variant="ghost" type="submit">Rechercher</Button>
      </form>

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">Chargement…</p>
      ) : clients.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-slate-500 dark:text-slate-400">Aucun client</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <Card
              key={c.id}
              className="p-4 cursor-pointer hover:scale-[1.005] transition-transform"
              onClick={() => setEditing(c)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">{c.company_name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{c.contact_name} — {c.email}</p>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(c.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ClientForm({ client, onSaved, onCancel, onDeleted }) {
  const isNew = !client
  const [form, setForm] = useState({
    companyName: client?.company_name || '',
    contactName: client?.contact_name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    siret: client?.siret || '',
    websiteUrl: client?.website_url || '',
    notes: client?.notes || ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isNew) {
        await api.post('/clients', form)
      } else {
        await api.put(`/clients/${client.id}`, form)
      }
      onSaved()
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
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
          {isNew ? 'Nouveau client' : `Modifier — ${client.company_name}`}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input id="companyName" label="Nom de l'entreprise *" value={form.companyName} onChange={set('companyName')} required />
          <Input id="contactName" label="Nom du contact *" value={form.contactName} onChange={set('contactName')} required />
          <Input id="email" label="Email *" type="email" value={form.email} onChange={set('email')} required />
          <Input id="phone" label="Téléphone" value={form.phone} onChange={set('phone')} />
          <Input id="address" label="Adresse" value={form.address} onChange={set('address')} />
          <Input id="siret" label="SIRET" value={form.siret} onChange={set('siret')} />
          <Input id="websiteUrl" label="Site web" value={form.websiteUrl} onChange={set('websiteUrl')} />
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Notes</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{error}</p>
          )}
          <div className="flex items-center justify-between">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Enregistrement…' : (isNew ? 'Créer le client' : 'Enregistrer')}
            </Button>
            {!isNew && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                Supprimer
              </button>
            )}
          </div>
        </form>

        {!isNew && confirmDelete && (
          <div className="mt-4 rounded-xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
            <p className="text-sm text-red-600 dark:text-red-300 mb-3">
              Supprimer définitivement <strong>{client.company_name}</strong> ?
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <button
                onClick={async () => {
                  setDeleting(true)
                  setError('')
                  try {
                    await api.delete(`/clients/${client.id}`)
                    onDeleted()
                  } catch (err) {
                    setError(err.message)
                    setDeleting(false)
                    setConfirmDelete(false)
                  }
                }}
                disabled={deleting}
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
