import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { ThemeFrame } from '../theme.jsx'
import { Glass, Spinner, fmtDate } from '../ui.jsx'
import { api } from '../api.js'
import { useI18n } from '../i18n.jsx'

export default function TicketView() {
  const { t } = useI18n()
  const { qr } = useParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => { api(`/tickets/${qr}`).then(setData).catch(() => setErr(true)) }, [qr])

  return (
    <ThemeFrame>
      <nav className="glass sticky top-0 z-50 rounded-none border-x-0 border-t-0">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-accent" />
            <span className="font-bold text-ink">AIHub</span>
          </Link>
          <Link to="/app/events" className="text-sm text-ink-soft hover:text-ink">{t('events.title')} →</Link>
        </div>
      </nav>
      <main className="relative z-10 max-w-md mx-auto px-4 py-8">
        {err ? (
          <p className="text-center text-ink-soft py-16">{t('ticket.notFound')}</p>
        ) : !data ? <Spinner label="loading ticket" /> : (
          <Glass className="rounded-3xl overflow-hidden">
            <div className="p-6 text-center space-y-1" style={{ background: 'linear-gradient(100deg, var(--accent), var(--accent-2))' }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/80">AIHub · Ticket</p>
              <h1 className="text-xl font-bold text-white leading-tight">{data.event?.title}</h1>
              <p className="text-white/80 text-sm">{data.ticket_type?.name}</p>
            </div>
            <div className="relative border-t-2 border-dashed border-veil">
              <span className="absolute -top-3 -left-3 w-6 h-6 rounded-full app-bg" />
              <span className="absolute -top-3 -right-3 w-6 h-6 rounded-full app-bg" />
            </div>
            <div className="p-6 space-y-4 text-center">
              <p className="font-mono text-xs text-ink-faint">{fmtDate(data.event?.starts_at)}{data.event?.venue ? ` · ${data.event.venue}` : ''}</p>
              <img src={data.qr} alt="Ticket QR" className="mx-auto rounded-xl border border-veil w-56 h-56 bg-white" />
              <p className="font-mono text-[10px] text-ink-faint break-all">{data.ticket.qr_token}</p>
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold font-mono uppercase tracking-widest ${data.ticket.status === 'checked_in' ? 'bg-chip text-ink-faint border border-veil' : 'text-white'}`}
                style={data.ticket.status !== 'checked_in' ? { background: 'var(--accent-3)' } : undefined}>
                {data.ticket.status === 'checked_in' ? t('ticket.checkedIn') : t('ticket.valid')}
              </span>
              {data.ticket.holder_name && <p className="text-ink-soft text-sm">{data.ticket.holder_name}</p>}
            </div>
          </Glass>
        )}
      </main>
    </ThemeFrame>
  )
}
