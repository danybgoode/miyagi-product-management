// cloudflare-origin-cert.test.mjs — Story 3.4 (09-platform-infra frontend-vercel-to-cloudrun,
// Sprint 3): static drift guard for the --domain/--hostnames parametrization added to support
// requesting a SECOND Origin CA cert for mschz.org (a separate zone from miyagisanchez.com,
// uncovered by the original Sprint 2 cert). Pure fs read, zero deps, no live network/openssl
// calls (the script's own logic is an unconditional top-level IIFE that would call Cloudflare's
// API for real, so this stays static text analysis, matching the repo's existing drift-guard
// convention for infra scripts). Run: `node --test infra/gcp/test/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'cloudflare-origin-cert.mjs'), 'utf8')

test('cloudflare-origin-cert.mjs: default domain is still miyagisanchez.com (Sprint 2 regression guard)', () => {
  assert.match(src, /arg\('domain', 'miyagisanchez\.com'\)/)
})

test('cloudflare-origin-cert.mjs: default hostnames still derive to [domain, *.domain]', () => {
  assert.match(src, /arg\('hostnames', `\$\{DOMAIN\},\*\.\$\{DOMAIN\}`\)/)
})

test('cloudflare-origin-cert.mjs: --hostnames is comma-split and trimmed (supports apex+www, no wildcard)', () => {
  assert.match(src, /\.split\(','\)\.map\(\(h\) => h\.trim\(\)\)\.filter\(Boolean\)/)
})

test('cloudflare-origin-cert.mjs: DOMAIN/HOSTNAMES are now parsed from argv, not hardcoded constants', () => {
  assert.doesNotMatch(src, /^const DOMAIN = 'miyagisanchez\.com'$/m, 'DOMAIN must be argv-derived, not a hardcoded constant (regression: mschz.org would be unrequestable)')
})
