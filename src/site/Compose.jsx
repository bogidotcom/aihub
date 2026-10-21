import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Copy, Check, ArrowLeft, Wallet, ArrowRight } from 'lucide-react'
import { GradBtn } from '../ui.jsx'
import { api } from '../api.js'
import { media } from '../media.js'
import { useI18n } from '../i18n.jsx'
import { useClock } from '../theme.jsx'
import { useThermConfig, byteLen, clampBytes, extractSignature, rememberWallet } from './therm.js'
import { useSession } from '../session.jsx'

const ComposeCtx = createContext({ open: () => {} })
export const useCompose = () => useContext(ComposeCtx)

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const solanaProvider = () => window.phantom?.solana || window.solflare || window.solana || null

function b58encode(bytes) {
  let n = 0n
  for (const b of bytes) n = (n << 8n) + BigInt(b)
  let out = ''
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n }
  for (const b of bytes) { if (b === 0) out = '1' + out; else break }
  return out || '1'
}
function b64ToBytes(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function bytesToB64(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
function asSignature(result) {
  const sig = result?.signature ?? result
  if (typeof sig === 'string') return (sig.match(/[1-9A-HJ-NP-Za-km-z]{80,90}/) || [''])[0]
  if (sig && typeof sig.length === 'number') return b58encode(sig)
  return ''
}
const walletRejected = (e) => e?.code === 4001 || e?.code === '4001' || /reject|cancel|declin/i.test(e?.message || '')

async function legacyTransaction(bytes) {
  const { Buffer } = await import('buffer')
  globalThis.Buffer = Buffer
  const { Transaction } = await import('@solana/web3.js')
  return Transaction.from(Buffer.from(bytes))
}

const DRAFT_KEY = 'therm-draft'
const R = 11, C = 2 * Math.PI * R

// The prompt IS the Solana memo, so the composer looks like a "new post" box and counts bytes, not characters.
export default function Compose({ open, onClose }) {
  const { t } = useI18n()
  const nav = useNavigate()
  const { user } = useSession()
  const cfg = useThermConfig()
  const max = cfg?.memoMaxBytes ?? 500

  const [text, setText] = useState(() => { try { return localStorage.getItem(DRAFT_KEY) || '' } catch { return '' } })
  const [step, setStep] = useState('write')
  const [quote, setQuote] = useState(null)
  const [tx, setTx] = useState('')
  const [copied, setCopied] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  const bytes = useMemo(() => byteLen(text), [text])
  const left = max - bytes

  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, text) } catch { /* private mode */ } }, [text])
  useEffect(() => { if (!open) { setStep('write'); setTx(''); setPayError(''); setPaying(false) } }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Live price for this exact prompt.
  useEffect(() => {
    if (!open || !text.trim()) { setQuote(null); return }
    let dead = false
    const id = setTimeout(() => {
      api('/therm/quote', { method: 'POST', body: { prompt: text } }).then(q => !dead && setQuote(q)).catch(() => !dead && setQuote(null))
    }, 450)
    return () => { dead = true; clearTimeout(id) }
  }, [text, open])

  if (!open) return null

  const copy = (key, value) => {
    navigator.clipboard?.writeText(String(value)).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(''), 1400)
  }
  const sig = extractSignature(tx)
  const seeAnswer = () => {
    if (sig && user) api('/therm/claim', { method: 'POST', body: { sig } }).catch(() => {})
    onClose()
    nav(`/app/feed?tx=${sig}`)
  }
  const pay = async () => {
    setPayError('')
    const provider = solanaProvider()
    if (!provider?.connect) { setPayError(t('compose.noWallet')); return }
    setPaying(true)
    try {
      const connected = await provider.connect()
      const key = connected?.publicKey ?? provider.publicKey
      const owner = typeof key === 'string' ? key : key?.toString?.()
      if (!owner) throw new Error('NO_WALLET')
      rememberWallet(owner)
      const built = await api('/therm/pay', { method: 'POST', body: { owner, prompt: text } })
      const transaction = await legacyTransaction(b64ToBytes(built.transaction))
      let result
      if (typeof provider.signAndSendTransaction === 'function') {
        result = await provider.signAndSendTransaction(transaction)
      } else if (typeof provider.request === 'function') {
        result = await provider.request({
          method: 'signAndSendTransaction',
          params: { message: b58encode(transaction.serializeMessage()) },
        })
      } else if (typeof provider.signTransaction === 'function') {
        const signed = await provider.signTransaction(transaction)
        result = await api('/therm/submit', { method: 'POST', body: { transaction: bytesToB64(signed.serialize()) } })
      } else {
        setPayError(t('compose.noWallet'))
        return
      }
      const signature = asSignature(result)
      if (!signature) throw new Error('NO_SIG')
      setTx(signature)
      if (user) api('/therm/claim', { method: 'POST', body: { sig: signature } }).catch(() => {})
      onClose()
      nav(`/app/feed?tx=${signature}`)
    } catch (e) {
      const code = e.data?.error
      if (code === 'NO_THERM') setPayError(t('compose.noTherm'))
      else if (walletRejected(e)) setPayError(t('compose.cancelled'))
      else if (/insufficient lamports|insufficient funds for fee|insufficient SOL/i.test(e?.message || '')) setPayError(t('compose.noSol'))
      else setPayError(e?.message === 'NO_WALLET' ? t('compose.noWallet') : t('compose.payFailed'))
    } finally {
      setPaying(false)
    }
  }

  const Row = ({ id, label, value, mono = true }) => (
    <button onClick={() => copy(id, value)} className="compose-well w-full text-left rounded-lg px-4 py-3 hover:brightness-110 transition-colors cursor-pointer">
      <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-ink-faint mb-1">
        {label} {copied === id ? <Check className="w-3.5 h-3.5 text-accent-3" /> : <Copy className="w-3.5 h-3.5" />}
      </span>
      <span className={`block text-ink text-sm ${mono ? 'break-all font-mono' : 'break-words'}`}>{value}</span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        className="compose-panel relative w-full sm:max-w-xl min-h-[60vh] sm:min-h-0 max-h-screen overflow-y-auto rounded-none sm:rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          {step === 'send'
            ? <button onClick={() => setStep('write')} className="p-1.5 -ml-1.5 text-ink cursor-pointer" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
            : <button onClick={onClose} className="p-1.5 -ml-1.5 text-ink cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>}
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-faint">{t('compose.title')}</span>
          <span className="w-6" />
        </div>

        {step === 'write' && (
          <>
            <div className="flex gap-3">
              <img src={media('therm-icon.svg')} alt="" className="w-10 h-10 shrink-0 rounded-full border border-veil bg-chip p-1.5" />
              <textarea autoFocus value={text} onChange={(e) => setText(clampBytes(e.target.value, max))}
                placeholder={t('compose.placeholder')} rows={6}
                className="flex-1 bg-transparent text-ink placeholder:text-ink-faint text-lg leading-snug resize-none focus:outline-none" />
            </div>
            <p className="ml-[52px] mt-1 text-ink-faint text-xs">{t('compose.hint')}</p>

            <div className="mt-4 pt-4 border-t border-veil flex items-center gap-3">
              <div className="min-h-9 flex-1 text-xs text-ink-soft">
                {quote
                  ? <span className="font-mono">≈ {quote.therm.suggested} $THERM · {quote.tokens.recommended.toLocaleString()} {t('compose.aiTokens')}</span>
                  : text.trim() ? <span className="text-ink-faint">{t('compose.quoting')}</span> : null}
              </div>
              <span className="font-mono text-xs tabular-nums" style={{ color: left < 40 ? 'var(--accent)' : 'var(--ink-faint)' }}>{left}</span>
              <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90" aria-label={`${bytes}/${max} bytes`}>
                <circle cx="14" cy="14" r={R} fill="none" stroke="var(--veil)" strokeWidth="2.5" />
                <circle cx="14" cy="14" r={R} fill="none" stroke={left < 40 ? 'var(--accent)' : 'var(--accent-2)'} strokeWidth="2.5"
                  strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, bytes / max))} strokeLinecap="round" />
              </svg>
              <GradBtn onClick={() => setStep('send')} disabled={!text.trim()} className="!px-6 !py-2 text-sm rounded-full">{t('compose.post')}</GradBtn>
            </div>
          </>
        )}

        {step === 'send' && (
          <div className="space-y-4">
            <div className="compose-well rounded-xl p-4">
              <p className="text-ink whitespace-pre-wrap break-words">{text}</p>
            </div>

            {!cfg?.configured ? (
              <div className="text-center space-y-3 py-4">
                <p className="text-3xl">🔥</p>
                <p className="text-ink font-semibold">{t('compose.soonTitle')}</p>
                <p className="text-ink-soft text-sm">{t('compose.soonBody')}</p>
                <a href="https://t.me/iamaihub" target="_blank" rel="noreferrer" className="inline-block text-accent text-sm font-semibold">{t('compose.soonCta')} →</a>
              </div>
            ) : (
              <>
                <p className="text-ink-soft text-sm">{t('compose.sendIntro')}</p>
                <Row id="to" label={t('compose.sendTo')} value={cfg.treasury} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Row id="amt" label={t('compose.amount')} value={quote?.therm.suggested ?? '…'} />
                  <Row id="memo" label={t('compose.memo')} value={text} mono={false} />
                </div>
                <GradBtn onClick={pay} disabled={paying || !quote} className="w-full text-sm"><Wallet className="w-4 h-4" /> {paying ? t('compose.paying') : t('compose.openWallet')}</GradBtn>
                {payError && <p className="text-accent text-sm text-center">{payError}</p>}
                <div className="pt-2 border-t border-veil space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{t('compose.sentIt')}</p>
                  <div className="flex gap-2">
                    <input value={tx} onChange={(e) => setTx(e.target.value.trim())} placeholder={t('compose.txPh')}
                      className="compose-well flex-1 min-w-0 px-4 py-3 rounded-lg text-ink placeholder:text-ink-faint text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
                    <GradBtn onClick={seeAnswer} disabled={!sig} className="!px-4 text-sm shrink-0">{t('compose.seeAnswer')} <ArrowRight className="w-4 h-4" /></GradBtn>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ComposeProvider({ children }) {
  const { theme } = useClock()
  const [open, setOpen] = useState(false)
  return (
    <ComposeCtx.Provider value={{ open: () => setOpen(true) }}>
      {/* Theme vars live on the app frame. The dialog is a sibling of that frame, so it needs the same vars or its colors never resolve. */}
      <div style={theme.vars}>
        {children}
        <Compose open={open} onClose={() => setOpen(false)} />
      </div>
    </ComposeCtx.Provider>
  )
}
