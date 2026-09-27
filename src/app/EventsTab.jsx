import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CalendarDays, Minus, Plus } from 'lucide-react'
import { Glass, Reveal, Spinner, GradBtn, Field, Modal, fmtWhen } from '../ui.jsx'
import { api } from '../api.js'
import { useSession } from '../session.jsx'
import { useI18n } from '../i18n.jsx'
import { media } from '../media.js'
import { DAI_COUNTRIES } from '../countries.js'
import { BLOCKCHAINS } from '../blockchains.js'
import { LoginCard } from './AppShell.jsx'

// A ticket can be priced in USDT, in KGS (settled in KGST), or both — free only when neither is set.
const isPaid = (tt) => Number(tt.price_usdt) > 0 || Number(tt.price_kgs) > 0
const priceStr = (tt, t) => {
  if (!isPaid(tt)) return t('events.free')
  const kgs = Number(tt.price_kgs) > 0 ? `${Number(tt.price_kgs).toLocaleString()} KGS` : ''
  if (Number(tt.price_usdt) > 0) return `${Number(tt.price_usdt)} USDT${kgs ? ` · ${kgs}` : ''}`
  return kgs
}

function EventCard({ e }) {
  const { t } = useI18n()
  return (
    <Link to={`/app/event/${e.slug}`} className="snap-center shrink-0 w-[80%] sm:w-[340px]">
      <Glass className="rounded-2xl overflow-hidden h-full transition-transform duration-300 hover:-translate-y-1">
        <div className="h-36 flex items-center justify-center text-5xl bg-chip border-b border-veil overflow-hidden">
          {e.cover_image ? <img src={media(e.cover_image)} alt="" className="w-full h-full object-cover" /> : '🎪'}
        </div>
        <div className="p-5 space-y-2">
          <h3 className="font-bold text-ink leading-snug">{e.title}</h3>
          <p className="text-ink-faint text-xs font-mono flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {fmtWhen(e)}</p>
          {e.venue && <p className="text-ink-faint text-xs flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {e.venue}</p>}
          {e.ticket_types?.length > 0 && (
            <p className="text-accent text-sm font-semibold pt-1">
              {isPaid(e.ticket_types[0]) ? `${t('events.from')} ${priceStr(e.ticket_types[0], t)}` : t('events.freeEntry')}
            </p>
          )}
        </div>
      </Glass>
    </Link>
  )
}

export default function EventsTab() {
  const { t } = useI18n()
  const [when, setWhen] = useState('upcoming')
  const [events, setEvents] = useState(null)
  useEffect(() => {
    setEvents(null)
    api(`/events?when=${when}`).then(d => setEvents(d.events)).catch(() => setEvents([]))
  }, [when])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-liquid text-3xl font-bold tracking-tight">{t('events.title')}</h1>
        <div className="flex bg-chip border border-veil rounded-full p-1">
          {['upcoming', 'past'].map(w => (
            <button key={w} onClick={() => setWhen(w)}
              className={`px-4 py-1.5 rounded-full text-sm capitalize transition-colors cursor-pointer ${when === w ? 'font-semibold' : 'text-ink-soft'}`}
              style={when === w ? { background: 'linear-gradient(100deg, var(--accent), var(--accent-2))', color: 'var(--on-accent, #fff)' } : undefined}>
              {t(`events.${w}`)}
            </button>
          ))}
        </div>
      </div>

      {!events ? <Spinner label="loading events" /> : events.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">🌾</p>
          <p className="text-ink-soft">{when === 'upcoming' ? t('events.noneUpcoming') : t('events.nonePast')}</p>
        </div>
      ) : (
        <Reveal>
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 no-scrollbar">
            {events.map(e => <EventCard key={e.id} e={e} />)}
          </div>
        </Reveal>
      )}
    </div>
  )
}

