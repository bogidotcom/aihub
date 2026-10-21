import { ArrowRight, Zap, ExternalLink, CalendarDays, Trophy, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Reveal, Glass, GradBtn, Field } from '../ui.jsx'
import { useI18n } from '../i18n.jsx'
import { api } from '../api.js'
import { BLOCKCHAINS } from '../blockchains.js'


function ContactForm() {
  const { t } = useI18n()
  const [form, setForm] = useState({ name: '', contact: '', subject: '', message: '' })
  const [state, setState] = useState('idle')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setState('sending')
    try {
      await api('/contact', { method: 'POST', body: { name: form.name, contact: form.contact, message: `${form.subject ? form.subject + '\n\n' : ''}${form.message}`, topic: 'thermopolium' } })
      setState('sent')
    } catch { setState('error') }
  }
  if (state === 'sent') {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-4xl">🕊️</p>
        <p className="text-ink font-semibold text-lg">{t('contact.sentTitle')}</p>
        <p className="text-ink-soft text-sm">{t('contact.sentSub')}</p>
      </div>
    )
  }
  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid md:grid-cols-2 gap-4">
        <Field type="text" placeholder={t('contact.name')} value={form.name} onChange={set('name')} />
        <Field type="text" placeholder={t('contact.emailTg')} value={form.contact} onChange={set('contact')} required />
      </div>
      <Field type="text" placeholder={t('contact.subject')} value={form.subject} onChange={set('subject')} />
      <textarea placeholder={t('contact.message')} rows="5" value={form.message} onChange={set('message')} required
        className="w-full px-4 py-3 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all placeholder:text-ink-faint resize-none text-ink" />
      <GradBtn type="submit" className="w-full py-3.5" disabled={state === 'sending'}>
        {state === 'sending' ? t('contact.sending') : t('contact.send')}
      </GradBtn>
      {state === 'error' && <p className="text-center text-sm text-accent">{t('contact.error')}</p>}
    </form>
  )
}

