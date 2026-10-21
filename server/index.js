import './env.js'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

import express from 'express'
import QRCode from 'qrcode'
import { db, genToken, seedDemoEvents } from './db.js'
import { attachUser, requireAuth, requireAdmin, validateInitData, validateWidget, upsertUser, createSession } from './auth.js'
import { YOGA_PACKAGES, YOGA_SLOTS, VIBECODING_PROGRAMS } from './catalog.js'
import { createOrder, fulfillOrder, markPaid, startWatcher, buildTonPayload, ALT_ADDRESSES, KGST, amountLabel, setNotifiers } from './payments.js'
import { startBot, sendTo, notifyAdmins, getBotUsername } from './bot.js'
import { startTherm, createProject } from './therm.js'

const app = express()
const PORT = Number(process.env.PORT || 3460)
const BLOG_DIR = path.join(__dirname, '..', 'content', 'blog')
const DIST_DIR = path.join(__dirname, '..', 'dist')

app.set('trust proxy', true)
app.use(express.json({ limit: '10mb' }))
app.use(attachUser)

seedDemoEvents()
setNotifiers({ notify: sendTo, notifyAdmins })

const publicUser = (u) => u && ({ id: u.id, tg_id: u.tg_id, username: u.username, first_name: u.first_name, last_name: u.last_name, photo_url: u.photo_url, is_admin: !!u.is_admin })

// ---------- config ----------
app.get('/api/config', (_req, res) => {
  res.json({
    bot_username: getBotUsername(),
    ton_address: process.env.TON_ADDRESS || '',
    alt_addresses: ALT_ADDRESSES,
    kgst: KGST,
    yoga_packages: Object.values(YOGA_PACKAGES),
    yoga_slots: Object.values(YOGA_SLOTS),
    vibecoding_programs: Object.values(VIBECODING_PROGRAMS),
  })
})

// ---------- auth ----------
app.post('/api/auth/tma', (req, res) => {
  const tgUser = validateInitData(req.body?.initData || '')
  if (!tgUser) return res.status(401).json({ error: 'BAD_INIT_DATA' })
  const user = upsertUser(tgUser)
  res.json({ token: createSession(user.id), user: publicUser(user) })
})

app.post('/api/auth/widget', (req, res) => {
  const data = validateWidget(req.body || {})
  if (!data) return res.status(401).json({ error: 'BAD_WIDGET_DATA' })
  const user = upsertUser(data)
  res.json({ token: createSession(user.id), user: publicUser(user) })
})

app.get('/api/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

app.post('/api/me/wallet', requireAuth, (req, res) => {
  const wallet = String(req.body?.wallet || '').trim()
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) return res.status(400).json({ error: 'BAD_WALLET' })
  db.prepare(`INSERT INTO wallet_links (wallet, user_id, updated_at) VALUES (?,?,?)
    ON CONFLICT(wallet) DO UPDATE SET user_id = excluded.user_id, updated_at = excluded.updated_at`)
    .run(wallet, req.user.id, new Date().toISOString())
  res.json({ ok: true })
})

// ---------- blog ----------
function loadPostContent(filename) {
  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf8')
  let meta = {}, body = raw
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  if (fm) {
    body = raw.slice(fm[0].length)
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^(\w+):\s*(.*)$/)
      if (m) meta[m[1]] = m[2].trim()
    }
  }
  const stat = fs.statSync(path.join(BLOG_DIR, filename))
  return { meta, body, mtime: stat.mtime }
}

