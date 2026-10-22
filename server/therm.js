// $THERM: send the token to the treasury with a memo → the memo becomes a signed DAI job → the
// answer comes back on-chain — dust $THERM + the answer in the memo, from a dedicated reply
// wallet, never the treasury. therm_posts keeps a full copy of every prompt and answer too, as
// a backup and to render the feed, but the db is no longer the primary way the answer is delivered.
//
//   Solana (THERM → treasury, memo)  ──watch──▶  therm_posts  ──estimate/sign/publish──▶  DAI node
//                                                     ▲                                        │
//                                                     └────────────── poll result ◀────────────┘
//                                                     │
//                                                     └──reply wallet──▶  Solana (dust $THERM → sender, answer in memo)
//
// Everything is idempotent on the transaction signature, so restarts and re-scans never double-spend DAI.
import { db, getSetting, setSetting } from './db.js'
import { requireAuth } from './auth.js'
import {
  rpc, tokenAccountsOf, readIncomingTransfer, isSolanaAddress, buildTokenPayment, submitTransaction,
  paysTreasury, paymentCoversTreasury, resolveThermMint, loadSolanaKeypair, buildReplyPayment,
} from './solana.js'
import * as dai from './dai.js'

const cfg = () => ({
  mint: process.env.THERM_MINT || '',
  treasury: process.env.THERM_TREASURY || '',
  tokensPerTherm: Number(process.env.THERM_TOKENS_PER_THERM || 100_000_000),   // 1 THERM = 100M AI tokens
  memoMax: 500,
  maxJobTokens: Number(process.env.THERM_MAX_JOB_TOKENS || 20_000_000),        // hard cap per job (20 DAI-cents at 1 μDAI/token)
  pollMs: Number(process.env.THERM_POLL_MS || 8000),
  backfill: process.env.THERM_BACKFILL === '1',
  jobTimeoutMs: Number(process.env.THERM_JOB_TIMEOUT_MS || 30 * 60 * 1000),
  replyKeyFile: process.env.THERM_REPLY_KEY_FILE || '',
  replyDustRaw: '1',   // smallest unit of the mint — the reply is a receipt, not a payment
})

// The reply wallet signs the on-chain replies. Separate from the treasury on purpose: the
// treasury's key is never loaded here, so a compromised server can only drain this wallet's
// small top-up, not the accumulated THERM balance.
let replyWalletCache
function replyWallet(c) {
  if (replyWalletCache === undefined || replyWalletCache?.keyFile !== c.replyKeyFile) {
    replyWalletCache = c.replyKeyFile ? loadSolanaKeypair(c.replyKeyFile) : null
    if (replyWalletCache) replyWalletCache.keyFile = c.replyKeyFile
  }
  return replyWalletCache
}
export const thermConfigured = () => !!(cfg().mint && cfg().treasury)
const publicBase = () => (process.env.WEB_APP_URL || 'https://iamai.kg/thermopolium').replace(/\/$/, '')
const ESTIMATE_DOCS = 'https://iamai.kg/docs/#jobs'

function thermToRaw(amount, decimals) {
  const fixed = Number(amount).toFixed(decimals)
  const raw = decimals === 0 ? fixed : fixed.replace('.', '')
  return BigInt(raw).toString()
}

function x402Cors(res) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Content-Type, PAYMENT-SIGNATURE, X-PAYMENT')
  res.set('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED')
}

const now = () => new Date().toISOString()
// created_at comes from SQLite's CURRENT_TIMESTAMP ("YYYY-MM-DD HH:MM:SS", no zone);
// updated_at is always written by now() above (already a full ISO string with "Z").
const toMs = (s) => new Date(/Z$/.test(s) ? s : s.replace(' ', 'T') + 'Z').getTime()
const log = (...a) => console.log('[therm]', ...a)

function truncateBytes(s, max) {
  let out = ''
  for (const ch of s) { if (Buffer.byteLength(out + ch, 'utf8') > max) break; out += ch }
  return out
}

