import { useState } from 'react'

import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import Input from '../../components/Input.jsx'
import { api } from '../../api/client.js'

const STEPS = [
  { title: 'Votre entreprise', subtitle: 'Informations de contact' },
  { title: 'Votre projet', subtitle: 'Détails du site web souhaité' },
  { title: 'Design', subtitle: 'Couleurs et préférences visuelles' },
  { title: 'Confirmation', subtitle: 'Vérifiez et envoyez' }
]

const INITIAL = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  websiteUrl: '',
  activity: '',
  pack: 'essentiel',
  pages: '',
  primaryColor: '#00D4FF',
  secondaryColor: '#0A1628',
  content: '',
  notes: ''
}

export default function OnboardingForm() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const set = (field) => (e) => {
    const value = e.target ? e.target.value : e
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const next = () => {
    setError('')
    if (step === 0) {
      if (!form.companyName || !form.contactName || !form.email) {
        return setError('Veuillez remplir les champs obligatoires')
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const submit = async () => {
    setError('')
    setSubmitting(true)
    try {
      await api.post('/onboarding', form)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <Card className="w-full max-w-lg p-8 text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-semibold text-cyan">Demande envoyée !</h1>
          <p className="mt-2 text-text-secondary">
            Merci pour votre confiance. Nous reviendrons vers vous sous 48h
            à l'adresse <span className="text-text-primary">{form.email}</span>.
          </p>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy p-6">
      <Card className="w-full max-w-lg p-8">
        <h1 className="text-xl font-semibold text-text-primary">
          Dev<span className="text-cyan">Shield</span>
        </h1>
        <p className="mt-1 text-sm text-text-secondary">Formulaire de prise en charge</p>

        {/* Progress bar */}
        <div className="mt-6 flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-cyan' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <h2 className="mt-4 text-sm font-medium text-cyan">{STEPS[step].title}</h2>
        <p className="text-xs text-text-secondary">{STEPS[step].subtitle}</p>

        <div className="mt-4 space-y-3">
          {step === 0 && <Step1 form={form} set={set} />}
          {step === 1 && <Step2 form={form} set={set} />}
          {step === 2 && <Step3 form={form} set={set} />}
          {step === 3 && <Step4 form={form} />}
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-between gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={prev}>Retour</Button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={next}>Suivant</Button>
          ) : (
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Envoi…' : 'Envoyer ma demande'}
            </Button>
          )}
        </div>
      </Card>
    </main>
  )
}

// --- Step components ---

function Step1({ form, set }) {
  return (
    <>
      <Input id="companyName" label="Nom de l'entreprise *" value={form.companyName} onChange={set('companyName')} required />
      <Input id="contactName" label="Nom du contact *" value={form.contactName} onChange={set('contactName')} required />
      <Input id="email" label="Email *" type="email" value={form.email} onChange={set('email')} required />
      <Input id="phone" label="Téléphone" type="tel" value={form.phone} onChange={set('phone')} />
    </>
  )
}

function Step2({ form, set }) {
  return (
    <>
      <Input id="activity" label="Activité de l'entreprise" value={form.activity} onChange={set('activity')} />
      <Input id="websiteUrl" label="Site web actuel (si existant)" type="url" value={form.websiteUrl} onChange={set('websiteUrl')} />
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Pack souhaité *</label>
        <div className="flex gap-3">
          {['essentiel', 'optimal'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set('pack')(p)}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors ${
                form.pack === p
                  ? 'border-cyan/50 bg-cyan/10 text-cyan'
                  : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20'
              }`}
            >
              <span className="font-medium capitalize">{p}</span>
              <span className="block text-xs mt-1 opacity-70">
                {p === 'essentiel' ? '700 €' : '850 €'}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="pages" className="mb-1 block text-sm text-text-secondary">
          Pages souhaitées
        </label>
        <textarea
          id="pages"
          value={form.pages}
          onChange={set('pages')}
          rows={3}
          placeholder="Ex : Accueil, À propos, Services, Contact..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-cyan/50 focus:outline-none"
        />
      </div>
    </>
  )
}

function Step3({ form, set }) {
  return (
    <>
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="primaryColor" className="mb-1 block text-sm text-text-secondary">
            Couleur principale
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="primaryColor"
              value={form.primaryColor}
              onChange={set('primaryColor')}
              className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
            <span className="text-sm text-text-secondary">{form.primaryColor}</span>
          </div>
        </div>
        <div className="flex-1">
          <label htmlFor="secondaryColor" className="mb-1 block text-sm text-text-secondary">
            Couleur secondaire
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="secondaryColor"
              value={form.secondaryColor}
              onChange={set('secondaryColor')}
              className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
            <span className="text-sm text-text-secondary">{form.secondaryColor}</span>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="content" className="mb-1 block text-sm text-text-secondary">
          Contenus / textes à intégrer
        </label>
        <textarea
          id="content"
          value={form.content}
          onChange={set('content')}
          rows={4}
          placeholder="Décrivez le contenu que vous souhaitez voir sur votre site..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-cyan/50 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm text-text-secondary">
          Notes complémentaires
        </label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={set('notes')}
          rows={2}
          placeholder="Autres demandes ou précisions..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-cyan/50 focus:outline-none"
        />
      </div>
    </>
  )
}

function Step4({ form }) {
  const fields = [
    ['Entreprise', form.companyName],
    ['Contact', form.contactName],
    ['Email', form.email],
    ['Téléphone', form.phone || '—'],
    ['Site actuel', form.websiteUrl || '—'],
    ['Activité', form.activity || '—'],
    ['Pack', form.pack === 'essentiel' ? 'Essentiel (700 €)' : 'Optimal (850 €)'],
    ['Pages', form.pages || '—']
  ]

  return (
    <div className="space-y-2">
      {fields.map(([label, value]) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="text-text-secondary">{label}</span>
          <span className="text-text-primary text-right max-w-[60%]">{value}</span>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: form.primaryColor }} />
          <span className="text-xs text-text-secondary">{form.primaryColor}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: form.secondaryColor }} />
          <span className="text-xs text-text-secondary">{form.secondaryColor}</span>
        </div>
      </div>
    </div>
  )
}
