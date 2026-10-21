# THERM

**$THERM** is a 29.3 kWh energy RWA. One token pays for 100,000,000 AI tokens. The site lives at **https://iamai.kg/thermopolium/**. Telegram login, the feed, and admin alerts stay. Old hub routes are still in the tree and hidden.

- **Frontend** (this dir): Vite + React 19 + Tailwind 4, served under the `/thermopolium/` base path. Landing, the token page, the feed, and the ecosystem apply form under `/app`. EN/RU.
- **`server/`**: Node 22+ (no build step) — Express + `node:sqlite`. API, Telegram bot, and the **$THERM service** (`therm.js`, `solana.js`, `dai.js`).

## Run

```bash
# backend (port 3460)
cd server && npm i && npm run dev

# frontend dev (port 5173) — open http://localhost:5173/thermopolium/ ; /thermopolium/api is proxied to :3460
npm i && npm run dev
```

## $THERM: memo → AI answer

A watcher polls the treasury's THERM token account on Solana. A transfer with a memo becomes a **signed DAI compute job** (memo = prompt, `1 THERM = 100,000,000 AI tokens`); the answer is stored and shown on the feed. The price comes from `POST /api/estimate` on the DAI node (https://iamai.kg/docs/#jobs). A node without that route falls back to a local count of the prompt.

Solana x402: `POST /api/x402/infer` with `{prompt}` and no payment returns **402** and a `PAYMENT-REQUIRED` header. The body is an exact-scheme challenge: asset is the THERM mint, `payTo` is the treasury, `maxAmountRequired` is the estimate in raw units, and `extra.memo` is the prompt. Retry with `PAYMENT-SIGNATURE` or `X-PAYMENT`, base64 JSON `{ "payload": { "transaction": "<signed legacy tx>" } }`. The transferChecked must pay the treasury at least that raw amount and the memo must equal the prompt. The answer for a signature is `GET /api/x402/data/:sig`. `GET /api/therm/config` lists the same routes. `POST /api/therm/vote` returns 410.

The ecosystem list is `GET /api/therm/projects`, newest first. An application is the Telegram form: name, app, what it does, https link. It does not import a page from anywhere else.

`THERM_MINT` may be the SPL mint or the Meteora Dynamic Bonding Curve pool the token launched on. The API reads the pool's base mint and uses that for transfers, the watcher, and x402. With `THERM_MINT`/`THERM_TREASURY` empty the watcher stays idle and the rest of the site works. See `deploy/thermopolium.env.example`.

DAI wallet for jobs: `node dai-wallet.mjs generate|address|register|status` (in `server/`).

## Deploy (hk → iamai.kg/thermopolium)

`deploy/deploy.sh` is a dry run until you pass `--yes`; see the header of that script and `deploy/nginx-thermopolium.conf` for the one-time nginx include.

## Configure — `server/.env`

- `BOT_TOKEN` — the bot token (set)
- `ADMIN_USERNAMES` — Telegram usernames that become admins on /start (they receive contact-form messages, order notifications, and Approve/Reject buttons)
- `WEB_APP_URL` — `https://iamai.kg/thermopolium` (bot buttons + ticket links; `public/tonconnect-manifest.json` already points there)
- Payment addresses: `TON_ADDRESS` (auto-verified), `TRC20_ADDRESS` / `SOL_ADDRESS` / `ERC20_ADDRESS` (manual verify via tx-hash + admin approve)
- `TONCENTER_KEY` — optional, higher rate limits

## Blog

Drop `.md` files into `content/blog/`. Optional frontmatter:

```markdown
---
title: My post
date: 2026-08-02
---
```

## Payments (all checkout flows: tickets, class packages, gift cards)

1. Checkout creates an order with a **uniquified USDT amount** (e.g. `42.002473`) and a comment code.
2. Buyer pays via **TON Connect** (@wallet, Tonkeeper, …) — the server builds the USDT jetton-transfer payload — or manually to the shown address.
3. A watcher polls toncenter for incoming USDT jetton transfers and matches the exact amount → order paid → tickets issued / package credited / gift code generated → buyer + admins notified in Telegram.
4. Other networks (TRC20/SOL/ERC20): buyer submits the tx hash → admins get Approve/Reject buttons in the bot.

Orders expire after 30 min. Free tickets are issued instantly.

## Adding events

`POST /api/admin/events` with header `x-admin-token: <ADMIN_API_TOKEN>`:

```json
{ "title": "…", "description": "…", "venue": "…", "starts_at": "2026-09-01T18:00:00Z",
  "ticket_types": [{ "name": "Standard", "price_usdt": 15, "price_amd": 5000, "supply": 50 }] }
```

## Telegram setup checklist (BotFather)

- `/setmenubutton` → set the Mini App URL to `WEB_APP_URL` (or use the bot's inline "Open Thermopolium" button, already wired)
- `/setdomain` → set the domain to enable the **Login Widget** on the website