function blogPosts(lang = 'en') {
  if (!fs.existsSync(BLOG_DIR)) return []
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))

  // Group files by base slug and language
  const postsBySlug = {}
  files.forEach(f => {
    const match = f.match(/^(.+?)(\.([a-z]{2}))?\.md$/)
    if (!match) return
    const [, baseSlug, , langCode] = match
    if (!postsBySlug[baseSlug]) postsBySlug[baseSlug] = {}
    postsBySlug[baseSlug][langCode || 'default'] = f
  })

  // For each slug, load only the requested language version (with fallback to default)
  return Object.entries(postsBySlug).map(([baseSlug, versions]) => {
    const filename = versions[lang] || versions['default']
    if (!filename) return null

    const { meta, body, mtime } = loadPostContent(filename)
    const title = meta.title || (body.match(/^#\s+(.+)$/m)?.[1]) || baseSlug
    const excerpt = body.replace(/^#.*$/m, '').replace(/[#*_`>\[\]!]/g, '').trim().slice(0, 180)
    return { slug: baseSlug, title, date: meta.date || mtime.toISOString().slice(0, 10), cover: meta.cover || '', excerpt, body }
  }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date))
}

app.get('/api/blog', (req, res) => {
  const lang = req.query.lang || 'en'
  res.json({ posts: blogPosts(lang).map(({ body, ...p }) => p) })
})
app.get('/api/blog/:slug', (req, res) => {
  const lang = req.query.lang || 'en'
  const post = blogPosts(lang).find(p => p.slug === req.params.slug)
  if (!post) return res.status(404).json({ error: 'NOT_FOUND' })
  res.json({ post })
})

// ---------- events ----------
function eventCopy(e) {
  let pack = {}
  try { pack = JSON.parse(e.i18n || '{}') || {} } catch { pack = {} }
  if (!pack.en && !pack.ru && typeof e.description === 'string' && e.description.includes('\n—\n')) {
    const [ru, ...rest] = e.description.split(/\n—\n/)
    const en = rest.join('\n—\n').trim()
    if (en && ru.trim()) pack = { ru: ru.trim(), en }
  }
  return {
    en: String(pack.en || '').trim(),
    ru: String(pack.ru || '').trim(),
  }
}

const hydrateEvent = (e) => {
  const copy = eventCopy(e)
  return {
    ...e,
    descriptions: copy,
    description: copy.en || copy.ru || e.description,
    when: new Date(e.ends_at || e.starts_at).getTime() >= Date.now() ? 'upcoming' : 'past',
    ticket_types: db.prepare('SELECT * FROM ticket_types WHERE event_id = ? AND active = 1 ORDER BY CAST(price_usdt AS REAL) ASC, CAST(price_kgs AS REAL) ASC').all(e.id)
      .map(t => ({ ...t, available: t.supply == null ? null : Math.max(0, t.supply - (t.sold || 0) - pendingQty(t.id)) })),
  }
}

const saveEventCopy = (body, previous) => {
  const incoming = body?.descriptions
  const prev = eventCopy(previous || {})
  const en = incoming ? String(incoming.en ?? '') : (body?.description ?? prev.en)
  const ru = incoming ? String(incoming.ru ?? '') : prev.ru
  const descriptions = { en: String(en || '').trim(), ru: String(ru || '').trim() }
  return { description: descriptions.en || descriptions.ru || String(body?.description || previous?.description || ''), i18n: JSON.stringify(descriptions) }
}
const pendingQty = (ttId) =>
  db.prepare("SELECT COALESCE(SUM(quantity),0) AS n FROM orders WHERE ticket_type_id = ? AND status IN ('pending','review')").get(ttId).n

app.get('/api/events', (req, res) => {
  const when = req.query.when || 'upcoming'
  let events = db.prepare("SELECT * FROM events WHERE status = 'published' ORDER BY starts_at ASC").all().map(hydrateEvent)
  if (when !== 'all') events = events.filter(e => e.when === when)
  if (when === 'past') events.reverse()
  res.json({ events })
})

app.get('/api/events/:slug', (req, res) => {
  const e = db.prepare('SELECT * FROM events WHERE slug = ? OR id = ?').get(req.params.slug, Number(req.params.slug) || -1)
  if (!e) return res.status(404).json({ error: 'NOT_FOUND' })
  res.json({ event: hydrateEvent(e) })
})

// minimal admin CRUD so events can be added without a UI (x-admin-token)
app.post('/api/admin/events', requireAdmin, (req, res) => {
  const b = req.body || {}
  const slug = b.slug || (b.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + genToken(3).toLowerCase()
  const copy = saveEventCopy(b, {})
  const r = db.prepare('INSERT INTO events (title, slug, description, cover_image, venue, location, starts_at, ends_at, status, i18n) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(b.title || 'Untitled', slug, copy.description, b.cover_image || '', b.venue || '', b.location || '', b.starts_at || new Date().toISOString(), b.ends_at || '', b.status || 'published', copy.i18n)
  const eventId = Number(r.lastInsertRowid)
  for (const t of b.ticket_types || []) {
    db.prepare('INSERT INTO ticket_types (event_id, name, description, price_usdt, price_kgs, supply) VALUES (?,?,?,?,?,?)')
      .run(eventId, t.name || 'Ticket', t.description || '', String(t.price_usdt ?? '0'), String(t.price_kgs ?? '0'), t.supply ?? null)
  }
  res.json({ event: hydrateEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(eventId)) })
})

app.put('/api/admin/events/:id', requireAdmin, (req, res) => {
  const eventId = Number(req.params.id)
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId)
  if (!e) return res.status(404).json({ error: 'NOT_FOUND' })

  const b = req.body || {}
  const copy = saveEventCopy(b, e)
  db.prepare('UPDATE events SET title = ?, description = ?, cover_image = ?, venue = ?, location = ?, starts_at = ?, ends_at = ?, status = ?, i18n = ? WHERE id = ?')
    .run(b.title || e.title, copy.description, b.cover_image ?? e.cover_image, b.venue ?? e.venue,
         b.location ?? e.location, b.starts_at || e.starts_at, b.ends_at ?? e.ends_at, b.status || e.status, copy.i18n, eventId)

  // Update ticket types
  if (Array.isArray(b.ticket_types)) {
    for (const t of b.ticket_types) {
      if (t.id) {
        db.prepare('UPDATE ticket_types SET name = ?, description = ?, price_usdt = ?, price_kgs = ?, supply = ?, active = ? WHERE id = ?')
          .run(t.name, t.description || '', String(t.price_usdt ?? '0'), String(t.price_kgs ?? '0'), t.supply ?? null, t.active !== false ? 1 : 0, t.id)
      } else {
        db.prepare('INSERT INTO ticket_types (event_id, name, description, price_usdt, price_kgs, supply) VALUES (?,?,?,?,?,?)')
          .run(eventId, t.name || 'Ticket', t.description || '', String(t.price_usdt ?? '0'), String(t.price_kgs ?? '0'), t.supply ?? null)
      }
    }
  }

  res.json({ event: hydrateEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(eventId)) })
})

