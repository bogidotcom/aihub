import { Menu, X, ArrowRight, Code2, Users, Leaf, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClock, ThemeFrame } from '../theme.jsx'
import { Reveal, Glass, Collage, GradBtn, Field } from '../ui.jsx'
import { useI18n, LangSwitcher } from '../i18n.jsx'
import { api } from '../api.js'
import { media } from '../media.js'

const SECTIONS = [
  {
    id: 'events', index: '01', label: 'events', icon: Users, to: '/app/events',
    photos: [
      { src: media('photos/events-network.jpg'), label: 'Network & Learn', cls: 'row-span-2', tilt: '-1.5deg' },
      { src: media('photos/events-build.jpg'), label: 'Build Together', tilt: '1.2deg' },
      { src: media('photos/events-ideas.jpg'), label: 'Share Ideas', tilt: '2deg' },
      { src: media('photos/events-dinner.jpg'), label: 'Community Spirit', cls: 'col-span-2', tilt: '-0.8deg' },
    ],
  },
  {
    id: 'classes', index: '02', label: 'vibe-coding', icon: Code2, to: '/app/learn',
    photos: [
      { src: media('photos/classes-flow.jpg'), label: 'Flow State Coding', cls: 'col-span-2', tilt: '1deg' },
      { src: media('photos/classes-pair.jpg'), label: 'Collaborative Learning', tilt: '-1.8deg' },
      { src: media('photos/classes-showcase.jpg'), label: 'Showcase Projects', tilt: '1.5deg' },
      { src: media('photos/classes-ai.jpg'), label: 'AI Integration', cls: 'col-span-2', tilt: '-0.7deg' },
    ],
  },
  {
    id: 'development', index: '03', label: 'development', icon: Zap, to: '/app/work',
    photos: [
      { src: media('photos/dev-space.jpg'), label: 'Creative Space', cls: 'row-span-2', tilt: '1.4deg' },
      { src: media('photos/dev-strategy.jpg'), label: 'Strategy & Design', tilt: '-1.2deg' },
      { src: media('photos/dev-tech.jpg'), label: 'Tech Innovation', tilt: '2deg' },
      { src: media('photos/dev-launch.jpg'), label: 'Launch & Scale', cls: 'col-span-2', tilt: '-1deg' },
    ],
  },
]

