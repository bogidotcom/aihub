import crypto from 'node:crypto'
import { db, genToken } from './db.js'

const BOT_TOKEN = process.env.BOT_TOKEN || ''
const ADMIN_USERNAMES = (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000

// Telegram Mini App initData: HMAC-SHA256 chain keyed with "WebAppData"
export function validateInitData(initData) {
  if (!initData || !BOT_TOKEN) return null
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return null
    params.delete('hash')
    const dataCheckString = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n')
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
    const computed = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
    if (computed !== hash) return null
    const authDate = Number(params.get('auth_date') || 0)
    if (authDate && Date.now() / 1000 - authDate > 24 * 3600) return null
    return JSON.parse(params.get('user') || 'null')
  } catch { return null }
}

// Telegram Login Widget: secret = SHA256(botToken)
export function validateWidget(data) {
  if (!data || !data.hash || !BOT_TOKEN) return null
  try {
    const { hash, ...rest } = data
    const dataCheckString = Object.keys(rest)
      .filter(k => rest[k] !== undefined && rest[k] !== null && rest[k] !== '')
      .sort()
      .map(k => `${k}=${rest[k]}`)
      .join('\n')
    const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest()
    const computed = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
    if (computed !== hash) return null
    if (data.auth_date && Date.now() / 1000 - Number(data.auth_date) > 24 * 3600) return null
    return data
  } catch { return null }
}

export function upsertUser(tgUser) {
  const tgId = String(tgUser.id)
  const username = tgUser.username || ''
  const isAdmin = ADMIN_USERNAMES.includes(username.toLowerCase()) ? 1 : 0
  const existing = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId)
  if (existing) {
    db.prepare('UPDATE users SET username = ?, first_name = ?, last_name = ?, photo_url = ?, is_admin = MAX(is_admin, ?) WHERE tg_id = ?')
      .run(username, tgUser.first_name || '', tgUser.last_name || '', tgUser.photo_url || existing.photo_url || '', isAdmin, tgId)
    return db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId)
  }
  db.prepare('INSERT INTO users (tg_id, username, first_name, last_name, photo_url, is_admin) VALUES (?,?,?,?,?,?)')
    .run(tgId, username, tgUser.first_name || '', tgUser.last_name || '', tgUser.photo_url || '', isAdmin)
  return db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId)
}

export function createSession(userId) {
  const token = genToken(32)
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)').run(token, userId, expires)
  return token
}

export function attachUser(req, _res, next) {
  req.user = null
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.headers['x-session-token']
  if (token) {
    const s = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token)
    if (s && new Date(s.expires_at).getTime() > Date.now()) {
      req.user = db.prepare('SELECT * FROM users WHERE id = ?').get(s.user_id) || null
    }
  }
  if (!req.user && req.headers['x-admin-token'] && req.headers['x-admin-token'] === (process.env.ADMIN_API_TOKEN || '')) {
    req.user = { id: 0, is_admin: 1, first_name: 'API', tg_id: null }
  }
  next()
}

export const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'AUTH_REQUIRED' })
export const requireAdmin = (req, res, next) => req.user?.is_admin ? next() : res.status(403).json({ error: 'ADMIN_ONLY' })

export function adminChatIds() {
  return db.prepare('SELECT tg_id FROM users WHERE is_admin = 1 AND tg_id IS NOT NULL').all().map(r => r.tg_id)
}
