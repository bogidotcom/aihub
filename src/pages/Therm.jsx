import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Copy, Check, Vote, MessagesSquare, KeyRound, Gift, Zap, Snowflake, Bot, Flame } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Reveal, Glass, GradBtn } from '../ui.jsx'
import { useI18n } from '../i18n.jsx'
import { media } from '../media.js'
import { Backdrop } from '../site/parts.jsx'
import Top10 from '../site/Top10.jsx'
import { useThermConfig } from '../site/therm.js'
import { useCompose } from '../site/Compose.jsx'

const PURPOSE_ART = [
  { icon: Vote, photo: 'photos/events-network.jpg' },
  { icon: MessagesSquare, photo: 'photos/classes-ai.jpg' },
  { icon: KeyRound, photo: 'photos/cover-opening.jpg' },
  { icon: Gift, photo: 'photos/events-dinner.jpg' },
]
const ROADMAP_STATE = ['done', 'done', 'live', 'next', 'next', 'next', 'next', 'tba']

function CopyRow({ label, value }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(value).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1400) }}
      className="w-full text-left bg-chip border border-veil rounded-lg px-4 py-2.5 hover:bg-veil transition-colors cursor-pointer">
      <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label} {ok ? <Check className="w-3.5 h-3.5 text-accent-3" /> : <Copy className="w-3.5 h-3.5" />}
      </span>
      <span className="block text-ink break-all text-sm font-mono">{value}</span>
    </button>
  )
}

