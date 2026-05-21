import { useEffect, useState } from 'react'

import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../api/client.js'

const STATUS_LABELS = {
  new: { label: 'Nouveau', color: 'text-cyan border-cyan/30 bg-cyan/10' },
  in_progress: { label: 'En cours', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  done: { label: 'Terminé', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  cancelled: { label: 'Annulé', color: 'text-red-400 border-red-400/30 bg-red-400/10' }
}

const STATUS_OPTIONS = ['new', 'in_progress', 'done', 'cancelled']

export default function Submissions() {
  const [submissions, setSubmissions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState(null)

  const load = async (statusFilter) => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const data = await api.get(`/onboarding${params}`)
      setSubmissions(data.submissions)
      setTotal(data.total)
    } catch {
      // Handled silently — empty list shown
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(filter) }, [filter])

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/onboarding/${id}/status`, { status })
      load(filter)
      if (selected?.id === id) {
        setSelected((prev) => ({ ...prev, status }))
      }
    } catch {
      // Handled silently
    }
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (selected) {
    return (
      <SubmissionDetail
        submission={selected}
        onBack={() => setSelected(null)}
        onStatusChange={updateStatus}
        formatDate={formatDate}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Soumissions onboarding</h1>
          <p className="text-sm text-text-secondary">{total} demande{total > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <FilterButton label="Toutes" active={filter === ''} onClick={() => setFilter('')} />
        {STATUS_OPTIONS.map((s) => (
          <FilterButton
            key={s}
            label={STATUS_LABELS[s].label}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </div>

      {loading ? (
        <p className="text-text-secondary text-sm">Chargement…</p>
      ) : submissions.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-text-secondary">Aucune soumission pour le moment</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Card
              key={sub.id}
              className="p-4 cursor-pointer hover:border-cyan/30 transition-colors"
              onClick={() => setSelected(sub)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">{sub.company_name}</h3>
                  <p className="text-sm text-text-secondary">
                    {sub.contact_name} — {sub.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">{formatDate(sub.created_at)}</span>
                  <StatusBadge status={sub.status} />
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
  const s = STATUS_LABELS[status] || STATUS_LABELS.new
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${s.color}`}>
      {s.label}
    </span>
  )
}

function FilterButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-cyan/50 bg-cyan/10 text-cyan'
          : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20'
      }`}
    >
      {label}
    </button>
  )
}

function SubmissionDetail({ submission: sub, onBack, onStatusChange, formatDate }) {
  const fields = [
    ['Entreprise', sub.company_name],
    ['Contact', sub.contact_name],
    ['Email', sub.email],
    ['Téléphone', sub.phone || '—'],
    ['Site actuel', sub.website_url || '—'],
    ['Activité', sub.activity || '—'],
    ['Pack', sub.pack === 'essentiel' ? 'Essentiel (700 €)' : 'Optimal (850 €)'],
    ['Pages', sub.pages || '—'],
    ['Contenus', sub.content || '—'],
    ['Notes', sub.notes || '—'],
    ['Soumis le', formatDate(sub.created_at)]
  ]

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-4">← Retour</Button>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">{sub.company_name}</h2>
          <StatusBadge status={sub.status} />
        </div>

        <div className="space-y-3 mb-6">
          {fields.map(([label, value]) => (
            <div key={label}>
              <span className="text-xs text-text-secondary">{label}</span>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </div>

        {sub.primary_color && (
          <div className="flex gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded" style={{ backgroundColor: sub.primary_color }} />
              <span className="text-xs text-text-secondary">{sub.primary_color}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded" style={{ backgroundColor: sub.secondary_color }} />
              <span className="text-xs text-text-secondary">{sub.secondary_color}</span>
            </div>
          </div>
        )}

        <div>
          <span className="text-xs text-text-secondary block mb-2">Changer le statut</span>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(sub.id, s)}
                disabled={sub.status === s}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  sub.status === s
                    ? 'border-cyan/50 bg-cyan/10 text-cyan'
                    : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20'
                }`}
              >
                {STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
