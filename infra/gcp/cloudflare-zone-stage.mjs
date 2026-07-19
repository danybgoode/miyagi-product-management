#!/usr/bin/env node
// cloudflare-zone-stage.mjs — Story 2.1 (09-platform-infra frontend-vercel-to-cloudrun, Sprint 2).
//
// Stages the miyagisanchez.com DNS zone in Cloudflare from the REAL Vercel zone export — not `dig`,
// which the subdomains-epic scar tissue (Roadmap/LEARNINGS.md) found misses records like DKIM/SPF.
// Every record is created DNS-only (proxied: false). This script never flips NS and never proxies
// traffic — it only mirrors records so the zone is ready for Daniel's manual NS-flip walkthrough.
// Safe to re-run: create-if-absent per record, by (type, name, content, priority).
//
// Usage:
//   node infra/gcp/cloudflare-zone-stage.mjs                  # stage + verify (idempotent)
//   node infra/gcp/cloudflare-zone-stage.mjs --verify-only     # skip staging, just re-diff + report
//   node infra/gcp/cloudflare-zone-stage.mjs --domain foo.com  # override the domain (default miyagisanchez.com)
//
// Credentials — env var first, else `gcloud secrets versions access latest` against project
// miyagisanchezback-497722: VERCEL_API_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID. Never
// reads .env/.env.local — this domain's real DNS is prod, there is no "dev" zone to rehearse
// against (LEARNINGS: seed/activation scripts must use prod Secret Manager creds).
//
// Zero npm deps — Node 18+ (global fetch). Diff/normalize logic lives in
// infra/gcp/lib/cloudflare-zone-diff.mjs so infra/gcp/test/cloudflare-zone-stage.test.js can
// unit-test it with fixtures, no live API calls (infra is not Playwright-gated).

import { execFileSync } from 'node:child_process'
import { diffRecords, normalizeVercelRecord, normalizeCloudflareRecord } from './lib/cloudflare-zone-diff.mjs'

const GCP_PROJECT = process.env.PROJECT_ID || 'miyagisanchezback-497722' // env-overridable since gcp-account-migration S2 — the .sh family always was
const VERCEL_API = 'https://api.vercel.com'
const CF_API = 'https://api.cloudflare.com/client/v4'

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0) return def
  const next = process.argv[i + 1]
  return next && !next.startsWith('--') ? next : true
}
const DOMAIN = String(arg('domain', 'miyagisanchez.com'))
const VERIFY_ONLY = !!arg('verify-only', false)

function resolveSecret(envName, secretName) {
  if (process.env[envName]) return process.env[envName]
  try {
    return execFileSync('gcloud', [
      'secrets', 'versions', 'access', 'latest',
      `--secret=${secretName}`, `--project=${GCP_PROJECT}`,
    ], { encoding: 'utf8' }).trim()
  } catch {
    console.error(`✗ Could not resolve ${envName}: set the env var, or populate Secret Manager secret ${secretName} in ${GCP_PROJECT} (gcloud secrets versions add ${secretName} --project=${GCP_PROJECT} --data-file=-).`)
    process.exit(1)
  }
}

const VERCEL_TOKEN = resolveSecret('VERCEL_API_TOKEN', 'VERCEL_API_TOKEN')
const CF_TOKEN = resolveSecret('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN')
const CF_ACCOUNT_ID = resolveSecret('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID')

async function vercelApi(path) {
  const r = await fetch(`${VERCEL_API}${path}`, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } })
  const j = await r.json()
  if (!r.ok) throw new Error(`Vercel ${path} → ${r.status} ${JSON.stringify(j).slice(0, 300)}`)
  return j
}

// The domain-records endpoint is account-level and 403s on a bare project-scoped call
// (LEARNINGS: "Vercel API tokens are scoped + team-aware") — resolve the team id and
// append it to every call. VERCEL_TEAM_ID env overrides; otherwise auto-detect via /v2/teams
// (same pattern as scripts/vercel-prune-previews.mjs).
let vercelTeamId
async function resolveVercelTeamId() {
  if (vercelTeamId !== undefined) return vercelTeamId
  if (process.env.VERCEL_TEAM_ID) { vercelTeamId = process.env.VERCEL_TEAM_ID; return vercelTeamId }
  const j = await vercelApi('/v2/teams')
  vercelTeamId = (j.teams && j.teams[0] && j.teams[0].id) || ''
  return vercelTeamId
}

