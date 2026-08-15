import { useState, useEffect } from 'react'

export const THEMES = {
  morning: {
    greeting: 'Good Morning',
    vars: {
      '--bg-a': '#fdf1d8', '--bg-b': '#fbdfe3', '--bg-c': '#e7dcf7',
      '--ink': '#33265c', '--ink-soft': '#5c527f', '--ink-faint': '#8b81a8',
      '--accent': '#f2765f', '--accent-2': '#6a4fc7', '--accent-3': '#2fb586',
      '--surface': 'rgba(255,255,255,0.42)', '--veil': 'rgba(255,255,255,0.65)',
      '--chip': 'rgba(255,255,255,0.5)',
      '--glow-a': 'rgba(251,191,36,0.3)', '--glow-b': 'rgba(244,114,182,0.2)',
      '--bird': '#5c527f', '--sun-core': '#ffce6d', '--sun-glow': 'rgba(255,196,86,0.55)',
      '--star': '#fff7e0',
    },
  },
  afternoon: {
    greeting: 'Good Afternoon',
    vars: {
      '--bg-a': '#fbe3d3', '--bg-b': '#f6d9e6', '--bg-c': '#ddd2f5',
      '--ink': '#2e2354', '--ink-soft': '#5c527f', '--ink-faint': '#8b81a8',
      '--accent': '#ef7080', '--accent-2': '#6a4fc7', '--accent-3': '#35c290',
      '--surface': 'rgba(255,255,255,0.42)', '--veil': 'rgba(255,255,255,0.65)',
      '--chip': 'rgba(255,255,255,0.5)',
      '--glow-a': 'rgba(249,168,212,0.35)', '--glow-b': 'rgba(167,139,250,0.25)',
      '--bird': '#5c527f', '--sun-core': '#ffd98a', '--sun-glow': 'rgba(255,209,110,0.5)',
      '--star': '#fff7e0',
    },
  },
  evening: {
    greeting: 'Good Evening',
    vars: {
      '--bg-a': '#f6c4a2', '--bg-b': '#dfa6c9', '--bg-c': '#8f7cc9',
      '--ink': '#2c1f4e', '--ink-soft': '#4e4174', '--ink-faint': '#6f639a',
      '--accent': '#e8556d', '--accent-2': '#5f3fb4', '--accent-3': '#d9930f',
      '--surface': 'rgba(255,255,255,0.32)', '--veil': 'rgba(255,255,255,0.5)',
      '--chip': 'rgba(255,255,255,0.38)',
      '--glow-a': 'rgba(251,146,60,0.35)', '--glow-b': 'rgba(139,92,246,0.28)',
      '--bird': '#4e4174', '--sun-core': '#ffab61', '--sun-glow': 'rgba(255,138,76,0.5)',
      '--star': '#fff3d6',
    },
  },
  night: {
    greeting: 'Hello, Night Owl',
    vars: {
      '--bg-a': '#020617', '--bg-b': '#0e1330', '--bg-c': '#1e1b4b',
      '--ink': '#e7e9f4', '--ink-soft': '#a6adc8', '--ink-faint': '#767e9e',
      '--accent': '#f087a6', '--accent-2': '#a78bfa', '--accent-3': '#67e8f9',
      '--surface': 'rgba(255,255,255,0.06)', '--veil': 'rgba(255,255,255,0.12)',
      '--chip': 'rgba(255,255,255,0.08)',
      '--glow-a': 'rgba(167,139,250,0.14)', '--glow-b': 'rgba(103,232,249,0.1)',
      '--bird': 'transparent', '--sun-core': 'transparent', '--sun-glow': 'transparent',
      '--star': '#fef9c3',
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

const STARS = [
  { x: 6, y: 12, r: 1.6, d: 0 }, { x: 14, y: 30, r: 1.1, d: 1.2 }, { x: 22, y: 8, r: 1.4, d: 2.1 },
  { x: 31, y: 22, r: 1.0, d: 0.6 }, { x: 38, y: 14, r: 1.8, d: 1.7 }, { x: 47, y: 6, r: 1.2, d: 2.6 },
  { x: 55, y: 26, r: 1.5, d: 0.3 }, { x: 63, y: 11, r: 1.0, d: 1.9 }, { x: 71, y: 33, r: 1.3, d: 0.9 },
  { x: 78, y: 7, r: 1.7, d: 2.3 }, { x: 85, y: 19, r: 1.1, d: 1.4 }, { x: 92, y: 29, r: 1.5, d: 0.1 },
  { x: 26, y: 40, r: 1.0, d: 2.8 }, { x: 60, y: 42, r: 1.2, d: 1.1 }, { x: 88, y: 44, r: 1.0, d: 2.0 },
  { x: 43, y: 36, r: 1.4, d: 0.5 },
]

const BIRDS = [
  { top: '16%', dur: '52s', delay: '-8s', scale: 1, opacity: 0.7 },
  { top: '11%', dur: '64s', delay: '-30s', scale: 0.7, opacity: 0.55 },
  { top: '24%', dur: '58s', delay: '-45s', scale: 0.85, opacity: 0.6 },
  { top: '7%', dur: '70s', delay: '-18s', scale: 0.55, opacity: 0.45 },
]

function Bird({ top, dur, delay, scale, opacity }) {
  return (
    <svg
      viewBox="0 0 28 14" width="26" height="13"
      className="bird"
      style={{ top, opacity, '--fly-dur': dur, animationDelay: delay, '--bird-scale': scale }}
    >
      <path d="M2 10 Q8 3 14 10 M14 10 Q20 3 26 10" stroke="var(--bird)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Sky({ phase }) {
  const showSun = phase === 'morning' || phase === 'afternoon' || phase === 'evening'
  const showBirds = phase !== 'night'
  const showMoon = phase === 'night'
  const stars = phase === 'night' ? STARS : phase === 'evening' ? STARS.slice(0, 7) : []

  const sunPos =
    phase === 'morning' ? { left: '10%', top: '22%' }
    : phase === 'afternoon' ? { right: '16%', top: '8%' }
    : { right: '6%', top: '48%' } // evening: low on the horizon

  return (
    <>
      {showSun && (
        <svg width="180" height="180" className="float-slow absolute" style={sunPos} aria-hidden="true">
          <defs>
            <radialGradient id="sun-glow">
              <stop offset="0%" stopColor="var(--sun-glow)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx="90" cy="90" r="88" fill="url(#sun-glow)" />
          <circle cx="90" cy="90" r="34" fill="var(--sun-core)" />
        </svg>
      )}

      {showMoon && (
        <svg width="140" height="140" className="float-slow absolute" style={{ right: '12%', top: '10%' }} aria-hidden="true">
          <defs>
            <radialGradient id="moon-glow">
              <stop offset="0%" stopColor="rgba(254,249,195,0.28)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <mask id="crescent">
              <rect width="140" height="140" fill="white" />
              <circle cx="82" cy="56" r="26" fill="black" />
            </mask>
          </defs>
          <circle cx="70" cy="70" r="68" fill="url(#moon-glow)" />
          <circle cx="70" cy="70" r="28" fill="#ece8d4" mask="url(#crescent)" />
        </svg>
      )}

      {stars.length > 0 && (
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
          {stars.map((s, i) => (
            <circle
              key={i}
              cx={`${s.x}%`} cy={`${s.y}%`} r={s.r}
              fill="var(--star)"
              className="twinkle"
              style={{ animationDelay: `${s.d}s`, opacity: phase === 'evening' ? 0.5 : undefined }}
            />
          ))}
        </svg>
      )}

      {showBirds && BIRDS.map((b, i) => <Bird key={i} {...b} />)}
    </>
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