export function EventDetail() {
  const { t } = useI18n()
  const { slug } = useParams()
  const nav = useNavigate()
  const { user } = useSession()
  const [event, setEvent] = useState(null)
  const [err, setErr] = useState(false)
  const [buying, setBuying] = useState(null) // ticket type being bought
  const [qty, setQty] = useState(1)
  const [guest, setGuest] = useState({ name: '', contact: '' })
  const [busy, setBusy] = useState(false)
  const [submitTicket, setSubmitTicket] = useState(null) // ticket type for the project-submission form
  const [submission, setSubmission] = useState({ name: '', project: '', github: '', x: '', tg: '', link: '', blockchain: '', country: '' })
  const [subBusy, setSubBusy] = useState(false)
  const [subError, setSubError] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const [colo, setColo] = useState(null)
  const [coloBusy, setColoBusy] = useState(false)
  const auto = useRef({ project: false, github: false, x: false, country: false })

  useEffect(() => { api(`/events/${slug}`).then(d => setEvent(d.event)).catch(() => setErr(true)) }, [slug])
  useEffect(() => { if (user) setLoginOpen(false) }, [user])

  // A Colosseum project link fills the form from the public page, and the server pulls the same details again on submit.
  useEffect(() => {
    const link = submission.link.trim()
    if (!/^https?:\/\//i.test(link)) { setColo(null); setColoBusy(false); return }
    let dead = false
    const id = setTimeout(() => {
      setColoBusy(true)
      api('/colosseum/preview?url=' + encodeURIComponent(link))
        .then(d => { if (!dead) setColo(d) })
        .catch(() => { if (!dead) setColo({ status: 'unavailable' }) })
        .finally(() => { if (!dead) setColoBusy(false) })
    }, 450)
    return () => { dead = true; clearTimeout(id) }
  }, [submission.link])

  useEffect(() => {
    if (colo?.status !== 'ok' || !colo.project) return
    const p = colo.project
    const match = DAI_COUNTRIES.find(c => c.country.toLowerCase() === (p.country || '').toLowerCase())
    setSubmission(s => {
      const next = { ...s }
      if ((!s.project || auto.current.project) && p.name) { next.project = p.name; auto.current.project = true }
      if ((!s.github || auto.current.github) && p.repoLink) { next.github = p.repoLink; auto.current.github = true }
      if ((!s.x || auto.current.x) && p.twitter) { next.x = p.twitter.replace(/^@/, ''); auto.current.x = true }
      if (match && (!s.country || auto.current.country)) {
        next.country = `${match.country} (${match.ticker})`
        auto.current.country = true
      }
      return next
    })
  }, [colo])

  if (err) return <p className="text-ink-soft py-10 text-center">{t('events.notFound')} <Link to="/app/events" className="text-accent">← {t('events.title')}</Link></p>
  if (!event) return <Spinner label="loading event" />

  const isSubmission = event.slug === 'thermopolium'

  const checkout = async () => {
    setBusy(true)
    try {
      const d = await api('/checkout', {
        method: 'POST',
        body: { kind: 'ticket', ticket_type_id: buying.id, quantity: qty, buyer_name: user?.first_name || guest.name, buyer_contact: guest.contact },
      })
      if (d.order.status === 'paid') nav(`/app/invoice/${d.order.id}`) // free → invoice page shows success + tickets
      else nav(`/app/invoice/${d.order.id}`)
    } catch (e) {
      alert(e.data?.error === 'SOLD_OUT' ? t('events.soldOutMsg') : t('events.checkoutFail'))
      setBusy(false)
    }
  }

  const submitProject = async () => {
    setSubBusy(true)
    setSubError('')
    try {
      // The dedupe check (one submission per blockchain per Telegram account) lives on
      // /contact, so run it before we spend a ticket — a rejected dupe shouldn't eat a seat.
      await api('/contact', {
        method: 'POST',
        body: {
          name: submission.name, contact: submission.tg, topic: 'thermopolium-submission', blockchain: submission.blockchain,
          project: { name: submission.project, blockchain: submission.blockchain, country: submission.country, github: submission.github, x: submission.x, tg: submission.tg, link: submission.link, submitter: submission.name },
          message: `Project submission for Thermopolium\n\nProject: ${submission.project}\nBlockchain: ${submission.blockchain}\nCountry: ${submission.country}\nGitHub: ${submission.github || '—'}\nX: ${submission.x || '—'}\nTelegram (as entered): ${submission.tg}\nColosseum link: ${submission.link}`,
        },
      })
      nav('/app/submissions')
    } catch (e) {
      if (e.data?.error === 'ALREADY_SUBMITTED') setSubError(t('events.subDupe'))
      else if (e.data?.error === 'AUTH_REQUIRED') { setSubmitTicket(null); setLoginOpen(true) }
      else setSubError(e.data?.error === 'SOLD_OUT' ? t('events.soldOutMsg') : t('events.checkoutFail'))
      setSubBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/app/events" className="inline-flex items-center gap-2 text-ink-faint hover:text-ink text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('events.all')}
      </Link>

      <Glass className="rounded-2xl overflow-hidden">
        <div className="h-44 flex items-center justify-center text-6xl bg-chip border-b border-veil overflow-hidden">
          {event.cover_image ? <img src={media(event.cover_image)} alt="" className="w-full h-full object-cover" /> : '🎪'}
        </div>
        <div className="p-6 space-y-3">
          <h1 className="text-2xl font-bold text-ink leading-tight">{event.title}</h1>
          <p className="text-ink-soft text-sm font-mono flex items-center gap-2"><CalendarDays className="w-4 h-4 text-accent" /> {fmtWhen(event)}</p>
          {(event.venue || event.location) && (
            <p className="text-ink-soft text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              {event.location ? <a href={event.location} target="_blank" rel="noreferrer" className="text-accent underline">{event.venue || 'Map'}</a> : event.venue}
            </p>
          )}
          <p className="text-ink-soft leading-relaxed whitespace-pre-wrap">{event.description}</p>
        </div>
      </Glass>

      <div className="space-y-3">
        <h2 className="font-mono text-xs tracking-[0.25em] uppercase text-ink-faint">{t('events.tickets')}</h2>
        {event.ticket_types.map(tt => (
          <Glass key={tt.id} className="rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-ink">{tt.name}</p>
              {tt.description && <p className="text-ink-faint text-xs">{tt.description}</p>}
              <p className="text-accent font-semibold text-sm mt-1">{priceStr(tt, t)}</p>
              {tt.available != null && <p className="font-mono text-[10px] text-ink-faint mt-0.5">{tt.available > 0 ? t('events.left', { n: tt.available }) : t('events.soldOut')}</p>}
            </div>
            <GradBtn disabled={tt.available === 0}
              onClick={() => isSubmission ? (user ? setSubmitTicket(tt) : setLoginOpen(true)) : (setBuying(tt), setQty(1))}
              className="!px-5 !py-2.5 text-sm shrink-0">
              {isSubmission ? t('events.submit') : isPaid(tt) ? t('events.buy') : t('events.rsvp')}
            </GradBtn>
          </Glass>
        ))}
      </div>

      {buying && (
        <Glass className="rounded-2xl p-6 space-y-4">
          <p className="font-bold text-ink">{buying.name} — {priceStr(buying, t)}</p>
          <div className="flex items-center gap-4">
            <span className="text-ink-soft text-sm">{t('events.quantity')}</span>
            <div className="flex items-center gap-3 bg-chip border border-veil rounded-full px-2 py-1">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-1 text-ink cursor-pointer"><Minus className="w-4 h-4" /></button>
              <span className="font-mono text-ink w-6 text-center">{qty}</span>
              <button onClick={() => setQty(Math.min(buying.available ?? 20, qty + 1))} className="p-1 text-ink cursor-pointer"><Plus className="w-4 h-4" /></button>
            </div>
            {isPaid(buying) && (
              <span className="ml-auto font-bold text-accent">
                {Number(buying.price_usdt) > 0
                  ? `${(Number(buying.price_usdt) * qty).toFixed(0)} USDT`
                  : `${(Number(buying.price_kgs) * qty).toLocaleString()} KGS`}
              </span>
            )}
          </div>
          {!user && (
            <div className="grid gap-3">
              <Field placeholder={t('events.yourName')} value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} />
              <Field placeholder={t('events.contactPh')} value={guest.contact} onChange={e => setGuest({ ...guest, contact: e.target.value })} required />
            </div>
          )}
          <GradBtn onClick={checkout} disabled={busy || (!user && !guest.contact)} className="w-full">
            {busy ? t('events.creating') : isPaid(buying) ? t('events.continuePay') : t('events.getTicket')}
          </GradBtn>
        </Glass>
      )}

      <Modal open={!!submitTicket} onClose={() => !subBusy && setSubmitTicket(null)}>
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-ink">{t('events.submitTitle')}</h3>
          {user && (
            <p className="font-mono text-[11px] text-ink-faint bg-chip border border-veil rounded-lg px-3 py-2">
              {t('events.subAuthedAs', { handle: user.username ? '@' + user.username : user.first_name })}
            </p>
          )}
          <div className="grid gap-3">
            <Field placeholder={t('events.subLink')} value={submission.link} onChange={e => setSubmission({ ...submission, link: e.target.value })} required />
            {coloBusy && <p className="text-xs text-ink-faint">{t('events.subColoWait')}</p>}
            {colo?.status === 'ok' && colo.project && (
              <div className="flex gap-3 rounded-xl border border-veil bg-chip p-3">
                {colo.project.image && <img src={colo.project.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-veil" />}
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-accent">{t('events.subColoReady')}</p>
                  <p className="font-semibold text-ink truncate">{colo.project.name}</p>
                  {(colo.project.category || colo.project.hackathon?.name) && (
                    <p className="text-ink-faint text-[11px] truncate">{[colo.project.category, colo.project.hackathon?.name].filter(Boolean).join(' · ')}</p>
                  )}
                  {colo.project.description && <p className="text-ink-soft text-xs line-clamp-3 mt-1">{colo.project.description}</p>}
                </div>
              </div>
            )}
            {colo && colo.status !== 'ok' && !coloBusy && (
              <p className="text-xs text-accent">
                {t(colo.status === 'not_found' ? 'events.subColoMissing' : colo.status === 'unavailable' ? 'events.subColoDown' : 'events.subColoInvalid')}
              </p>
            )}
            <Field placeholder={t('events.subName')} value={submission.name} onChange={e => setSubmission({ ...submission, name: e.target.value })} required />
            <Field placeholder={t('events.subProject')} value={submission.project} onChange={e => setSubmission({ ...submission, project: e.target.value })} required />
            <select value={submission.blockchain} onChange={e => setSubmission({ ...submission, blockchain: e.target.value })} required
              className="w-full px-4 py-3 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all text-ink">
              <option value="" disabled>{t('events.subBlockchain')}</option>
              {BLOCKCHAINS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={submission.country} onChange={e => setSubmission({ ...submission, country: e.target.value })} required
              className="w-full px-4 py-3 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all text-ink">
              <option value="" disabled>{t('events.subCountry')}</option>
              {DAI_COUNTRIES.map(c => <option key={`${c.country}|${c.ticker}`} value={`${c.country} (${c.ticker})`}>{c.country} — {c.ticker}</option>)}
            </select>
            <Field placeholder={t('events.subGithub')} value={submission.github} onChange={e => setSubmission({ ...submission, github: e.target.value })} />
            <Field placeholder={t('events.subX')} value={submission.x} onChange={e => setSubmission({ ...submission, x: e.target.value })} />
            <Field placeholder={t('events.subTg')} value={submission.tg} onChange={e => setSubmission({ ...submission, tg: e.target.value })} required />
          </div>
          {subError && <p className="text-center text-sm text-accent">{subError}</p>}
          <GradBtn onClick={submitProject}
            disabled={subBusy || !submission.name || !submission.project || !submission.tg || !submission.link || !submission.blockchain || !submission.country}
            className="w-full">
            {subBusy ? t('events.creating') : t('events.submit')}
          </GradBtn>
        </div>
      </Modal>

      <Modal open={loginOpen} onClose={() => setLoginOpen(false)}>
        <LoginCard prompt={t('events.subLoginPrompt')} />
      </Modal>
    </div>
  )
}
