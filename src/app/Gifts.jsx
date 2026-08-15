import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Glass, GradBtn, Field } from '../ui.jsx'
import { api } from '../api.js'
import { useSession } from '../session.jsx'
import { useI18n } from '../i18n.jsx'

const KIND_KEYS = ['yoga_package', 'vibecoding', 'custom']
const KIND_I18N = { yoga_package: 'gifts.yoga', vibecoding: 'gifts.vibecoding', custom: 'gifts.custom' }

export default function Gifts() {
  const { t } = useI18n()
  const nav = useNavigate()
  const { config, user } = useSession()
  const [kind, setKind] = useState('yoga_package')
  const [ref, setRef] = useState('p4')
  const [amount, setAmount] = useState('50')
  const [guest, setGuest] = useState({ name: '', contact: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const yoga = (config?.yoga_packages || []).map(o => ({ ...o, title: t(`yoga.pkg.${o.key}`) }))
  const programs = (config?.vibecoding_programs || []).map(o => ({ ...o, title: t(`learn.prog.${o.key}.title`) }))
  const options = kind === 'yoga_package' ? yoga : kind === 'vibecoding' ? programs : []

  const pick = (k) => {
    setKind(k)
    setRef(k === 'yoga_package' ? 'p4' : k === 'vibecoding' ? 'tryout' : '')
  }

  const checkout = async () => {
    setBusy(true); setErr('')
    try {
      const d = await api('/checkout', {
        method: 'POST',
        body: { kind: 'giftcard', gift_kind: kind, ref, amount: Number(amount), buyer_name: guest.name || user?.first_name || '', buyer_contact: guest.contact },
      })
      nav(`/app/invoice/${d.order.id}`)
    } catch {
      setErr(t('gifts.error'))
      setBusy(false)
    }
  }

  const price = () => {
    if (kind === 'custom') return Number(amount) > 0 ? `${Number(amount).toFixed(0)} USDT` : '—'
    const item = options.find(o => o.key === ref)
    return item ? `${item.kgs.toLocaleString()} KGS · ≈ ${item.usdt} USDT` : '—'
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-liquid text-3xl font-bold tracking-tight">{t('gifts.title')}</h1>
        <p className="text-ink-soft">{t('gifts.sub')}</p>
      </div>

      <Glass className="rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {KIND_KEYS.map(k => (
            <button key={k} onClick={() => pick(k)}
              className={`rounded-xl border py-3 px-2 text-sm text-center transition-colors cursor-pointer ${kind === k ? 'border-accent bg-chip text-ink font-semibold' : 'border-veil text-ink-soft'}`}>
              {t(KIND_I18N[k])}
            </button>
          ))}
        </div>

        {kind !== 'custom' ? (
          <div className="grid grid-cols-2 gap-2">
            {options.map(o => (
              <button key={o.key} onClick={() => setRef(o.key)}
                className={`rounded-xl border p-3 text-center transition-colors cursor-pointer ${ref === o.key ? 'border-accent bg-chip' : 'border-veil'}`}>
                <p className="font-bold text-ink text-sm">{o.title}</p>
                <p className="text-accent text-sm font-semibold">{o.kgs.toLocaleString()} KGS</p>
                <p className="font-mono text-[10px] text-ink-faint">≈ {o.usdt} USDT</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-widest text-ink-faint">{t('gifts.amount')}</label>
            <Field type="number" min="1" max="10000" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        )}

        {!user && (
          <div className="grid gap-3">
            <Field placeholder={t('gifts.yourName')} value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} />
            <Field placeholder={t('gifts.contactPh')} value={guest.contact} onChange={e => setGuest({ ...guest, contact: e.target.value })} required />
          </div>
        )}

        <div className="flex items-center justify-between border-t border-veil pt-4">
          <span className="text-ink-soft text-sm">{t('gifts.total')}</span>
          <span className="font-bold text-accent">{price()}</span>
        </div>

        <GradBtn onClick={checkout} disabled={busy || (!user && !guest.contact)} className="w-full">
          {busy ? t('gifts.creating') : t('gifts.continue')}
        </GradBtn>
        {err && <p className="text-center text-sm text-accent">{err}</p>}
      </Glass>
    </div>
  )
}
