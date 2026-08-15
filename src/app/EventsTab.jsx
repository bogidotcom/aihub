import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CalendarDays, Minus, Plus } from 'lucide-react'
import { Glass, Reveal, Spinner, GradBtn, Field, fmtDate } from '../ui.jsx'
import { api } from '../api.js'
import { useSession } from '../session.jsx'
import { useI18n } from '../i18n.jsx'
import { media } from '../media.js'

const priceStr = (tt, t) => Number(tt.price_usdt) > 0
  ? `${Number(tt.price_usdt)} USDT${Number(tt.price_kgs) > 0 ? ` · ${Number(tt.price_kgs).toLocaleString()} KGS` : ''}`
  : t('events.free')

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
          <p className="text-ink-faint text-xs font-mono flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {fmtDate(e.starts_at)}</p>
          {e.venue && <p className="text-ink-faint text-xs flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {e.venue}</p>}
          {e.ticket_types?.length > 0 && (
            <p className="text-accent text-sm font-semibold pt-1">
              {Number(e.ticket_types[0].price_usdt) > 0 ? `${t('events.from')} ${priceStr(e.ticket_types[0], t)}` : t('events.freeEntry')}
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
              className={`px-4 py-1.5 rounded-full text-sm capitalize transition-colors cursor-pointer ${when === w ? 'text-white font-semibold' : 'text-ink-soft'}`}
              style={when === w ? { background: 'linear-gradient(100deg, var(--accent), var(--accent-2))' } : undefined}>
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

  useEffect(() => { api(`/events/${slug}`).then(d => setEvent(d.event)).catch(() => setErr(true)) }, [slug])

  if (err) return <p className="text-ink-soft py-10 text-center">{t('events.notFound')} <Link to="/app/events" className="text-accent">← {t('events.title')}</Link></p>
  if (!event) return <Spinner label="loading event" />

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
          <p className="text-ink-soft text-sm font-mono flex items-center gap-2"><CalendarDays className="w-4 h-4 text-accent" /> {fmtDate(event.starts_at)}{event.ends_at ? ` — ${fmtDate(event.ends_at)}` : ''}</p>
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
            <GradBtn disabled={tt.available === 0} onClick={() => { setBuying(tt); setQty(1) }} className="!px-5 !py-2.5 text-sm shrink-0">
              {Number(tt.price_usdt) > 0 ? t('events.buy') : t('events.rsvp')}
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
            {Number(buying.price_usdt) > 0 && <span className="ml-auto font-bold text-accent">{(Number(buying.price_usdt) * qty).toFixed(0)} USDT</span>}
          </div>
          {!user && (
            <div className="grid gap-3">
              <Field placeholder={t('events.yourName')} value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} />
              <Field placeholder={t('events.contactPh')} value={guest.contact} onChange={e => setGuest({ ...guest, contact: e.target.value })} required />
            </div>
          )}
          <GradBtn onClick={checkout} disabled={busy || (!user && !guest.contact)} className="w-full">
            {busy ? t('events.creating') : Number(buying.price_usdt) > 0 ? t('events.continuePay') : t('events.getTicket')}
          </GradBtn>
        </Glass>
      )}
    </div>
  )
}