export default function Therm() {
  const { t } = useI18n()
  const { hash } = useLocation()
  const cfg = useThermConfig()
  const compose = useCompose()
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 60)
  }, [hash])
  const purposes = t('therm.purposes')
  const rate = (cfg?.tokensPerTherm ?? 100_000_000).toLocaleString()

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center px-4 py-20 overflow-hidden">
        <Backdrop src="photos/dev-launch.jpg" opacity={0.2} />
        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-[1.25fr_1fr] gap-12 items-center relative z-10">
          <Reveal className="space-y-6">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-accent-2 bg-chip border border-veil rounded-full px-3 py-1.5">
              <Flame className="w-3.5 h-3.5" /> {t('therm.kicker')}
            </p>
            <h1 className="font-bold leading-[0.95] text-[clamp(3.2rem,12vw,8rem)]"><span className="block type-soft text-accent">$THERM</span></h1>
            <p className="text-lg md:text-xl text-ink-soft leading-relaxed max-w-xl">{t('therm.sub')}</p>
            <ul className="flex flex-wrap gap-2">
              {t('therm.facts').map(f => <li key={f} className="font-mono text-xs text-ink-soft bg-chip border border-veil rounded-full px-3 py-1.5">{f}</li>)}
            </ul>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <GradBtn onClick={compose.open} className="group px-8 py-4">{t('therm.ctaTalk')} <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" /></GradBtn>
              <Link to="/app/projects" className="inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold rounded-xl text-ink border border-veil hover:bg-chip transition-colors">{t('therm.ctaVote')}</Link>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <Glass className="rounded-3xl p-6 md:p-8 space-y-4">
              <p className="font-display font-bold text-ink text-lg">{t('therm.tokenCard')}</p>
              <CopyRow label={t('therm.ca')} value={cfg?.mint || t('therm.atLaunch')} />
              <CopyRow label={t('therm.treasury')} value={cfg?.treasury || t('therm.atLaunch')} />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-chip border border-veil rounded-lg p-3 text-center"><p className="font-display font-bold text-ink text-lg">Solana</p><p className="text-ink-faint text-xs">{t('therm.network')}</p></div>
                <div className="bg-chip border border-veil rounded-lg p-3 text-center"><p className="font-display font-bold text-ink text-lg">Cyrene</p><p className="text-ink-faint text-xs">{t('therm.launchVia')}</p></div>
              </div>
              <a href="https://cyreneai.com" target="_blank" rel="noreferrer" className="block text-center text-accent text-sm font-semibold">cyreneai.com ↗</a>
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* Top 10 */}
      <section id="top" className="relative min-h-screen flex items-center py-20 px-4">
        <div className="max-w-4xl mx-auto w-full space-y-10">
          <Reveal className="text-center space-y-3">
            <h2 className="text-liquid text-3xl md:text-5xl font-bold">{t('top.title')}</h2>
            <p className="text-ink-soft max-w-xl mx-auto">{t('top.subTherm')}</p>
          </Reveal>
          <Reveal delay={100}><Top10 /></Reveal>
        </div>
      </section>

      {/* Purposes — one full screen each */}
      {purposes.map((p, i) => {
        const Icon = PURPOSE_ART[i].icon
        const flip = i % 2 === 1
        return (
          <section key={p.title} className="relative min-h-screen flex items-center py-20 px-4 overflow-hidden">
            <Backdrop src={PURPOSE_ART[i].photo} opacity={0.12} />
            <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
              <Reveal className={`space-y-6 ${flip ? 'md:order-2' : ''}`}>
                <p className="font-mono text-xs tracking-[0.3em] uppercase text-ink-faint flex items-center gap-3">
                  <Icon className="w-4 h-4 text-accent" /> {String(i + 1).padStart(2, '0')} <span className="text-accent">/</span> {t('therm.purposeLabel')}
                  {p.tag && <span className="text-accent-2 border border-veil rounded-full px-2 py-0.5 tracking-widest">{p.tag}</span>}
                </p>
                <h2 className="text-liquid text-4xl md:text-6xl font-bold leading-tight">{p.title}</h2>
                <p className="text-lg text-ink-soft max-w-lg">{p.body}</p>
                <ul className="space-y-3 pt-1">
                  {p.points.map(pt => (
                    <li key={pt} className="flex items-start gap-3 text-ink-soft"><span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2.5" />{pt}</li>
                  ))}
                </ul>
                {i === 0 && <GradBtn as={Link} to="/app/projects" className="group px-7 py-3.5">{t('therm.ctaVote')} <ArrowRight className="w-4 h-4" /></GradBtn>}
                {i === 1 && (
                  <div className="flex flex-wrap gap-3">
                    <GradBtn onClick={compose.open} className="px-7 py-3.5">{t('therm.ctaTalk')}</GradBtn>
                    <Link to="/app/feed" className="inline-flex items-center gap-2 px-7 py-3.5 font-semibold rounded-xl text-ink border border-veil hover:bg-chip transition-colors">{t('nav.feed')} →</Link>
                  </div>
                )}
              </Reveal>

              <Reveal delay={150} className={flip ? 'md:order-1' : ''}>
                <div className="relative mx-auto w-full max-w-sm aspect-[3/4] overflow-hidden border border-veil shadow-2xl rounded-t-[999px] rounded-b-2xl">
                  <img src={media(PURPOSE_ART[i].photo)} alt="" className="absolute inset-0 w-full h-full object-cover tinted" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  {i === 1 && (
                    <div className="absolute inset-x-4 bottom-4 glass rounded-xl p-4 text-center">
                      <p className="font-display font-bold text-ink text-xl">1 $THERM</p>
                      <p className="text-ink-soft text-sm">= {rate} {t('compose.aiTokens')}</p>
                      <p className="text-ink-faint text-xs mt-1">≈ 100,000 {t('therm.qaCycles')}</p>
                    </div>
                  )}
                </div>
              </Reveal>
            </div>
          </section>
        )
      })}

      {/* Why THERM */}
      <section className="relative min-h-screen flex items-center py-20 px-4 overflow-hidden">
        <Backdrop src="photos/dev-tech.jpg" opacity={0.16} />
        <div className="max-w-5xl mx-auto w-full space-y-10 relative z-10">
          <Reveal className="text-center space-y-4">
            <h2 className="text-liquid text-4xl md:text-6xl font-bold">{t('therm.unitTitle')}</h2>
            <p className="text-lg text-ink-soft max-w-2xl mx-auto">{t('therm.unitBody')}</p>
          </Reveal>
          <Reveal delay={100}>
            <Glass className="rounded-3xl p-8 md:p-10 text-center">
              <Zap className="w-8 h-8 text-accent-2 mx-auto mb-2" />
              <p className="font-display font-bold text-ink text-5xl md:text-7xl">29.3 kWh</p>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-faint mt-2">= 1 therm</p>
            </Glass>
          </Reveal>
          <Reveal delay={150} className="grid md:grid-cols-2 gap-6">
            <Glass className="rounded-2xl p-6 md:p-8 space-y-3"><Snowflake className="w-7 h-7 text-accent-3" /><p className="text-ink text-lg">{t('therm.unit1')}</p></Glass>
            <Glass className="rounded-2xl p-6 md:p-8 space-y-3"><Bot className="w-7 h-7 text-accent" /><p className="text-ink text-lg">{t('therm.unit2')}</p></Glass>
          </Reveal>
          <p className="text-center font-display text-ink-soft tracking-wide">{t('therm.unitClose')}</p>
        </div>
      </section>

      {/* Roadmap */}
      <section className="relative min-h-screen flex items-center py-20 px-4">
        <div className="max-w-3xl mx-auto w-full space-y-10">
          <Reveal className="text-center"><h2 className="text-liquid text-4xl md:text-6xl font-bold">{t('therm.roadmapTitle')}</h2></Reveal>
          <ol className="relative border-l-2 border-veil ml-4 space-y-6">
            {t('therm.roadmap').map((step, i) => {
              const st = ROADMAP_STATE[i]
              return (
                <Reveal key={step} delay={i * 60} className="relative pl-8">
                  <span className={`absolute -left-[13px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold font-display
                    ${st === 'done' ? 'bg-[var(--accent-3)] border-[var(--accent-3)] text-white' : st === 'live' ? 'bg-[var(--accent)] border-[var(--accent)] text-white animate-pulse' : 'bg-[var(--bg-b)] border-veil text-ink-faint'}`}>
                    {st === 'done' ? '✓' : i + 1}
                  </span>
                  <p className="font-display font-bold text-ink text-lg md:text-xl">{step}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{t(`therm.state.${st}`)}</p>
                </Reveal>
              )
            })}
          </ol>
        </div>
      </section>
    </>
  )
}
