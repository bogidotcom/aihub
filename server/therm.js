// $THERM: send the token to the treasury with a memo → the memo becomes a signed DAI job → the answer is published.
//
//   Solana (THERM → treasury, memo)  ──watch──▶  therm_posts  ──estimate/sign/publish──▶  DAI node
//                                                     ▲                                        │
//                                                     └────────────── poll result ◀────────────┘
//
// Everything is idempotent on the transaction signature, so restarts and re-scans never double-spend DAI.
import { db, getSetting, setSetting } from './db.js'
import { rpc, tokenAccountsOf, readIncomingTransfer, thermBalance, verifyWalletSignature, isSolanaAddress } from './solana.js'
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
  voteRefreshMs: Number(process.env.THERM_VOTE_REFRESH_MS || 10 * 60 * 1000),
})
export const thermConfigured = () => !!(cfg().mint && cfg().treasury)

const now = () => new Date().toISOString()
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
    const accts = await tokenAccountsOf(c.treasury, c.mint)
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
        // First sight of this account: don't spend DAI on old history unless asked to.
        cursors[a.address] = fresh[0].signature
        setSetting('therm_cursors', cursors)
        log(`first run on ${a.address}: skipping ${fresh.length} historical transfer(s) (set THERM_BACKFILL=1 to answer them)`)
        continue
      }
      const batch = (cursors[a.address] ? fresh : fresh.slice(0, 200)).filter(s => !s.err).reverse() // oldest first
      for (const s of batch) await ingest(s.signature, c)
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
  log(`+ ${therm} THERM from ${inc.sender?.slice(0, 6)}… ${memo ? `memo(${Buffer.byteLength(memo)}B)` : 'no memo'} ${sig.slice(0, 10)}…`)
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
    const funding = e.code === 'payment' || /balance|insufficient|fund/i.test(e.message || '')
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
        if (Date.now() - new Date(row.created_at.replace(' ', 'T') + 'Z').getTime() > c.jobTimeoutMs) {
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

// ---------- 4. votes ----------
let refreshingVotes = false
async function refreshVoteWeights() {
  const c = cfg()
  if (!thermConfigured() || refreshingVotes) return
  refreshingVotes = true
  try {
    const wallets = db.prepare('SELECT wallet FROM project_votes ORDER BY updated_at ASC LIMIT 200').all()
    for (const { wallet } of wallets) {
      try {
        const w = await thermBalance(wallet, c.mint)
        db.prepare('UPDATE project_votes SET weight = ?, updated_at = ? WHERE wallet = ?').run(w, now(), wallet)
      } catch (e) { log(`vote refresh ${wallet.slice(0, 6)}…: ${e.message}`) }
      await new Promise(r => setTimeout(r, 150))
    }
  } finally { refreshingVotes = false }
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
})