// ---------- 1. watch the chain ----------
let scanning = false
async function scanChain() {
  const c = cfg()
  if (!thermConfigured() || scanning) return
  scanning = true
  try {
    const asset = await resolveThermMint(c.mint)
    const watch = { ...c, mint: asset.address }
    const accts = await tokenAccountsOf(watch.treasury, watch.mint)
    const cursors = getSetting('therm_cursors', {})
    for (const a of accts) {
      const fresh = []
      let before
      for (let page = 0; page < 10; page++) {
        const sigs = await rpc('getSignaturesForAddress', [a.address, {
          limit: 100, commitment: 'confirmed',
          ...(cursors[a.address] ? { until: cursors[a.address] } : {}),
          ...(before ? { before } : {}),
        }])
        fresh.push(...sigs)
        if (sigs.length < 100) break
        before = sigs[sigs.length - 1].signature
      }
      if (!fresh.length) continue

      if (!cursors[a.address] && !c.backfill) {
        // Don't answer old history. A transfer that just landed still counts: the account
        // often appears for the first time because of that payment.
        const cutoff = Math.floor(Date.now() / 1000) - 20 * 60
        const recent = fresh.filter(s => !s.err && (s.blockTime || 0) >= cutoff).reverse()
        for (const s of recent) await ingest(s.signature, watch)
        cursors[a.address] = fresh[0].signature
        setSetting('therm_cursors', cursors)
        log(`first run on ${a.address}: ingested ${recent.length} recent, skipped ${fresh.length - recent.length} older (set THERM_BACKFILL=1 to answer history)`)
        continue
      }
      const batch = (cursors[a.address] ? fresh : fresh.slice(0, 200)).filter(s => !s.err).reverse() // oldest first
      for (const s of batch) await ingest(s.signature, watch)
      cursors[a.address] = fresh[0].signature
      setSetting('therm_cursors', cursors)
    }
  } catch (e) {
    log('scan error:', e.message)
  } finally { scanning = false }
}

async function ingest(sig, c) {
  if (db.prepare('SELECT 1 FROM therm_posts WHERE sig = ?').get(sig)) return
  const tx = await rpc('getTransaction', [sig, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }])
  const inc = readIncomingTransfer(tx, { mint: c.mint, treasury: c.treasury })
  if (!inc) return
  const memo = truncateBytes((inc.memo || '').trim(), c.memoMax)
  const therm = Number(inc.received) / 10 ** inc.decimals
  const allowance = Number((inc.received * BigInt(c.tokensPerTherm)) / 10n ** BigInt(inc.decimals))
  db.prepare(`INSERT OR IGNORE INTO therm_posts
    (sig, slot, block_time, sender, amount_raw, decimals, therm, memo, status, allowance_tokens, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(sig, tx.slot ?? null, tx.blockTime ?? null, inc.sender, inc.received.toString(), inc.decimals, therm, memo,
      memo ? 'received' : 'no_memo', allowance, now())
  const claim = db.prepare('SELECT user_id FROM post_claims WHERE sig = ?').get(sig)
  if (claim && inc.sender) linkWallet(inc.sender, claim.user_id)
  log(`+ ${therm} THERM from ${inc.sender?.slice(0, 6)}… ${memo ? `memo(${Buffer.byteLength(memo)}B)` : 'no memo'} ${sig.slice(0, 10)}…`)
}

function linkWallet(wallet, userId) {
  if (!wallet || !userId) return
  db.prepare(`INSERT INTO wallet_links (wallet, user_id, updated_at) VALUES (?,?,?)
    ON CONFLICT(wallet) DO UPDATE SET user_id = excluded.user_id, updated_at = excluded.updated_at`)
    .run(wallet, userId, now())
}

function withAuthors(rows) {
  const senders = [...new Set(rows.map(r => r.sender).filter(Boolean))]
  const authors = new Map()
  if (senders.length) {
    const marks = senders.map(() => '?').join(',')
    for (const row of db.prepare(`SELECT w.wallet, u.photo_url, u.username, u.first_name
      FROM wallet_links w JOIN users u ON u.id = w.user_id WHERE w.wallet IN (${marks})`).all(...senders)) {
      authors.set(row.wallet, row)
    }
  }
  return rows.map(r => {
    const author = authors.get(r.sender)
    return { ...postView(r), id: r.id, avatar: author?.photo_url || '', author: author?.first_name || (author?.username ? '@' + author.username : '') }
  })
}

// ---------- 2. turn memos into jobs ----------
let publishing = false
let lastFundingAlert = 0
async function publishPending(notifyAdmins) {
  if (publishing) return
  publishing = true
  try {
    const rows = db.prepare("SELECT * FROM therm_posts WHERE status = 'received' ORDER BY id LIMIT 10").all()
    for (const row of rows) await publishOne(row, notifyAdmins)
  } finally { publishing = false }
}

const update = (id, fields) => {
  const keys = Object.keys(fields)
  db.prepare(`UPDATE therm_posts SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
    .run(...keys.map(k => fields[k]), now(), id)
}

