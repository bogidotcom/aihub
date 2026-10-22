// Minimal Solana JSON-RPC client + the few pieces of chain logic Thermopolium needs.
// Raw fetch on purpose: no @solana/web3.js, so the service stays a 3-package install.
import crypto from 'node:crypto'
import fs from 'node:fs'

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
  throw lastErr || new Error(`${method}: no response`)
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

// ed25519 keypair from a PEM file, as a Solana signer (base58 address = raw public key).
// Used for wallets this server signs with itself (the reply wallet) — never the treasury,
// which stays receive-only and never has its key loaded here.
export function loadSolanaKeypair(pemPath) {
  if (!pemPath) return null
  let pem
  try { pem = fs.readFileSync(pemPath, 'utf8') } catch { return null }
  const privateKey = crypto.createPrivateKey(pem)
  const spki = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
  return { privateKey, address: b58encode(spki.subarray(spki.length - 32)) }
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
  const info = await rpc('getAccountInfo', [mint, { encoding: 'jsonParsed', commitment: 'confirmed' }])
  const decimals = info?.value?.data?.parsed?.info?.decimals
  if (info?.value?.data?.parsed?.type !== 'mint' || decimals == null) throw new Error('mint account missing')
  return decimals
}

const DBC_PROGRAM_ID = 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN'
const TOKEN_2022_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
const SPL_TOKEN_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
// VirtualPool: 8 byte discriminator, 64 byte volatility tracker, config, creator, then base_mint.
const DBC_BASE_MINT_OFFSET = 136

let resolvedMint = null

/**
 * THERM_MINT is either the SPL mint or the Meteora Dynamic Bonding Curve pool
 * the token launched on. Payments always use the base mint.
 */
export async function resolveThermMint(address) {
  if (resolvedMint?.input === address) return resolvedMint
  const info = await rpc('getAccountInfo', [address, { encoding: 'base64', commitment: 'confirmed' }])
  const owner = info?.value?.owner
  const data = info?.value?.data?.[0]
  if (!owner || !data) throw new Error('mint account missing')
  let mint = address
  let pool = null
  if (owner === DBC_PROGRAM_ID) {
    const buf = Buffer.from(data, 'base64')
    if (buf.length < DBC_BASE_MINT_OFFSET + 32) throw new Error('pool account too small')
    mint = b58encode(buf.subarray(DBC_BASE_MINT_OFFSET, DBC_BASE_MINT_OFFSET + 32))
    pool = address
  } else if (owner !== SPL_TOKEN_ID && owner !== TOKEN_2022_ID) {
    throw new Error('THERM_MINT is not a token mint')
  }
  const parsed = await rpc('getAccountInfo', [mint, { encoding: 'jsonParsed', commitment: 'confirmed' }])
  const body = parsed?.value?.data?.parsed
  if (body?.type !== 'mint' || body.info?.decimals == null) throw new Error('resolved address is not a mint')
  if (parsed.value.owner !== SPL_TOKEN_ID && parsed.value.owner !== TOKEN_2022_ID) throw new Error('resolved address is not a mint')
  resolvedMint = { input: address, address: mint, decimals: body.info.decimals, program: parsed.value.owner, pool }
  return resolvedMint
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

function buildLegacyMessage({ payer, writable = [], readonly = [], blockhash, instructions }) {
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
  return Buffer.concat([
    Buffer.from([1, 0, readonly.length]),
    compactU16(keys.length),
    Buffer.concat(keys),
    b58decode(blockhash),
    compactU16(ixs.length),
    ...ixs,
  ])
}

// Legacy transaction a wallet can sign. One signature slot, left empty.
export function compileLegacyTransaction(opts) {
  return Buffer.concat([compactU16(1), Buffer.alloc(64), buildLegacyMessage(opts)]).toString('base64')
}

// Legacy transaction signed here, with a key this server holds (the reply wallet — never the treasury).
export function signLegacyTransaction({ privateKey, ...opts }) {
  const message = buildLegacyMessage(opts)
  return Buffer.concat([compactU16(1), crypto.sign(null, message, privateKey), message]).toString('base64')
}

function fail(code) {
  const err = new Error(code)
  err.code = code
  return err
}

/**
 * Unsigned USDC/$THERM payment: create the treasury token account if needed,
 * transferChecked the exact amount, and attach the prompt as a memo.
 * Throws NO_THERM when `owner` has no single token account that can cover `amountRaw`.
 */
export async function buildTokenPayment({ owner, treasury, mint, amountRaw, decimals, memo }) {
  const amount = BigInt(amountRaw)
  if (amount <= 0n) throw fail('NO_THERM')
  const payer = b58decode(owner)
  const mintKey = b58decode(mint)
  const treasuryKey = b58decode(treasury)
  const token = TOKEN_PROGRAM()
  const funded = (await tokenAccountsOf(owner, mint))
    .filter(a => a.decimals === decimals && a.amount >= amount)
    .sort((a, b) => (a.amount > b.amount ? -1 : 1))
  if (!funded.length) throw fail('NO_THERM')
  const source = b58decode(funded[0].address)
  const held = await tokenAccountsOf(treasury, mint)
  const createDest = held.length === 0
  const dest = createDest ? associatedTokenAddress(treasury, mint) : b58decode(held[0].address)
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
  transfer.writeBigUInt64LE(amount, 1)
  transfer[9] = decimals
  instructions.push({ programId: token, accounts: [source, mintKey, dest, payer], data: transfer })
  instructions.push({ programId: MEMO_PROGRAM(), accounts: [payer], data: Buffer.from(memo, 'utf8') })
  const { value } = await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])
  const transaction = compileLegacyTransaction({ payer, writable, readonly, blockhash: value.blockhash, instructions })
  return { transaction, blockhash: value.blockhash }
}

