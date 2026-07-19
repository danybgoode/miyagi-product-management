// cloudflare-tenant-domain-migrate.test.mjs — Story 4.3 (09-platform-infra
// frontend-vercel-to-cloudrun, Sprint 4): static drift guard for the tenant custom-domain
// pre-provisioning/migration script. Pure fs read, zero deps, no live network/gcloud calls (the
// script's own logic is an unconditional top-level IIFE — same convention as the other Cloudflare
// script guards in this directory). Run: `node --test infra/gcp/test/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'cloudflare-tenant-domain-migrate.mjs'), 'utf8')

test('cloudflare-tenant-domain-migrate.mjs: apply is opt-in — dry-run is the default (vercel-prune-previews.mjs convention)', () => {
  assert.match(src, /arg\('apply', false\)/)
})

test('cloudflare-tenant-domain-migrate.mjs: enumerates live tenant domains from Supabase, not a hardcoded list', () => {
  assert.match(src, /marketplace_shops\?select=/)
  assert.match(src, /custom_domain=not\.is\.null/)
})

test('cloudflare-tenant-domain-migrate.mjs: cross-checks against the live Vercel project domain list for drift', () => {
  assert.match(src, /fetchVercelProjectDomains/)
  assert.match(src, /driftMissingFromVercel/)
})

test('cloudflare-tenant-domain-migrate.mjs: pre-provisions via TXT validation, NOT requiring a seller DNS change', () => {
  assert.match(src, /ssl: \{ method: 'txt', type: 'dv' \}/)
})

test('cloudflare-tenant-domain-migrate.mjs: uses the same fallback origin as lib/domain-utils.ts CNAME_TARGET', () => {
  assert.match(src, /FALLBACK_ORIGIN = 'cname\.miyagisanchez\.com'/)
})

test('cloudflare-tenant-domain-migrate.mjs: --rollback deletes only the Cloudflare custom hostname, never touches seller DNS', () => {
  assert.match(src, /ROLLBACK_DOMAIN/)
  assert.match(src, /method: 'DELETE'/)
  assert.doesNotMatch(src, /dns_records/, 'this script must never write DNS records into a domain it does not own')
})

test('cloudflare-tenant-domain-migrate.mjs: --status runs read-only with no create/apply path reached', () => {
  assert.match(src, /STATUS_ONLY/)
  assert.match(src, /read-only, no changes made/)
})

test('cloudflare-tenant-domain-migrate.mjs: writes a JSON report before printing the seller action list', () => {
  const reportIdx = src.indexOf('Report saved')
  const actionListIdx = src.indexOf('Seller action list')
  assert.ok(reportIdx > -1 && actionListIdx > -1 && reportIdx < actionListIdx)
})

test('cloudflare-tenant-domain-migrate.mjs: credential resolution matches the epic convention (env var, else Secret Manager in the backend project)', () => {
  assert.match(src, /resolveSecret\('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN'\)/)
  assert.match(src, /resolveSecret\('SUPABASE_URL', 'SUPABASE_URL'\)/)
  assert.match(src, /resolveSecret\('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'\)/)
  assert.match(src, /resolveSecret\('VERCEL_API_TOKEN', 'VERCEL_API_TOKEN'\)/)
  assert.match(src, /miyagisanchez-prod/)
})

test('cloudflare-tenant-domain-migrate.mjs: concurrency pool mirrors vercel-prune-previews.mjs (8 workers)', () => {
  assert.match(src, /Array\.from\(\{ length: 8 \}, worker\)/)
})