async function cfApi(path, opts = {}) {
  const r = await fetch(`${CF_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  // Read as text first — an outage/edge error (502/504) returns an HTML page, not JSON, and
  // parsing that directly throws a SyntaxError that masks the real HTTP status (cross-review nit).
  const body = await r.text()
  let j
  try { j = JSON.parse(body) } catch {
    throw new Error(`Cloudflare ${path} → ${r.status} (non-JSON response): ${body.slice(0, 300)}`)
  }
  if (!r.ok || j.success === false) {
    throw new Error(`Cloudflare ${path} → ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`)
  }
  return j
}

// --- Vercel real zone export -------------------------------------------------
async function fetchVercelRecords(domain) {
  const teamId = await resolveVercelTeamId()
  const tq = teamId ? `&teamId=${teamId}` : ''
  let records = []
  let next
  do {
    const j = await vercelApi(`/v4/domains/${domain}/records?limit=100${tq}${next ? `&next=${next}` : ''}`)
    records = records.concat(j.records || [])
    next = j.pagination && j.pagination.next
  } while (next)
  return records
}

// --- Cloudflare zone create-if-absent ----------------------------------------
async function ensureZone(domain) {
  const list = await cfApi(`/zones?name=${encodeURIComponent(domain)}&account.id=${CF_ACCOUNT_ID}`)
  if (list.result && list.result.length) return list.result[0]
  console.log(`▶ creating Cloudflare zone ${domain} (account ${CF_ACCOUNT_ID})`)
  const created = await cfApi('/zones', {
    method: 'POST',
    body: JSON.stringify({ name: domain, account: { id: CF_ACCOUNT_ID }, type: 'full' }),
  })
  return created.result
}

async function fetchCloudflareRecords(zoneId) {
  let records = []
  let page = 1
  for (;;) {
    const j = await cfApi(`/zones/${zoneId}/dns_records?page=${page}&per_page=100`)
    records = records.concat(j.result || [])
    if (!j.result_info || page >= j.result_info.total_pages) break
    page++
  }
  return records
}

// --- stage: create-if-absent every Vercel record into Cloudflare, DNS-only ---
async function stageRecords(zoneId, vercelRecords, existingCfRecords, zoneApex) {
  const existingKeys = new Set(existingCfRecords.map((r) => normalizeCloudflareRecord(r, zoneApex).key))
  let created = 0
  let skipped = 0
  for (const vr of vercelRecords) {
    const norm = normalizeVercelRecord(vr)
    if (!norm) { skipped++; continue } // unsupported/internal record type — see normalize fn
    if (existingKeys.has(norm.key)) continue // already staged
    console.log(`  + ${norm.type} ${norm.name} → ${norm.content}`)
    await cfApi(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: norm.type,
        name: norm.name,
        content: norm.content,
        ttl: norm.ttl || 1, // 1 = "automatic" in Cloudflare
        priority: norm.priority,
        proxied: false, // DNS-only — traffic stays on Vercel this story
      }),
    })
    created++
  }
  return { created, skipped }
}

;(async () => {
  console.log(`▶ Staging Cloudflare zone for ${DOMAIN}`)
  const vercelRecords = await fetchVercelRecords(DOMAIN)
  console.log(`  Vercel export: ${vercelRecords.length} records`)

  const zone = await ensureZone(DOMAIN)
  console.log(`  Cloudflare zone: ${zone.id} (status: ${zone.status})`)

  if (!VERIFY_ONLY) {
    const before = await fetchCloudflareRecords(zone.id)
    const { created, skipped } = await stageRecords(zone.id, vercelRecords, before, DOMAIN)
    console.log(`  staged ${created} new record(s), skipped ${skipped} unsupported/internal, ${before.length} already present`)
  }

  // --- verify: re-fetch and diff -----
  const after = await fetchCloudflareRecords(zone.id)
  const diff = diffRecords(vercelRecords, after, DOMAIN)

  if (diff.missing.length) {
    console.error(`\n✗ ZONE-DIFF FAILED — ${diff.missing.length} record(s) present in Vercel but missing in Cloudflare:`)
    diff.missing.forEach((r) => console.error(`    ${r.type} ${r.name} → ${r.content}`))
    process.exit(1)
  }
  console.log(`\n✓ Zone-diff clean — every Vercel record is staged in Cloudflare (${diff.matched} matched, ${diff.extra.length} Cloudflare-only/ignorable).`)

  console.log('\nNameservers to hand off to Daniel for the NS flip:')
  ;(zone.name_servers || []).forEach((ns) => console.log(`  ${ns}`))
})().catch((e) => { console.error(e.message || e); process.exit(1) })
