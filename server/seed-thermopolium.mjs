// Заводит событие THERM. Повторный запуск обновляет запись по slug.
//   node seed-thermopolium.mjs
import './env.js'
import { db } from './db.js'

const E = [
  {
    slug: 'thermopolium',
    title: 'THERM',
    venue: '',
    starts_at: '2026-09-28T12:00:00Z',
    ends_at: '2026-12-31T12:00:00Z',
    cover_image: '',
    description: `Заявка для Solana-приложений, которые платят за инференс токеном THERM.

1 THERM — это 29,3 кВт·ч. Один токен оплачивает 100 000 000 AI-токенов. Цена запроса берётся из оценки работы на https://iamai.kg/docs/#jobs. Оплата — перевод SPL или Solana x402. Ответ приходит в memo транзакции, его же может прочитать любой контракт.

Вход через Telegram. В форме: имя, приложение, что оно делает с THERM, https-ссылка. Голосования нет.

—

Apply a Solana app that pays for inference with THERM.

1 THERM is 29.3 kWh. One token pays for 100,000,000 AI tokens. The price of a request comes from the job estimate at https://iamai.kg/docs/#jobs. Payment is an SPL transfer or Solana x402. The reply is in the transaction memo, and any contract can read that same reply.

Sign in with Telegram. The form asks for your name, the app, what it does with THERM, and an https link. There is no vote.`,
    tickets: [
      { name: 'Apply', description: 'Free. Sign in with Telegram and describe the app.', usdt: '0', kgs: '0', supply: null },
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

db.prepare(`UPDATE ticket_types SET name = 'Apply'
  WHERE name = 'Submit a project'
    AND event_id = (SELECT id FROM events WHERE slug = 'thermopolium')`).run()

for (const e of E) {
  const { id, created } = upsertEvent(e)
  const added = e.tickets.map(t => upsertTicket(id, t)).filter(Boolean).length
  console.log(`${created ? '+ created' : '~ updated'}  #${id}  ${e.slug}  (tickets added: ${added})`)
}

const total = db.prepare("SELECT COUNT(*) AS n FROM events WHERE status='published'").get().n
console.log(`published events in db: ${total}`)