app.delete('/api/admin/events/:id', requireAdmin, (req, res) => {
  const eventId = Number(req.params.id)
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId)
  if (!e) return res.status(404).json({ error: 'NOT_FOUND' })

  db.prepare('DELETE FROM ticket_types WHERE event_id = ?').run(eventId)
  db.prepare('DELETE FROM events WHERE id = ?').run(eventId)
  res.json({ ok: true })
})

// ---------- contact ----------
app.post('/api/contact', async (req, res) => {
  const { name = '', contact = '', message = '', topic = 'general', blockchain = '' } = req.body || {}
  if (!message.trim() && !contact.trim()) return res.status(400).json({ error: 'EMPTY' })
  // Project submissions must be tied to a real Telegram login — the "Telegram" field on
  // the form is free text a submitter could fake, so admins always get the authenticated
  // identity too, straight from the session, never from client-supplied text.
  if (topic === 'thermopolium-submission') {
    if (!req.user) return res.status(401).json({ error: 'AUTH_REQUIRED' })
    // One submission per blockchain per Telegram account — keyed off the authenticated
    // user, not anything the form itself could be made to say.
    if (blockchain) {
      const dupe = db.prepare(
        "SELECT id FROM contact_messages WHERE topic = 'thermopolium-submission' AND user_id = ? AND message LIKE ?"
      ).get(req.user.id, `%Blockchain: ${blockchain}\n%`)
      if (dupe) return res.status(409).json({ error: 'ALREADY_SUBMITTED' })
    }
  }
  const text = String(message)
  const project = req.body?.project
  db.prepare('INSERT INTO contact_messages (user_id, name, contact, message, topic) VALUES (?,?,?,?,?)')
    .run(req.user?.id ?? null, name, contact, text, topic)
  if (topic === 'thermopolium-submission' && project) createProject(req.user.id, project)
  const who = req.user ? `${req.user.first_name} ${req.user.username ? '@' + req.user.username : ''}`.trim() : name || 'anonymous'
  const authLine = req.user
    ? `Authenticated Telegram: @${req.user.username || '—'} (id ${req.user.tg_id})`
    : 'Authenticated Telegram: — (not logged in)'
  await notifyAdmins(`📮 New "${topic}" message\n\nFrom: ${who}\n${authLine}\nContact (as entered): ${contact || '—'}\n\n${text}`)
  res.json({ ok: true })
})

