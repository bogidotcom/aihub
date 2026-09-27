import { useEffect, useRef } from 'react'

export function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view')
          io.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}

export function Glass({ children, className = '', onClick }) {
  const ref = useRef(null)
  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }
  return (
    <div ref={ref} onMouseMove={onMove} onClick={onClick} className={`glass glass-live ${className}`}>
      {children}
    </div>
  )
}

export function Collage({ photos }) {
  return (
    <div className="grid grid-cols-2 gap-4 h-[58vh] min-h-[420px] max-h-[600px]">
      {photos.map((p) => (
        <figure
          key={p.label}
          className={`photo-ph rounded-2xl overflow-hidden relative ${p.cls || ''}`}
          style={{ '--tilt': p.tilt }}
        >
          {p.src
            ? <img src={p.src} alt={p.label} className="absolute inset-0 w-full h-full object-cover" />
            : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="text-5xl select-none">{p.emoji}</span>
              </div>
            )}
          <figcaption className="absolute inset-x-0 bottom-0 px-3 py-2.5 font-mono text-[10px] text-white/90 bg-gradient-to-t from-black/50 to-transparent">
            [ {p.label} ]
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

export function GradBtn({ children, className = '', as: As = 'button', ...props }) {
  return (
    <As
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/30 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${className}`}
      style={{ background: 'linear-gradient(100deg, var(--accent), var(--accent-2))', color: 'var(--on-accent, #fff)' }}
      {...props}
    >
      {children}
    </As>
  )
}

export function ChipBtn({ children, className = '', as: As = 'button', ...props }) {
  return (
    <As
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 font-semibold rounded-xl text-ink border border-veil bg-chip hover:bg-veil transition-colors duration-300 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </As>
  )
}

export function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <Glass className="relative rounded-3xl p-6 sm:p-8 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {children}
      </Glass>
    </div>
  )
}

export function Field(props) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all placeholder:text-ink-faint text-ink ${props.className || ''}`}
    />
  )
}

export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-ink-faint">
      <div className="w-8 h-8 rounded-full border-2 border-veil border-t-[var(--accent)] animate-spin" />
      {label && <p className="font-mono text-xs">{label}</p>}
    </div>
  )
}

export function CopyRow({ label, value, mono = true }) {
  const copy = () => navigator.clipboard?.writeText(value).catch(() => {})
  return (
    <button onClick={copy} className="w-full text-left bg-chip border border-veil rounded-lg px-4 py-3 hover:bg-veil transition-colors cursor-pointer group">
      <span className="block font-mono text-[10px] uppercase tracking-widest text-ink-faint mb-1">{label} — tap to copy</span>
      <span className={`block text-ink break-all text-sm ${mono ? 'font-mono' : ''}`}>{value}</span>
    </button>
  )
}

// Multi-day events read better as a date range: the hour of day means nothing there and would shift by timezone.
export const isMultiDay = (e) => e?.ends_at && new Date(e.ends_at) - new Date(e.starts_at) > 36 * 3600 * 1000
export const fmtDay = (iso) => new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
export const fmtWhen = (e) => (isMultiDay(e) ? `${fmtDay(e.starts_at)} — ${fmtDay(e.ends_at)}` : fmtDate(e.starts_at) + (e.ends_at ? ` — ${fmtDate(e.ends_at)}` : ''))

export const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
