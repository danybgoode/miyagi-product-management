// cloudflare-zone-diff.mjs — pure record-normalization + diff logic for the Cloudflare
// zone-staging script (09-platform-infra frontend-vercel-to-cloudrun, Sprint 2, Story 2.1).
//
// Kept dependency- and network-free so infra/gcp/test/cloudflare-zone-stage.test.js can unit-test
// it against fixtures (node:test, no live API calls — infra is not Playwright-gated, per the
// deploy-invariants convention).

// Vercel record types we deliberately don't mirror: ALIAS is Vercel's own apex-flattening
// artifact (the real apex record the domain resolves to is exported separately as A/AAAA), not
// real DNS a target zone needs.
const SKIP_TYPES = new Set(['ALIAS'])

function trimTrailingDot(s) {
  return typeof s === 'string' && s.endsWith('.') ? s.slice(0, -1) : s
}

// Cloudflare echoes TXT `content` back wrapped in a literal quote pair for records created via
// the API, but unquoted for records it auto-imported when the zone was added — cosmetically
// different, semantically identical DNS content. Strip the quoting before keying so both shapes
// compare equal (found live: an unstripped quote caused the stage script to treat an
// already-present record as missing and create a duplicate — 09-platform-infra
// frontend-vercel-to-cloudrun S2.1, live incident 2026-07-10).
//
// A long TXT (>255 bytes — common for DKIM keys) is split into MULTIPLE quoted segments,
// `"first 255 bytes" "remaining bytes"` — join every segment into one continuous string rather
// than stripping only the outer pair (a single `s.slice(1,-1)` would leave the inner `" "`
// separator embedded, permanently mismatching Vercel's single unquoted value). A plain
// single-quoted string is just the one-segment case of the same pattern; an already-unquoted
// string (no `"..."` found) passes through unchanged. Found in cross-agent review, 2026-07-10.
function stripWrappingQuotes(s) {
  if (typeof s !== 'string') return s
  const segments = [...s.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1])
  return segments.length > 0 ? segments.join('') : s
}

function recordKey(type, name, content, priority) {
  return [type, name, content, priority ?? ''].join('|').toLowerCase()
}

/**
 * Vercel's `GET /v4/domains/{domain}/records` shape: { name, type, value, mxPriority?, ttl? }.
 * `name` is relative to the zone apex ('' = apex, 'www', '*', '_dmarc', ...).
 * Returns null for records that shouldn't be mirrored (skip-listed type, or empty value).
 */
export function normalizeVercelRecord(r) {
  if (!r || SKIP_TYPES.has(r.type)) return null
  const content = stripWrappingQuotes(trimTrailingDot(String(r.value ?? '')))
  if (!content) return null
  const name = r.name === '' ? '@' : r.name
  const priority = r.mxPriority ?? r.priority ?? undefined
  return { type: r.type, name, content, priority, ttl: r.ttl, key: recordKey(r.type, name, content, priority) }
}

/**
 * Cloudflare's `GET /zones/{id}/dns_records` shape: { type, name, content, priority?, ttl }.
 * `name` here is the FQDN (apex = the zone name itself) — normalize relative to `zoneApex` so it
 * lines up with Vercel's relative-name convention ('@' for apex).
 */
export function normalizeCloudflareRecord(r, zoneApex) {
  let name = r.name
  if (zoneApex) {
    if (name === zoneApex) name = '@'
    else if (name.endsWith(`.${zoneApex}`)) name = name.slice(0, -(zoneApex.length + 1))
  }
  const content = stripWrappingQuotes(trimTrailingDot(String(r.content ?? '')))
  const priority = r.priority
  return { type: r.type, name, content, priority, key: recordKey(r.type, name, content, priority) }
}

/**
 * Compares a Vercel export against a live Cloudflare record set (raw API objects on both sides).
 * `missing` = present in Vercel, absent in Cloudflare (this must be empty before handoff).
 * `extra`   = present in Cloudflare, not in the Vercel export (informational only — e.g. Cloudflare's
 *             own default records on a freshly-created zone; never fails the gate on its own).
 */
export function diffRecords(vercelRecords, cfRecords, zoneApex) {
  const vNorm = vercelRecords.map(normalizeVercelRecord).filter(Boolean)
  const cNorm = cfRecords.map((r) => normalizeCloudflareRecord(r, zoneApex))
  const cKeys = new Set(cNorm.map((r) => r.key))
  const vKeys = new Set(vNorm.map((r) => r.key))

  const missing = vNorm.filter((r) => !cKeys.has(r.key))
  const extra = cNorm.filter((r) => !vKeys.has(r.key))
  const matched = vNorm.length - missing.length

  return { missing, matched, extra }
}
