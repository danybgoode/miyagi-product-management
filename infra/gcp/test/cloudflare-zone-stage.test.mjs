// cloudflare-zone-stage.test.mjs — pure-logic coverage for the Cloudflare zone-staging diff
// (09-platform-infra frontend-vercel-to-cloudrun, Sprint 2, Story 2.1). No live API calls — infra
// is not Playwright-gated, so this static node:test is the deterministic gate. Run:
// `node --test infra/gcp/test/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeVercelRecord, normalizeCloudflareRecord, diffRecords } from '../lib/cloudflare-zone-diff.mjs'

const ZONE_APEX = 'miyagisanchez.com'

// ---- normalizeVercelRecord ----

test('normalizeVercelRecord: apex name "" → "@"', () => {
  const r = normalizeVercelRecord({ type: 'A', name: '', value: '216.198.79.1' })
  assert.equal(r.name, '@')
  assert.equal(r.type, 'A')
})

test('normalizeVercelRecord: MX uses mxPriority, trims trailing dot on content', () => {
  const r = normalizeVercelRecord({ type: 'MX', name: '', value: 'mail.protection.outlook.com.', mxPriority: 10 })
  assert.equal(r.content, 'mail.protection.outlook.com')
  assert.equal(r.priority, 10)
})

test('normalizeVercelRecord: skips ALIAS (Vercel-internal apex-flattening artifact)', () => {
  assert.equal(normalizeVercelRecord({ type: 'ALIAS', name: '', value: 'cname.vercel-dns.com' }), null)
})

test('normalizeVercelRecord: skips a record with empty value', () => {
  assert.equal(normalizeVercelRecord({ type: 'TXT', name: '_foo', value: '' }), null)
})

