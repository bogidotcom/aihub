// Заводит два события кампании «Кочевники → Создатели» на iamai.kg.
// Идемпотентно: повторный запуск обновляет существующие записи по slug.
//   node seed-nomads.mjs
import './env.js'
import { db } from './db.js'

// Кыргызстан — UTC+6, поэтому время храним со смещением, а не «наивным».
const E = [
  {
    slug: 'nomads-digital-nomads',
    title: 'Кочевники & Цифровые Кочевники',
    venue: 'Hotel Balyk, Иссык-Куль',
    starts_at: '2026-09-01T17:00:00+06:00',
    ends_at: '2026-09-01T21:00:00+06:00',
    cover_image: 'photos/cover-nomads-conference.jpg',
    description: `Вечер на берегу Иссык-Куля во время Всемирных игр кочевников.

Днём — адреналин Игр. Вечером — разговор о том, что дух кочевника значит в современной цифровой экономике: свобода, адаптивность, устойчивость.

В программе: выступления спикеров и истории основателей, дискуссия об удалённой работе и цифровых продуктах, нетворкинг с предпринимателями и цифровыми кочевниками.

Четыре часа. Русский и английский. Вход свободный.

—

An evening on the shore of Issyk-Kul during the World Nomad Games. Founder stories, a discussion on remote work and digital products, and networking with entrepreneurs and digital nomads. Four hours, Russian and English, free entry.`,
    tickets: [
      { name: 'Свободный вход', description: 'Регистрация обязательна — у зала есть вместимость', usdt: '0', kgs: '0', supply: 100 },
    ],
  },
  {
    slug: 'solo-founder-sprint',
    title: 'От идеи к цифровому продукту — 48-часовой спринт соло-фаундера',
    venue: 'Иссык-Куль',
    starts_at: '2026-08-31T12:00:00+06:00',
    ends_at: '2026-09-03T12:00:00+06:00',
    cover_image: 'photos/cover-nomads-sprint.jpg',
    description: `Практический воркшоп с ограниченным числом мест: за 48 часов работы превратить идею в работающий MVP — через lean-подход, no-code и AI-ускоренные процессы. Проходит во время Всемирных игр кочевников.

Приезжайте со своей идеей или присоединяйтесь к чужой команде.

Как устроены четыре дня:
31 августа — трансфер, заселение с 16:00, знакомство
1–2 сентября — рабочие дни: 08:00 йога, 09:00 завтрак, дальше сессии и работа над проектом
1 сентября, вечером — открытая конференция «Кочевники & Цифровые Кочевники» на той же площадке
3 сентября — закрывающий круг в 10:00, выселение и трансфер в 12:00

Что входит в стоимость: трансфер туда и обратно, проживание, питание, работа с менторами, обратная связь по проекту и утренняя йога.

Язык: русский и английский. Участие по заявке, всего 10 мест.

—

A hands-on sprint: turn one idea into a working MVP in 48 hours of work, using lean methods, no-code and AI-accelerated workflows. Transfer, accommodation, meals, mentors and morning yoga included. 10 seats, by application.`,
    tickets: [
      {
        name: 'Участие в спринте',
        description: 'Трансфер, проживание, питание, менторы и утренняя йога включены',
        usdt: '0', kgs: '25000', supply: 10,
      },
    ],
  },
]

const upsertEvent = (e) => {
  const row = db.prepare('SELECT id FROM events WHERE slug = ?').get(e.slug)
  if (row) {
    db.prepare(`UPDATE events SET title=?, description=?, cover_image=?, venue=?, starts_at=?, ends_at=?, status='published' WHERE id=?`)
      .run(e.title, e.description, e.cover_image, e.venue, e.starts_at, e.ends_at, row.id)
    return { id: row.id, created: false }
  }
  const r = db.prepare(`INSERT INTO events (title, slug, description, cover_image, venue, location, starts_at, ends_at, status)
    VALUES (?,?,?,?,?,'',?,?,'published')`)
    .run(e.title, e.slug, e.description, e.cover_image, e.venue, e.starts_at, e.ends_at)
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
  const price = e.tickets.map(t => Number(t.kgs) > 0 ? `${Number(t.kgs).toLocaleString('ru-RU')} KGS` : 'бесплатно').join(', ')
  console.log(`${created ? '+ создано' : '~ обновлено'}  #${id}  ${e.slug}  (${price}, билетов добавлено: ${added})`)
}

const total = db.prepare("SELECT COUNT(*) AS n FROM events WHERE status='published'").get().n
console.log(`опубликованных событий в базе: ${total}`)
