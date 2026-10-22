import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, 'hub.db'))

db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id TEXT UNIQUE,
  username TEXT, first_name TEXT, last_name TEXT, photo_url TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT, slug TEXT UNIQUE, description TEXT, cover_image TEXT,
  venue TEXT, location TEXT, starts_at TEXT, ends_at TEXT,
  status TEXT DEFAULT 'published',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER, name TEXT, description TEXT,
  price_usdt TEXT DEFAULT '0', price_kgs TEXT DEFAULT '0',
  supply INTEGER, sold INTEGER DEFAULT 0, active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT,                       -- ticket | yoga_package | giftcard
  item TEXT,                       -- package key / gift kind (tickets use ids below)
  event_id INTEGER, ticket_type_id INTEGER, quantity INTEGER DEFAULT 1,
  buyer_user_id INTEGER, buyer_tg_id TEXT, buyer_name TEXT, buyer_contact TEXT,
  amount TEXT, currency TEXT DEFAULT 'USDT', chain TEXT DEFAULT 'ton',
  comment_code TEXT,
  status TEXT DEFAULT 'pending',   -- pending | review | paid | expired | rejected
  tx_hash TEXT, meta TEXT DEFAULT '{}',
  paid_at TEXT, expires_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER, ticket_type_id INTEGER, order_id INTEGER, owner_user_id INTEGER,
  holder_name TEXT, qr_token TEXT UNIQUE,
  status TEXT DEFAULT 'issued',    -- issued | checked_in | void
  checked_in_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS yoga_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, package_key TEXT, classes_total INTEGER, classes_left INTEGER,
  order_id INTEGER, giftcard_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS yoga_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, date TEXT, slot TEXT,          -- sunrise | sunset
  package_id INTEGER,                             -- NULL when pay-on-spot
  pay_on_spot INTEGER DEFAULT 0,
  status TEXT DEFAULT 'booked',                   -- booked | attended | cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS giftcards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  gift_kind TEXT,                 -- yoga_package | vibecoding | custom
  ref TEXT,                       -- package key / program key
  amount_usdt TEXT, amount_kgs TEXT,
  order_id INTEGER, buyer_user_id INTEGER,
  redeemed_by INTEGER, redeemed_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, name TEXT, contact TEXT, message TEXT, topic TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT
);

-- $THERM transfers that carry a memo: the memo is the prompt, the answer is a signed DAI job's result.
CREATE TABLE IF NOT EXISTS therm_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sig TEXT UNIQUE,                 -- Solana transaction signature
  slot INTEGER, block_time INTEGER,
  sender TEXT,                     -- wallet that paid (owner of the debited token account)
  amount_raw TEXT, decimals INTEGER, therm REAL,
  memo TEXT,
  status TEXT,                     -- received | queued | computing | done | error | insufficient | no_memo
  allowance_tokens INTEGER,        -- AI tokens the transfer pays for (therm x rate)
  estimate_tokens INTEGER, estimate_source TEXT,  -- node | heuristic
  budget_udai INTEGER,
  job_id TEXT, answer TEXT, error TEXT, raw TEXT,
  hidden INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at TEXT
);
CREATE INDEX IF NOT EXISTS therm_posts_status ON therm_posts (status);

-- Projects submitted through Thermopolium; the community ranks them with $THERM.
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE, user_id INTEGER,
  name TEXT, blockchain TEXT, country TEXT,
  github TEXT, x TEXT, tg TEXT, link TEXT,
  hidden INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- One vote per Solana wallet; weight is that wallet's THERM balance, refreshed from chain.
CREATE TABLE IF NOT EXISTS project_votes (
  wallet TEXT PRIMARY KEY, project_id INTEGER,
  weight REAL DEFAULT 0, signature TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at TEXT
);
`)

// migration: local currency AMD → KGS (pre-2026-08 databases)
for (const [table, from, to] of [['ticket_types', 'price_amd', 'price_kgs'], ['giftcards', 'amount_amd', 'amount_kgs']]) {
  try { db.exec(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`) } catch { /* already renamed */ }
}

// migration: KGS-denominated orders, settled in KGST
for (const [table, column, decl] of [
  ['orders', 'amount_kgs', "TEXT DEFAULT '0'"],           // what a KGST payer owes (KGST is 1:1 with KGS)
]) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`) } catch { /* already added */ }
}

// migration: Colosseum page details stored with a submission
for (const [column, decl] of [
  ['description', 'TEXT'],
  ['image', 'TEXT'],
  ['category', 'TEXT'],
  ['details', 'TEXT'],
  ['submitter', 'TEXT'],
]) {
  try { db.exec(`ALTER TABLE projects ADD COLUMN ${column} ${decl}`) } catch { /* already added */ }
}

try { db.exec('ALTER TABLE events ADD COLUMN i18n TEXT') } catch { /* already added */ }

// migration: the reply is now sent on-chain (dust $THERM + answer in the memo), not just stored
for (const [column, decl] of [
  ['reply_sig', 'TEXT'],       // signature of the reply transaction, once sent
  ['reply_status', 'TEXT'],    // NULL | sent | error
]) {
  try { db.exec(`ALTER TABLE therm_posts ADD COLUMN ${column} ${decl}`) } catch { /* already added */ }
}

db.exec(`
CREATE TABLE IF NOT EXISTS wallet_links (
  wallet TEXT PRIMARY KEY,
  user_id INTEGER,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS post_claims (
  sig TEXT PRIMARY KEY,
  user_id INTEGER,
  created_at TEXT
);
`)

export const genToken = (n = 18) => crypto.randomBytes(n).toString('base64url')

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  if (!row) return fallback
  try { return JSON.parse(row.value) } catch { return fallback }
}

export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value))
}

export function seedDemoEvents() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM events').get().n
  if (n > 0) return
  const insEvent = db.prepare(
    'INSERT INTO events (title, slug, description, cover_image, venue, location, starts_at, ends_at) VALUES (?,?,?,?,?,?,?,?)')
  const insTt = db.prepare(
    'INSERT INTO ticket_types (event_id, name, description, price_usdt, price_kgs, supply) VALUES (?,?,?,?,?,?)')

  const inDays = (d, h = 18) => { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(h, 0, 0, 0); return t.toISOString() }

  const e1 = insEvent.run('AIHub Opening Meetup', 'opening-meetup',
    'First community gathering at the hub — meet the residents, see the space, talk AI-native business over dinner.',
    'photos/cover-opening.jpg', 'AIHub Countryside', '', inDays(14), inDays(14, 22)).lastInsertRowid
  insTt.run(e1, 'Community', 'Entry + dinner', '15', '1300', 60)
  insTt.run(e1, 'Supporter', 'Entry + dinner + hub tour', '42', '3700', 20)

  const e2 = insEvent.run('Vibe-Coding Demo Night', 'demo-night',
    'Residents demo what they built this month. Live music after.',
    'photos/cover-demo.jpg', 'AIHub Countryside', '', inDays(30, 19), inDays(30, 23)).lastInsertRowid
  insTt.run(e2, 'Free entry', 'RSVP required', '0', '0', 100)

  const e3 = insEvent.run('Hackathon: Automate Your Business', 'hackathon-automate',
    '48h building AI automations for real local businesses. Teams of 2-4, prizes from sponsors.',
    'photos/cover-hackathon.jpg', 'AIHub Countryside', '', inDays(-20, 10), inDays(-18, 20)).lastInsertRowid
  insTt.run(e3, 'Hacker', 'Full weekend + meals', '25', '2200', 40)
}