// ---------- unified checkout ----------
app.post('/api/checkout', (req, res) => {
  const b = req.body || {}
  let order
  if (b.kind === 'ticket') {
    const tt = db.prepare('SELECT * FROM ticket_types WHERE id = ?').get(Number(b.ticket_type_id))
    if (!tt) return res.status(404).json({ error: 'TICKET_TYPE_NOT_FOUND' })
    const qty = Math.max(1, Math.min(20, Number(b.quantity) || 1))
    if (tt.supply != null && tt.supply - (tt.sold || 0) - pendingQty(tt.id) < qty) return res.status(409).json({ error: 'SOLD_OUT' })
    const base = (Number(tt.price_usdt) * qty).toFixed(2)
    const baseKgs = (Number(tt.price_kgs) * qty).toFixed(0)
    order = createOrder({
      kind: 'ticket', event_id: tt.event_id, ticket_type_id: tt.id, quantity: qty,
      user: req.user, buyer_name: b.buyer_name || '', buyer_contact: b.buyer_contact || '',
      baseUsdt: base, baseKgs,
    })
    if (order.status === 'paid') fulfillOrder(order) // free ticket
  } else if (b.kind === 'yoga_package') {
    if (!req.user) return res.status(401).json({ error: 'AUTH_REQUIRED' })
    const pkg = YOGA_PACKAGES[b.package]
    if (!pkg) return res.status(404).json({ error: 'PACKAGE_NOT_FOUND' })
    order = createOrder({ kind: 'yoga_package', item: pkg.key, user: req.user, baseUsdt: pkg.usdt, meta: { kgs: pkg.kgs } })
  } else if (b.kind === 'giftcard') {
    let baseUsdt, meta
    if (b.gift_kind === 'yoga_package') {
      const pkg = YOGA_PACKAGES[b.ref]
      if (!pkg) return res.status(404).json({ error: 'PACKAGE_NOT_FOUND' })
      baseUsdt = pkg.usdt; meta = { gift_kind: 'yoga_package', ref: pkg.key, kgs: pkg.kgs }
    } else if (b.gift_kind === 'vibecoding') {
      const prog = VIBECODING_PROGRAMS[b.ref]
      if (!prog) return res.status(404).json({ error: 'PROGRAM_NOT_FOUND' })
      baseUsdt = prog.usdt; meta = { gift_kind: 'vibecoding', ref: prog.key, kgs: prog.kgs }
    } else {
      const amt = Math.round(Number(b.amount))
      if (!amt || amt < 1 || amt > 10000) return res.status(400).json({ error: 'BAD_AMOUNT' })
      baseUsdt = String(amt); meta = { gift_kind: 'custom' }
    }
    order = createOrder({ kind: 'giftcard', item: b.gift_kind, user: req.user, buyer_name: b.buyer_name || '', buyer_contact: b.buyer_contact || '', baseUsdt, meta })
  } else {
    return res.status(400).json({ error: 'BAD_KIND' })
  }
  res.json({ order: orderView(order) })
})

