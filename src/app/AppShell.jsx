import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { GraduationCap, Briefcase, BookOpen, CalendarDays, Leaf, Gift, Megaphone, Calendar } from 'lucide-react'
import { ThemeFrame, useClock } from '../theme.jsx'
import { useSession } from '../session.jsx'
import { isTelegram, openTelegramLink } from '../telegram.js'
import { Modal, GradBtn } from '../ui.jsx'
import { useI18n, LangSwitcher } from '../i18n.jsx'
import Broadcast from './Broadcast.jsx'
import EventsAdmin from './EventsAdmin.jsx'

const TABS = [
  { to: '/app/learn', icon: GraduationCap, key: 'learn' },
  { to: '/app/work', icon: Briefcase, key: 'work' },
  { to: '/app/blog', icon: BookOpen, key: 'blog' },
  { to: '/app/events', icon: CalendarDays, key: 'events' },
]

export function LoginGate({ children, prompt }) {
  const { user, ready } = useSession()
  if (!ready) return null
  if (user) return children
  return <LoginCard prompt={prompt} />
}

export function LoginCard({ prompt }) {
  const { t } = useI18n()
  const { config, loginWidget } = useSession()
  const ref = useRef(null)
  const botName = config?.bot_username

  useEffect(() => {
    if (!botName || !ref.current || isTelegram()) return
    window.onTelegramAuth = (user) => loginWidget(user).catch(() => alert('Login failed'))
    const s = document.createElement('script')
    s.src = 'https://telegram.org/js/telegram-widget.js?22'
    s.async = true
    s.setAttribute('data-telegram-login', botName)
    s.setAttribute('data-size', 'large')
    s.setAttribute('data-radius', '12')
    s.setAttribute('data-onauth', 'onTelegramAuth(user)')
    s.setAttribute('data-request-access', 'write')
    ref.current.replaceChildren(s)
  }, [botName, loginWidget])

  return (
    <div className="text-center space-y-4 max-w-sm mx-auto">
      <p className="text-4xl">👋</p>
      <p className="text-ink font-semibold">{prompt || t('shell.loginPrompt')}</p>
      <div ref={ref} className="flex justify-center min-h-12" />
      {botName && (
        <button onClick={() => openTelegramLink(`https://t.me/${botName}`)} className="text-sm text-accent cursor-pointer">
          {t('shell.openBot', { bot: botName })}
        </button>
      )}
    </div>
  )
}

