import { beginCell, Address, Cell } from '@ton/core'
import { db, genToken } from './db.js'
import { YOGA_PACKAGES } from './catalog.js'

const TON_ADDRESS = process.env.TON_ADDRESS || ''
const USDT_JETTON = process.env.USDT_JETTON || 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'
const TONCENTER_KEY = process.env.TONCENTER_KEY || ''
const USDT_DECIMALS = 6
const ORDER_TTL_MS = 30 * 60 * 1000

export const ALT_ADDRESSES = {
  trc20: process.env.TRC20_ADDRESS || '',
  sol: process.env.SOL_ADDRESS || '',
  erc20: process.env.ERC20_ADDRESS || '',
}

// KGST — the Kyrgyz som stablecoin on BNB Chain, pegged 1:1 to KGS.
// Prices in KGS are therefore payable one-for-one in KGST, with no FX rate involved.
// Settlement is manual (buyer submits the tx hash, admin approves) like the other non-TON chains.
//   token_address — the KGST BEP-20 contract, used to identify the token in a wallet
//   address       — OUR receiving wallet, set explicitly via KGST_ADDRESS.
// No fallback on purpose: sending to the wrong address burns the payment, so an
// unset KGST_ADDRESS hides the KGST option entirely rather than guessing a wallet.
export const KGST = {
  symbol: 'KGST',
  chain: 'bsc',
  chain_id: 56,
  token_address: '0x94be0bbA8E1E303fE998c9360B57b826F1A4f828',
  address: process.env.KGST_ADDRESS || '',
  rate_kgs: 1,
}

// ---- exact decimal → raw BigInt (no floats) ----
export function amountToRaw(amount, decimals = USDT_DECIMALS) {
  const [i, f = ''] = String(amount).split('.')
  return BigInt(i + f.padEnd(decimals, '0').slice(0, decimals))
}

export function createOrder({ kind, item = null, event_id = null, ticket_type_id = null, quantity = 1, user = null, buyer_name = '', buyer_contact = '', baseUsdt, baseKgs = 0, meta = {} }) {
  // Round amounts; orders are told apart by the transfer comment (comment_code),
  // with exact amount + time as fallback for payers who omit the comment.
  const amount = Number(baseUsdt) > 0 ? String(Number(baseUsdt)) : '0'
  const amountKgs = Number(baseKgs) > 0 ? String(Number(baseKgs)) : '0'
  const code = 'HUB-' + genToken(4).toUpperCase().replace(/[^A-Z0-9]/g, 'X').slice(0, 6)
  const expires = new Date(Date.now() + ORDER_TTL_MS).toISOString()
  // Free only when it costs nothing in either currency — a KGS-only ticket still has to be paid.
  const free = Number(baseUsdt) <= 0 && Number(baseKgs) <= 0
  const r = db.prepare(`INSERT INTO orders
    (kind, item, event_id, ticket_type_id, quantity, buyer_user_id, buyer_tg_id, buyer_name, buyer_contact, amount, amount_kgs, comment_code, expires_at, meta, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(kind, item, event_id, ticket_type_id, quantity, user?.id ?? null, user?.tg_id ?? null,
      buyer_name || user?.first_name || '', buyer_contact, amount, amountKgs, code, expires, JSON.stringify(meta),
      free ? 'paid' : 'pending')
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(r.lastInsertRowid))
  return order
}

// ---- fulfillment ----
let notifyFn = async () => {}
let notifyAdminsFn = async () => {}
export function setNotifiers({ notify, notifyAdmins }) { notifyFn = notify; notifyAdminsFn = notifyAdmins }

export function fulfillOrder(order) {
  const meta = safeJson(order.meta)
  if (order.kind === 'ticket') {
    const existing = db.prepare('SELECT * FROM tickets WHERE order_id = ?').all(order.id)
    if (!existing.length) {
      const ins = db.prepare('INSERT INTO tickets (event_id, ticket_type_id, order_id, owner_user_id, holder_name, qr_token) VALUES (?,?,?,?,?,?)')
      for (let i = 0; i < (order.quantity || 1); i++) {
        ins.run(order.event_id, order.ticket_type_id, order.id, order.buyer_user_id, order.buyer_name || '', genToken(18))
      }
      db.prepare('UPDATE ticket_types SET sold = sold + ? WHERE id = ?').run(order.quantity || 1, order.ticket_type_id)
    }
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(order.event_id)
    const tickets = db.prepare('SELECT * FROM tickets WHERE order_id = ?').all(order.id)
    if (order.buyer_tg_id) {
      const base = process.env.WEB_APP_URL || ''
      const links = tickets.map(t => base ? `${base}/ticket/${t.qr_token}` : t.qr_token).join('\n')
      notifyFn(order.buyer_tg_id, `🎉 Your ticket${tickets.length > 1 ? 's are' : ' is'} confirmed!\n\n${event?.title || 'Event'}\n${links}`)
    }
    notifyAdminsFn(`💸 Ticket order #${order.id} paid — ${order.quantity}× for "${event?.title}" (${amountLabel(order)}) by ${buyerLabel(order)}`)
  }
  if (order.kind === 'yoga_package') {
    const pkg = YOGA_PACKAGES[order.item]
    if (pkg && order.buyer_user_id) {
      const existing = db.prepare('SELECT id FROM yoga_packages WHERE order_id = ?').get(order.id)
      if (!existing) {
        db.prepare('INSERT INTO yoga_packages (user_id, package_key, classes_total, classes_left, order_id) VALUES (?,?,?,?,?)')
          .run(order.buyer_user_id, pkg.key, pkg.classes, pkg.classes, order.id)
      }
      if (order.buyer_tg_id) notifyFn(order.buyer_tg_id, `🧘 Your yoga package "${pkg.title}" is active — ${pkg.classes} class${pkg.classes > 1 ? 'es' : ''} added to your profile.`)
    }
    notifyAdminsFn(`💸 Yoga package "${YOGA_PACKAGES[order.item]?.title || order.item}" paid (#${order.id}, ${amountLabel(order)}) by ${buyerLabel(order)}`)
  }
  if (order.kind === 'giftcard') {
    let gift = db.prepare('SELECT * FROM giftcards WHERE order_id = ?').get(order.id)
    if (!gift) {
      const code = 'GIFT-' + genToken(6).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8).padEnd(8, '7')
      db.prepare('INSERT INTO giftcards (code, gift_kind, ref, amount_usdt, amount_kgs, order_id, buyer_user_id) VALUES (?,?,?,?,?,?,?)')
        .run(code, meta.gift_kind, meta.ref || '', order.amount, String(meta.kgs || ''), order.id, order.buyer_user_id)
      gift = db.prepare('SELECT * FROM giftcards WHERE order_id = ?').get(order.id)
    }
    if (order.buyer_tg_id) notifyFn(order.buyer_tg_id, `🎁 Your gift card is ready!\n\nCode: ${gift.code}\n\nThe recipient can redeem it in the app (Yoga → Redeem gift) or show it at the hub.`)
    notifyAdminsFn(`💸 Gift card ${gift.code} (${meta.gift_kind}${meta.ref ? ' / ' + meta.ref : ''}) paid (#${order.id}, ${amountLabel(order)}) by ${buyerLabel(order)}`)
  }
}

