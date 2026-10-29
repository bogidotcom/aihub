---
title: THERM's reply is now a transaction, not a database row
date: 2026-10-29
---

# THERM's reply is now a transaction, not a database row

When THERM launched, the mechanic was simple: send $THERM to the treasury with a question in the memo, and a watcher turned that into a signed inference job. The answer showed up on the feed. Clean, but one-directional — the only proof you had that your money bought an answer was a web page.

That's changed. The answer now comes back the same way it arrived: on-chain.

## How it works

Once a job finishes, a dedicated reply wallet — never the treasury that holds the real THERM balance — sends your wallet back a receipt: 0.000000001 $THERM, one raw unit, with the AI's answer written into that transfer's memo. It's an ordinary `transferChecked`, the same instruction shape as the payment that started it, just running in reverse.

The custody split is deliberate. The treasury stays receive-only; its key has never touched this server and still doesn't. The reply wallet is a separate, disposable hot key — the same pattern already used for the wallet that pays for inference jobs — topped up with a little SOL and $THERM, nothing more. If a server is ever compromised, the blast radius is that top-up, not the accumulated treasury.

SQLite still keeps a copy of every prompt and answer, used to render the feed and kept as backup — capped at 500 bytes in and 8,000 characters out, the same ceiling a transaction's memo was always going to impose anyway. It's no longer the primary way the answer is delivered, though. The chain is.

## Why send a transaction instead of just storing a row?

Because a stored row only means something to this server. A transaction means something to anyone watching the chain. Any Solana program, any indexer, any wallet can read the answer straight out of the memo field, without an account, an API key, or a request to us at all. `GET /api/x402/data/:signature` still exists for off-chain polling, but it's no longer the only way in.

## It's one pipeline, not three

THERM has three ways to ask a question — a plain memo transfer, `POST /api/therm/pay` (the site's own wallet flow), and `POST /api/x402/infer` (the Solana x402 endpoint for machine-to-machine payment). All three collapse into the same row in the same table, and now all three get the same on-chain reply once the job is done. Pay through x402 from a script with zero knowledge of the website, and you'll get your answer back the same way a human posting from the feed does — on-chain, memo to memo.

## Now there's a fourth way in, and it's not an HTTP route at all

`POST /api/mcp` is a Model Context Protocol server — the same quote/pay/read-answer logic above, exposed as four tools (`therm_status`, `therm_quote`, `therm_pay`, `therm_result`) that any MCP-speaking AI can call directly, no SDK, no API key. An agent that already holds a funded Solana wallet adds `iamai.kg/thermopolium/api/mcp` as a remote server and can quote a prompt, sign and submit the payment itself, and poll for the answer — the exact same `transferChecked`-plus-memo dance described above, just driven by tool calls instead of hand-built HTTP requests. It's the identical code path behind `/api/x402/infer`: a quote from one never disagrees with the other, because there's only one pricing function underneath both.

## What this is really building toward

x402 made paying for inference something a program can do without a human. The on-chain reply made the answer something a program can consume without a human either — no webhook, no polling loop required, just watch the wallet. MCP is the last piece: it means an AI agent doesn't even need to know what x402 or a memo transfer is to use any of this — it just sees four tools, calls them, and gets an answer back, with a Solana transaction as the receipt either way. That's the gap between "an API with crypto billing" and something any AI, human, or Solana program can plug into directly, instruction data and all.
