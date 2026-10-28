// THERM over MCP: the same Solana-metered inference the website and the x402 HTTP endpoint
// offer, exposed as MCP tools so another AI (an agent, a Claude session, anything speaking
// Model Context Protocol) can quote, pay and read the answer without touching a browser.
// Stateless streamable HTTP, mounted at POST /api/mcp — a fresh McpServer + transport per
// request, same pattern as the SDK's own stateless example. No session to manage, nothing to
// clean up between calls: each tool call reuses the exact pricing/payment/lookup logic in
// therm.js that already backs /api/x402/infer, so a quote from one never drifts from the other.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { thermStatus, buildX402Challenge, settleX402Payment, getX402Data } from './therm.js'

const log = (...a) => console.log('[mcp]', ...a)
const json = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] })
const errorResult = (e) => ({ isError: true, content: [{ type: 'text', text: JSON.stringify({ error: e.code || 'ERROR', message: e.message }, null, 2) }] })

function buildServer() {
  const server = new McpServer({
    name: 'thermopolium',
    version: '1.0.0',
    websiteUrl: 'https://iamai.kg/thermopolium',
  }, { capabilities: {} })

  server.registerTool('therm_status', {
    title: 'THERM status',
    description: 'The $THERM mint, treasury address, reply wallet, and price rate (1 $THERM = N AI tokens) for Solana-metered inference. Call this once to learn the asset and payTo address before quoting or paying.',
    inputSchema: {},
  }, async () => json(await thermStatus()))

  server.registerTool('therm_quote', {
    title: 'Quote a prompt',
    description: 'Price a prompt in $THERM. Returns an x402 "exact" challenge: the asset, payTo (treasury), the exact raw amount required, and the memo the paying transaction must carry (the prompt itself). Build and sign a Solana transferChecked for that amount to that address with that memo, then call therm_pay with it.',
    inputSchema: { prompt: z.string().min(1).max(500).describe('The question to ask. Travels on-chain as the memo — max 500 bytes.') },
  }, async ({ prompt }) => {
    try { return json((await buildX402Challenge(prompt)).challenge) }
    catch (e) { return errorResult(e) }
  })

  server.registerTool('therm_pay', {
    title: 'Pay for inference',
    description: 'Submit a prompt together with a signed Solana transaction that pays the treasury the exact amount from therm_quote (transferChecked, memo = the prompt, verbatim). Broadcasts it and returns the job signature right away — the answer is not ready yet. Poll therm_result with that signature. The paying wallet also receives the answer back on-chain later: a dust $THERM transfer with the answer in its own memo.',
    inputSchema: {
      prompt: z.string().min(1).max(500).describe('The exact prompt that was quoted — must match the paid memo byte-for-byte.'),
      transaction: z.string().min(100).describe('Base64-encoded, fully signed legacy Solana transaction (the transferChecked + memo quoted by therm_quote).'),
    },
  }, async ({ prompt, transaction }) => {
    try {
      const priced = await buildX402Challenge(prompt)
      return json(await settleX402Payment(prompt, transaction, priced))
    } catch (e) {
      if (e.code === 'PAYMENT_MISMATCH') {
        return errorResult({ code: e.code, message: 'payment does not cover the current quote, or the memo does not match the prompt exactly — call therm_quote again, the price may have moved' })
      }
      return errorResult(e)
    }
  })

  server.registerTool('therm_result', {
    title: 'Read the answer',
    description: 'Look up a job by the Solana transaction signature from therm_pay. status is one of pending | received | queued | computing | done | error. answer is non-null once status is done.',
    inputSchema: { signature: z.string().describe('The Solana transaction signature returned by therm_pay.') },
  }, async ({ signature }) => {
    try { return json(getX402Data(signature)) }
    catch (e) { return errorResult(e) }
  })

  return server
}

const rpcError = (code, message) => ({ jsonrpc: '2.0', error: { code, message }, id: null })

function mcpCors(res) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version')
  res.set('Access-Control-Expose-Headers', 'Mcp-Session-Id')
}

// /api/mcp, not /mcp: nginx (deploy/nginx-thermopolium.conf) only proxies /thermopolium/api/*
// to this service — anything else falls through to the SPA and answers 200 HTML. Staying under
// /api/ means this needs no nginx change to go live.
export function startMcp(app) {
  app.options('/api/mcp', (_req, res) => {
    mcpCors(res)
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.sendStatus(204)
  })

  app.post('/api/mcp', async (req, res) => {
    mcpCors(res)
    let server, transport
    try {
      server = buildServer()
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      await server.connect(transport)
      res.on('close', () => { transport.close(); server.close() })
      await transport.handleRequest(req, res, req.body)
    } catch (e) {
      log('request failed:', e.message)
      if (!res.headersSent) res.status(500).json(rpcError(-32603, 'Internal server error'))
    }
  })
  // Stateless: no session to GET a stream for or DELETE.
  app.get('/api/mcp', (_req, res) => { mcpCors(res); res.status(405).json(rpcError(-32000, 'Method not allowed — POST only, stateless')) })
  app.delete('/api/mcp', (_req, res) => { mcpCors(res); res.status(405).json(rpcError(-32000, 'Method not allowed — POST only, stateless')) })
  log('mounted at POST /api/mcp (tools: therm_status, therm_quote, therm_pay, therm_result)')
}
