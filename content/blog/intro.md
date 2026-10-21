---
title: THERM is 29.3 kWh
date: 2026-09-28
---

# THERM is 29.3 kWh

One therm of heat is 29.3 kilowatt-hours. That is 105,480,400 joules. On this site that same unit is one $THERM, and one $THERM pays for 100,000,000 AI tokens.

## How a payment works

You send $THERM on Solana. The note on the transfer is the question. The answer comes back on that transaction, and it is also posted on the feed.

The price is the job estimate. The server asks the DAI node, the same estimate described at https://iamai.kg/docs/#jobs, how many tokens the question needs. Divide by 100,000,000. That is the $THERM amount.

## Pay with x402

A program can ask without opening this site. It calls `POST /api/x402/infer` with the question. The route answers HTTP 402 and names an exact $THERM transfer on Solana. The program pays that amount, puts the question in the memo, and retries with the signed transaction. When the answer is ready, any caller can read it at `GET /api/x402/data/<signature>`.

## For builders

If your Solana app spends $THERM this way, apply. Sign in with Telegram, name the app, say what it does, and paste an https link. There is no vote.

The feed is still there. So is a new post.
