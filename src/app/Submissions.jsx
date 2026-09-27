import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Glass, Spinner, GradBtn } from '../ui.jsx'
import { api } from '../api.js'
import { useSession } from '../session.jsx'
import { useI18n } from '../i18n.jsx'
import { LoginCard } from './AppShell.jsx'

function when(iso) {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Submissions() {
  const { t } = useI18n()
  const { user, ready } = useSession()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (!user) return
    setData(null)
    setErr(false)
    api('/submissions').then(setData).catch(() => setErr(true))
  }, [user])

  if (!ready) return null
  if (!user) return <LoginCard prompt={t('submissions.login')} />

  const all = data?.scope === 'all'
  const rows = data?.submissions || []

  return (
    <div className="space-y-6">
      <h1 className="text-liquid text-3xl font-bold tracking-tight">{all ? t('submissions.all') : t('submissions.mine')}</h1>
      {err ? (
        <p className="text-ink-soft">{t('events.checkoutFail')}</p>
      ) : !data ? <Spinner label="loading submissions" /> : rows.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-ink-soft">{all ? t('submissions.emptyAll') : t('submissions.empty')}</p>
          <GradBtn as={Link} to="/app/event/thermopolium" className="mx-auto">{t('submissions.submitCta')}</GradBtn>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(s => {
            const same = (a, b) => (a || '').replace(/^@/, '').toLowerCase() === (b || '').replace(/^@/, '').toLowerCase()
            const account = s.username ? '@' + s.username : [s.first_name, s.last_name].filter(Boolean).join(' ')
            const typed = s.submitter && !same(s.submitter, s.username) && !same(s.submitter, s.first_name) ? s.submitter : ''
            const handle = s.tg && !same(s.tg, s.username) && !same(s.tg, s.submitter) ? s.tg : ''
            const who = [typed, account, handle].filter(Boolean)
            return (
              <Glass key={s.id} className="rounded-2xl p-5 flex gap-4">
                {s.image && <img src={s.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-chip border border-veil" />}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-bold text-ink truncate">{s.name}</h2>
                    <span className="font-mono text-[10px] text-ink-faint shrink-0">{when(s.created_at)}</span>
                  </div>
                  <p className="text-ink-soft text-sm">{[s.blockchain, s.country, s.category].filter(Boolean).join(' · ')}</p>
                  {s.description && <p className="text-ink-faint text-sm line-clamp-3">{s.description}</p>}
                  {all && who.length > 0 && (
                    <p className="font-mono text-[11px] text-ink-faint">{t('submissions.by')} {who.join(' · ')}</p>
                  )}
                  <div className="flex flex-wrap gap-3 pt-1 text-sm">
                    {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="text-accent">{t('submissions.open')}</a>}
                    {s.github && <a href={s.github.startsWith('http') ? s.github : `https://github.com/${s.github.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="text-ink-soft hover:text-ink">GitHub</a>}
                    {s.x && <a href={s.x.startsWith('http') ? s.x : `https://x.com/${s.x.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="text-ink-soft hover:text-ink">X</a>}
                  </div>
                </div>
              </Glass>
            )
          })}
        </div>
      )}
    </div>
  )
}