/**
 * The reply: dust $THERM transferChecked from the reply wallet back to `recipient`, with the
 * AI's answer as the memo — signed here, ready to broadcast. `recipient` must already hold a
 * token account for `mint` (they just paid from one). Throws REPLY_WALLET_EMPTY when the reply
 * wallet itself has no funded account, RECIPIENT_NO_ATA when the recipient's account is gone.
 */
export async function buildReplyPayment({ privateKey, from, recipient, mint, amountRaw, decimals, memo }) {
  const amount = BigInt(amountRaw)
  if (amount <= 0n) throw fail('NO_DUST')
  const payer = b58decode(from)
  const mintKey = b58decode(mint)
  const token = TOKEN_PROGRAM()
  const funded = (await tokenAccountsOf(from, mint))
    .filter(a => a.decimals === decimals && a.amount >= amount)
    .sort((a, b) => (a.amount > b.amount ? -1 : 1))
  if (!funded.length) throw fail('REPLY_WALLET_EMPTY')
  const source = b58decode(funded[0].address)
  const destHeld = await tokenAccountsOf(recipient, mint)
  if (!destHeld.length) throw fail('RECIPIENT_NO_ATA')
  const dest = b58decode(destHeld[0].address)
  const writable = [source, dest]
  const readonly = [mintKey, token, MEMO_PROGRAM()]
  const transfer = Buffer.alloc(10)
  transfer[0] = 12
  transfer.writeBigUInt64LE(amount, 1)
  transfer[9] = decimals
  const instructions = [
    { programId: token, accounts: [source, mintKey, dest, payer], data: transfer },
    { programId: MEMO_PROGRAM(), accounts: [payer], data: Buffer.from(memo, 'utf8') },
  ]
  const { value } = await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])
  const transaction = signLegacyTransaction({ privateKey, payer, writable, readonly, blockhash: value.blockhash, instructions })
  return { transaction, blockhash: value.blockhash }
}

function readCompact(buf, offset) {
  let n = 0, shift = 0, o = offset
  for (let i = 0; i < 3; i++) {
    if (o >= buf.length) return null
    const b = buf[o++]
    n += (b & 0x7f) << shift
    if ((b & 0x80) === 0) return [n, o]
    shift += 7
  }
  return null
}

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const MEMO_PROGRAM_ID_SET = new Set([
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
])

