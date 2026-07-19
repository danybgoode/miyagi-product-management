// cloudflare-saas-fallback-provision.test.mjs — Story 4.1 (09-platform-infra
// frontend-vercel-to-cloudrun, Sprint 4): static drift guard for the one-time Cloudflare-for-SaaS
// fallback-origin provisioning script. Pure fs read, zero deps, no live network/gcloud calls (the
// script's own logic is an unconditional top-level IIFE that would call Cloudflare's API for real —
// same convention as cloudflare-origin-cert.test.mjs). Run: `node --test infra/gcp/test/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'cloudflare-saas-fallback-provision.mjs'), 'utf8')

test('cloudflare-saas-fallback-provision.mjs: default domain is miyagisanchez.com', () => {
  assert.match(src, /arg\('domain', 'miyagisanchez\.com'\)/)
})

test('cloudflare-saas-fallback-provision.mjs: default fallback label is "cname" (matches CNAME_TARGET plan)', () => {
  assert.match(src, /arg\('fallback-label', 'cname'\)/)
})

test('cloudflare-saas-fallback-provision.mjs: apply is the default — dry-run is opt-in via --dry-run', () => {
  assert.match(src, /arg\('dry-run', false\)/)
})

test('cloudflare-saas-fallback-provision.mjs: reuses the ALB static IP name from provision-alb-frontend.sh', () => {
  assert.match(src, /ALB_IP_NAME = 'miyagi-web-lb-ip'/)
})

test('cloudflare-saas-fallback-provision.mjs: creates an A record, not a CNAME, for the fallback origin (proxied traffic needs a resolvable proxied record in-zone)', () => {
  assert.match(src, /type: 'A', name: FALLBACK_HOST, content: albIp, proxied: true/)
})

test('cloudflare-saas-fallback-provision.mjs: registers the fallback origin via the documented Cloudflare-for-SaaS endpoint', () => {
  assert.match(src, /\/custom_hostnames\/fallback_origin/)
  assert.match(src, /method: 'PUT'/)
})

test('cloudflare-saas-fallback-provision.mjs: does NOT attempt to reissue the origin cert itself (that stays a separate, deliberate step)', () => {
  assert.doesNotMatch(src, /cfApi\(`\/certificates`/, 'cert reissuance must stay in cloudflare-origin-cert.mjs, not be duplicated here')
  assert.match(src, /NOT run by this script/)
})

test('cloudflare-saas-fallback-provision.mjs: credential resolution matches the epic convention (env var, else Secret Manager in the backend project)', () => {
  assert.match(src, /resolveSecret\('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN'\)/)
  assert.match(src, /resolveSecret\('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID'\)/)
  assert.match(src, /miyagisanchez-prod/)
})
