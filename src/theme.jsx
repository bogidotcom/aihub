import { useState, useEffect } from 'react'

// "Roman holiday": sunlit travertine, terracotta carpet, brass lamps, cypress green, a strip of sky.
const DAY = {
  '--ink': '#3a2416', '--ink-soft': '#5e4630', '--ink-faint': '#75604a',
  '--accent': '#b5452d', '--accent-2': '#9c701d', '--accent-3': '#4d6a3a', '--on-accent': '#fffaf0',
  '--surface': 'rgba(255,251,240,0.66)', '--veil': 'rgba(156,112,29,0.30)', '--chip': 'rgba(255,248,228,0.72)',
  '--bird': '#5e4630', '--logo-filter': 'none',
}

export const THEMES = {
  morning: {
    greeting: 'Good Morning',
    vars: {
      ...DAY,
      '--bg-a': '#d3e5ee', '--bg-b': '#f5ecd5', '--bg-c': '#ead6ab',
      '--glow-a': 'rgba(240,190,80,0.30)', '--glow-b': 'rgba(181,69,45,0.10)',
      '--sun-core': '#f6c453', '--sun-glow': 'rgba(250,200,90,0.55)', '--star': '#fff7e0',
    },
  },
  afternoon: {
    greeting: 'Good Afternoon',
    vars: {
      ...DAY,
      '--bg-a': '#c6deeb', '--bg-b': '#f3e7c9', '--bg-c': '#e6cc9a',
      '--glow-a': 'rgba(240,190,80,0.28)', '--glow-b': 'rgba(120,160,190,0.14)',
      '--sun-core': '#fbd166', '--sun-glow': 'rgba(252,205,100,0.5)', '--star': '#fff7e0',
    },
  },
  evening: {
    greeting: 'Good Evening',
    vars: {
      ...DAY,
      '--ink': '#38200f', '--ink-soft': '#5a3f28', '--ink-faint': '#72573f',
      '--bg-a': '#f1cf9f', '--bg-b': '#eabd8c', '--bg-c': '#c99872',
      '--surface': 'rgba(255,246,228,0.6)',
      '--glow-a': 'rgba(240,150,60,0.34)', '--glow-b': 'rgba(181,69,45,0.16)',
      '--sun-core': '#f39a45', '--sun-glow': 'rgba(240,130,60,0.5)', '--star': '#fff3d6',
    },
  },
  night: {
    greeting: 'Hello, Night Owl',
    vars: {
      '--bg-a': '#17110c', '--bg-b': '#241a12', '--bg-c': '#33231a',
      '--ink': '#f3e6c9', '--ink-soft': '#d2bf9a', '--ink-faint': '#a48f6b',
      '--accent': '#e0704f', '--accent-2': '#e3b04b', '--accent-3': '#9cbf7e', '--on-accent': '#2a1a0e',
      '--surface': 'rgba(255,236,200,0.07)', '--veil': 'rgba(227,176,75,0.28)', '--chip': 'rgba(255,236,200,0.09)',
      '--glow-a': 'rgba(227,176,75,0.12)', '--glow-b': 'rgba(224,112,79,0.10)',
      '--bird': 'transparent', '--logo-filter': 'invert(1)', '--sun-core': 'transparent', '--sun-glow': 'transparent', '--star': '#fef3c7',
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
