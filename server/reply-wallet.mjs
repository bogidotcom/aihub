// $THERM reply wallet: signs the on-chain replies (dust $THERM + the AI's answer in the memo).
// Kept separate from the treasury on purpose — the treasury stays receive-only and its key is
// never loaded by this server; this hot key only ever needs a small top-up of SOL (network fees)
// and $THERM (reply dust), so a compromised server can't drain more than that top-up.
//   node reply-wallet.mjs generate <key.pem>   create an ed25519 key (0600) and print its address
//   node reply-wallet.mjs address              print the address of THERM_REPLY_KEY_FILE
//   node reply-wallet.mjs balance               SOL + $THERM balance of that address
// Reads THERM_REPLY_KEY_FILE / THERM_MINT from the environment (or .env).
import './env.js'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { loadSolanaKeypair, tokenAccountsOf, resolveThermMint, rpc } from './solana.js'

const [cmd, arg] = process.argv.slice(2)

if (cmd === 'generate') {
  if (!arg) { console.error('usage: generate <key.pem>'); process.exit(1) }
  if (fs.existsSync(arg)) { console.error(`${arg} already exists — refusing to overwrite a wallet key`); process.exit(1) }
  const { privateKey } = crypto.generateKeyPairSync('ed25519')
  fs.writeFileSync(arg, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 })
  console.log(`key written to ${arg}\naddress: ${loadSolanaKeypair(arg).address}\nfund this address with a little SOL and $THERM, then point THERM_REPLY_KEY_FILE at it`)
} else {
  const w = loadSolanaKeypair(process.env.THERM_REPLY_KEY_FILE)
  if (!w) { console.error('no key: set THERM_REPLY_KEY_FILE'); process.exit(1) }
  if (cmd === 'address') {
    console.log(w.address)
  } else if (cmd === 'balance') {
    const sol = await rpc('getBalance', [w.address, { commitment: 'confirmed' }])
    let therm = '0 (THERM_MINT not set)'
    if (process.env.THERM_MINT) {
      const asset = await resolveThermMint(process.env.THERM_MINT)
      const accts = await tokenAccountsOf(w.address, asset.address)
      const total = accts.reduce((n, a) => n + a.amount, 0n)
      therm = accts.length ? Number(total) / 10 ** accts[0].decimals : '0 (no token account yet)'
    }
    console.log(JSON.stringify({ address: w.address, sol: sol.value / 1e9, therm }, null, 2))
  } else {
    console.error('commands: generate <file> | address | balance')
    process.exit(1)
  }
}