async function publishOne(row, notifyAdmins) {
  const c = cfg()
  try {
    const est = await dai.estimate(row.memo)
    if (row.allowance_tokens < est.minTokens) {
      return update(row.id, {
        status: 'insufficient', estimate_tokens: est.minTokens, estimate_source: est.source,
        error: `needs at least ${(est.minTokens / c.tokensPerTherm).toFixed(6)} THERM`,
      })
    }
    const info = await dai.minerInfo()
    const gasPrice = Number(info.gasPrice || 1)
    let budgetTokens = Math.min(est.recommendedTokens, row.allowance_tokens, c.maxJobTokens)
    let job
    for (let attempt = 0; ; attempt++) {
      try {
        job = await dai.publishJob({ prompt: row.memo, budgetUdai: Math.ceil(budgetTokens * gasPrice) })
        break
      } catch (e) {
        // Heuristic estimates can undershoot: retry once with a bigger budget, still bounded by what was paid.
        const bigger = Math.min(budgetTokens * 3, row.allowance_tokens, c.maxJobTokens)
        if (attempt === 0 && e.code === 'FEE_TOO_LOW' && bigger > budgetTokens) { budgetTokens = bigger; continue }
        throw e
      }
    }
    update(row.id, {
      status: 'queued', job_id: job.jobId, estimate_tokens: est.recommendedTokens, estimate_source: est.source,
      budget_udai: job.budgetUdai, error: null,
    })
    log(`→ job ${job.jobId} for ${row.sig.slice(0, 10)}… budget ${job.budgetUdai} μDAI (${est.source} estimate)`)
  } catch (e) {
    log(`publish failed for ${row.sig.slice(0, 10)}…: ${e.code || ''} ${e.message}`)
    const funding = e.code === 'payment' || e.code === 'PAYMENT_PROOF_MISMATCH' || /balance|insufficient|fund/i.test(e.message || '')
    // A funding failure isn't the sender's fault: leave it 'received' so it retries once the wallet is topped up.
    if (funding || e.code === 'no_wallet' || e.name === 'TimeoutError' || e.cause?.code === 'ECONNREFUSED' || /fetch failed/.test(e.message)) {
      if (Date.now() - lastFundingAlert > 3600_000) {
        lastFundingAlert = Date.now()
        notifyAdmins?.(`⚠️ THERM publisher is stuck (${e.code || e.name}): ${e.message}\nPending answers will retry automatically.`)
      }
      return
    }
    update(row.id, { status: 'error', error: `${e.code || 'error'}: ${e.message}`.slice(0, 300) })
  }
}

// ---------- 3. collect answers ----------
let polling = false
async function pollJobs() {
  if (polling) return
  polling = true
  try {
    const c = cfg()
    const rows = db.prepare("SELECT * FROM therm_posts WHERE status IN ('queued','computing') ORDER BY id LIMIT 25").all()
    for (const row of rows) {
      try {
        // Measure from when the job was dispatched (updated_at at the 'queued' transition), not
        // from the post's original created_at — a post can sit for hours on a funding retry before
        // it's finally queued, and that wait must not count against the job's own timeout budget.
        if (Date.now() - toMs(row.updated_at || row.created_at) > c.jobTimeoutMs) {
          update(row.id, { status: 'error', error: 'timeout: no result from the node' })
          continue
        }
        const st = await dai.jobStatus(row.job_id)
        if (st.status === 'error') { update(row.id, { status: 'error', error: (st.error || 'job failed').slice(0, 300) }); continue }
        if (st.status === 'computing' && row.status !== 'computing') update(row.id, { status: 'computing' })
        if (st.status === 'done' || st.status === 'computing') {
          const r = await dai.jobResult(row.job_id)
          if (r.ready) {
            if (r.answer) update(row.id, { status: 'done', answer: r.answer.slice(0, 8000), raw: JSON.stringify(r.data).slice(0, 20000), error: null })
            else update(row.id, { status: 'error', error: 'empty answer', raw: JSON.stringify(r.data).slice(0, 20000) })
          }
        }
      } catch (e) { log(`poll ${row.job_id}: ${e.message}`) }
    }
  } finally { polling = false }
}

