import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, GitBranch, Vote } from 'lucide-react'
import { Glass, GradBtn, Spinner } from '../ui.jsx'
import { api } from '../api.js'
import { useI18n } from '../i18n.jsx'
import { ROMAN } from './parts.jsx'
import { fmtTherm, rememberWallet } from './therm.js'

// Phantom, Solflare, or any wallet that injects a Solana provider.
const wallet = () => window.phantom?.solana || window.solflare || window.solana || null

export function ProjectBoard({ mode = 'top' }) {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const all = mode === 'all'

  const load = () => api(all ? '/therm/projects' : '/therm/top').then(setData).catch(() => setData({ projects: [], votingOpen: false }))
  useEffect(() => { load() }, [all])

  const vote = async (slug) => {
    setMsg('')
    const w = wallet()
    if (!w?.signMessage) return setMsg(t('top.noWallet'))
    setBusy(slug)
    try {
      const { publicKey } = await w.connect()
      rememberWallet(publicKey.toString())
      const message = `Thermopolium vote\nproject: ${slug}\nissued: ${new Date().toISOString()}`
      const signed = await w.signMessage(new TextEncoder().encode(message), 'utf8')
      await api('/therm/vote', { method: 'POST', body: { slug, wallet: publicKey.toString(), message, signature: Array.from(signed.signature) } })
      setMsg(t('top.voted'))
      load()
    } catch (e) {
      const code = e.data?.error
      setMsg(code === 'NO_THERM' ? t('top.noTherm') : code === 'VOTING_NOT_OPEN' ? t('top.soon') : t('top.failed'))
    } finally { setBusy('') }
  }

  if (!data) return <Spinner />
  if (!data.projects.length) {
    return (
      <Glass className="rounded-2xl p-10 text-center space-y-4">
        <p className="text-4xl">🏛️</p>
        <p className="text-ink-soft max-w-md mx-auto">{t('top.empty')}</p>
        <GradBtn as={Link} to="/app/event/thermopolium" className="text-sm">{t('nav.submit')}</GradBtn>
      </Glass>
    )
  }

  return (
    <div className="space-y-3">
      {data.projects.map((p, i) => (
        <Glass key={p.slug} className="rounded-xl px-4 sm:px-6 py-4 flex items-center gap-4">
          <span className="font-display text-2xl sm:text-3xl text-accent-2 w-12 text-center shrink-0">{all ? String(p.rank || i + 1) : (ROMAN[i] || i + 1)}</span>
          {p.image && <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-veil shrink-0 hidden sm:block" />}
          <div className="min-w-0 flex-1">
            <a href={p.link} target="_blank" rel="noreferrer" className="font-display font-bold text-ink hover:text-accent inline-flex items-center gap-1.5 max-w-full">
              <span className="truncate">{p.name}</span> <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
            {p.description && <p className="text-ink-faint text-xs line-clamp-2 mt-0.5">{p.description}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
              {p.blockchain && <span className="font-mono uppercase tracking-widest bg-chip border border-veil rounded-full px-2 py-0.5">{p.blockchain}</span>}
              {p.country && <span>{p.country.replace(/ \(ai[A-Z]+\)$/, '')}</span>}
              {p.github && <a href={p.github.startsWith('http') ? p.github : `https://github.com/${p.github}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink"><GitBranch className="w-3.5 h-3.5" /> GitHub</a>}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display font-bold text-ink">{fmtTherm(p.votes)}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">$THERM · {p.voters} {t('top.voters')}</p>
          </div>
          <GradBtn onClick={() => vote(p.slug)} disabled={busy === p.slug} className="!px-3 sm:!px-4 !py-2 text-xs shrink-0">
            <Vote className="w-4 h-4" /> <span className={all ? '' : 'hidden sm:inline'}>{t('top.vote')}</span>
          </GradBtn>
        </Glass>
      ))}
      {msg && <p className="text-center text-sm text-accent">{msg}</p>}
      {!data.votingOpen && <p className="text-center text-xs text-ink-faint">{t('top.soon')}</p>}
    </div>
  )
}

export default function Top10() {
  return <ProjectBoard mode="top" />
}
