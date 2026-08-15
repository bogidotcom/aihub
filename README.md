# AIHub Kyrgyzstan

AI community hub for Kyrgyzstan. Lives at **iamai.kg**.

Sister static sites live in `~/Desktop/kgs` (ChuiE at chuie.iamai.kg, KGST at kgst.iamai.kg). This app stays here and is linked from that tree as `apps/hub`.

Landing + blog + Telegram Mini App (**@iamaihubbot**) + bot + broadcast messaging + USDT payments, in two packages:

- **Frontend** (this dir): Vite + React 19 + Tailwind 4. Landing, blog, multi-language (EN/RU/KY/ZH), and the mini-app (also fully usable on the web).
- **`server/`**: Node 24 (no build step) — Express + `node:sqlite`. API, Telegram bot (long polling), TON USDT payment watcher, broadcast messaging for @bogidotcom.

## Run

```bash
# backend (port 3400) — also serves dist/ in production
cd server && npm i && npm run dev

# frontend dev (port 5173, proxies /api → 3400)
npm i && npm run dev

# production: build once, then the server serves everything on :3400
npm run build && cd server && npm start
```

## Configure — `server/.env`

- `BOT_TOKEN` — the bot token (set)
- `ADMIN_USERNAMES` — Telegram usernames that become admins on /start (they receive contact-form messages, order notifications, and Approve/Reject buttons)
- `WEB_APP_URL` — public https URL once deployed (used for bot buttons + ticket links; also update `public/tonconnect-manifest.json` to the same domain for @wallet payments to work)
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

- `/setmenubutton` → set the Mini App URL to `WEB_APP_URL` (or use the bot's inline "Open AIHub" button, already wired)
- `/setdomain` → set the domain to enable the **Login Widget** on the website