export default function AppShell() {
  const { phase, hhmm } = useClock()
  const { t } = useI18n()
  const { user, ready } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [eventsAdminOpen, setEventsAdminOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => { if (user) setLoginOpen(false) }, [user])

  const avatar = user?.photo_url
    ? <img src={user.photo_url} alt="" className="w-9 h-9 rounded-full border border-veil" />
    : <span className="w-9 h-9 rounded-full bg-chip border border-veil flex items-center justify-center text-sm font-bold text-accent">{(user?.first_name || '?')[0]}</span>

  return (
    <ThemeFrame>
      {/* Desktop sidebar (Facebook-style) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 z-50 flex-col glass rounded-none border-y-0 border-l-0 p-5">
        <Link to="/" className="flex items-center gap-2.5 px-2 mb-1">
          <Leaf className="w-7 h-7 text-accent" />
          <span className="text-xl font-bold text-ink">AIHub</span>
        </Link>
        <p className="font-mono text-[11px] text-ink-faint px-2 mb-6">
          {hhmm} — {t(`greet.${phase}`)}
        </p>

        <nav className="flex flex-col gap-1">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-[15px] transition-colors ${isActive ? 'bg-chip text-accent font-semibold' : 'text-ink-soft hover:bg-chip hover:text-ink'}`}>
              <tab.icon className="w-5 h-5" />
              {t(`tabs.${tab.key}`)}
            </NavLink>
          ))}
          <NavLink to="/app/gifts"
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-xl text-[15px] transition-colors ${isActive ? 'bg-chip text-accent font-semibold' : 'text-ink-soft hover:bg-chip hover:text-ink'}`}>
            <Gift className="w-5 h-5" />
            {t('tabs.gifts')}
          </NavLink>
        </nav>

        <div className="mt-auto space-y-3">
          <LangSwitcher className="mx-3" />
          {ready && (user ? (
            <button onClick={() => setProfileOpen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-chip transition-colors cursor-pointer text-left">
              {avatar}
              <span className="min-w-0">
                <span className="block text-ink text-sm font-semibold truncate">{user.first_name} {user.last_name}</span>
                {user.username && <span className="block font-mono text-[11px] text-ink-faint truncate">@{user.username}</span>}
              </span>
            </button>
          ) : (
            <button onClick={() => setLoginOpen(true)} className="w-full mx-0 px-3 py-2.5 rounded-xl bg-chip text-accent text-sm font-semibold hover:bg-veil transition-colors cursor-pointer">
              {t('shell.login')}
            </button>
          ))}
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden glass sticky top-0 z-50 rounded-none border-x-0 border-t-0">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-accent" />
            <span className="font-bold text-ink">AIHub</span>
          </Link>
          <p className="font-mono text-[11px] text-ink-faint hidden sm:block">
            {hhmm} — {t(`greet.${phase}`)}{user ? `, ${user.first_name}` : ''}
          </p>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Link to="/app/gifts" aria-label="Gift cards" className="p-2 text-ink-soft hover:text-accent transition-colors"><Gift className="w-5 h-5" /></Link>
            {ready && (user ? (
              <button onClick={() => setProfileOpen(true)} className="cursor-pointer">
                {avatar}
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="text-sm font-semibold text-accent cursor-pointer">
                {t('shell.login')}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content — offset right of the sidebar on desktop */}
      <div className="md:pl-64">
        <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-28 md:py-10 md:pb-16 lg:max-w-3xl">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar — pinned to the viewport bottom */}
      <nav className="md:hidden glass fixed bottom-0 inset-x-0 z-50 rounded-none border-x-0 border-b-0 tabbar">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors ${isActive ? 'text-accent font-semibold' : 'text-ink-faint hover:text-ink'}`}>
              <tab.icon className="w-5 h-5" />
              {t(`tabs.${tab.key}`)}
            </NavLink>
          ))}
        </div>
      </nav>

      <Modal open={loginOpen} onClose={() => setLoginOpen(false)}>
        <LoginCard prompt={t('shell.loginPrompt')} />
      </Modal>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} user={user} onBroadcast={() => { setProfileOpen(false); setBroadcastOpen(true) }} onEventsAdmin={() => { setProfileOpen(false); setEventsAdminOpen(true) }} />
      {broadcastOpen && <Broadcast user={user} onClose={() => setBroadcastOpen(false)} />}
      {eventsAdminOpen && <EventsAdmin onClose={() => setEventsAdminOpen(false)} />}
    </ThemeFrame>
  )
}

function ProfileModal({ open, onClose, user, onBroadcast, onEventsAdmin }) {
  const { t } = useI18n()
  const { logout } = useSession()
  if (!user) return null
  const isBogidotcom = user.username?.toLowerCase() === 'bogidotcom'
  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center space-y-4">
        {user.photo_url && <img src={user.photo_url} alt="" className="w-16 h-16 rounded-full mx-auto border border-veil" />}
        <div>
          <p className="text-ink font-bold text-lg">{user.first_name} {user.last_name}</p>
          {user.username && <p className="text-ink-faint text-sm font-mono">@{user.username}</p>}
        </div>
        <div className="grid gap-2 text-left">
          <GradBtn as={Link} to="/app/events" onClick={onClose} className="!py-2.5 text-sm">{t('shell.myClasses')}</GradBtn>
          <Link to="/app/gifts" onClick={onClose} className="bg-chip border border-veil rounded-lg px-4 py-3 text-ink text-sm hover:bg-veil transition-colors">{t('shell.myGifts')}</Link>
          {isBogidotcom && (
            <>
              <button onClick={onEventsAdmin} className="bg-accent/10 border border-accent rounded-lg px-4 py-3 text-accent text-sm hover:bg-accent/20 transition-colors flex items-center gap-2 justify-center font-semibold cursor-pointer">
                <Calendar className="w-4 h-4" /> Manage Events
              </button>
              <button onClick={onBroadcast} className="bg-accent/10 border border-accent rounded-lg px-4 py-3 text-accent text-sm hover:bg-accent/20 transition-colors flex items-center gap-2 justify-center font-semibold cursor-pointer">
                <Megaphone className="w-4 h-4" /> Broadcast
              </button>
            </>
          )}
        </div>
        {!isTelegram() && (
          <GradBtn onClick={() => { logout(); onClose() }} className="w-full !py-2.5">{t('shell.logout')}</GradBtn>
        )}
      </div>
    </Modal>
  )
}
