import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sunrise, Sunset, Gift } from 'lucide-react'
import { Glass, Reveal, Spinner, GradBtn, ChipBtn, Modal, Field } from '../ui.jsx'
import { api } from '../api.js'
import { useSession } from '../session.jsx'
import { LoginCard } from './AppShell.jsx'
import { useI18n } from '../i18n.jsx'

const SLOT_ICONS = { sunrise: Sunrise, sunset: Sunset }

function todayStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function PackageCard({ pkg, onBuy, busy, highlight }) {
  const { t } = useI18n()
  return (
    <Glass className={`rounded-xl p-5 text-center space-y-2 ${highlight ? 'ring-2 ring-[var(--accent)]' : ''}`}>
      <p className="text-3xl font-bold text-ink">{pkg.classes}</p>
      <p className="text-ink-soft text-sm">{t(`yoga.pkg.${pkg.key}`)}</p>
      <p className="text-accent font-semibold text-sm">{pkg.kgs.toLocaleString()} KGS</p>
      <p className="font-mono text-[11px] text-ink-faint">≈ {pkg.usdt} USDT</p>
      <GradBtn onClick={() => onBuy(pkg)} disabled={busy} className="w-full !py-2 text-sm">{t('yoga.buy')}</GradBtn>
    </Glass>
  )
}

export default function Yoga() {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      <h1 className="text-liquid text-3xl font-bold tracking-tight">{t('yoga.title')}</h1>
      <YogaInner />
    </div>
  )
}