// Orders can be priced in USDT, in KGS (paid as KGST), or both.
export const amountLabel = (o) => [
  Number(o.amount) > 0 ? `${o.amount} USDT` : '',
  Number(o.amount_kgs) > 0 ? `${o.amount_kgs} KGS/KGST` : '',
].filter(Boolean).join(' or ') || 'free'

const buyerLabel = (o) => {
  const u = o.buyer_user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(o.buyer_user_id) : null
  return u ? `${u.first_name} ${u.username ? '@' + u.username : ''}`.trim() : (o.buyer_name || 'guest')
}
const safeJson = (s) => { try { return JSON.parse(s || '{}') } catch { return {} } }

export function markPaid(order, txHash) {
  db.prepare("UPDATE orders SET status = 'paid', tx_hash = ?, paid_at = ? WHERE id = ?")
    .run(txHash || order.tx_hash || '', new Date().toISOString(), order.id)
  fulfillOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id))
}

// ---- TON chain watcher (toncenter v3, jetton transfers in) ----
async function fetchTonUsdtTransfers() {
  const url = new URL('https://toncenter.com/api/v3/jetton/transfers')
  url.searchParams.set('owner_address', TON_ADDRESS)
  url.searchParams.set('direction', 'in')
  url.searchParams.set('limit', '64')
  const headers = TONCENTER_KEY ? { 'X-API-Key': TONCENTER_KEY } : {}
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`toncenter ${res.status}`)
  const data = await res.json()
  const masterRaw = Address.parse(USDT_JETTON).toRawString().toLowerCase()
  return (data.jetton_transfers || [])
    .filter(t => {
      try { return Address.parseRaw(t.jetton_master).toRawString().toLowerCase() === masterRaw } catch { return false }
    })
    .map(t => ({
      amountRaw: BigInt(t.amount),
      tsMs: (t.transaction_now || 0) * 1000,
      hash: t.transaction_hash || '',
      comment: parseComment(t.forward_payload),
    }))
}