// ---------- 4. reply on-chain: dust $THERM + the answer in the memo, sent back to the asker ----------
let replying = false
let lastReplyAlert = 0
async function sendReplies(notifyAdmins) {
  if (replying) return
  replying = true
  try {
    const c = cfg()
    const wallet = replyWallet(c)
    if (!wallet) return
    const rows = db.prepare("SELECT * FROM therm_posts WHERE status = 'done' AND (reply_status IS NULL OR reply_status = 'error') ORDER BY id LIMIT 10").all()
    if (!rows.length) return
    let asset
    try { asset = await resolveThermMint(c.mint) } catch (e) { log('reply mint', e.message); return }
    for (const row of rows) {
      try {
        const memo = truncateBytes(row.answer || '', c.memoMax)
        const built = await buildReplyPayment({
          privateKey: wallet.privateKey, from: wallet.address, recipient: row.sender,
          mint: asset.address, amountRaw: c.replyDustRaw, decimals: asset.decimals, memo,
        })
        const signature = await submitTransaction(built.transaction)
        update(row.id, { reply_sig: signature, reply_status: 'sent' })
        log(`↩ reply ${signature.slice(0, 10)}… to ${row.sender?.slice(0, 6)}… for ${row.sig.slice(0, 10)}…`)
      } catch (e) {
        update(row.id, { reply_status: 'error' })
        log(`reply failed for ${row.sig.slice(0, 10)}…: ${e.code || ''} ${e.message}`)
        if (e.code === 'REPLY_WALLET_EMPTY' && Date.now() - lastReplyAlert > 3600_000) {
          lastReplyAlert = Date.now()
          notifyAdmins?.(`⚠️ THERM reply wallet (${wallet.address}) is out of SOL or $THERM — replies are queued but not sending. Top it up.`)
        }
      }
    }
  } finally { replying = false }
}

// ---------- public views ----------
const shortErr = (row) => {
  if (row.status === 'insufficient') return row.error || 'not enough THERM for this prompt'
  if (row.status === 'error') return 'The AI could not answer this one.'
  return null
}
export const postView = (r) => ({
  sig: r.sig, sender: r.sender, therm: r.therm, memo: r.memo, status: r.status,
  answer: r.answer || null, note: shortErr(r), block_time: r.block_time, created_at: r.created_at, job_id: r.job_id || null,
  replySig: r.reply_sig || null, replyStatus: r.reply_status || null,
})

