import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ExternalLink, Loader2 } from 'lucide-react'
import { api } from '../api.js'
import { media } from '../media.js'
import { useI18n } from '../i18n.jsx'
import { Glass, GradBtn, Spinner } from '../ui.jsx'
import { shortAddr, timeAgo, hueOf, extractSignature } from './therm.js'
import { useCompose } from './Compose.jsx'

const PENDING = new Set(['received', 'queued', 'computing'])

function Post({ post, highlight }) {
  const { t } = useI18n()
  const pending = PENDING.has(post.status)
  return (
    <article className={`border-b border-veil px-4 sm:px-5 py-4 ${highlight ? 'bg-chip' : ''}`}>
      <div className="flex gap-3">
        <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-display font-bold text-sm text-white"
          style={{ background: `linear-gradient(135deg, hsl(${hueOf(post.sender)} 45% 42%), hsl(${(hueOf(post.sender) + 40) % 360} 55% 30%))` }}>
          {(post.sender || '??').slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm flex flex-wrap items-baseline gap-x-2">
            <span className="font-display font-bold text-ink mono-real">{shortAddr(post.sender)}</span>
            <span className="text-ink-faint text-xs">· {timeAgo(post)} · {t('feed.sent', { n: post.therm })} $THERM</span>
          </p>
          <p className="text-ink mt-1 whitespace-pre-wrap break-words">{post.memo}</p>

          <div className="mt-3 flex gap-3 rounded-xl border border-veil bg-[color-mix(in_oklab,var(--chip)_70%,transparent)] p-3">
            <img src={media('therm-icon.svg')} alt="" className="w-8 h-8 shrink-0 rounded-full border border-veil bg-chip p-1" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-ink">Thermopolium AI {post.status === 'done' && <span className="font-body font-normal text-ink-faint text-xs">· {t('feed.onDai')}</span>}</p>
              {post.status === 'done' && <p className="mt-1 text-ink-soft whitespace-pre-wrap break-words">{post.answer}</p>}
              {pending && (
                <p className="mt-1 text-ink-faint text-sm flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" /> {post.status === 'computing' ? t('feed.thinking') : t('feed.queued')}
                </p>
              )}
              {(post.status === 'insufficient' || post.status === 'error') && <p className="mt-1 text-accent text-sm">{post.note}</p>}
            </div>
          </div>

          <a href={`https://solscan.io/tx/${post.sig}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-faint hover:text-ink mono-real">
            {post.sig.slice(0, 8)}…{post.sig.slice(-6)} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </article>
  )
}

export default function Feed() {
  const { t } = useI18n()
  const compose = useCompose()
  const [params, setParams] = useSearchParams()
  const [posts, setPosts] = useState(null)
  const [next, setNext] = useState(null)
  const [q, setQ] = useState(params.get('tx') || '')
  const [found, setFound] = useState(null)      // { post } | { missing: true } | null
  const [loadingMore, setLoadingMore] = useState(false)
  const timer = useRef()

  const loadFeed = useCallback(() => api('/therm/feed?limit=20').then(d => { setPosts(d.posts); setNext(d.next) }).catch(() => setPosts([])), [])
  useEffect(() => { loadFeed(); const id = setInterval(loadFeed, 10000); return () => clearInterval(id) }, [loadFeed])

  const more = async () => {
    setLoadingMore(true)
    try { const d = await api(`/therm/feed?limit=20&before=${next}`); setPosts(p => [...p, ...d.posts]); setNext(d.next) } finally { setLoadingMore(false) }
  }

  // Look a transfer up by hash; keep polling while its answer is still being produced.
  const lookup = useCallback(async (sig, tries = 0) => {
    clearTimeout(timer.current)
    try {
      const d = await api(`/therm/tx/${sig}`)
      setFound({ post: d.post })
      if (PENDING.has(d.post.status)) timer.current = setTimeout(() => lookup(sig, 0), 4000)
    } catch {
      setFound({ missing: true })
      if (tries < 30) timer.current = setTimeout(() => lookup(sig, tries + 1), 5000)   // the watcher may not have seen it yet
    }
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const sig = extractSignature(params.get('tx') || '')
    if (sig) { setQ(sig); lookup(sig) } else { clearTimeout(timer.current); setFound(null) }
  }, [params, lookup])

  const search = (e) => {
    e.preventDefault()
    const sig = extractSignature(q)
    if (sig) setParams({ tx: sig }); else setParams({})
    if (q && !sig) setFound({ invalid: true })
  }

  return (
    <div className="relative px-0 sm:px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Glass className="rounded-none sm:rounded-2xl overflow-hidden">
          <header className="px-4 sm:px-5 pt-5 pb-4 border-b border-veil space-y-3">
            <div>
              <h1 className="text-liquid text-3xl font-bold">{t('feed.title')}</h1>
              <p className="text-ink-faint text-sm">{t('feed.sub')}</p>
            </div>
            <form onSubmit={search} className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('feed.searchPh')}
                  className="w-full pl-10 pr-4 py-3 bg-chip border border-veil rounded-full text-ink placeholder:text-ink-faint text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
              </div>
              <GradBtn type="submit" className="!px-5 !py-2 text-sm rounded-full">{t('feed.search')}</GradBtn>
            </form>
          </header>

          {found && (
            <section className="border-b border-veil">
              <p className="px-5 pt-3 font-mono text-[10px] uppercase tracking-widest text-ink-faint">{t('feed.result')}</p>
              {found.post && <Post post={found.post} highlight />}
              {found.missing && <p className="px-5 py-5 text-ink-soft text-sm">{t('feed.notFound')}</p>}
              {found.invalid && <p className="px-5 py-5 text-accent text-sm">{t('feed.badHash')}</p>}
            </section>
          )}

          {!posts ? <Spinner /> : posts.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-4">
              <p className="text-4xl">🔥</p>
              <p className="text-ink-soft max-w-sm mx-auto">{t('feed.empty')}</p>
              <GradBtn onClick={compose.open} className="text-sm">{t('compose.title')}</GradBtn>
            </div>
          ) : (
            <>
              {posts.map(p => <Post key={p.sig} post={p} />)}
              {next && (
                <div className="p-4 text-center">
                  <GradBtn onClick={more} disabled={loadingMore} className="!py-2 text-sm">{t('feed.more')}</GradBtn>
                </div>
              )}
            </>
          )}
        </Glass>
      </div>
    </div>
  )
}
