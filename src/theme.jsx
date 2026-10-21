import { useState, useEffect } from 'react'

// Instrument panel: a dark field, a heat mark for the joule, a cold mark for the measurement.
const LAB = {
  '--ink': '#e7eef2', '--ink-soft': '#b7c4cc', '--ink-faint': '#7d8b94',
  '--accent': '#ffb020', '--accent-2': '#7ee0ff', '--accent-3': '#d7dde2', '--on-accent': '#140e06',
  '--surface': 'rgba(8,12,16,0.78)', '--veil': 'rgba(126,224,255,0.22)', '--chip': 'rgba(255,176,32,0.08)',
  '--bird': 'transparent', '--logo-filter': 'invert(1)',
  '--star': '#7ee0ff',
}

export const THEMES = {
  morning: {
    greeting: 'Good Morning',
    vars: {
      ...LAB,
      '--bg-a': '#070b10', '--bg-b': '#101820', '--bg-c': '#0c1218',
      '--glow-a': 'rgba(255,176,32,0.16)', '--glow-b': 'rgba(126,224,255,0.08)',
    },
  },
  afternoon: {
    greeting: 'Good Afternoon',
    vars: {
      ...LAB,
      '--bg-a': '#070b10', '--bg-b': '#121a22', '--bg-c': '#0e161e',
      '--glow-a': 'rgba(255,176,32,0.18)', '--glow-b': 'rgba(126,224,255,0.10)',
    },
  },
  evening: {
    greeting: 'Good Evening',
    vars: {
      ...LAB,
      '--bg-a': '#05080c', '--bg-b': '#10161c', '--bg-c': '#1a120c',
      '--glow-a': 'rgba(255,140,32,0.20)', '--glow-b': 'rgba(126,224,255,0.06)',
    },
  },
  night: {
    greeting: 'Hello, Night Owl',
    vars: {
      ...LAB,
      '--bg-a': '#05070a', '--bg-b': '#0c1218', '--bg-c': '#101820',
      '--glow-a': 'rgba(255,176,32,0.10)', '--glow-b': 'rgba(126,224,255,0.08)',
    },
  },
}

export function phaseFor(hour) {
  // preview override: ?phase=morning|afternoon|evening|night (works with hash router too)
  const search = window.location.search || window.location.hash.split('?')[1] || ''
  const forced = new URLSearchParams(search.startsWith('?') ? search : '?' + search).get('phase')
  if (forced && THEMES[forced]) return forced
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function useClock() {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 30_000)
    return () => clearInterval(tick)
  }, [])
  const phase = phaseFor(clock.getHours())
  return {
    clock, phase, theme: THEMES[phase],
    hhmm: clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

export function Sky() {
  return (
    <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id="joule">
          <stop offset="0%" stopColor="rgba(255,176,32,0.5)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="82%" cy="12%" r="140" fill="url(#joule)" />
    </svg>
  )
}

// Full-page wrapper: time-of-day background + grain + ambient glow + sky
export function ThemeFrame({ children, parallax = false, className = '' }) {
  const { phase, theme } = useClock()
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    if (!parallax) return
    let raf = 0
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setScrollY(window.scrollY)) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [parallax])

  return (
    <div className={`app-bg grain min-h-screen overflow-x-clip ${className}`} style={theme.vars}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="animate-drift absolute -top-24 left-1/4 w-[36rem] h-[36rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--glow-a) 0%, transparent 70%)', translate: `0 ${scrollY * 0.15}px` }}
        />
        <div
          className="animate-drift absolute bottom-0 right-1/5 w-[32rem] h-[32rem] rounded-full blur-3xl [animation-delay:-9s]"
          style={{ background: 'radial-gradient(circle, var(--glow-b) 0%, transparent 70%)', translate: `0 ${scrollY * -0.1}px` }}
        />
        <Sky phase={phase} />
      </div>
      {children}
    </div>
  )
}