test('normalizeVercelRecord: subdomain and wildcard names pass through unchanged', () => {
  assert.equal(normalizeVercelRecord({ type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' }).name, 'www')
  assert.equal(normalizeVercelRecord({ type: 'CNAME', name: '*', value: 'cname.vercel-dns.com' }).name, '*')
})

// ---- normalizeCloudflareRecord ----

test('normalizeCloudflareRecord: FQDN apex → "@" relative to zone apex', () => {
  const r = normalizeCloudflareRecord({ type: 'A', name: ZONE_APEX, content: '216.198.79.1' }, ZONE_APEX)
  assert.equal(r.name, '@')
})

test('normalizeCloudflareRecord: FQDN subdomain strips the zone-apex suffix', () => {
  const r = normalizeCloudflareRecord({ type: 'CNAME', name: `www.${ZONE_APEX}`, content: 'cname.vercel-dns.com' }, ZONE_APEX)
  assert.equal(r.name, 'www')
})

test('normalizeVercelRecord and normalizeCloudflareRecord produce the SAME key for the same logical record', () => {
  const v = normalizeVercelRecord({ type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com.' })
  const c = normalizeCloudflareRecord({ type: 'CNAME', name: `www.${ZONE_APEX}`, content: 'cname.vercel-dns.com' }, ZONE_APEX)
  assert.equal(v.key, c.key)
})

test('normalizeCloudflareRecord: a long TXT split into MULTIPLE quoted segments joins into one continuous string (DKIM edge case)', () => {
  // A >255-byte TXT is zone-file-split into multiple "..." segments — a naive single
  // slice(1,-1) would leave the inner `" "` separator embedded and never match Vercel's
  // single unquoted value.
  const c = normalizeCloudflareRecord(
    { type: 'TXT', name: `resend._domainkey.${ZONE_APEX}`, content: '"p=MIGfMA0GCSqGSIb3DQEB" "AQUAA4GNADCBiQKBgQDS570BrQ=="' },
    ZONE_APEX,
  )
  assert.equal(c.content, 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDS570BrQ==')
})

test('diffRecords: a multi-segment-quoted Cloudflare TXT is recognized as already-present, not a duplicate', () => {
  const vercelRecords = [{ type: 'TXT', name: 'resend._domainkey', value: 'p=abc123def456' }]
  const cfRecords = [{ type: 'TXT', name: `resend._domainkey.${ZONE_APEX}`, content: '"p=abc123" "def456"' }]
  const diff = diffRecords(vercelRecords, cfRecords, ZONE_APEX)
  assert.deepEqual(diff.missing, [])
  assert.equal(diff.matched, 1)
})

// ---- diffRecords ----

test('diffRecords: zero-diff when every Vercel record is staged in Cloudflare', () => {
  const vercelRecords = [
    { type: 'A', name: '', value: '216.198.79.1' },
    { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com.' },
    { type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=reject' },
    { type: 'MX', name: '', value: 'mail.protection.outlook.com.', mxPriority: 10 },
  ]
  const cfRecords = [
    { type: 'A', name: ZONE_APEX, content: '216.198.79.1' },
    { type: 'CNAME', name: `www.${ZONE_APEX}`, content: 'cname.vercel-dns.com' },
    { type: 'TXT', name: `_dmarc.${ZONE_APEX}`, content: 'v=DMARC1; p=reject' },
    { type: 'MX', name: ZONE_APEX, content: 'mail.protection.outlook.com', priority: 10 },
  ]
  const diff = diffRecords(vercelRecords, cfRecords, ZONE_APEX)
  assert.deepEqual(diff.missing, [])
  assert.equal(diff.matched, 4)
})

test('diffRecords: flags a genuinely missing record (the auth/email blast-radius case)', () => {
  const vercelRecords = [
    { type: 'A', name: '', value: '216.198.79.1' },
    { type: 'CNAME', name: 'clerk', value: 'frontend-api.clerk.services.' }, // Clerk auth record
    { type: 'TXT', name: 'resend._domainkey', value: 'p=MIGfMA0GCSq...' }, // DKIM
  ]
  const cfRecords = [
    { type: 'A', name: ZONE_APEX, content: '216.198.79.1' },
    // clerk CNAME and DKIM TXT never got staged — this is exactly the scenario the
    // scripted zone-diff exists to catch before handoff.
  ]
  const diff = diffRecords(vercelRecords, cfRecords, ZONE_APEX)
  assert.equal(diff.missing.length, 2)
  assert.ok(diff.missing.some((r) => r.name === 'clerk'))
  assert.ok(diff.missing.some((r) => r.name === 'resend._domainkey'))
})

test('normalizeCloudflareRecord: strips a Cloudflare-echoed quote-wrapped TXT content so it matches the unquoted Vercel value (live incident 2026-07-10 — this exact mismatch created 4 duplicate TXT records)', () => {
  const v = normalizeVercelRecord({ type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine;' })
  const cUnquoted = normalizeCloudflareRecord({ type: 'TXT', name: `_dmarc.${ZONE_APEX}`, content: 'v=DMARC1; p=quarantine;' }, ZONE_APEX)
  const cQuoted = normalizeCloudflareRecord({ type: 'TXT', name: `_dmarc.${ZONE_APEX}`, content: '"v=DMARC1; p=quarantine;"' }, ZONE_APEX)
  assert.equal(v.key, cUnquoted.key)
  assert.equal(v.key, cQuoted.key)
})

test('diffRecords: a quote-wrapped Cloudflare TXT record is recognized as already-present, not missing', () => {
  const vercelRecords = [{ type: 'TXT', name: 'resend._domainkey', value: 'p=abc123' }]
  const cfRecords = [{ type: 'TXT', name: `resend._domainkey.${ZONE_APEX}`, content: '"p=abc123"' }]
  const diff = diffRecords(vercelRecords, cfRecords, ZONE_APEX)
  assert.deepEqual(diff.missing, [])
  assert.equal(diff.matched, 1)
})

test('diffRecords: extra Cloudflare-only records (e.g. a default NS) never fail the gate', () => {
  const vercelRecords = [{ type: 'A', name: '', value: '216.198.79.1' }]
  const cfRecords = [
    { type: 'A', name: ZONE_APEX, content: '216.198.79.1' },
    { type: 'NS', name: ZONE_APEX, content: 'ns1.cloudflare.com' },
  ]
  const diff = diffRecords(vercelRecords, cfRecords, ZONE_APEX)
  assert.deepEqual(diff.missing, [])
  assert.equal(diff.extra.length, 1)
})
