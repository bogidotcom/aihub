import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { ThemeFrame } from '../theme.jsx'
import { useI18n, LangSwitcher } from '../i18n.jsx'
import { Logo } from './parts.jsx'

function SiteNav() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const home = pathname === '/'
  const close = () => setMenuOpen(false)
  const linkCls = 'text-ink-soft hover:text-ink transition-colors duration-200 text-sm whitespace-nowrap'
  const pageCls = ({ isActive }) => `${linkCls} ${isActive ? '!text-accent font-semibold' : ''}`
  const section = (id, label) => (home
    ? <a key={id} href={`#${id}`} className={linkCls} onClick={close}>{label}</a>
    : <Link key={id} to={`/#${id}`} className={linkCls} onClick={close}>{label}</Link>)

  return (
    <nav className="glass sticky top-0 z-50 rounded-none border-x-0 border-t-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Logo to={home ? '#home' : '/'} />

          <div className="hidden md:flex items-center gap-5">
            {section('ideas', t('nav.ideas'))}
            <NavLink to="/app/therm" className={pageCls} onClick={close}>{t('nav.therm')}</NavLink>
            <NavLink to="/blog" className={pageCls} onClick={close}>{t('nav.blog')}</NavLink>
            {section('contact', t('nav.contact'))}
            <LangSwitcher />
          </div>

          <div className="md:hidden flex items-center gap-3">
            <LangSwitcher />
            <button className="p-2 -mr-2 text-ink" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1 [&_a]:block [&_a]:px-4 [&_a]:py-2 [&_a]:rounded-lg [&_a:hover]:bg-chip">
            {section('ideas', t('nav.ideas'))}
            <NavLink to="/app/therm" className={pageCls} onClick={close}>{t('nav.therm')}</NavLink>
            <NavLink to="/blog" className={pageCls} onClick={close}>{t('nav.blog')}</NavLink>
            {section('contact', t('nav.contact'))}
          </div>
        )}
      </div>
    </nav>
  )
}

function SiteFooter() {
  const { t } = useI18n()
  const cols = [
    { title: t('footer.explore'), links: [[t('nav.ideas'), '/#ideas'], [t('nav.therm'), '/app/therm'], [t('nav.blog'), '/blog'], [t('nav.contact'), '/#contact']] },
    { title: t('footer.resources'), links: [['Colosseum World\'s Fair', 'https://colosseum.com/worldsfair'], ['DAI Miner — iamai.kg', 'https://iamai.kg'], ['Cyrene — cyreneai.com', 'https://cyreneai.com']] },
    { title: t('footer.connect'), links: [['Telegram Group', 'https://t.me/iamaihub'], ['X', 'https://x.com/iamaihub'], ['Telegram', 'https://t.me/iamaihubbot']] },
  ]
  return (
    <footer className="relative border-t border-veil py-12 px-4 mt-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <Logo className="mb-4" textClassName="text-lg" to="/" />
            <p className="text-ink-faint text-sm">{t('footer.tagline')}</p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold mb-4 text-ink">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    {to.startsWith('http')
                      ? <a href={to} className="text-ink-faint hover:text-ink text-sm transition-colors" target="_blank" rel="noreferrer">{label}</a>
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
  )
}

export default function SiteLayout() {
  return (
    <ThemeFrame parallax>
      <SiteNav />
      <Outlet />
      <SiteFooter />
    </ThemeFrame>
  )
}
