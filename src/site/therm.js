import { useEffect, useState } from 'react'
import { api, getToken } from '../api.js'

// One shared fetch of the public token config (mint, treasury, rate, memo cap).
let configPromise
export function useThermConfig() {
  const [cfg, setCfg] = useState(null)
  useEffect(() => {
    configPromise ??= api('/therm/config').catch(() => ({ configured: false, tokensPerTherm: 100_000_000, memoMaxBytes: 500 }))
    configPromise.then(setCfg)
  }, [])
  return cfg
}

export const shortAddr = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '—')

export const byteLen = (s) => new TextEncoder().encode(s).length
export function clampBytes(s, max) {
  if (byteLen(s) <= max) return s
  let out = ''
  for (const ch of s) { if (byteLen(out + ch) > max) break; out += ch }
  return out
}

export function timeAgo(post) {
  const t = post.block_time ? post.block_time * 1000 : new Date(post.created_at.replace(' ', 'T') + 'Z').getTime()
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// A base58 signature is 86-88 chars; accept a bare hash or any explorer URL containing one.
export const extractSignature = (s) => (s.match(/[1-9A-HJ-NP-Za-km-z]{80,90}/) || [null])[0]

export const fmtTherm = (n) => (n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(Number(n.toPrecision(4))))

export const hueOf = (s) => { let h = 0; for (const c of s || '') h = (h * 31 + c.charCodeAt(0)) % 360; return h }

// Tie a connected Solana wallet to the logged-in Telegram account so the feed can show their photo.
export function rememberWallet(address) {
  if (!address || !getToken()) return
  api('/me/wallet', { method: 'POST', body: { wallet: address } }).catch(() => {})
}