export function createProject(userId, p) {
  const colo = p.colosseum && typeof p.colosseum === 'object' ? p.colosseum : null
  const clean = (s, n) => String(s ?? '').trim().slice(0, n)
  const name = clean(p.name, 120) || clean(colo?.name, 120)
  const link = clean(p.link, 300) || (colo?.slug ? `https://colosseum.com/arena/projects/${colo.slug}` : '')
  if (!name || !/^https?:\/\//i.test(link)) return null
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6)
  const github = clean(p.github, 200) || clean(colo?.repoLink, 200)
  const x = clean(p.x, 100) || clean(colo?.twitter, 60)
  const image = /^https:\/\//.test(colo?.image || '') ? colo.image.slice(0, 500) : ''
  db.prepare(`INSERT INTO projects (slug, user_id, name, blockchain, country, github, x, tg, link, description, image, category, details, submitter)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      slug, userId ?? null, name, clean(p.blockchain, 40), clean(p.country, 80),
      github, x, clean(p.tg, 60), link,
      clean(colo?.description, 1500), image, clean(colo?.category, 60),
      colo ? JSON.stringify(colo).slice(0, 8000) : null,
      clean(p.submitter, 80),
    )
  return slug
}

const topProjects = (limit = 10) => db.prepare(`
  SELECT p.slug, p.name, p.blockchain, p.country, p.github, p.x, p.link, p.description, p.image, p.category, p.created_at,
         COALESCE(SUM(v.weight), 0) AS votes, COUNT(v.wallet) AS voters
  FROM projects p LEFT JOIN project_votes v ON v.project_id = p.id
  WHERE p.hidden = 0 GROUP BY p.id ORDER BY votes DESC, p.id ASC LIMIT ?`).all(limit)
  .map((p, i) => ({ ...p, rank: i + 1 }))

// ---------- routes + lifecycle ----------
export function startTherm(app, { notifyAdmins, requireAdmin }) {
  const c = cfg()

  app.get('/api/therm/config', (_req, res) => {
    const cc = cfg()
    res.json({
      configured: thermConfigured(), network: 'solana',
      mint: cc.mint || null, treasury: cc.treasury || null,
      tokensPerTherm: cc.tokensPerTherm, memoMaxBytes: cc.memoMax,
      posts: db.prepare("SELECT COUNT(*) n FROM therm_posts WHERE hidden = 0 AND status != 'no_memo'").get().n,
    })
  })

  app.get('/api/therm/feed', (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const before = Number(req.query.before) || Number.MAX_SAFE_INTEGER
    const rows = db.prepare(`SELECT * FROM therm_posts WHERE hidden = 0 AND status != 'no_memo' AND id < ? ORDER BY id DESC LIMIT ?`).all(before, limit + 1)
    const more = rows.length > limit
    const page = rows.slice(0, limit)
    res.json({ posts: page.map(r => ({ ...postView(r), id: r.id })), next: more ? page[page.length - 1].id : null })
  })

  app.get('/api/therm/tx/:sig', (req, res) => {
    const row = db.prepare('SELECT * FROM therm_posts WHERE sig = ? AND hidden = 0').get(req.params.sig)
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ post: { ...postView(row), id: row.id } })
  })

  app.post('/api/therm/quote', async (req, res) => {
    const cc = cfg()
    const prompt = String(req.body?.prompt || '').trim()
    if (!prompt) return res.status(400).json({ error: 'EMPTY' })
    if (Buffer.byteLength(prompt, 'utf8') > cc.memoMax) return res.status(400).json({ error: 'TOO_LONG' })
    const est = await dai.estimate(prompt)
    const up6 = (n) => Math.ceil(n * 1e6) / 1e6
    const suggested = Math.max(up6((est.recommendedTokens / cc.tokensPerTherm) * 1.1), 0.000001)
    res.json({
      bytes: Buffer.byteLength(prompt, 'utf8'), source: est.source,
      tokens: { min: est.minTokens, recommended: est.recommendedTokens },
      therm: { min: up6(est.minTokens / cc.tokensPerTherm), suggested },
      pay: thermConfigured()
        ? `solana:${cc.treasury}?spl-token=${cc.mint}&amount=${suggested}&label=Thermopolium&memo=${encodeURIComponent(prompt)}`
        : null,
    })
  })

  app.get('/api/therm/top', (_req, res) => {
    res.json({ projects: topProjects(10), votingOpen: thermConfigured() })
  })

  // Wallet-signed vote: the wallet proves it owns the address, its live THERM balance is the weight.
  app.post('/api/therm/vote', async (req, res) => {
    const cc = cfg()
    if (!thermConfigured()) return res.status(503).json({ error: 'VOTING_NOT_OPEN' })
    const { slug, wallet, message, signature } = req.body || {}
    if (!isSolanaAddress(wallet) || typeof message !== 'string' || !Array.isArray(signature)) return res.status(400).json({ error: 'BAD_REQUEST' })
    const m = message.match(/^Thermopolium vote\nproject: ([a-z0-9-]+)\nissued: (\S+)$/)
    if (!m || m[1] !== slug) return res.status(400).json({ error: 'BAD_MESSAGE' })
    if (Math.abs(Date.now() - Date.parse(m[2])) > 10 * 60 * 1000) return res.status(400).json({ error: 'EXPIRED' })
    if (!verifyWalletSignature(wallet, message, signature)) return res.status(401).json({ error: 'BAD_SIGNATURE' })
    const project = db.prepare('SELECT id FROM projects WHERE slug = ? AND hidden = 0').get(slug)
    if (!project) return res.status(404).json({ error: 'PROJECT_NOT_FOUND' })
    let weight
    try { weight = await thermBalance(wallet, cc.mint) } catch { return res.status(502).json({ error: 'CHAIN_UNAVAILABLE' }) }
    if (!(weight > 0)) return res.status(403).json({ error: 'NO_THERM' })
    db.prepare(`INSERT INTO project_votes (wallet, project_id, weight, signature, updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(wallet) DO UPDATE SET project_id = excluded.project_id, weight = excluded.weight, signature = excluded.signature, updated_at = excluded.updated_at`)
      .run(wallet, project.id, weight, Buffer.from(signature).toString('base64'), now())
    res.json({ ok: true, weight })
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
    log(`watching ${c.treasury} for ${c.mint} — 1 THERM = ${c.tokensPerTherm.toLocaleString()} AI tokens; DAI wallet ${w ? w.address : 'NOT CONFIGURED (jobs will wait)'}`)
    if (w && w.address !== w.derived) log(`note: DAI_ADDRESS (${w.address}) differs from the key-derived address (${w.derived})`)
  }

  const tick = async () => {
    await scanChain()
    await publishPending(notifyAdmins)
    await pollJobs()
  }
  setInterval(tick, c.pollMs)
  setTimeout(tick, 1500)
  setInterval(refreshVoteWeights, c.voteRefreshMs)
}