function ContactForm() {
  const { t } = useI18n()
  const [form, setForm] = useState({ name: '', contact: '', subject: '', message: '' })
  const [state, setState] = useState('idle')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setState('sending')
    try {
      await api('/contact', { method: 'POST', body: { name: form.name, contact: form.contact, message: `${form.subject ? form.subject + '\n\n' : ''}${form.message}`, topic: 'landing' } })
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
  const [menuOpen, setMenuOpen] = useState(false)
  const { phase, hhmm } = useClock()
  const { t } = useI18n()

  const navigation = [
    { name: t('nav.home'), href: '#home' },
    { name: t('nav.events'), href: '#events' },
    { name: t('nav.vibecoding'), href: '#classes' },
    { name: t('nav.development'), href: '#development' },
    { name: t('nav.contact'), href: '#contact' },
  ]

  return (
    <ThemeFrame parallax>
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 rounded-none border-x-0 border-t-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="#home" className="flex items-center gap-2">
              <Leaf className="w-7 h-7 text-accent" />
              <span className="text-xl font-bold tracking-tight text-ink">AIHub</span>
            </a>

            <div className="hidden md:flex items-center gap-6">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} className="text-ink-soft hover:text-ink transition-colors duration-200 text-sm">
                  {item.name}
                </a>
              ))}
              <Link to="/blog" className="text-ink-soft hover:text-ink transition-colors duration-200 text-sm">{t('nav.blog')}</Link>
              <LangSwitcher />
              <GradBtn as={Link} to="/app" className="!px-4 !py-2 text-sm">{t('nav.openApp')}</GradBtn>
            </div>

            <div className="md:hidden flex items-center gap-3">
              <LangSwitcher />
              <button className="p-2 -mr-2 text-ink" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="md:hidden pb-4 space-y-1">
              {navigation.map((item) => (
                <a key={item.href} href={item.href}
                  className="block px-4 py-2 text-ink-soft hover:text-ink hover:bg-chip rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}>
                  {item.name}
                </a>
              ))}
              <Link to="/blog" className="block px-4 py-2 text-ink-soft hover:text-ink hover:bg-chip rounded-lg transition-colors" onClick={() => setMenuOpen(false)}>{t('nav.blog')}</Link>
              <Link to="/app" className="block px-4 py-2 font-semibold text-accent hover:bg-chip rounded-lg transition-colors" onClick={() => setMenuOpen(false)}>{t('nav.openApp')} →</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="relative min-h-[92vh] flex items-center px-4 py-20">
        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-[1.2fr_1fr] gap-12 items-center relative z-10">
          <div className="space-y-8">
            <Reveal className="space-y-5">
              <p className="font-mono text-xs md:text-sm tracking-[0.25em] uppercase text-ink-faint">
                <span className="text-accent">//</span> {hhmm} — {t(`greet.${phase}`)}, {t('hero.explorer')}
              </p>
              <h1 className="font-bold leading-[0.95] tracking-tighter text-[clamp(3rem,9vw,7rem)]">
                <span className="block type-soft text-accent">{t('hero.l1')}</span>
                <span className="block type-soft text-accent-2">{t('hero.l2')}</span>
                <span className="block type-soft text-accent-3">{t('hero.l3')}</span>
              </h1>
              <p className="text-lg md:text-xl text-ink-soft leading-relaxed max-w-lg font-light">
                {t('hero.sub')}
              </p>
            </Reveal>

            <Reveal delay={150} className="flex flex-col sm:flex-row gap-4 pt-2">
              <GradBtn as={Link} to="/app" className="group px-8 py-4">
                {t('hero.explore')} <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </GradBtn>
              <a href="#contact" className="px-8 py-4 text-center font-semibold rounded-xl text-ink border border-veil hover:bg-chip transition-colors duration-300">
                {t('hero.learnMore')}
              </a>
            </Reveal>
          </div>

          <Reveal delay={250} className="relative h-96 md:h-[28rem]">
            <Glass className="absolute inset-0 rounded-3xl shadow-2xl">
              <img src={media('photos/hero-hub.jpg')} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="relative h-full flex flex-col items-center justify-end gap-2 p-8 pb-12">
                <p className="text-2xl font-bold text-center leading-tight text-white">{t('hero.cardTitle')}</p>
                <p className="text-white/80 text-sm text-center max-w-xs">{t('hero.cardSub')}</p>
                <p className="font-mono text-[11px] text-white/65 absolute bottom-5 left-6">{t('hero.fig')}</p>
              </div>
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* Full-screen sections */}
      {SECTIONS.map((s, i) => {
        const sub = t(`land.${s.id}.sub`)
        return (
          <section key={s.id} id={s.id} className="relative min-h-screen flex items-center py-24 px-4">
            <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                <Reveal className="space-y-6">
                  <p className="font-mono text-xs tracking-[0.3em] uppercase text-ink-faint flex items-center gap-3">
                    <s.icon className="w-4 h-4 text-accent" />
                    {s.index} <span className="text-accent">/</span> {s.label}
                  </p>
                  <h2 className="text-liquid text-5xl md:text-6xl font-bold tracking-tight">{t(`land.${s.id}.title`)}</h2>
                  {sub && <p className="text-lg text-ink-soft max-w-lg">{sub}</p>}
                  <ul className="space-y-3 pt-2">
                    {t(`land.${s.id}.points`).map((point) => (
                      <li key={point} className="flex items-center gap-3 text-ink-soft">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4">
                    <GradBtn as={Link} to={s.to} className="group px-7 py-3.5">
                      {t(`land.${s.id}.cta`)} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </GradBtn>
                  </div>
                </Reveal>
              </div>
              <Reveal delay={150} className={i % 2 === 1 ? 'md:order-1' : ''}>
                <Collage photos={s.photos} />
              </Reveal>
            </div>
          </section>
        )
      })}

      {/* Contact */}
      <section id="contact" className="relative py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <Glass className="rounded-3xl p-8 md:p-12 space-y-8">
              <div className="text-center space-y-3">
                <p className="font-mono text-xs tracking-[0.3em] uppercase text-ink-faint">
                  05 <span className="text-accent">/</span> {t('contact.label')}
                </p>
                <h2 className="text-liquid text-4xl md:text-5xl font-bold tracking-tight">{t('contact.title')}</h2>
                <p className="text-ink-soft">{t('contact.sub')}</p>
              </div>
              <ContactForm />
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-veil py-12 px-4 mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-6 h-6 text-accent" />
                <span className="text-lg font-bold text-ink">AIHub</span>
              </div>
              <p className="text-ink-faint text-sm">{t('footer.tagline')}</p>
            </div>
            {[
              { title: t('footer.learn'), links: [[t('nav.vibecoding'), '/app/learn'], [t('nav.events'), '/app/events']] },
              { title: t('footer.business'), links: [[t('nav.development'), '/app/work'], [t('footer.gifts'), '/app/gifts'], [t('nav.blog'), '/blog']] },
              { title: t('footer.connect'), links: [['Telegram', 'https://t.me/iamaihubbot'], ['Instagram', '#'], ['LinkedIn', '#']] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold mb-4 text-ink">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(([label, to]) => (
                    <li key={label}>
                      {to.startsWith('http') || to === '#'
                        ? <a href={to} className="text-ink-faint hover:text-ink text-sm transition-colors" target={to === '#' ? undefined : '_blank'} rel="noreferrer">{label}</a>
                        : <Link to={to} className="text-ink-faint hover:text-ink text-sm transition-colors">{label}</Link>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-veil pt-8">
            <p className="text-center font-mono text-ink-faint text-xs">{t('footer.rights')}</p>
          </div>
        </div>
      </footer>
    </ThemeFrame>
  )
}