// forward_payload cell: 0x00000000 (text op) + string tail
function parseComment(b64) {
  try {
    if (!b64) return ''
    const s = Cell.fromBase64(b64).beginParse()
    if (s.loadUint(32) !== 0) return ''
    return s.loadStringTail().trim().toUpperCase()
  } catch { return '' }
}

const orderCreatedMs = (order) =>
  new Date(order.created_at.includes('Z') ? order.created_at : order.created_at + 'Z').getTime() - 5 * 60000

// Strong match: transfer carries the order's comment code and covers the amount.
function matchesByComment(order, transfer) {
  return transfer.comment && transfer.comment === String(order.comment_code || '').toUpperCase()
    && transfer.amountRaw >= amountToRaw(order.amount)
}

// Fallback (payer omitted the comment): exact amount within the order's lifetime.
function matchesByAmount(order, transfer) {
  return transfer.amountRaw === amountToRaw(order.amount) && transfer.tsMs >= orderCreatedMs(order)
}

export function startWatcher(intervalMs = 20000) {
  const tick = async () => {
    const pending = db.prepare("SELECT * FROM orders WHERE status = 'pending'").all()
    if (!pending.length) return
    // expire stale first
    let live = []
    for (const o of pending) {
      if (o.expires_at && new Date(o.expires_at).getTime() < Date.now()) {
        db.prepare("UPDATE orders SET status = 'expired' WHERE id = ?").run(o.id)
      } else live.push(o)
    }
    // The watcher only settles USDT-on-TON. Orders priced solely in KGS (paid in KGST)
    // carry amount '0' and must never be matched by an incoming TON transfer.
    live = live.filter(o => Number(o.amount) > 0)
    if (!live.length || !TON_ADDRESS) return
    try {
      const transfers = await fetchTonUsdtTransfers()
      // a transfer can settle at most one order — round amounts collide, comments don't
      const used = new Set(db.prepare("SELECT tx_hash FROM orders WHERE tx_hash IS NOT NULL AND tx_hash != ''").all().map(r => r.tx_hash))
      for (const pass of [matchesByComment, matchesByAmount]) {
        for (const order of live) {
          if (order.done) continue
          const match = transfers.find(t => !used.has(t.hash) && pass(order, t))
          if (match) {
            used.add(match.hash)
            order.done = true
            console.log(`[payments] order #${order.id} paid on TON (${order.amount} USDT, ${match.comment ? 'comment' : 'amount'} match)`)
            markPaid(order, match.hash)
          }
        }
      }
    } catch (e) {
      console.error('[payments] watcher error:', e.message)
    }
  }
  tick()
  return setInterval(tick, intervalMs)
}

// ---- TON Connect: build a USDT jetton-transfer message for the connected wallet ----
async function runGetMethod(address, method, stack) {
  const res = await fetch('https://toncenter.com/api/v2/runGetMethod', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(TONCENTER_KEY ? { 'X-API-Key': TONCENTER_KEY } : {}) },
    body: JSON.stringify({ address, method, stack }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error('runGetMethod failed')
  return data.result
}

export async function buildTonPayload(order, senderAddress) {
  const sender = Address.parse(senderAddress)
  // sender's USDT jetton-wallet address
  const slice = beginCell().storeAddress(sender).endCell().toBoc().toString('base64')
  const result = await runGetMethod(USDT_JETTON, 'get_wallet_address', [['tvm.Slice', slice]])
  const entry = result.stack?.[0]
  const bytes = entry?.[1]?.bytes || entry?.[1] || entry?.value
  if (!bytes || typeof bytes !== 'string') throw new Error('unexpected get_wallet_address result')
  const jettonWallet = Cell.fromBoc(Buffer.from(bytes, 'base64'))[0].beginParse().loadAddress()

  const comment = beginCell().storeUint(0, 32).storeStringTail(order.comment_code || `HUB-${order.id}`).endCell()
  const body = beginCell()
    .storeUint(0x0f8a7ea5, 32)                       // jetton transfer op
    .storeUint(BigInt(Date.now()), 64)               // query id
    .storeCoins(amountToRaw(order.amount))           // USDT amount (raw, 6 dp)
    .storeAddress(Address.parse(TON_ADDRESS))        // destination owner
    .storeAddress(sender)                            // excess gas back to sender
    .storeMaybeRef(null)                             // no custom payload
    .storeCoins(1n)                                  // forward 1 nanoton → notify receiver
    .storeMaybeRef(comment)                          // forward payload: text comment
    .endCell()

  return {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [{
      address: jettonWallet.toString({ bounceable: true }),
      amount: '60000000',                            // 0.06 TON gas budget
      payload: body.toBoc().toString('base64'),
    }],
  }
}
