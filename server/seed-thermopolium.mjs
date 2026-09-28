// Заводит событие «Thermopolium» (сайд-трек хакатона Colosseum) на iamai.kg.
// Идемпотентно: повторный запуск обновляет существующую запись по slug.
//   node seed-thermopolium.mjs
import './env.js'
import { db } from './db.js'

// Многодневное событие: время суток не важно, поэтому ставим полдень UTC — так дата не «уезжает» в соседний день ни в одном часовом поясе.
const E = [
  {
    slug: 'thermopolium',
    title: 'Thermopolium × Colosseum World\'s Fair',
    venue: '',
    starts_at: '2026-09-28T12:00:00Z',
    ends_at: '2026-10-12T12:00:00Z',
    cover_image: 'photos/cover-hackathon.jpg',
    description: `Сайд-трек хакатона Colosseum World's Fair. Как старая уличная лавка у арены — соревнуйтесь в основном треке и подайтесь ещё и сюда, за дополнительный шанс.

Мы оцениваем слой локального фиата и AI-агентов. 🏆 Призы: $1000 в эквиваленте локального ai-стейблкоина — по призу на каждую страну, где есть DAI.

Стройте на любом блокчейне — Solana, Ethereum, Hydromancer, Base, Tempo, Arbitrum, Zcash, Robinhood Chain, или на самой сети DAI. Единственное обязательное условие: использовать DAI хоть как-то — DAI Miner (iamai.kg), запускающий job, skill, agent или chat-флоу, который судья может запустить сам; DAI MCP; расчёты в локальном стейбле; или peer-ноды. Например: P2P AI-агент, торгующий USDT против вашего локального стейблкоина на любом из блокчейнов выше. Внешние инструменты и MCP-серверы разрешены — чем больше «тяжёлой» логики остаётся на DAI, а не просто оборачивает готовый API, тем выше оценка.

Регистрация — как обычно, через Telegram. В форме заявки выберите блокчейн и страну (по одной заявке на блокчейн с одного Telegram-аккаунта).

28 сентября — 12 октября 2026.

—

A side track next to the Colosseum World's Fair hackathon. Same idea as the old street stall beside the arena: compete in the main event, and submit here too for an extra shot.

We score the local-fiat / agent layer. 🏆 Reward: $1,000 equivalent in local ai-stablecoins — one prize per country DAI supports.

Build on any chain — Solana, Ethereum, Hydromancer, Base, Tempo, Arbitrum, Zcash, Robinhood Chain, or DAI Network itself. The one hard requirement is that it uses DAI somehow: DAI Miner (iamai.kg) running a job, skill, agent, or chat flow a judge can actually trigger; DAI MCP; local-stable settlement; or peer nodes. Example: a P2P AI agent that trades USDT against your local stablecoin on any of the chains above. External tools and other MCP servers are allowed — the more of the heavy lifting stays on DAI instead of just wrapping a hosted API, the higher the score.

Registration is as usual, via Telegram. The submission form asks for your blockchain and country (one submission per blockchain per Telegram account).

Sep 28 — Oct 12, 2026.`,
    tickets: [
      { name: 'Submit a project', description: 'Free — sign in with Telegram, pick your blockchain & country', usdt: '0', kgs: '0', supply: null },
    ],
  },
]

const splitCopy = (text) => {
  const parts = String(text || '').split(/\n—\n/)
  if (parts.length < 2) return { en: String(text || '').trim(), ru: '' }
  return { ru: parts[0].trim(), en: parts.slice(1).join('\n—\n').trim() }
}

const upsertEvent = (e) => {
  const copy = splitCopy(e.description)
  const i18n = JSON.stringify(copy)
  const row = db.prepare('SELECT id FROM events WHERE slug = ?').get(e.slug)
  if (row) {
    db.prepare(`UPDATE events SET title=?, description=?, cover_image=?, venue=?, starts_at=?, ends_at=?, status='published', i18n=? WHERE id=?`)
      .run(e.title, copy.en || copy.ru, e.cover_image, e.venue, e.starts_at, e.ends_at, i18n, row.id)
    return { id: row.id, created: false }
  }
  const r = db.prepare(`INSERT INTO events (title, slug, description, cover_image, venue, location, starts_at, ends_at, status, i18n)
    VALUES (?,?,?,?,?,'',?,?,'published',?)`)
    .run(e.title, e.slug, copy.en || copy.ru, e.cover_image, e.venue, e.starts_at, e.ends_at, i18n)
  return { id: Number(r.lastInsertRowid), created: true }
}

const upsertTicket = (eventId, t) => {
  const row = db.prepare('SELECT id FROM ticket_types WHERE event_id = ? AND name = ?').get(eventId, t.name)
  if (row) {
    db.prepare('UPDATE ticket_types SET description=?, price_usdt=?, price_kgs=?, supply=?, active=1 WHERE id=?')
      .run(t.description, t.usdt, t.kgs, t.supply, row.id)
    return false
  }
  db.prepare('INSERT INTO ticket_types (event_id, name, description, price_usdt, price_kgs, supply) VALUES (?,?,?,?,?,?)')
    .run(eventId, t.name, t.description, t.usdt, t.kgs, t.supply)
  return true
}

for (const e of E) {
  const { id, created } = upsertEvent(e)
  const added = e.tickets.map(t => upsertTicket(id, t)).filter(Boolean).length
  console.log(`${created ? '+ created' : '~ updated'}  #${id}  ${e.slug}  (tickets added: ${added})`)
}

const total = db.prepare("SELECT COUNT(*) AS n FROM events WHERE status='published'").get().n
console.log(`published events in db: ${total}`)
