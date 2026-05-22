import { useState } from 'react'

import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import Input from '../../components/Input.jsx'
import { api } from '../../api/client.js'
import logoIcon from '../../assets/logo-icon.png'

const STEPS = [
  { title: 'Votre entreprise', subtitle: 'Informations de contact' },
  { title: 'Votre projet', subtitle: 'Détails du site web souhaité' },
  { title: 'Design', subtitle: 'Couleurs et préférences visuelles' },
  { title: 'Confirmation', subtitle: 'Vérifiez et envoyez' }
]

const INITIAL = {
  companyName: '', contactName: '', email: '', phone: '',
  websiteUrl: '', activity: '', pack: 'essentiel', pages: '',
  primaryColor: '#0ea5e9', secondaryColor: '#0f172a',
  content: '', notes: ''
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy p-6 relative">
        <div className="blob-container">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
        <Card className="relative z-10 w-full max-w-lg p-8 text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-brand-500">Demande envoyée !</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Merci pour votre confiance. Nous reviendrons vers vous sous 48h
            à l'adresse <span className="text-slate-800 dark:text-white">{form.email}</span>.
          </p>
          <a
            href="https://devshield.fr"
            className="inline-block mt-4 text-sm text-brand-500 hover:text-brand-600 hover:underline transition-colors"
          >
            ← Retour sur devshield.fr
          </a>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy p-6 relative">
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      <Card className="relative z-10 w-full max-w-lg p-8">
        <div className="flex items-center justify-between">
          <a href="https://devshield.fr" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logoIcon} alt="DevShield" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                Dev<span className="text-brand-500">Shield</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Formulaire de prise en charge</p>
            </div>
          </a>
          <a
            href="https://devshield.fr"
            className="text-sm text-brand-500 hover:text-brand-600 hover:underline transition-colors"
          >
            ← Retour au site
          </a>
        </div>

        {/* Progress bar */}
        <div className="mt-6 flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-white/10'
              }`}
            />
          ))}
        </div>

        <h2 className="mt-4 text-sm font-semibold text-brand-500">{STEPS[step].title}</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">{STEPS[step].subtitle}</p>

        <div className="mt-4 space-y-3">
          {step === 0 && <Step1 form={form} set={set} />}
          {step === 1 && <Step2 form={form} set={set} />}
          {step === 2 && <Step3 form={form} set={set} />}
          {step === 3 && <Step4 form={form} />}
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
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
        <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Pack souhaité *</label>
        <div className="flex gap-3">
          {['essentiel', 'optimal'].map((p) => (
            <button key={p} type="button" onClick={() => set('pack')(p)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm transition-all ${
                form.pack === p
                  ? 'border-brand-400 dark:border-brand-500/50 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'glass-input text-slate-500 dark:text-slate-400'
              }`}>
              <span className="font-medium capitalize">{p}</span>
              <span className="block text-xs mt-1 opacity-70">{p === 'essentiel' ? '700 €' : '850 €'}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="pages" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Pages souhaitées</label>
        <textarea id="pages" value={form.pages} onChange={set('pages')} rows={3}
          placeholder="Ex : Accueil, À propos, Services, Contact..."
          className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400/60 dark:placeholder:text-slate-500/50 focus:ring-2 focus:ring-brand-500/40 focus:outline-none" />
      </div>
    </>
  )
}

function Step3({ form, set }) {
  return (
    <>
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="primaryColor" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Couleur principale</label>
          <div className="flex items-center gap-2">
            <input type="color" id="primaryColor" value={form.primaryColor} onChange={set('primaryColor')}
              className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent" />
            <span className="text-sm text-slate-500 dark:text-slate-400">{form.primaryColor}</span>
          </div>
        </div>
        <div className="flex-1">
          <label htmlFor="secondaryColor" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Couleur secondaire</label>
          <div className="flex items-center gap-2">
            <input type="color" id="secondaryColor" value={form.secondaryColor} onChange={set('secondaryColor')}
              className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent" />
            <span className="text-sm text-slate-500 dark:text-slate-400">{form.secondaryColor}</span>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="content" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Contenus / textes à intégrer</label>
        <textarea id="content" value={form.content} onChange={set('content')} rows={4}
          placeholder="Décrivez le contenu que vous souhaitez voir sur votre site..."
          className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400/60 dark:placeholder:text-slate-500/50 focus:ring-2 focus:ring-brand-500/40 focus:outline-none" />
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Notes complémentaires</label>
        <textarea id="notes" value={form.notes} onChange={set('notes')} rows={2}
          placeholder="Autres demandes ou précisions..."
          className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400/60 dark:placeholder:text-slate-500/50 focus:ring-2 focus:ring-brand-500/40 focus:outline-none" />
      </div>
    </>
  )
}

function Step4({ form }) {
  const fields = [
    ['Entreprise', form.companyName], ['Contact', form.contactName],
    ['Email', form.email], ['Téléphone', form.phone || '—'],
    ['Site actuel', form.websiteUrl || '—'], ['Activité', form.activity || '—'],
    ['Pack', form.pack === 'essentiel' ? 'Essentiel (700 €)' : 'Optimal (850 €)'],
    ['Pages', form.pages || '—']
  ]

  return (
    <div className="space-y-2">
      {fields.map(([label, value]) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">{label}</span>
          <span className="text-slate-800 dark:text-white text-right max-w-[60%]">{value}</span>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: form.primaryColor }} />
          <span className="text-xs text-slate-400 dark:text-slate-500">{form.primaryColor}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: form.secondaryColor }} />
          <span className="text-xs text-slate-400 dark:text-slate-500">{form.secondaryColor}</span>
        </div>
      </div>
    </div>
  )
}