export default function Landing() {
  const { t } = useI18n()
  const { hash } = useLocation()

  // Arriving from another page via /#ideas: the section mounts after the browser's own fragment scroll.
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 60)
  }, [hash])

  return (
    <>
      {/* Hero */}
      <section id="home" className="relative flex items-center px-4 py-16 md:py-28 overflow-hidden">
        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-[1.2fr_1fr] gap-10 md:gap-12 items-center relative z-10">
          <div className="space-y-8">
            <Reveal className="space-y-5">
              <h1 className="font-bold leading-[1.02] text-[clamp(2.6rem,7.2vw,5.6rem)]">
                <span className="block type-soft text-accent">{t('hero.title')}</span>
              </h1>
              <p className="text-lg md:text-xl text-ink-soft leading-relaxed max-w-lg ">
                {t('hero.sub')}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex items-center gap-2 font-mono text-sm text-ink-faint">
                  <CalendarDays className="w-4 h-4 text-accent" /> {t('hero.dates')}
                </p>
                <p className="flex items-center gap-2 font-mono text-xs text-accent bg-chip border border-veil rounded-sm px-3 py-1.5">
                  <Trophy className="w-3.5 h-3.5" /> {t('hero.reward')}
                </p>
              </div>
            </Reveal>

            <Reveal delay={150} className="flex flex-col sm:flex-row gap-4 pt-2">
              <GradBtn as={Link} to="/app/event/thermopolium" className="group px-8 py-4">
                {t('hero.ctaSubmit')} <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </GradBtn>
              <a href="https://iamai.kg/docs/#jobs" target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-center font-semibold rounded-xl text-ink border border-veil hover:bg-chip transition-colors duration-300">
                {t('hero.ctaColosseum')} <ExternalLink className="w-4 h-4" />
              </a>
            </Reveal>
          </div>

          <Reveal delay={250}>
            <Glass className="rounded-3xl p-8 md:p-10 space-y-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-faint">1 therm</p>
              <p className="font-display font-bold text-ink text-5xl md:text-6xl leading-none">29.3 kWh</p>
              <p className="text-ink-soft">105,480,400 J</p>
              <div className="border-t border-veil pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-faint">1 $THERM</p>
                <p className="font-display font-bold text-accent text-3xl">100,000,000</p>
                <p className="text-ink-faint text-sm">AI tokens · Solana x402</p>
              </div>
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* About / analogy */}
      <section className="relative flex items-center py-16 md:py-24 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto relative w-full">
          <Reveal>
            <Glass className="rounded-3xl p-8 md:p-12 space-y-8">
              <div className="text-center space-y-3">
                <h2 className="text-liquid text-3xl md:text-5xl font-bold tracking-tight">{t('about.title')}</h2>
                <p className="text-ink-soft max-w-2xl mx-auto">{t('about.body')}</p>
              </div>

              <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-6 items-center">
                <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-chip border border-veil">
                  <Zap className="w-9 h-9 text-accent" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{t('about.mainLabel')}</p>
                  <p className="text-xl font-bold text-ink">{t('about.mainDesc')}</p>
                </div>

                <span className="hidden sm:block text-3xl font-bold text-accent-2 select-none">→</span>

                <div className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-chip border border-veil">
                  <Zap className="w-9 h-9 text-accent-2" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{t('about.crossLabel')}</p>
                  <p className="text-xl font-bold text-ink">{t('about.crossDesc')}</p>
                </div>
              </div>
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* Ideas that fit */}
      <section id="ideas" className="relative flex items-center py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto space-y-10 w-full">
          <Reveal className="text-center space-y-3">
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-ink-faint">01 <span className="text-accent">/</span> {t('nav.ideas')}</p>
            <h2 className="text-liquid text-3xl md:text-5xl font-bold tracking-tight">{t('ideas.title')}</h2>
            <p className="text-ink-soft max-w-xl mx-auto">{t('ideas.sub')}</p>
          </Reveal>

          <div className="grid gap-6">
            <Reveal delay={100} className="grid sm:grid-cols-2 gap-4 content-start">
              {t('ideas.items').map((idea, i) => (
                <div key={idea} className="flex items-start gap-4 p-5 rounded-2xl bg-chip border border-veil">
                  <span className="font-mono text-xs text-accent-2 shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <p className="text-ink-soft text-sm leading-relaxed">{idea}</p>
                </div>
              ))}
            </Reveal>
          </div>

          <Reveal delay={150}>
            <Glass className="rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-ink">{t('ideas.chainsTitle')}</h3>
              </div>
              <p className="text-ink-faint text-sm">{t('ideas.chainsNote')}</p>
              <div className="flex flex-wrap gap-2">
                {BLOCKCHAINS.map(b => (
                  <span key={b} className="font-mono text-xs text-ink-soft bg-chip border border-veil rounded-sm px-3 py-1.5">{b}</span>
                ))}
              </div>
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* Rules */}
      <section id="rules" className="relative flex items-center py-16 md:py-24 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-10 relative w-full">
          <Reveal className="text-center space-y-3">
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-ink-faint">02 <span className="text-accent">/</span> {t('nav.rules')}</p>
            <h2 className="text-liquid text-3xl md:text-5xl font-bold tracking-tight">{t('rules.title')}</h2>
            <p className="text-ink-soft max-w-xl mx-auto">{t('rules.sub')}</p>
          </Reveal>

          <Reveal delay={100} className="grid md:grid-cols-2 gap-6">
            <Glass className="rounded-2xl p-6 md:p-8 space-y-3">
              <h3 className="text-lg font-bold text-ink">{t('rules.daiTitle')}</h3>
              <p className="text-ink-soft text-sm leading-relaxed">{t('rules.daiBody')}</p>
              <a href="https://iamai.kg" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-accent text-sm font-semibold">
                iamai.kg <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Glass>
            <Glass className="rounded-2xl p-6 md:p-8 space-y-3">
              <h3 className="text-lg font-bold text-ink">{t('rules.judgingTitle')}</h3>
              <p className="text-ink-soft text-sm leading-relaxed">{t('rules.judgingBody')}</p>
            </Glass>
          </Reveal>

          <Reveal delay={150}>
            <Glass className="rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-ink mb-4">{t('rules.termsTitle')}</h3>
              <ul className="space-y-2.5">
                {t('rules.terms').map((term) => (
                  <li key={term} className="flex items-start gap-3 text-ink-faint text-sm leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" /> {term}
                  </li>
                ))}
              </ul>
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* Event / submit */}
      <section id="event" className="relative flex items-center py-16 md:py-24 px-4 overflow-hidden">
        <div className="max-w-3xl mx-auto relative w-full">
          <Reveal>
            <Glass className="rounded-3xl p-8 md:p-12 text-center space-y-6">
              <p className="font-mono text-xs tracking-[0.3em] uppercase text-ink-faint">03 <span className="text-accent">/</span> {t('nav.event')}</p>
              <h2 className="text-liquid text-3xl md:text-5xl font-bold tracking-tight">{t('event.title')}</h2>
              <p className="text-ink-soft max-w-lg mx-auto">{t('event.sub')}</p>
              <p className="flex items-center justify-center gap-2 font-mono text-sm text-ink-faint">
                <CalendarDays className="w-4 h-4 text-accent" /> {t('event.dates')}
              </p>
              <div className="flex flex-col items-center gap-2 max-w-md mx-auto">
                <p className="flex items-center gap-2 font-mono text-xs text-accent bg-chip border border-veil rounded-sm px-3 py-1.5">
                  <Trophy className="w-3.5 h-3.5 shrink-0" /> {t('event.reward')}
                </p>
                <p className="text-ink-faint text-xs">{t('event.chains')}</p>
              </div>
              <div className="pt-2">
                <GradBtn as={Link} to="/app/event/thermopolium" className="group px-8 py-4">
                  {t('event.cta')} <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </GradBtn>
                <p className="font-mono text-[11px] text-ink-faint mt-3">{t('event.ctaSub')}</p>
              </div>
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative flex items-center py-16 md:py-24 px-4 overflow-hidden">
        <div className="max-w-2xl mx-auto relative w-full">
          <Reveal>
            <Glass className="rounded-3xl p-8 md:p-12 space-y-8">
              <div className="text-center space-y-3">
                <p className="font-mono text-xs tracking-[0.3em] uppercase text-ink-faint">
                  04 <span className="text-accent">/</span> {t('contact.label')}
                </p>
                <h2 className="text-liquid text-4xl md:text-5xl font-bold tracking-tight">{t('contact.title')}</h2>
                <p className="text-ink-soft">{t('contact.sub')}</p>
              </div>
              <ContactForm />
            </Glass>
          </Reveal>
        </div>
      </section>
    </>
  )
}