/** transferChecked legs and memo strings inside a one-signature legacy transaction. */
export function readLegacyPayment(base64, mint) {
  let raw
  try { raw = Buffer.from(base64, 'base64') } catch { return null }
  if (raw.length < 66 || raw[0] !== 1) return null
  const signature = b58encode(raw.subarray(1, 65))
  const message = raw.subarray(65)
  const count = readCompact(message, 3)
  if (!count) return null
  const [n, keyAt] = count
  if (n < 1 || n > 64 || message.length < keyAt + n * 32 + 32) return null
  const keys = []
  for (let i = 0; i < n; i++) keys.push(b58encode(message.subarray(keyAt + i * 32, keyAt + (i + 1) * 32)))
  let o = keyAt + n * 32 + 32
  const ic = readCompact(message, o)
  if (!ic) return { signature, transfers: [], memos: [] }
  o = ic[1]
  const tokenIndex = keys.indexOf(TOKEN_PROGRAM_ID)
  const mintIndex = mint ? keys.indexOf(mint) : -1
  const transfers = []
  const memos = []
  for (let i = 0; i < ic[0]; i++) {
    if (o >= message.length) break
    const program = message[o++]
    const ac = readCompact(message, o)
    if (!ac) break
    const accounts = message.subarray(ac[1], ac[1] + ac[0])
    o = ac[1] + ac[0]
    const dc = readCompact(message, o)
    if (!dc) break
    const data = message.subarray(dc[1], dc[1] + dc[0])
    o = dc[1] + dc[0]
    const programId = keys[program]
    if (programId && MEMO_PROGRAM_ID_SET.has(programId)) memos.push(data.toString('utf8'))
    // transferChecked: source, mint, destination, authority. Amount is a u64 at byte 1.
    if (program === tokenIndex && mintIndex >= 0 && data.length >= 10 && data[0] === 12 && accounts.length >= 4 && accounts[1] === mintIndex) {
      transfers.push({ dest: keys[accounts[2]] || '', amount: data.readBigUInt64LE(1) })
    }
  }
  return { signature, transfers, memos }
}

function legacyTransfers(base64, mint) {
  const pay = readLegacyPayment(base64, mint)
  return pay ? pay.transfers.map(t => t.dest).filter(Boolean) : []
}

/**
 * The transaction pays `amountRaw` (or more) of `mint` to the treasury and
 * carries memo text. Returns the parsed payment, or null when it does not.
 */
export async function paymentCoversTreasury(base64, { mint, treasury, amountRaw }) {
  const pay = readLegacyPayment(base64, mint)
  if (!pay) return null
  let need
  try { need = BigInt(amountRaw) } catch { return null }
  if (need <= 0n) return null
  const ata = b58encode(associatedTokenAddress(treasury, mint))
  for (const t of pay.transfers) {
    if (!t.dest || t.amount < need) continue
    if (t.dest === ata) return pay
    try {
      const info = await rpc('getAccountInfo', [t.dest, { encoding: 'jsonParsed', commitment: 'confirmed' }])
      const parsed = info?.value?.data?.parsed?.info
      if (parsed?.mint === mint && parsed?.owner === treasury) return pay
    } catch { /* a relay must not accept a transfer it could not check */ }
  }
  return null
}

/** True when a transferChecked in this signed transaction pays the treasury's token account. */
export async function paysTreasury(base64, { mint, treasury }) {
  const ata = b58encode(associatedTokenAddress(treasury, mint))
  for (const dest of legacyTransfers(base64, mint)) {
    if (!dest) continue
    if (dest === ata) return true
    try {
      const info = await rpc('getAccountInfo', [dest, { encoding: 'jsonParsed', commitment: 'confirmed' }])
      const parsed = info?.value?.data?.parsed?.info
      if (parsed?.mint === mint && parsed?.owner === treasury) return true
    } catch { /* a relay must not broadcast a transfer we could not check */ }
  }
  return false
}

/** Broadcast a signed legacy transaction. Returns the signature. */
export function submitTransaction(base64) {
  return rpc('sendTransaction', [base64, { encoding: 'base64', preflightCommitment: 'confirmed' }], { timeoutMs: 30000 })
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
