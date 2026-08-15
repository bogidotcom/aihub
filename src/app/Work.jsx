import { useState } from 'react'
import { Code2, Zap, Users } from 'lucide-react'
import { Glass, Reveal, GradBtn, Field } from '../ui.jsx'
import { api } from '../api.js'
import { useSession } from '../session.jsx'
import { useI18n } from '../i18n.jsx'

const SERVICE_ICONS = [Code2, Zap, Users]

export default function Work() {
  const { t } = useI18n()
  const { user } = useSession()
  const [form, setForm] = useState({ name: '', contact: '', message: '' })
  const [state, setState] = useState('idle')

  const submit = async (e) => {
    e.preventDefault()
    setState('sending')
    try {
      await api('/contact', { method: 'POST', body: { ...form, name: form.name || user?.first_name || '', topic: 'work' } })
      setState('sent')
    } catch { setState('error') }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-liquid text-3xl font-bold tracking-tight">{t('work.title')}</h1>
        <p className="text-ink-soft">{t('work.sub')}</p>
      </div>

      <div className="space-y-3">
        {t('work.services').map((s, i) => {
          const Icon = SERVICE_ICONS[i]
          return (
            <Reveal key={s.title} delay={i * 80}>
              <Glass className="rounded-xl p-5 flex gap-4 items-start">
                <div className="p-2.5 bg-chip rounded-xl shrink-0"><Icon className="w-5 h-5 text-accent" /></div>
                <div>
                  <p className="font-bold text-ink">{s.title}</p>
                  <p className="text-ink-soft text-sm">{s.desc}</p>
                </div>
              </Glass>
            </Reveal>
          )
        })}
      </div>

      <Glass className="rounded-2xl p-6 space-y-4">
        {state === 'sent' ? (
          <div className="text-center space-y-2 py-6">
            <p className="text-4xl">🕊️</p>
            <p className="font-bold text-ink">{t('work.sent')}</p>
            <p className="text-ink-soft text-sm">{t('work.sentSub')}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h2 className="font-bold text-ink text-lg">{t('work.getInTouch')}</h2>
            <Field placeholder={t('work.namePh')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Field placeholder={t('work.contactPh')} value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} required />
            <textarea placeholder={t('work.projectPh')} rows="4" required value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="w-full px-4 py-3 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all placeholder:text-ink-faint resize-none text-ink" />
            <GradBtn type="submit" disabled={state === 'sending'} className="w-full">
              {state === 'sending' ? t('work.sending') : t('work.send')}
            </GradBtn>
            {state === 'error' && <p className="text-center text-sm text-accent">{t('work.error')}</p>}
          </form>
        )}
      </Glass>
    </div>
  )
}
