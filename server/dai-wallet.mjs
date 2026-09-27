// DAI wallet helper for the THERM publisher.
//   node dai-wallet.mjs generate <key.pem>   create an ed25519 key (0600) and print its dai… address
//   node dai-wallet.mjs address              print the address of DAI_SIGNING_KEY_FILE
//   node dai-wallet.mjs register             register the key with the node (once per wallet)
//   node dai-wallet.mjs status               balance + nonce on the node, and what a job costs
// Reads DAI_SIGNING_KEY_FILE / DAI_NODE_URL from the environment (or .env).
import './env.js'
import crypto from 'node:crypto'
import fs from 'node:fs'
import * as dai from './dai.js'

const [cmd, arg] = process.argv.slice(2)
const node = (process.env.DAI_NODE_URL || 'http://127.0.0.1:3456').replace(/\/$/, '')

if (cmd === 'generate') {
  if (!arg) { console.error('usage: generate <key.pem>'); process.exit(1) }
  if (fs.existsSync(arg)) { console.error(`${arg} already exists — refusing to overwrite a wallet key`); process.exit(1) }
  const { privateKey } = crypto.generateKeyPairSync('ed25519')
  fs.writeFileSync(arg, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 })
  process.env.DAI_SIGNING_KEY_FILE = arg
  console.log(`key written to ${arg}\naddress: ${dai.loadWallet().address}\nfund this address with DAI, then run: node dai-wallet.mjs register`)
} else {
  const w = dai.loadWallet()
  if (!w) { console.error('no key: set DAI_SIGNING_KEY_FILE (or DAI_SIGNING_KEY)'); process.exit(1) }
  if (cmd === 'address') {
    console.log(w.address)
  } else if (cmd === 'register') {
    // Proof = signature over the address itself (SDK: createSigningProof).
    const body = { address: w.address, signingPublicKey: w.publicPem, proof: dai.signData(w.address, w.privateKey) }
    const r = await fetch(`${node}/api/wallet/register-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    console.log(r.status, await r.text())
  } else if (cmd === 'status') {
    const s = await dai.walletState(w.address)
    const est = await dai.estimate('develop x402 ai agent on solana')
    console.log(JSON.stringify({ address: w.address, ...s.raw, sampleJob: { source: est.source, minTokens: est.minTokens, recommendedTokens: est.recommendedTokens } }, null, 2))
  } else {
    console.error('commands: generate <file> | address | register | status')
    process.exit(1)
  }
}
