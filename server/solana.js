// Minimal Solana JSON-RPC client + the few pieces of chain logic Thermopolium needs.
// Raw fetch on purpose: no @solana/web3.js, so the service stays a 3-package install.
import crypto from 'node:crypto'

const rpcUrl = () => process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

export async function rpc(method, params = [], { timeoutMs = 15000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(rpcUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (res.status === 429) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue }
      const data = await res.json()
      if (data.error) throw new Error(`${method}: ${data.error.message || JSON.stringify(data.error)}`)
      return data.result
    } catch (e) {
      lastErr = e
      if (attempt < 2) await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
    }
  }
  throw lastErr
}

// ---------- base58 (Bitcoin alphabet) ----------
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const B58_MAP = Object.fromEntries([...B58].map((c, i) => [c, i]))

export function b58decode(str) {
  let n = 0n
  for (const ch of str) {
    const v = B58_MAP[ch]
    if (v === undefined) throw new Error('bad base58')
    n = n * 58n + BigInt(v)
  }
  let hex = n.toString(16)
  if (hex.length % 2) hex = '0' + hex
  const bytes = n === 0n ? Buffer.alloc(0) : Buffer.from(hex, 'hex')
  let zeros = 0
  for (const ch of str) { if (ch === '1') zeros++; else break }
  return Buffer.concat([Buffer.alloc(zeros), bytes])
}

export function b58encode(buf) {
  let n = BigInt('0x' + (Buffer.from(buf).toString('hex') || '0'))
  let out = ''
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n }
  for (const b of buf) { if (b === 0) out = '1' + out; else break }
  return out
}

export const isSolanaAddress = (s) => {
  if (typeof s !== 'string' || s.length < 32 || s.length > 44) return false
  try { return b58decode(s).length === 32 } catch { return false }
}

// ed25519 verify for wallet signMessage() proofs (Phantom & co sign the raw UTF-8 bytes).
const SPKI_ED25519_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
export function verifyWalletSignature(address, message, signature) {
  try {
    const pub = b58decode(address)
    if (pub.length !== 32) return false
    const key = crypto.createPublicKey({ key: Buffer.concat([SPKI_ED25519_PREFIX, pub]), format: 'der', type: 'spki' })
    return crypto.verify(null, Buffer.from(message, 'utf8'), key, Buffer.from(signature))
  } catch { return false }
}

// ---------- token accounts / balances ----------
/** Token accounts the owner holds for the mint (usually one ATA). */
export async function tokenAccountsOf(owner, mint) {
  const r = await rpc('getTokenAccountsByOwner', [owner, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }])
  return (r?.value || []).map(v => ({
    address: v.pubkey,
    amount: BigInt(v.account.data.parsed.info.tokenAmount.amount),
    decimals: v.account.data.parsed.info.tokenAmount.decimals,
  }))
}

/** UI-unit balance of `owner` for `mint` (0 when they hold none). */
export async function thermBalance(owner, mint) {
  const accts = await tokenAccountsOf(owner, mint)
  let total = 0n, decimals = 0
  for (const a of accts) { total += a.amount; decimals = a.decimals }
  return Number(total) / 10 ** decimals
}

// ---------- reading a transfer out of a parsed transaction ----------
const MEMO_PROGRAM_IDS = new Set([
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',   // Memo v2
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',   // Memo v1
])

function findMemo(tx) {
  const ixs = [
    ...(tx.transaction?.message?.instructions || []),
    ...((tx.meta?.innerInstructions || []).flatMap(i => i.instructions || [])),
  ]
  for (const ix of ixs) {
    if (ix.program === 'spl-memo' || MEMO_PROGRAM_IDS.has(ix.programId)) {
      if (typeof ix.parsed === 'string') return ix.parsed
    }
  }
  // Fallback: the Memo program logs the text back.
  for (const line of tx.meta?.logMessages || []) {
    const m = line.match(/^Program log: Memo \(len \d+\): "([\s\S]*)"$/)
    if (m) { try { return JSON.parse(`"${m[1]}"`) } catch { return m[1] } }
  }
  return ''
}

/**
 * What did `treasury` receive in `mint` in this transaction?
 * Works off the pre/post token balances, so it covers transfer and transferChecked
 * alike (and multi-hop wrappers) without decoding instructions.
 * Returns null when the treasury didn't gain THERM (an outgoing payout, unrelated tx…).
 */
export function readIncomingTransfer(tx, { mint, treasury }) {
  if (!tx || tx.meta?.err) return null
  const pre = tx.meta?.preTokenBalances || [], post = tx.meta?.postTokenBalances || []
  const amountOf = (list, owner) => list
    .filter(b => b.mint === mint && b.owner === owner)
    .reduce((s, b) => s + BigInt(b.uiTokenAmount.amount), 0n)
  const received = amountOf(post, treasury) - amountOf(pre, treasury)
  if (received <= 0n) return null

  const decimals = (post.find(b => b.mint === mint) || pre.find(b => b.mint === mint))?.uiTokenAmount.decimals ?? 0

  // Sender: the owner whose balance fell the most; the fee payer as a last resort.
  let sender = null, biggest = 0n
  const owners = new Set([...pre, ...post].filter(b => b.mint === mint && b.owner !== treasury).map(b => b.owner))
  for (const o of owners) {
    const drop = amountOf(pre, o) - amountOf(post, o)
    if (drop > biggest) { biggest = drop; sender = o }
  }
  if (!sender) {
    const first = tx.transaction?.message?.accountKeys?.[0]
    sender = typeof first === 'string' ? first : first?.pubkey || null
  }
  return { received, decimals, sender, memo: findMemo(tx) }
}
