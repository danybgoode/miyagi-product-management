// cloudflare-cutover-flip.test.mjs — Story 3.4 (09-platform-infra frontend-vercel-to-cloudrun,
// Sprint 3): static drift guard for the DNS cutover-flip script. Pure fs read, zero deps, no
// live Cloudflare/gcloud calls (matches the repo's existing infra drift-guard convention — the
// script itself is an unconditional top-level IIFE that would call real APIs). Run:
// `node --test infra/gcp/test/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'cloudflare-cutover-flip.mjs'), 'utf8')

test('cloudflare-cutover-flip.mjs: dry-run by default (APPLY gated on --apply)', () => {
  assert.match(src, /const APPLY = !!arg\('apply', false\)/)
  assert.match(src, /if \(!APPLY\) \{[\s\S]{0,80}DRY-RUN/, 'must print a DRY-RUN notice and skip writes when --apply is absent')
})

test('cloudflare-cutover-flip.mjs: only ever selects the apex and wildcard records, nothing else', () => {
  assert.match(src, /function selectCutoverRecords/)
  assert.match(src, /r\.name === apexName \|\| r\.name === wildcardName/)
})

test('cloudflare-cutover-flip.mjs: filters by ROUTING record type too, not name alone (regression: CAA/TXT at the apex)', () => {
  // Found live via a dry-run against the real zone: miyagisanchez.com carries 3 CAA records +
  // 1 TXT (google-site-verification) at the apex, sharing the SAME name as the A records. A
  // name-only filter would have --apply-overwritten those with an A record pointing at the ALB.
  assert.match(src, /const ROUTING_TYPES = new Set\(\['A', 'AAAA', 'CNAME'\]\)/)
  assert.match(src, /ROUTING_TYPES\.has\(r\.type\)/)
})

test('cloudflare-cutover-flip.mjs: writes a pre-flip snapshot BEFORE patching any record', () => {
  const snapshotIdx = src.indexOf('writeFileSync(snapshotPath')
  const patchIdx = src.indexOf('await patchRecord(zone.id, r, { content: albIp')
  assert.ok(snapshotIdx !== -1, 'expected a pre-flip snapshot write')
  assert.ok(patchIdx !== -1, 'expected the actual flip PATCH call')
  assert.ok(snapshotIdx < patchIdx, 'the snapshot must be written before any record is patched — rollback safety')
})

test('cloudflare-cutover-flip.mjs: rollback restores content + proxied + type, not just proxied', () => {
  const rollbackBlock = src.slice(src.indexOf('if (ROLLBACK_FILE)'), src.indexOf('if (ROLLBACK_FILE)') + 800)
  assert.match(rollbackBlock, /content: rec\.content, proxied: rec\.proxied, type: rec\.type/)
})

test('cloudflare-cutover-flip.mjs: resolves the ALB static IP live via gcloud, never hardcodes an IP literal', () => {
  assert.match(src, /function resolveAlbStaticIp/)
  assert.match(src, /'addresses', 'describe', ALB_IP_NAME/)
  assert.doesNotMatch(src, /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, 'must not hardcode a specific IP address anywhere in the script')
})

test('cloudflare-cutover-flip.mjs: flips the record TYPE to A (matches the ALB IP target), not left as the original CNAME', () => {
  assert.match(src, /content: albIp, proxied: true, type: 'A'/)
})
