import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Wallet, ChevronDown } from 'lucide-react'
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { Glass, Spinner, GradBtn, ChipBtn, CopyRow, Field } from '../ui.jsx'
import { api } from '../api.js'
import { useI18n } from '../i18n.jsx'

const CHAIN_LABELS = { ton: 'TON', trc20: 'Tron (TRC20)', sol: 'Solana', erc20: 'Ethereum (ERC20)', bsc: 'BNB Chain' }

function Countdown({ until }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()))
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(until).getTime() - Date.now())), 1000)
    return () => clearInterval(t)
  }, [until])
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000)
  return <span className="font-mono text-ink">{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
}

export default function Invoice() {
  const { t } = useI18n()
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const [paying, setPaying] = useState(false)
  const [payErr, setPayErr] = useState('')
  const [hashChain, setHashChain] = useState('ton')
  const [hash, setHash] = useState('')
  const [kgstHash, setKgstHash] = useState('')
  const [altOpen, setAltOpen] = useState(false)

  const load = useCallback(() => api(`/orders/${id}`).then(d => setOrder(d.order)).catch(() => {}), [id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!order || ['paid', 'expired', 'rejected'].includes(order.status)) return
    const t = setInterval(load, 6000)
    return () => clearInterval(t)
  }, [order?.status, load])

  if (!order) return <Spinner label="loading order" />

  const payWithTon = async () => {
    setPayErr('')
    if (!wallet) { tonConnectUI.openModal(); return }
    setPaying(true)
    try {
      const { tx } = await api(`/orders/${order.id}/ton-payload`, { method: 'POST', body: { sender: wallet.account.address } })
      await tonConnectUI.sendTransaction(tx)
      // watcher confirms on-chain; keep polling
    } catch (e) {
      if (!/reject/i.test(String(e?.message))) setPayErr(t('invoice.payFail'))
    }
    setPaying(false)
  }

  const sendHash = async (chain, tx_hash) => {
    try {
      await api(`/orders/${order.id}/submit-hash`, { method: 'POST', body: { chain, tx_hash } })
      load()
    } catch { setPayErr(t('invoice.hashFail')) }
  }
  const submitHash = (e) => { e.preventDefault(); sendHash(hashChain, hash) }
  const submitKgstHash = (e) => { e.preventDefault(); sendHash('bsc', kgstHash) }

  // ---- terminal states ----
  if (order.status === 'paid') {
    return (
      <div className="space-y-5 text-center py-6">
        <p className="text-5xl">🎉</p>
        <h1 className="text-liquid text-3xl font-bold">{t('invoice.confirmed')}</h1>
        {order.kind === 'ticket' && order.tickets?.length > 0 && (
          <Glass className="rounded-2xl p-6 space-y-3 text-left">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">{order.tickets.length > 1 ? t('invoice.yourTickets') : t('invoice.yourTicket')}</p>
            {order.tickets.map((tk, i) => (
              <Link key={tk.qr_token} to={`/ticket/${tk.qr_token}`} className="block bg-chip border border-veil rounded-lg px-4 py-3 text-ink hover:bg-veil transition-colors">
                {t('invoice.ticketN', { n: i + 1 })}
              </Link>
            ))}
          </Glass>
        )}
        {order.kind === 'giftcard' && order.giftcard && (
          <Glass className="rounded-2xl p-6 space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">{t('invoice.giftCode')}</p>
            <p className="text-2xl font-mono font-bold text-accent tracking-wider">{order.giftcard.code}</p>
            <p className="text-ink-soft text-sm">{t('invoice.giftNote')}</p>
          </Glass>
        )}
        {order.kind === 'yoga_package' && (
          <GradBtn as={Link} to="/app/events" className="mx-auto">{t('invoice.bookFirst')}</GradBtn>
        )}
      </div>
    )
  }
  if (order.status === 'expired') {
    return <div className="text-center py-16 space-y-3"><p className="text-4xl">⏳</p><p className="text-ink font-semibold">{t('invoice.expired')}</p><p className="text-ink-soft text-sm">{t('invoice.expiredSub')}</p></div>
  }
  if (order.status === 'rejected') {
    return <div className="text-center py-16 space-y-3"><p className="text-4xl">❌</p><p className="text-ink font-semibold">{t('invoice.rejected')}</p><p className="text-ink-soft text-sm">{t('invoice.rejectedSub')}</p></div>
  }
  if (order.status === 'review') {
    return <div className="text-center py-16 space-y-3"><p className="text-4xl">🔎</p><p className="text-ink font-semibold">{t('invoice.review')}</p><p className="text-ink-soft text-sm">{t('invoice.reviewSub')}</p></div>
  }

  // ---- pending ----
  // An order can be priced in USDT, in KGS (settled in KGST), or both.
  const kgst = order.pay?.kgst
  const usdtDue = Number(order.amount) > 0

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">{t('invoice.order')} #{order.id} · {t('invoice.expiresIn')} <Countdown until={order.expires_at} /></p>
        <h1 className="text-4xl font-bold text-ink">
          {usdtDue
            ? <>{order.amount} <span className="text-liquid">USDT</span></>
            : <>{Number(kgst?.amount || 0).toLocaleString()} <span className="text-liquid">KGST</span></>}
        </h1>
        <p className="text-ink-soft text-sm">{t('invoice.exact')}</p>
      </div>

      {!usdtDue && !kgst?.address && (
        <Glass className="rounded-2xl p-6 space-y-4">
          <p className="font-bold text-ink">{t('invoice.noMethod')}</p>
          <p className="text-ink-soft text-sm">{t('invoice.noMethodSub')}</p>
          <CopyRow label={t('invoice.orderCode')} value={order.pay.comment} />
          {order.pay.bot && (
            <GradBtn as="a" href={`https://t.me/${order.pay.bot}`} target="_blank" rel="noreferrer" className="w-full">
              {t('invoice.noMethodCta')}
            </GradBtn>
          )}
        </Glass>
      )}

      {kgst?.address && (
        <Glass className="rounded-2xl p-6 space-y-4">
          <p className="font-bold text-ink">{t('invoice.kgstTitle')}</p>
          <p className="text-ink-soft text-sm">{t('invoice.kgstNote')}</p>
          <CopyRow label={t('invoice.kgstAmountLabel')} value={kgst.amount} />
          <CopyRow label={t('invoice.kgstAddrLabel')} value={kgst.address} />
          <CopyRow label={t('invoice.kgstTokenLabel')} value={kgst.token_address} />
          <CopyRow label={t('invoice.commentLabel')} value={order.pay.comment} />
          <p className="font-mono text-[11px] text-ink-faint">{t('invoice.kgstNetwork')}</p>
          <form onSubmit={submitKgstHash} className="space-y-3">
            <Field placeholder={t('invoice.txHash')} value={kgstHash} onChange={e => setKgstHash(e.target.value)} required />
            <ChipBtn type="submit" className="w-full">{t('invoice.submitHash')}</ChipBtn>
          </form>
          {payErr && <p className="text-center text-sm text-accent">{payErr}</p>}
        </Glass>
      )}

      {usdtDue && (<>
      <Glass className="rounded-2xl p-6 space-y-4">
        <GradBtn onClick={payWithTon} disabled={paying} className="w-full !py-4">
          <Wallet className="w-5 h-5" />
          {wallet ? (paying ? t('invoice.opening') : t('invoice.payConnected')) : t('invoice.connect')}
        </GradBtn>
        {wallet && <p className="text-center font-mono text-[11px] text-ink-faint">{t('invoice.connected')}: {wallet.account.address.slice(0, 8)}…{wallet.account.address.slice(-6)} · <button className="text-accent cursor-pointer" onClick={() => tonConnectUI.disconnect()}>{t('invoice.disconnect')}</button></p>}
        {payErr && <p className="text-center text-sm text-accent">{payErr}</p>}

        <div className="flex items-center gap-3 text-ink-faint text-xs font-mono">
          <span className="flex-1 border-t border-veil" /> {t('invoice.orManual')} <span className="flex-1 border-t border-veil" />
        </div>

        {order.qr && <img src={order.qr} alt="TON address QR" className="mx-auto rounded-xl border border-veil w-40 h-40" />}
        <CopyRow label={t('invoice.addrLabel')} value={order.pay.ton_address} />
        <CopyRow label={t('invoice.amountLabel')} value={order.amount} />
        <CopyRow label={t('invoice.commentLabel')} value={order.pay.comment} />
        <p className="text-ink-faint text-xs text-center">{t('invoice.auto')}</p>
      </Glass>

      <Glass className="rounded-2xl overflow-hidden">
        <button onClick={() => setAltOpen(!altOpen)} className="w-full flex items-center justify-between px-6 py-4 text-ink-soft text-sm cursor-pointer">
          {t('invoice.other')} <ChevronDown className={`w-4 h-4 transition-transform ${altOpen ? 'rotate-180' : ''}`} />
        </button>
        {altOpen && (
          <div className="px-6 pb-6 space-y-3">
            {Object.entries(order.pay.alt_addresses).filter(([, v]) => v).map(([chain, addr]) => (
              <CopyRow key={chain} label={`USDT · ${CHAIN_LABELS[chain]}`} value={addr} />
            ))}
            <p className="text-ink-faint text-xs">{t('invoice.otherNote')}</p>
            <form onSubmit={submitHash} className="space-y-3">
              <div className="flex gap-2">
                {['trc20', 'sol', 'erc20'].map(c => (
                  <button type="button" key={c} onClick={() => setHashChain(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-colors cursor-pointer ${hashChain === c ? 'border-accent text-accent' : 'border-veil text-ink-faint'}`}>
                    {CHAIN_LABELS[c]}
                  </button>
                ))}
              </div>
              <Field placeholder={t('invoice.txHash')} value={hash} onChange={e => setHash(e.target.value)} required />
              <ChipBtn type="submit" className="w-full">{t('invoice.submitHash')}</ChipBtn>
            </form>
          </div>
        )}
      </Glass>
      </>)}
    </div>
  )
}
