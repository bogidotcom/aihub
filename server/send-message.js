#!/usr/bin/env node
import './env.js'
import { db } from './db.js'
import { sendTo } from './bot.js'

const message = process.argv.slice(2).join(' ')

if (!message) {
  console.error('Usage: node send-message.js "Your message here"')
  console.error('Example: node send-message.js "🎉 New event: AI Workshop this Saturday!"')
  process.exit(1)
}

const users = db.prepare('SELECT tg_id FROM users WHERE tg_id IS NOT NULL').all()

if (!users.length) {
  console.log('No users found')
  process.exit(0)
}

console.log(`📢 Sending message to ${users.length} users...`)
console.log(`Message: "${message}\n"`)

let sent = 0
let failed = 0

for (const user of users) {
  const result = await sendTo(user.tg_id, message)
  if (result) {
    sent++
  } else {
    failed++
  }
  // Rate limiting: wait a bit between messages to avoid hitting Telegram API limits
  await new Promise(r => setTimeout(r, 30))
}

console.log(`✅ Sent: ${sent} | ❌ Failed: ${failed}`)
