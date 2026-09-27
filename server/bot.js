// Dependency-free Telegram bot: long polling via the raw Bot API.
import { db } from './db.js'
import { upsertUser, adminChatIds } from './auth.js'
import { markPaid } from './payments.js'

const TOKEN = process.env.BOT_TOKEN || ''
const WEB_APP_URL = process.env.WEB_APP_URL || ''
let BOT_USERNAME = ''

async function tg(method, body = {}) {
  if (!TOKEN) return null
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!data.ok) console.error(`[bot] ${method} failed:`, data.description)
    return data.ok ? data.result : null
  } catch (e) {
    console.error(`[bot] ${method} error:`, e.message)
    return null
  }
}

export const sendTo = (chatId, text, extra = {}) =>
  tg('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, ...extra })

export async function notifyAdmins(text, extra = {}) {
  for (const id of adminChatIds()) await sendTo(id, text, extra)
}

export function getBotUsername() { return BOT_USERNAME }

function mainMenuKeyboard() {
  const rows = []
  if (WEB_APP_URL) {
    if (WEB_APP_URL.startsWith('https://')) {
      rows.push([{ text: '🌿 Open Thermopolium', web_app: { url: WEB_APP_URL } }])
    } else if (WEB_APP_URL.startsWith('http://')) {
      rows.push([{ text: '🌿 Open Thermopolium', url: WEB_APP_URL }])
    }
  }
  return rows.length ? { inline_keyboard: rows } : undefined
}

async function onMessage(msg) {
  const chatId = msg.chat?.id
  const from = msg.from
  if (!chatId || !from || from.is_bot) return
  const text = (msg.text || '').trim()

  // every /start creates/refreshes the profile; admins (by username) get flagged
  const user = upsertUser(from)

  if (text.startsWith('/start')) {
    const hello = user.is_admin
      ? `Welcome back, ${from.first_name}! You are an admin — I'll send you order and contact notifications here.`
      : `🌿 Welcome to AIHub Kyrgyzstan, ${from.first_name}!\n\nBuild digital businesses with AI. Join our community in the app.`
    const markup = mainMenuKeyboard()
    await sendTo(chatId, hello, markup ? { reply_markup: markup } : {})
    return
  }
  if (text === '/id') {
    await sendTo(chatId, `Your Telegram ID: ${from.id}\nChat ID: ${chatId}`)
    return
  }
  if (text === '/mytickets') {
    const rows = db.prepare(`
      SELECT t.qr_token, e.title FROM tickets t JOIN events e ON e.id = t.event_id
      JOIN users u ON u.id = t.owner_user_id WHERE u.tg_id = ? AND t.status != 'void'`).all(String(from.id))
    if (!rows.length) {
      const markup = mainMenuKeyboard()
      return sendTo(chatId, 'No tickets yet — grab one in the app!', markup ? { reply_markup: markup } : {})
    }
    const base = WEB_APP_URL ? `${WEB_APP_URL}/ticket/` : ''
    return sendTo(chatId, rows.map(r => `🎟 ${r.title}\n${base ? base + r.qr_token : r.qr_token}`).join('\n\n'))
  }
  const markup = mainMenuKeyboard()
  await sendTo(chatId, 'Hi! Use the button below to open the app, or /mytickets to see your tickets.',
    markup ? { reply_markup: markup } : {})
}

async function onCallback(cb) {
  const data = cb.data || ''
  const from = cb.from
  const user = upsertUser(from)
  const answer = (text) => tg('answerCallbackQuery', { callback_query_id: cb.id, text })

  if ((data.startsWith('ok:') || data.startsWith('no:'))) {
    if (!user.is_admin) return answer('Admins only')
    const orderId = Number(data.slice(3))
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
    if (!order) return answer('Order not found')
    if (order.status === 'paid') return answer('Already paid')
    if (data.startsWith('ok:')) {
      markPaid(order, order.tx_hash)
      await answer('Approved ✅')
      await tg('editMessageText', {
        chat_id: cb.message.chat.id, message_id: cb.message.message_id,
        text: cb.message.text + '\n\n✅ APPROVED by ' + (from.username ? '@' + from.username : from.first_name),
      })
    } else {
      db.prepare("UPDATE orders SET status = 'rejected' WHERE id = ?").run(orderId)
      if (order.buyer_tg_id) sendTo(order.buyer_tg_id, `❌ Payment for order #${orderId} could not be verified. Reply here and we'll sort it out.`)
      await answer('Rejected')
      await tg('editMessageText', {
        chat_id: cb.message.chat.id, message_id: cb.message.message_id,
        text: cb.message.text + '\n\n❌ REJECTED by ' + (from.username ? '@' + from.username : from.first_name),
      })
    }
  }
}

export async function startBot() {
  if (!TOKEN) { console.log('[bot] no BOT_TOKEN — bot disabled'); return }
  const me = await tg('getMe')
  if (!me) { console.error('[bot] getMe failed — check token/network; retrying in 60s'); setTimeout(startBot, 60000); return }
  BOT_USERNAME = me.username
  console.log(`[bot] running as @${BOT_USERNAME}`)
  await tg('setMyCommands', {
    commands: [
      { command: 'start', description: 'Open Thermopolium' },
      { command: 'mytickets', description: 'My tickets' },
      { command: 'id', description: 'Show my Telegram ID' },
    ],
  })

  let offset = 0
  const poll = async () => {
    while (true) {
      try {
        const updates = await tg('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] })
        if (Array.isArray(updates)) {
          for (const u of updates) {
            offset = u.update_id + 1
            if (u.message) await onMessage(u.message).catch(e => console.error('[bot] onMessage:', e))
            if (u.callback_query) await onCallback(u.callback_query).catch(e => console.error('[bot] onCallback:', e))
          }
        }
      } catch (e) {
        console.error('[bot] poll error:', e.message)
        await new Promise(r => setTimeout(r, 5000))
      }
    }
  }
  poll()
}