function orderView(o) {
  if (!o) return null
  return {
    ...o, meta: JSON.parse(o.meta || '{}'),
    pay: {
      ton_address: process.env.TON_ADDRESS || '',
      alt_addresses: ALT_ADDRESSES,
      comment: o.comment_code,
      // KGST is 1:1 with KGS, so the som price is the amount to send — no conversion.
      kgst: Number(o.amount_kgs) > 0 ? { ...KGST, amount: o.amount_kgs } : null,
      // Fallback contact for an order nobody can pay yet (no USDT price, no KGST wallet set).
      bot: getBotUsername(),
    },
  }
}

app.get('/api/orders/:id', async (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id))
  if (!o) return res.status(404).json({ error: 'NOT_FOUND' })
  const view = orderView(o)
  if (o.status === 'paid') {
    if (o.kind === 'ticket') view.tickets = db.prepare('SELECT qr_token FROM tickets WHERE order_id = ?').all(o.id)
    if (o.kind === 'giftcard') view.giftcard = db.prepare('SELECT code, gift_kind, ref, amount_usdt FROM giftcards WHERE order_id = ?').get(o.id)
  }
  try { view.qr = await QRCode.toDataURL(process.env.TON_ADDRESS || '', { margin: 1, width: 240 }) } catch { /* noop */ }
  res.json({ order: view })
})

app.post('/api/orders/:id/ton-payload', async (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id))
  if (!o) return res.status(404).json({ error: 'NOT_FOUND' })
  if (o.status !== 'pending') return res.status(409).json({ error: 'NOT_PENDING' })
  try {
    res.json({ tx: await buildTonPayload(o, String(req.body?.sender || '')) })
  } catch (e) {
    console.error('[ton-payload]', e.message)
    res.status(500).json({ error: 'PAYLOAD_FAILED' })
  }
})

app.post('/api/orders/:id/submit-hash', async (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id))
  if (!o) return res.status(404).json({ error: 'NOT_FOUND' })
  if (o.status !== 'pending' && o.status !== 'review') return res.status(409).json({ error: 'NOT_PENDING' })
  const chain = String(req.body?.chain || 'ton')
  if (!['ton', 'trc20', 'sol', 'erc20', 'bsc'].includes(chain)) return res.status(400).json({ error: 'BAD_CHAIN' })
  const hash = String(req.body?.tx_hash || '').trim().slice(0, 120)
  if (!hash) return res.status(400).json({ error: 'NO_HASH' })
  db.prepare("UPDATE orders SET status = 'review', tx_hash = ?, chain = ? WHERE id = ?").run(hash, chain, o.id)
  await notifyAdmins(
    `🔎 Payment review — order #${o.id} (${o.kind})\nAmount: ${amountLabel(o)} on ${chain}\nHash: ${hash}\nBuyer: ${o.buyer_name || o.buyer_tg_id || 'guest'}`,
    { reply_markup: { inline_keyboard: [[{ text: '✅ Approve', callback_data: `ok:${o.id}` }, { text: '❌ Reject', callback_data: `no:${o.id}` }]] } })
  res.json({ ok: true, status: 'review' })
})

// ---------- tickets ----------
app.get('/api/tickets/:qr', async (req, res) => {
  const t = db.prepare('SELECT * FROM tickets WHERE qr_token = ?').get(req.params.qr)
  if (!t) return res.status(404).json({ error: 'NOT_FOUND' })
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(t.event_id)
  const tt = db.prepare('SELECT * FROM ticket_types WHERE id = ?').get(t.ticket_type_id)
  const qr = await QRCode.toDataURL(t.qr_token, { margin: 1, width: 320 })
  res.json({ ticket: t, event, ticket_type: tt, qr })
})

