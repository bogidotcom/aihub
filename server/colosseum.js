// Pulls a submitted project's public details from Colosseum.
//   https://colosseum.com/arena/projects/<slug>/__data.json
// That is SvelteKit's data endpoint: {"nodes":[{type:"data", data:[…flat devalue array…]}, …]}.
// The URL is always built from a validated slug on a fixed host, so a submitted link can never make us fetch anything else.

const HOSTS = new Set(['colosseum.com', 'www.colosseum.com'])
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/
const UA = 'Thermopolium/1.0 (+https://iamai.kg/thermopolium)'

/** A Colosseum project link → its slug, or null for anything that isn't one. */
export function colosseumSlug(link) {
  try {
    const u = new URL(String(link).trim())
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (!HOSTS.has(u.hostname.toLowerCase())) return null
    const m = u.pathname.match(/\/projects\/([^/]+)/i)
    const slug = m && decodeURIComponent(m[1]).toLowerCase()
    return slug && SLUG_RE.test(slug) ? slug : null
  } catch { return null }
}

// ---------- devalue (https://github.com/Rich-Harris/devalue) decoder ----------
// Every value in the flat array is either a primitive or a container whose fields are *indices* into the array.
const UNDEFINED = -1, HOLE = -2, NAN = -3, POS_INF = -4, NEG_INF = -5, NEG_ZERO = -6

export function devalueParse(flat) {
  const seen = new Map()
  const hydrate = (i) => {
    if (i === UNDEFINED) return undefined
    if (i === NAN) return NaN
    if (i === POS_INF) return Infinity
    if (i === NEG_INF) return -Infinity
    if (i === NEG_ZERO) return -0
    if (seen.has(i)) return seen.get(i)
    const v = flat[i]
    if (v === null || typeof v !== 'object') { seen.set(i, v); return v }

    if (Array.isArray(v)) {
      if (typeof v[0] === 'string') {                       // tagged special value
        let out
        switch (v[0]) {
          case 'Date': out = new Date(v[1]); break
          case 'BigInt': out = BigInt(v[1]); break
          case 'Set': out = new Set(); seen.set(i, out); v.slice(1).forEach(x => out.add(hydrate(x))); return out
          case 'Map': out = new Map(); seen.set(i, out); for (let k = 1; k < v.length; k += 2) out.set(hydrate(v[k]), hydrate(v[k + 1])); return out
          case 'null': out = Object.create(null); seen.set(i, out); for (let k = 1; k < v.length; k += 2) out[v[k]] = hydrate(v[k + 1]); return out
          default: out = null                                // typed arrays, custom transports: not needed here
        }
        seen.set(i, out)
        return out
      }
      const arr = []
      seen.set(i, arr)
      v.forEach((x, k) => { if (x !== HOLE) arr[k] = hydrate(x) })
      return arr
    }
    const obj = {}
    seen.set(i, obj)
    for (const k of Object.keys(v)) obj[k] = hydrate(v[k])
    return obj
  }
  return hydrate(0)
}

// The project object has lived in two places as the Colosseum page changed shape:
//   root.project            older page data
//   root.source.project     current arena project page
function rootWithProject(root) {
  if (!root || typeof root !== 'object') return null
  const direct = root.project
  if (direct && typeof direct === 'object' && (direct.slug || direct.name)) return root
  const nested = root.source?.project
  if (nested && typeof nested === 'object' && (nested.slug || nested.name)) return { project: nested }
  return null
}

/** SvelteKit payload → the page's data that carries `project` (or null when the project doesn't exist). */
export function projectFromPayload(payload) {
  const nodes = payload?.nodes || []
  if (nodes.some(n => n?.type === 'error' && n.status === 404)) return { notFound: true }
  for (const n of nodes) {
    if (n?.type !== 'data' || !Array.isArray(n.data)) continue
    let root
    try { root = devalueParse(n.data) } catch { continue }
    const hit = rootWithProject(root)
    if (hit) return { root: hit }
  }
  return null
}

const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : '')

/** Trim the raw page data to what Thermopolium shows and stores. */
export function normalizeProject(root) {
  const p = root.project
  const team = Array.isArray(p.teamMembers) ? p.teamMembers : []
  return {
    slug: str(p.slug, 80).toLowerCase(),
    name: str(p.name, 120),
    description: str(p.description, 1500),
    category: str(p.category, 60),
    country: str(p.country, 80),
    repoLink: str(p.repoLink, 300),
    website: str(p.website, 300),
    twitter: str(p.twitterHandle, 60).replace(/^@/, ''),
    image: /^https:\/\//.test(p.image?.url || '') ? p.image.url : '',
    tracks: Array.isArray(p.tracks) ? p.tracks.filter(t => typeof t === 'string').slice(0, 10) : [],
    hackathon: p.hackathon ? { name: str(p.hackathon.name, 80), slug: str(p.hackathon.slug, 60), emoji: str(p.hackathon.emoji, 8) } : null,
    submittedAt: p.submittedAt instanceof Date && !isNaN(p.submittedAt) ? p.submittedAt.toISOString() : null,
    members: team.slice(0, 8).map(m => ({ username: str(m.username, 60), name: str(m.displayName, 80), avatar: /^https:\/\//.test(m.avatarUrl || '') ? m.avatarUrl : '' })),
  }
}

// ---------- fetch ----------
const cache = new Map()   // slug → { at, result }
const TTL = 10 * 60 * 1000

/**
 * Resolve a link to Colosseum project details.
 *   { status: 'ok', project }        found and decoded
 *   { status: 'invalid' }            not a Colosseum project link
 *   { status: 'not_found' }          Colosseum says there is no such project
 *   { status: 'unavailable' }        Colosseum unreachable or changed shape — don't punish the submitter for that
 */
export async function resolveColosseum(link, { fresh = false } = {}) {
  const slug = colosseumSlug(link)
  if (!slug) return { status: 'invalid' }
  const hit = cache.get(slug)
  if (!fresh && hit && Date.now() - hit.at < TTL) return hit.result

  let result
  try {
    const res = await fetch(`https://colosseum.com/arena/projects/${slug}/__data.json`, {
      headers: { 'user-agent': UA, accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    const buf = await res.arrayBuffer()
    if (buf.byteLength > 2_000_000) throw new Error('payload too large')
    if (res.status === 404) result = { status: 'not_found' }
    else if (!res.ok) result = { status: 'unavailable' }
    else {
      const found = projectFromPayload(JSON.parse(Buffer.from(buf).toString('utf8')))
      if (found?.notFound) result = { status: 'not_found' }
      else if (found?.root) result = { status: 'ok', project: normalizeProject(found.root) }
      else result = { status: 'unavailable' }
    }
  } catch { result = { status: 'unavailable' } }

  if (result.status !== 'unavailable') cache.set(slug, { at: Date.now(), result })
  return result
}

// ---------- public preview endpoint (form auto-fill) ----------
const hits = new Map()   // ip → recent timestamps; keeps this from being a free scraping proxy
export async function previewHandler(req, res) {
  const ip = req.ip || 'x'
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter(t => now - t < 60_000)
  if (recent.length >= 20) return res.status(429).json({ error: 'RATE_LIMITED' })
  hits.set(ip, [...recent, now])
  if (hits.size > 5000) hits.clear()

  const r = await resolveColosseum(req.query.url)
  if (r.status === 'ok') return res.json({ status: 'ok', project: r.project })
  res.json({ status: r.status })
}