export function createProject(userId, p) {
  const clean = (s, n) => String(s ?? '').trim().slice(0, n)
  const name = clean(p.name, 120)
  const link = clean(p.link, 300)
  if (!name || !/^https?:\/\//i.test(link)) return null
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6)
  db.prepare(`INSERT INTO projects (slug, user_id, name, blockchain, country, github, x, tg, link, description, image, category, details, submitter)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      slug, userId ?? null, name, clean(p.blockchain, 40) || 'Solana', clean(p.country, 80),
      clean(p.github, 200), clean(p.x, 100), clean(p.tg, 60), link,
      clean(p.description, 1500), '', '', null,
      clean(p.submitter, 80),
    )
  return slug
}

const topProjects = (limit = 10) => db.prepare(`
  SELECT p.slug, p.name, p.blockchain, p.country, p.github, p.x, p.link, p.description, p.image, p.category, p.created_at
  FROM projects p
  WHERE p.hidden = 0 ORDER BY p.created_at DESC, p.id DESC LIMIT ?`).all(limit)
  .map((p, i) => ({ ...p, rank: i + 1, votes: 0, voters: 0 }))

// ---------- routes + lifecycle ----------
export function startTherm(app, { notifyAdmins, requireAdmin }) {
  const c = cfg()

  app.get('/api/therm/config', async (_req, res) => {
    const cc = cfg()
    let asset = null
    if (cc.mint) {
      try { asset = await resolveThermMint(cc.mint) } catch (e) { log('config mint', e.message) }
    }
    res.json({
      configured: thermConfigured(), network: 'solana',
      mint: asset?.address || null, pool: asset?.pool || null, decimals: asset?.decimals ?? null,
      treasury: cc.treasury || null,
      replyWallet: replyWallet(cc)?.address || null,
      tokensPerTherm: cc.tokensPerTherm, memoMaxBytes: cc.memoMax,
      posts: db.prepare("SELECT COUNT(*) n FROM therm_posts WHERE hidden = 0 AND status != 'no_memo'").get().n,
      x402: {
        scheme: 'exact',
        network: 'solana',
        asset: asset?.address || null,
        payTo: cc.treasury || null,
        infer: `${publicBase()}/api/x402/infer`,
        data: `${publicBase()}/api/x402/data`,
        estimate: 'https://iamai.kg/docs/#jobs',
      },
    })
  })

  app.get('/api/therm/feed', (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const before = Number(req.query.before) || Number.MAX_SAFE_INTEGER
    const rows = db.prepare(`SELECT * FROM therm_posts WHERE hidden = 0 AND status != 'no_memo' AND id < ? ORDER BY id DESC LIMIT ?`).all(before, limit + 1)
    const more = rows.length > limit
    const page = rows.slice(0, limit)
    res.json({ posts: withAuthors(page), next: more ? page[page.length - 1].id : null })
  })

  app.get('/api/therm/tx/:sig', (req, res) => {
    const row = db.prepare('SELECT * FROM therm_posts WHERE sig = ? AND hidden = 0').get(req.params.sig)
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ post: withAuthors([row])[0] })
  })

  // The payer is logged in with Telegram. Remember the signature now; the sender wallet
  // is linked when the transfer shows up, so the feed can use their photo.
  app.post('/api/therm/claim', requireAuth, (req, res) => {
    const sig = String(req.body?.sig || '').trim()
    if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(sig)) return res.status(400).json({ error: 'BAD_SIG' })
    db.prepare(`INSERT INTO post_claims (sig, user_id, created_at) VALUES (?,?,?)
      ON CONFLICT(sig) DO UPDATE SET user_id = excluded.user_id`).run(sig, req.user.id, now())
    const row = db.prepare('SELECT sender FROM therm_posts WHERE sig = ?').get(sig)
    if (row?.sender) linkWallet(row.sender, req.user.id)
    res.json({ ok: true })
  })

  const pricePrompt = async (prompt) => {
    const cc = cfg()
    const est = await dai.estimate(prompt)
    const up6 = (n) => Math.ceil(n * 1e6) / 1e6
    const suggested = Math.max(up6((est.recommendedTokens / cc.tokensPerTherm) * 1.1), 0.000001)
    return { cc, est, suggested, up6 }
  }

  app.post('/api/therm/quote', async (req, res) => {
    const prompt = String(req.body?.prompt || '').trim()
    const cc = cfg()
    if (!prompt) return res.status(400).json({ error: 'EMPTY' })
    if (Buffer.byteLength(prompt, 'utf8') > cc.memoMax) return res.status(400).json({ error: 'TOO_LONG' })
    const { est, suggested, up6 } = await pricePrompt(prompt)
    let asset = null
    if (thermConfigured()) {
      try { asset = await resolveThermMint(cc.mint) } catch (e) { log('quote mint', e.message) }
    }
    res.json({
      bytes: Buffer.byteLength(prompt, 'utf8'), source: est.source,
      tokens: { min: est.minTokens, recommended: est.recommendedTokens },
      therm: { min: up6(est.minTokens / cc.tokensPerTherm), suggested },
      pay: asset
        ? `solana:${cc.treasury}?spl-token=${asset.address}&amount=${suggested}&label=THERM&memo=${encodeURIComponent(prompt)}`
        : null,
    })
  })

  // Unsigned payment the connected wallet signs and submits. The memo is the prompt.
  app.post('/api/therm/pay', async (req, res) => {
    const cc = cfg()
    if (!thermConfigured()) return res.status(503).json({ error: 'NOT_CONFIGURED' })
    const owner = String(req.body?.owner || '').trim()
    const prompt = String(req.body?.prompt || '').trim()
    if (!isSolanaAddress(owner)) return res.status(400).json({ error: 'BAD_WALLET' })
    if (!prompt) return res.status(400).json({ error: 'EMPTY' })
    if (Buffer.byteLength(prompt, 'utf8') > cc.memoMax) return res.status(400).json({ error: 'TOO_LONG' })
    try {
      const { suggested } = await pricePrompt(prompt)
      const asset = await resolveThermMint(cc.mint)
      const decimals = asset.decimals
      if (decimals > 18) throw new Error('bad mint decimals')
      const raw = thermToRaw(suggested, decimals)
      const built = await buildTokenPayment({
        owner, treasury: cc.treasury, mint: asset.address, amountRaw: raw, decimals, memo: prompt,
      })
      const bytes = Buffer.from(built.transaction, 'base64')
      if (bytes[0] !== 1) throw new Error('bad signature prefix')
      res.json({
        transaction: built.transaction,
        message: bytes.subarray(65).toString('base64'),
        amount: suggested,
        decimals,
      })
    } catch (e) {
      if (e.code === 'NO_THERM') return res.status(403).json({ error: 'NO_THERM' })
      log('pay', e.message)
      res.status(502).json({ error: 'CHAIN_UNAVAILABLE' })
    }
  })

  // Wallet signed but did not broadcast (signTransaction fallback).
  app.post('/api/therm/submit', async (req, res) => {
    const cc = cfg()
    const transaction = String(req.body?.transaction || '')
    if (!thermConfigured()) return res.status(503).json({ error: 'NOT_CONFIGURED' })
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(transaction) || transaction.length < 100 || transaction.length > 4000) {
      return res.status(400).json({ error: 'BAD_TX' })
    }
    let asset
    try { asset = await resolveThermMint(cc.mint) } catch (e) {
      log('submit mint', e.message)
      return res.status(502).json({ error: 'CHAIN_UNAVAILABLE' })
    }
    if (!await paysTreasury(transaction, { mint: asset.address, treasury: cc.treasury })) return res.status(400).json({ error: 'BAD_TX' })
    try {
      const signature = await submitTransaction(transaction)
      res.json({ signature })
    } catch (e) {
      log('submit', e.message)
      res.status(502).json({ error: 'CHAIN_UNAVAILABLE' })
    }
  })

  app.get('/api/therm/top', (_req, res) => {
    res.json({ projects: topProjects(10), votingOpen: false })
  })

  app.get('/api/therm/projects', (_req, res) => {
    res.json({ projects: topProjects(500), votingOpen: false })
  })

  app.post('/api/therm/vote', (_req, res) => {
    res.status(410).json({ error: 'VOTING_CLOSED' })
  })

  // Solana x402. No payment → 402 priced from the DAI job estimate.
  // A retry carries PAYMENT-SIGNATURE (or X-PAYMENT): base64 JSON { payload: { transaction } }.
  // The signed transferChecked must pay the treasury at least the quoted raw amount, and the memo must be the prompt.
  app.options('/api/x402/infer', (_req, res) => {
    x402Cors(res)
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.sendStatus(204)
  })

  app.post('/api/x402/infer', async (req, res) => {
    x402Cors(res)
    const cc = cfg()
    if (!thermConfigured()) return res.status(503).json({ error: 'NOT_CONFIGURED' })
    const prompt = String(req.body?.prompt || '').trim()
    if (!prompt) return res.status(400).json({ error: 'EMPTY' })
    if (Buffer.byteLength(prompt, 'utf8') > cc.memoMax) return res.status(400).json({ error: 'TOO_LONG' })
    let priced
    try { priced = await pricePrompt(prompt) } catch (e) {
      log('x402 estimate', e.message)
      return res.status(502).json({ error: 'ESTIMATE_UNAVAILABLE' })
    }
    const { est, suggested } = priced
    let asset
    try { asset = await resolveThermMint(cc.mint) } catch (e) {
      log('x402 mint', e.message)
      return res.status(502).json({ error: 'CHAIN_UNAVAILABLE' })
    }
    const decimals = asset.decimals
    const raw = thermToRaw(suggested, decimals)
    const challenge = {
      x402Version: 1,
      error: 'PAYMENT-SIGNATURE header is required',
      accepts: [{
        scheme: 'exact',
        network: 'solana',
        maxAmountRequired: raw,
        resource: `${publicBase()}/api/x402/infer`,
        description: `THERM inference. ${est.recommendedTokens} AI tokens from ${ESTIMATE_DOCS}.`,
        mimeType: 'application/json',
        payTo: cc.treasury,
        maxTimeoutSeconds: 120,
        asset: asset.address,
        extra: {
          memo: prompt,
          decimals,
          tokensPerTherm: cc.tokensPerTherm,
          tokens: { min: est.minTokens, recommended: est.recommendedTokens },
          source: est.source,
          estimate: ESTIMATE_DOCS,
          therm: suggested,
        },
      }],
    }
    const header = String(req.get('PAYMENT-SIGNATURE') || req.get('X-PAYMENT') || '')
    if (!header) {
      res.set('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(challenge)).toString('base64'))
      return res.status(402).json(challenge)
    }
    let payload
    try { payload = JSON.parse(Buffer.from(header, 'base64').toString('utf8')) } catch {
      return res.status(400).json({ error: 'BAD_PAYMENT' })
    }
    const transaction = payload?.payload?.transaction || payload?.transaction
    if (typeof transaction !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(transaction) || transaction.length < 100 || transaction.length > 4000) {
      return res.status(400).json({ error: 'BAD_TX' })
    }
    const pay = await paymentCoversTreasury(transaction, { mint: asset.address, treasury: cc.treasury, amountRaw: raw })
    if (!pay || !pay.memos.some(m => m === prompt)) {
      res.set('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(challenge)).toString('base64'))
      return res.status(402).json({ ...challenge, error: 'PAYMENT_MISMATCH' })
    }
    const dataUrl = (sig) => `${publicBase()}/api/x402/data/${sig}`
    try {
      const signature = await submitTransaction(transaction)
      res.json({
        signature, therm: suggested, tokens: est.recommendedTokens, source: est.source, data: dataUrl(signature),
      })
    } catch (e) {
      const msg = String(e.message || e)
      if (/already been processed|already processed|duplicate/i.test(msg)) {
        return res.json({
          signature: pay.signature, therm: suggested, tokens: est.recommendedTokens, source: est.source, data: dataUrl(pay.signature),
        })
      }
      log('x402 submit', msg)
      res.status(502).json({ error: 'CHAIN_UNAVAILABLE' })
    }
  })

  app.get('/api/x402/data/:sig', (req, res) => {
    x402Cors(res)
    const sig = String(req.params.sig || '')
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(sig)) return res.status(400).json({ error: 'BAD_SIG' })
    const row = db.prepare('SELECT * FROM therm_posts WHERE sig = ? AND hidden = 0').get(sig)
    if (!row) return res.status(202).json({ signature: sig, status: 'pending', answer: null })
    res.json({ signature: row.sig, status: row.status, answer: row.answer || null, memo: row.memo, replySig: row.reply_sig || null })
  })

  app.post('/api/admin/therm/:sig/hide', requireAdmin, (req, res) => {
    db.prepare('UPDATE therm_posts SET hidden = ? WHERE sig = ?').run(req.body?.hidden === false ? 0 : 1, req.params.sig)
    res.json({ ok: true })
  })
  app.post('/api/admin/therm/:sig/retry', requireAdmin, (req, res) => {
    db.prepare("UPDATE therm_posts SET status = 'received', error = NULL, job_id = NULL WHERE sig = ? AND status IN ('error','insufficient')").run(req.params.sig)
    res.json({ ok: true })
  })

  if (!thermConfigured()) {
    log('THERM_MINT / THERM_TREASURY not set — watcher idle (API still serves the feed and top 10)')
  } else {
    const w = dai.loadWallet()
    const rw = replyWallet(c)
    resolveThermMint(c.mint)
      .then(a => log(`watching ${c.treasury} for mint ${a.address}${a.pool ? ` (pool ${a.pool})` : ''} — 1 THERM = ${c.tokensPerTherm.toLocaleString()} AI tokens; DAI wallet ${w ? w.address : 'NOT CONFIGURED (jobs will wait)'}; reply wallet ${rw ? rw.address : 'NOT CONFIGURED (replies will wait)'}`))
      .catch(e => log('mint', e.message))
    if (w && w.address !== w.derived) log(`note: DAI_ADDRESS (${w.address}) differs from the key-derived address (${w.derived})`)
  }

  const tick = async () => {
    await scanChain()
    await publishPending(notifyAdmins)
    await pollJobs()
    await sendReplies(notifyAdmins)
  }
  setInterval(tick, c.pollMs)
  setTimeout(tick, 1500)
}