function YogaInner() {
  const { t } = useI18n()
  const nav = useNavigate()
  const { user, ready, config } = useSession()
  const [state, setState] = useState(null)
  const [date, setDate] = useState(todayStr(1))
  const [slot, setSlot] = useState('sunrise')
  const [busy, setBusy] = useState(false)
  const [noClasses, setNoClasses] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [pickedPkg, setPickedPkg] = useState('p4')
  const [msg, setMsg] = useState('')
  const [redeem, setRedeem] = useState('')

  const load = useCallback(() => {
    if (user) api('/yoga/state').then(setState).catch(() => {})
  }, [user])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (user) setLoginOpen(false) }, [user])

  if (!ready) return <Spinner label="loading" />
  // guests browse everything; login is asked only when acting
  const guest = !user
  const view = user
    ? state
    : { classes_left: null, packages: [], bookings: [], catalog: config?.yoga_packages || [], slots: config?.yoga_slots || [] }
  if (!view) return <Spinner label="loading your yoga profile" />

  const needLogin = () => setLoginOpen(true)

  const book = async (payOnSpot = false) => {
    if (guest) return needLogin()
    setBusy(true); setMsg('')
    try {
      const d = await api('/yoga/book', { method: 'POST', body: { date, slot, pay_on_spot: payOnSpot } })
      setMsg(t('yoga.booked', { date, slot: slot === 'sunrise' ? `${t('yoga.sunrise')} 8 AM` : `${t('yoga.sunset')} 8 PM` }) + ' · ' + (payOnSpot ? t('yoga.paySpotTag') : t('yoga.classesLeftN', { n: d.classes_left })))
      setNoClasses(false)
      load()
    } catch (e) {
      if (e.data?.error === 'NO_CLASSES') setNoClasses(true)
      else if (e.data?.error === 'ALREADY_BOOKED') setMsg(t('yoga.alreadyBooked'))
      else setMsg(t('yoga.failed'))
    }
    setBusy(false)
  }

  const buyPackage = async (pkg) => {
    if (guest) return needLogin()
    setBusy(true)
    try {
      const d = await api('/checkout', { method: 'POST', body: { kind: 'yoga_package', package: pkg.key } })
      nav(`/app/invoice/${d.order.id}`)
    } catch { setMsg(t('yoga.failed')); setBusy(false) }
  }

  const doRedeem = async (e) => {
    e.preventDefault()
    if (guest) return needLogin()
    try {
      const d = await api('/yoga/redeem', { method: 'POST', body: { code: redeem } })
      setMsg(t('yoga.redeemed', { n: d.classes_added }))
      setRedeem(''); load()
    } catch (er) {
      setMsg(er.data?.error === 'ALREADY_REDEEMED' ? t('yoga.redeemedAlready') : t('yoga.badCode'))
    }
  }

  return (
    <div className="space-y-6">
      {/* balance */}
      <Glass className="rounded-2xl p-6 flex items-center justify-between">
        {guest ? (
          <>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">{t('yoga.yourClasses')}</p>
              <p className="text-ink font-semibold">{t('yoga.schedule')}</p>
            </div>
            <button onClick={needLogin} className="text-sm text-accent font-semibold cursor-pointer shrink-0">
              {t('yoga.loginSee')}
            </button>
          </>
        ) : (
          <>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">{t('yoga.classesLeft')}</p>
              <p className="text-4xl font-bold text-ink">{view.classes_left}</p>
            </div>
            <div className="text-right text-sm text-ink-soft">
              {t('yoga.pkgOf', { name: user.first_name })}
              {view.packages.filter(p => p.classes_left > 0).map(p => (
                <p key={p.id} className="font-mono text-[11px] text-ink-faint">{p.package_key}: {p.classes_left}/{p.classes_total}</p>
              ))}
            </div>
          </>
        )}
      </Glass>

      {/* booking */}
      <Reveal>
        <Glass className="rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-ink text-lg">{t('yoga.bookClass')}</h2>
          <Field type="date" min={todayStr()} value={date} onChange={e => setDate(e.target.value)}
            onClick={e => { try { e.currentTarget.showPicker() } catch { /* unsupported browser */ } }}
            className="cursor-pointer" />
          <div className="grid grid-cols-2 gap-3">
            {view.slots.map(s => {
              const Icon = SLOT_ICONS[s.key]
              const active = slot === s.key
              return (
                <button key={s.key} onClick={() => setSlot(s.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 transition-colors cursor-pointer ${active ? 'border-accent text-accent bg-chip' : 'border-veil text-ink-soft'}`}>
                  <Icon className="w-6 h-6" />
                  <span className="font-semibold text-sm">{t(`yoga.${s.key}`)}</span>
                  <span className="font-mono text-[11px] opacity-70">{s.time}</span>
                </button>
              )
            })}
          </div>
          <GradBtn onClick={() => book(false)} disabled={busy} className="w-full">{t('yoga.book')}</GradBtn>
          {msg && <p className="text-center text-sm text-ink-soft">{msg}</p>}
        </Glass>
      </Reveal>

      {/* upcoming */}
      {view.bookings.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-mono text-xs tracking-[0.25em] uppercase text-ink-faint">{t('yoga.upcoming')}</h2>
          {view.bookings.map(b => (
            <Glass key={b.id} className="rounded-xl px-5 py-3.5 flex items-center justify-between">
              <span className="text-ink text-sm font-semibold">{b.date} · {b.slot === 'sunrise' ? `☀️ ${t('yoga.sunrise')} 8 AM` : `🌇 ${t('yoga.sunset')} 8 PM`}</span>
              <span className="font-mono text-[11px] text-ink-faint">{b.pay_on_spot ? t('yoga.paySpot') : t('yoga.fromPackage')}</span>
            </Glass>
          ))}
        </div>
      )}

      {/* packages */}
      <div className="space-y-3">
        <h2 className="font-mono text-xs tracking-[0.25em] uppercase text-ink-faint">{t('yoga.packages')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {view.catalog.map(p => <PackageCard key={p.key} pkg={p} onBuy={buyPackage} busy={busy} />)}
        </div>
      </div>

      {/* redeem + gift */}
      <Glass className="rounded-2xl p-6 space-y-3">
        <p className="font-bold text-ink flex items-center gap-2"><Gift className="w-4 h-4 text-accent" /> {t('yoga.gifts')}</p>
        <form onSubmit={doRedeem} className="flex gap-2">
          <Field placeholder="GIFT-XXXXXXXX" value={redeem} onChange={e => setRedeem(e.target.value)} className="font-mono" />
          <ChipBtn type="submit" className="shrink-0">{t('yoga.redeem')}</ChipBtn>
        </form>
        <Link to="/app/gifts" className="block text-sm text-accent">{t('yoga.buyGiftLink')}</Link>
      </Glass>

      {/* login-before-purchase modal */}
      <Modal open={loginOpen} onClose={() => setLoginOpen(false)}>
        <LoginCard prompt={t('yoga.loginPrompt')} />
      </Modal>

      {/* no classes left modal */}
      <Modal open={noClasses} onClose={() => setNoClasses(false)}>
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-4xl">🧘</p>
            <h3 className="text-xl font-bold text-ink">{t('yoga.noLeft')}</h3>
            <p className="text-ink-soft text-sm">{t('yoga.noLeftSub')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {view.catalog.map(p => (
              <button key={p.key} onClick={() => setPickedPkg(p.key)}
                className={`rounded-xl border p-3 text-center transition-colors cursor-pointer ${pickedPkg === p.key ? 'border-accent bg-chip' : 'border-veil'}`}>
                <p className="font-bold text-ink">{p.classes} {p.classes === 1 ? t('yoga.cls1') : t('yoga.cls')}</p>
                <p className="text-accent text-sm font-semibold">{p.kgs.toLocaleString()} KGS</p>
                <p className="font-mono text-[10px] text-ink-faint">≈ {p.usdt} USDT</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <GradBtn onClick={() => buyPackage(view.catalog.find(p => p.key === pickedPkg))} disabled={busy}>{t('yoga.buy')}</GradBtn>
            <ChipBtn onClick={() => book(true)} disabled={busy}>{t('yoga.payOnSpot')}</ChipBtn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