app.get('/api/me/tickets', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, e.title AS event_title, e.starts_at, tt.name AS type_name
    FROM tickets t JOIN events e ON e.id = t.event_id LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
    WHERE t.owner_user_id = ? ORDER BY t.created_at DESC`).all(req.user.id)
  res.json({ tickets: rows })
})

app.post('/api/checkin', requireAdmin, (req, res) => {
  const t = db.prepare('SELECT * FROM tickets WHERE qr_token = ?').get(String(req.body?.qr_token || ''))
  if (!t) return res.status(404).json({ error: 'NOT_FOUND' })
  if (t.status === 'checked_in') return res.json({ already: true, ticket: t })
  db.prepare("UPDATE tickets SET status = 'checked_in', checked_in_at = ? WHERE id = ?").run(new Date().toISOString(), t.id)
  res.json({ ok: true })
})

// ---------- yoga ----------
app.get('/api/yoga/state', requireAuth, (req, res) => {
  const packages = db.prepare('SELECT * FROM yoga_packages WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id)
  const classesLeft = packages.reduce((s, p) => s + p.classes_left, 0)
  const bookings = db.prepare("SELECT * FROM yoga_bookings WHERE user_id = ? AND status = 'booked' AND date >= date('now') ORDER BY date ASC").all(req.user.id)
  res.json({ classes_left: classesLeft, packages, bookings, catalog: Object.values(YOGA_PACKAGES), slots: Object.values(YOGA_SLOTS) })
})

app.post('/api/yoga/book', requireAuth, async (req, res) => {
  const { date, slot, pay_on_spot } = req.body || {}
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + 'T23:59:59').getTime() < Date.now()) {
    return res.status(400).json({ error: 'BAD_DATE' })
  }
  if (!YOGA_SLOTS[slot]) return res.status(400).json({ error: 'BAD_SLOT' })
  const dup = db.prepare("SELECT id FROM yoga_bookings WHERE user_id = ? AND date = ? AND slot = ? AND status = 'booked'").get(req.user.id, date, slot)
  if (dup) return res.status(409).json({ error: 'ALREADY_BOOKED' })

  let packageId = null
  if (!pay_on_spot) {
    const pkg = db.prepare('SELECT * FROM yoga_packages WHERE user_id = ? AND classes_left > 0 ORDER BY created_at ASC LIMIT 1').get(req.user.id)
    if (!pkg) return res.status(402).json({ error: 'NO_CLASSES', catalog: Object.values(YOGA_PACKAGES) })
    db.prepare('UPDATE yoga_packages SET classes_left = classes_left - 1 WHERE id = ?').run(pkg.id)
    packageId = pkg.id
  }
  db.prepare('INSERT INTO yoga_bookings (user_id, date, slot, package_id, pay_on_spot) VALUES (?,?,?,?,?)')
    .run(req.user.id, date, slot, packageId, pay_on_spot ? 1 : 0)
  const s = YOGA_SLOTS[slot]
  const who = `${req.user.first_name} ${req.user.username ? '@' + req.user.username : ''}`.trim()
  await notifyAdmins(`🧘 Yoga booking: ${who} — ${date} ${s.title} (${s.time})${pay_on_spot ? ' — PAYS ON THE SPOT' : ' — from package'}`)
  const left = db.prepare('SELECT COALESCE(SUM(classes_left),0) AS n FROM yoga_packages WHERE user_id = ?').get(req.user.id).n
  res.json({ ok: true, classes_left: left })
})

app.post('/api/yoga/redeem', requireAuth, (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase()
  const gift = db.prepare('SELECT * FROM giftcards WHERE code = ?').get(code)
  if (!gift) return res.status(404).json({ error: 'NOT_FOUND' })
  if (gift.redeemed_by) return res.status(409).json({ error: 'ALREADY_REDEEMED' })
  if (gift.gift_kind !== 'yoga_package') return res.status(400).json({ error: 'NOT_A_YOGA_GIFT' })
  const pkg = YOGA_PACKAGES[gift.ref]
  if (!pkg) return res.status(400).json({ error: 'BAD_GIFT' })
  db.prepare('UPDATE giftcards SET redeemed_by = ?, redeemed_at = ? WHERE id = ?').run(req.user.id, new Date().toISOString(), gift.id)
  db.prepare('INSERT INTO yoga_packages (user_id, package_key, classes_total, classes_left, giftcard_id) VALUES (?,?,?,?,?)')
    .run(req.user.id, pkg.key, pkg.classes, pkg.classes, gift.id)
  res.json({ ok: true, classes_added: pkg.classes })
})

// ---------- submissions ----------
const submissionSelect = `
  SELECT p.id, p.slug, p.name, p.blockchain, p.country, p.github, p.x, p.tg, p.link,
         p.description, p.image, p.category, p.submitter, p.created_at, p.hidden,
         u.username, u.first_name, u.last_name
  FROM projects p LEFT JOIN users u ON u.id = p.user_id`

app.get('/api/submissions', requireAuth, (req, res) => {
  const admin = !!req.user.is_admin
  const rows = admin
    ? db.prepare(`${submissionSelect} ORDER BY p.id DESC`).all()
    : db.prepare(`${submissionSelect} WHERE p.user_id = ? AND p.hidden = 0 ORDER BY p.id DESC`).all(req.user.id)
  res.json({
    scope: admin ? 'all' : 'mine',
    submissions: rows.map(row => ({
      id: row.id, slug: row.slug, name: row.name, blockchain: row.blockchain, country: row.country,
      github: row.github || '', x: row.x || '', tg: row.tg || '', link: row.link || '',
      description: row.description || '', image: row.image || '', category: row.category || '',
      submitter: row.submitter || '', created_at: row.created_at,
      ...(admin ? {
        username: row.username || '', first_name: row.first_name || '', last_name: row.last_name || '',
        hidden: !!row.hidden,
      } : {}),
    })),
  })
})

// ---------- broadcast messaging (admin only — bogidotcom) ----------
const BOT_TOKEN = process.env.BOT_TOKEN || ''

async function tg(method, body = {}) {
  if (!BOT_TOKEN) return { ok: false, description: 'NO_TOKEN' }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!data.ok) console.error(`[broadcast] ${method} failed:`, data.description)
    return data.ok ? { ok: true } : { ok: false, description: data.description || 'TELEGRAM_ERROR' }
  } catch (e) {
    console.error(`[broadcast] ${method} error:`, e.message)
    return { ok: false, description: e.message }
  }
}

app.post('/api/broadcast', requireAuth, async (req, res) => {
  if (req.user.username?.toLowerCase() !== 'bogidotcom') return res.status(403).json({ error: 'UNAUTHORIZED' })
  const { text = '', media_url = '', media_type = 'photo' } = req.body || {}
  if (!text.trim()) return res.status(400).json({ error: 'EMPTY_MESSAGE' })

  const users = db.prepare("SELECT tg_id FROM users WHERE tg_id IS NOT NULL AND tg_id != ''").all()
  if (!users.length) return res.status(404).json({ error: 'NO_USERS' })

  let sent = 0, failed = 0
  for (const user of users) {
    const html = { chat_id: user.tg_id, parse_mode: 'HTML' }
    const plain = { chat_id: user.tg_id }
    const attempt = (mode) => {
      if (media_url && media_type === 'photo') return tg('sendPhoto', { ...mode, photo: media_url, caption: text })
      if (media_url && media_type === 'video') return tg('sendVideo', { ...mode, video: media_url, caption: text })
      return tg('sendMessage', { ...mode, text, disable_web_page_preview: true })
    }
    let result = await attempt(html)
    if (!result.ok && /parse entities|can't parse/i.test(result.description || '')) result = await attempt(plain)
    if (result.ok) sent++
    else failed++
    await new Promise(r => setTimeout(r, 40))
  }
  res.json({ sent, failed, total: users.length })
})

// ---------- static (production build + tonconnect manifest) ----------
// Production: nginx serves dist/ and only proxies /thermopolium/api/ here. Set SERVE_STATIC=1 to serve it from Node instead.
if (process.env.SERVE_STATIC === '1' && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')))
}

startTherm(app, { notifyAdmins, requireAdmin })

app.listen(PORT, () => console.log(`[thermopolium] API on http://localhost:${PORT}`))
startWatcher(Number(process.env.WATCH_INTERVAL_MS || 20000))
startBot()
