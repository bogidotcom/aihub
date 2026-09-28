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

const ED_P = (1n << 255n) - 19n
const mod = (a, m) => { const r = a % m; return r < 0n ? r + m : r }
function modPow(base, exp, m) {
  let r = 1n
  let b = mod(base, m)
  let e = exp
  while (e > 0n) {
    if (e & 1n) r = mod(r * b, m)
    b = mod(b * b, m)
    e >>= 1n
  }
  return r
}
const ED_D = mod(BigInt(-121665) * modPow(121666n, ED_P - 2n, ED_P), ED_P)
function le32(buf) {
  let n = 0n
  for (let i = 0; i < 32; i++) n |= BigInt(buf[i]) << (8n * BigInt(i))
  return n
}
// A Solana address is a public key only when this is true. PDAs are the ones that fail it.
export function isOnCurve(bytes) {
  const raw = Buffer.from(bytes)
  if (raw.length !== 32) return false
  let y = le32(raw)
  const sign = y >> 255n
  y &= (1n << 255n) - 1n
  if (y >= ED_P) return false
  const y2 = mod(y * y, ED_P)
  const x2 = mod(mod(y2 - 1n, ED_P) * modPow(mod(ED_D * y2 + 1n, ED_P), ED_P - 2n, ED_P), ED_P)
  if (x2 === 0n) return sign === 0n
  return modPow(x2, (ED_P - 1n) / 2n, ED_P) === 1n
}

const PDA_MARK = Buffer.from('ProgramDerivedAddress')
export function findProgramAddress(seeds, programId) {
  const program = Buffer.from(programId)
  for (let bump = 255; bump >= 0; bump--) {
    const hash = crypto.createHash('sha256').update(Buffer.concat([...seeds.map(s => Buffer.from(s)), Buffer.from([bump]), program, PDA_MARK])).digest()
    if (!isOnCurve(hash)) return hash
  }
  throw new Error('no program address')
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

const TOKEN_PROGRAM = () => b58decode('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ATA_PROGRAM = () => b58decode('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const MEMO_PROGRAM = () => b58decode('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
const SYSTEM_PROGRAM = () => Buffer.alloc(32)

export function associatedTokenAddress(owner, mint) {
  return findProgramAddress([b58decode(owner), TOKEN_PROGRAM(), b58decode(mint)], ATA_PROGRAM())
}

export async function mintDecimals(mint) {
  const info = await rpc('getAccountInfo', [mint, { encoding: 'base64', commitment: 'confirmed' }])
  const data = info?.value?.data?.[0]
  if (!data) throw new Error('mint account missing')
  return Buffer.from(data, 'base64')[44]
}

function compactU16(n) {
  const out = []
  let v = n
  while (true) {
    let b = v & 0x7f
    v >>= 7
    if (v) { b |= 0x80; out.push(b) } else { out.push(b); break }
  }
  return Buffer.from(out)
}

// Legacy transaction the wallet can sign. One signature slot, left empty.
export function compileLegacyTransaction({ payer, writable = [], readonly = [], blockhash, instructions }) {
  const keys = [Buffer.from(payer), ...writable.map(k => Buffer.from(k)), ...readonly.map(k => Buffer.from(k))]
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
  const indexOf = (buf) => {
    const i = keys.findIndex(k => same(k, buf))
    if (i < 0) throw new Error('instruction account missing from the message')
    return i
  }
  const ixs = instructions.map(ix => {
    const accounts = Buffer.from(ix.accounts.map(indexOf))
    return Buffer.concat([
      Buffer.from([indexOf(ix.programId)]),
      compactU16(accounts.length),
      accounts,
      compactU16(ix.data.length),
      ix.data,
    ])
  })
  const message = Buffer.concat([
    Buffer.from([1, 0, readonly.length]),
    compactU16(keys.length),
    Buffer.concat(keys),
    b58decode(blockhash),
    compactU16(ixs.length),
    ...ixs,
  ])
  return Buffer.concat([compactU16(1), Buffer.alloc(64), message]).toString('base64')
}

/**
 * Unsigned USDC/$THERM payment: create the treasury token account if needed,
 * transferChecked the exact amount, and attach the prompt as a memo.
 */
export async function buildTokenPayment({ owner, treasury, mint, amountRaw, decimals, memo }) {
  const payer = b58decode(owner)
  const mintKey = b58decode(mint)
  const treasuryKey = b58decode(treasury)
  const source = associatedTokenAddress(owner, mint)
  const dest = associatedTokenAddress(treasury, mint)
  const token = TOKEN_PROGRAM()
  const held = await tokenAccountsOf(treasury, mint)
  const createDest = held.length === 0
  const writable = [source, dest]
  const readonly = [mintKey, token, MEMO_PROGRAM()]
  if (createDest) readonly.push(SYSTEM_PROGRAM(), ATA_PROGRAM(), treasuryKey)
  const instructions = []
  if (createDest) {
    instructions.push({
      programId: ATA_PROGRAM(),
      accounts: [payer, dest, treasuryKey, mintKey, SYSTEM_PROGRAM(), token],
      data: Buffer.from([1]),
    })
  }
  const transfer = Buffer.alloc(10)
  transfer[0] = 12
  transfer.writeBigUInt64LE(BigInt(amountRaw), 1)
  transfer[9] = decimals
  instructions.push({ programId: token, accounts: [source, mintKey, dest, payer], data: transfer })
  instructions.push({ programId: MEMO_PROGRAM(), accounts: [payer], data: Buffer.from(memo, 'utf8') })
  const { value } = await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])
  return compileLegacyTransaction({ payer, writable, readonly, blockhash: value.blockhash, instructions })
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
