// cloudflare-cache-provision.test.mjs — Sprint 3 (09-platform-infra deploy-pipeline-tuning):
// static drift guard for the Cache Rule provisioning script (infra is not Playwright-gated).
// Pure fs read, zero deps, no live Cloudflare calls. Run: `node --test infra/gcp/test/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'cloudflare-cache-provision.mjs'), 'utf8')

test('cloudflare-cache-provision.mjs: caches ONLY the paths Sprint 3.1 confirmed static ("/") — do not widen without re-running the probe', () => {
  const match = src.match(/CONFIRMED_STATIC_PATHS\s*=\s*(\[[^\]]*\])/)
  assert.ok(match, 'expected a CONFIRMED_STATIC_PATHS constant')
  const paths = JSON.parse(match[1].replace(/'/g, '"'))
  assert.deepEqual(paths, ['/'], 'S3.1 only confirmed "/" as cacheable — the (shell) subtree and /faq, /politicas are not eligible')
})

test('cloudflare-cache-provision.mjs: respects the origin Cache-Control — never forces an override TTL', () => {
  assert.match(src, /edge_ttl:\s*\{\s*mode:\s*'respect_origin'\s*\}/, 'expected edge_ttl.mode to be respect_origin')
  assert.doesNotMatch(src, /override_origin/, 'a forced override TTL would ignore Next\'s own revalidate directive')
})

test('cloudflare-cache-provision.mjs: PUT to the entrypoint preserves any OTHER existing rule (filters by own description only)', () => {
  assert.match(src, /otherRules\s*=\s*existingRules\.filter/, 'a re-run must not clobber a rule a human added by hand in the dashboard')
})

test('cloudflare-cache-provision.mjs: the entrypoint-read catch only swallows "no ruleset yet" (10003), rethrows every other failure', () => {
  const catchIdx = src.indexOf('} catch (e) {')
  assert.ok(catchIdx !== -1, 'expected a catch(e) block around the entrypoint read, not a bare catch that swallows everything')
  const catchBlockEnd = src.indexOf('\n  }', catchIdx)
  const catchBody = src.slice(catchIdx, catchBlockEnd)
  assert.match(catchBody, /10003/, 'expected the catch to check for Cloudflare error code 10003 specifically')
  assert.match(catchBody, /throw e/, 'a 403/5xx/transient failure must rethrow, not silently proceed as if no rules exist (would clobber existing rules on the PUT)')
})

test('cloudflare-cache-provision.mjs: targets the Cache Rules phase, not the WAF script\'s firewall phase', () => {
  assert.match(src, /http_request_cache_settings/)
  assert.doesNotMatch(src, /http_request_firewall_custom/)
})

test('cloudflare-cache-provision.mjs: the rule action is set_cache_settings with cache:true', () => {
  assert.match(src, /action:\s*'set_cache_settings'/)
  assert.match(src, /cache:\s*true/)
})

test('cloudflare-cache-provision.mjs: scoped to the apex/www host only, never a wildcard that would catch shop subdomains or custom domains', () => {
  assert.match(src, /http\.host eq "\$\{DOMAIN\}"/, 'expected an exact-match host check against the apex DOMAIN constant')
  assert.match(src, /http\.host eq "www\.\$\{DOMAIN\}"/, 'expected an exact-match host check against www.<DOMAIN>')
  assert.doesNotMatch(src, /http\.host contains/, 'a "contains" host match could accidentally catch a custom domain or shop subdomain')
})
