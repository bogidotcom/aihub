import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Glass, GradBtn, Field, Modal } from '../ui.jsx'
import { api } from '../api.js'
import { useSession } from '../session.jsx'
import { useI18n } from '../i18n.jsx'
import { LoginCard } from './AppShell.jsx'
import { BLOCKCHAINS } from '../blockchains.js'

const EMPTY = { name: '', project: '', description: '', github: '', tg: '', link: '', blockchain: 'Solana' }

export default function Apply() {
  const { t } = useI18n()
  const nav = useNavigate()
  const { user } = useSession()
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => { if (user) setLoginOpen(false) }, [user])

  const ready = form.name && form.project && form.description && form.tg && /^https?:\/\//i.test(form.link) && form.blockchain

  const submit = async () => {
    if (!user) { setLoginOpen(true); return }
    setBusy(true)
    setError('')
    try {
      await api('/contact', {
        method: 'POST',
        body: {
          name: form.name, contact: form.tg, topic: 'thermopolium-submission', blockchain: form.blockchain,
          project: { name: form.project, blockchain: form.blockchain, description: form.description, github: form.github, tg: form.tg, link: form.link, submitter: form.name },
          message: `App application for THERM\n\nApp: ${form.project}\nBlockchain: ${form.blockchain}\nWhat it does: ${form.description}\nGitHub: ${form.github || '—'}\nTelegram (as entered): ${form.tg}\nLink: ${form.link}`,
        },
      })
      nav('/app/submissions')
    } catch (e) {
      if (e.data?.error === 'ALREADY_SUBMITTED') setError(t('apply.dupe'))
      else if (e.data?.error === 'AUTH_REQUIRED') setLoginOpen(true)
      else setError(t('apply.fail'))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-liquid text-3xl font-bold tracking-tight">{t('event.title')}</h1>
        <p className="text-ink-soft">{t('event.sub')}</p>
      </div>

      <Glass className="rounded-2xl p-6 space-y-4">
        {user && (
          <p className="font-mono text-[11px] text-ink-faint bg-chip border border-veil rounded-lg px-3 py-2">
            {t('apply.authed', { handle: user.username ? '@' + user.username : user.first_name })}
          </p>
        )}
        <div className="grid gap-3">
          <Field placeholder={t('apply.name')} value={form.name} onChange={set('name')} required />
          <Field placeholder={t('apply.project')} value={form.project} onChange={set('project')} required />
          <textarea placeholder={t('apply.about')} value={form.description} rows={4} required
            onChange={set('description')}
            className="w-full px-4 py-3 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all placeholder:text-ink-faint text-ink" />
          <Field placeholder={t('apply.link')} value={form.link} onChange={set('link')} required />
          <select value={form.blockchain} onChange={set('blockchain')} required
            className="w-full px-4 py-3 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all text-ink">
            {BLOCKCHAINS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <Field placeholder={t('apply.github')} value={form.github} onChange={set('github')} />
          <Field placeholder={t('apply.tg')} value={form.tg} onChange={set('tg')} required />
        </div>
        {error && <p className="text-center text-sm text-accent">{error}</p>}
        <GradBtn onClick={submit} disabled={busy || !ready} className="w-full">
          {busy ? t('apply.sending') : t('apply.submit')}
        </GradBtn>
      </Glass>

      <Modal open={loginOpen} onClose={() => setLoginOpen(false)}>
        <LoginCard prompt={t('apply.login')} />
      </Modal>
    </div>
  )
}
