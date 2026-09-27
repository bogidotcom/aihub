// DAI node client for the THERM prompt pipeline: estimate → sign → publish → poll.
// Signing mirrors the SDK / node exactly (sdk-js signing.ts, miner-node.js computeJobPaymentHash):
//   txHash    = sha256(JSON.stringify({ jobId, requesterAddress, minerAddress, amount, nonce }))
//   signature = base64(ed25519(privateKey, utf8(txHash)))      — hex string is signed, not raw bytes
import crypto from 'node:crypto'
import fs from 'node:fs'

const node = () => (process.env.DAI_NODE_URL || 'http://127.0.0.1:3456').replace(/\/$/, '')

async function call(path, { method = 'GET', body, timeoutMs = 20000 } = {}) {
  const res = await fetch(node() + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { status: res.status, ok: res.ok, data }
}

// ---------- wallet ----------
let cachedKey
export function loadWallet() {
  if (cachedKey !== undefined) return cachedKey
  cachedKey = null
  let pem = process.env.DAI_SIGNING_KEY_FILE ? safeRead(process.env.DAI_SIGNING_KEY_FILE) : (process.env.DAI_SIGNING_KEY || '').replace(/\\n/g, '\n')
  if (!pem.trim()) return cachedKey
  const privateKey = crypto.createPrivateKey(pem)
  const publicPem = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' })
  // Node derivation (Wallet.deriveAddressFromSigningKey): sha256 over the trimmed SPKI PEM.
  // DAI_ADDRESS overrides it for wallets whose address was registered a different way.
  const derived = 'dai' + crypto.createHash('sha256').update(publicPem.trim().replace(/\r\n/g, '\n')).digest('hex').slice(0, 40)
  cachedKey = { privateKey, publicPem, address: process.env.DAI_ADDRESS || derived, derived }
  return cachedKey
}
const safeRead = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return '' } }

export const signData = (message, privateKey) =>
  crypto.sign(null, Buffer.from(message, 'utf8'), privateKey).toString('base64')

export function paymentHash({ jobId, requesterAddress, minerAddress, amount, nonce }) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ jobId, requesterAddress, minerAddress, amount, nonce }))
    .digest('hex')
}

// ---------- node info ----------
export async function minerInfo() {
  const r = await call('/api/miner/info')
  if (!r.ok) throw new Error(`miner/info HTTP ${r.status}`)
  return r.data // { minerAddress, gasPrice, model, ... }
}

export async function walletState(address) {
  const [bal, nonce] = await Promise.all([
    call(`/api/wallet/balance?address=${encodeURIComponent(address)}`),
    call(`/api/wallet/nonce?address=${encodeURIComponent(address)}`),
  ])
  return { balance: bal.data?.balance ?? null, nonce: nonce.data?.nonce ?? 0, raw: { bal: bal.data, nonce: nonce.data } }
}

// ---------- estimate ----------
/**
 * Fee estimate for a prompt, in AI tokens (1 token = gasPrice μDAI, 1 μDAI/token by default).
 * Uses POST /api/estimate. Nodes at 0.4.36 and older don't have it (404), so fall back to a
 * conservative local estimate — prompt tokens ≈ bytes/3, a fixed output allowance, generous margin.
 */
export async function estimate(prompt, { maxOutputTokens = 512 } = {}) {
  try {
    const r = await call('/api/estimate', { method: 'POST', body: { prompt, currency: 'DAI', maxOutputTokens, route: false } })
    const f = r.data?.fees
    if (r.ok && f?.minimum?.tokens != null) {
      return {
        source: 'node',
        minTokens: Number(f.minimum.tokens),
        recommendedTokens: Number(f.recommended?.tokens ?? f.minimum.tokens),
        raw: r.data,
      }
    }
  } catch { /* fall through to heuristic */ }
  const promptTokens = Math.ceil(Buffer.byteLength(prompt, 'utf8') / 3) + 150
  const total = promptTokens + maxOutputTokens
  return { source: 'heuristic', minTokens: total, recommendedTokens: Math.ceil(total * 2), raw: null }
}

// ---------- publish ----------
// Job payments are signed against the wallet's current nonce, so publishing is strictly serial.
let chain = Promise.resolve()
export function publishJob(args) {
  const run = chain.then(() => doPublish(args))
  chain = run.catch(() => {})
  return run
}

async function doPublish({ prompt, budgetUdai, model }) {
  const wallet = loadWallet()
  if (!wallet) throw new DaiError('no_wallet', 'DAI signing key is not configured')
  const info = await minerInfo()
  const jobId = `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const { nonce } = await walletState(wallet.address)
  const txHash = paymentHash({ jobId, requesterAddress: wallet.address, minerAddress: info.minerAddress, amount: budgetUdai, nonce })
  const body = {
    id: jobId,
    type: 'compute',
    model: model || process.env.DAI_JOB_MODEL || info.model,
    payload: { prompt, route: false },     // plain LLM answer: a public memo must never trigger skills/MCP
    maxBudget: budgetUdai,
    requesterAddress: wallet.address,
    paymentTx: { txHash, signature: signData(txHash, wallet.privateKey) },
    route: false,
  }
  const r = await call('/job', { method: 'POST', body })
  if (!r.ok) {
    const code = r.data?.code || (r.status === 402 ? 'payment' : 'rejected')
    throw new DaiError(code, r.data?.error || `HTTP ${r.status}`, r.status)
  }
  return { jobId: r.data?.jobId || jobId, budgetUdai, model: body.model }
}

export class DaiError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status }
}

// ---------- poll ----------
export async function jobStatus(jobId) {
  const r = await call(`/job/${encodeURIComponent(jobId)}/status`)
  if (r.status === 404) return { status: 'unknown' }
  return { status: r.data?.status || 'unknown', error: r.data?.error }
}

/** Pull the answer text out of whatever shape the node returns for this job type. */
export function extractAnswer(result) {
  if (!result) return ''
  const pick = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '')
  const out = result.output
  return pick(result.nlResponse) || pick(out) || pick(out?.text) || pick(out?.answer) || pick(out?.response)
    || pick(result.response) || pick(result.answer) || pick(result.text) || pick(result.reasoning) || ''
}

export async function jobResult(jobId) {
  const r = await call(`/job/${encodeURIComponent(jobId)}/result`)
  if (r.status === 202) return { ready: false }
  if (!r.ok) return { ready: false, error: r.data?.error || `HTTP ${r.status}` }
  return { ready: r.data?.status !== 'computing', data: r.data, answer: extractAnswer(r.data) }
}
