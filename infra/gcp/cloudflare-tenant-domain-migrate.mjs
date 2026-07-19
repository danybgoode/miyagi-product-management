#!/usr/bin/env node
// cloudflare-tenant-domain-migrate.mjs — Story 4.3 (09-platform-infra frontend-vercel-to-cloudrun,
// Sprint 4).
//
// Pre-provisions every LIVE tenant custom domain as a Cloudflare Custom Hostname, so each is
// validated + SSL-ready ahead of the seller actually repointing their own DNS. Dry-run by default
// (vercel-prune-previews.mjs convention) — nothing is created until --apply.
//
// IMPORTANT — what this script does NOT do, and why: unlike Sprint 3.4's apex/wildcard cutover
// (our own zone, a direct API flip), a tenant's custom domain lives in THEIR zone/registrar, which
// we don't control and have no durable credential to write to (the one-click Cloudflare OAuth flow
// uses a single-use, never-persisted token). So this script uses TXT ownership validation, which
// does NOT require the seller's DNS to point at us yet — it only pre-provisions + reports. Traffic
// only actually moves once the seller repoints their own CNAME (self-service re-run of the
// one-click connect button, or manually, per Story 4.2's updated instructions). Vercel keeps
// serving every domain, unchanged, throughout — that's what makes rollback here low-stakes (see
// --rollback below): deleting a Cloudflare custom hostname does not touch the seller's live DNS at
// all, since the seller's DNS was never required to change for `--apply` to run.
//
// Usage:
//   node infra/gcp/cloudflare-tenant-domain-migrate.mjs                    # dry-run, all live tenant domains
//   node infra/gcp/cloudflare-tenant-domain-migrate.mjs --apply            # pre-provision as Cloudflare custom hostnames
//   node infra/gcp/cloudflare-tenant-domain-migrate.mjs --domain foo.mx    # scope to one domain
//   node infra/gcp/cloudflare-tenant-domain-migrate.mjs --status          # live status only, no writes, no --apply needed
//   node infra/gcp/cloudflare-tenant-domain-migrate.mjs --rollback foo.mx --apply   # delete that domain's Cloudflare custom hostname
//
// Credentials — env var first, else `gcloud secrets versions access latest` against project
// miyagisanchez-prod: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, VERCEL_API_TOKEN, VERCEL_PROJECT_ID. Zero npm deps — Node 18+ (global
// fetch). Deliberately does NOT import apps/miyagisanchez/lib/cloudflare-domains.ts — infra scripts
// in this repo are a separate, dependency-free runtime from the Next.js app (matches every other
// script in this directory), so the mapping is duplicated here in raw fetch form.

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const GCP_PROJECT = process.env.PROJECT_ID || 'miyagisanchez-prod' // env-overridable since gcp-account-migration S2 — the .sh family always was
const CF_API = 'https://api.cloudflare.com/client/v4'
const VERCEL_API = 'https://api.vercel.com'
const FALLBACK_ORIGIN = 'cname.miyagisanchez.com' // matches lib/domain-utils.ts CNAME_TARGET

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0) return def
  const next = process.argv[i + 1]
  return next && !next.startsWith('--') ? next : true
}
const ONLY_DOMAIN = arg('domain', undefined)
const APPLY = !!arg('apply', false)
const STATUS_ONLY = !!arg('status', false)
const ROLLBACK_DOMAIN = arg('rollback', undefined)
const REPORT_DIR = String(arg('report-dir', join(process.cwd(), '.cf-tenant-migration-reports')))

function resolveSecret(envName, secretName) {
  if (process.env[envName]) return process.env[envName]
  try {
    return execFileSync('gcloud', [
      'secrets', 'versions', 'access', 'latest',
      `--secret=${secretName}`, `--project=${GCP_PROJECT}`,
    ], { encoding: 'utf8' }).trim()
  } catch {
    console.error(`✗ Could not resolve ${envName}: set the env var, or populate Secret Manager secret ${secretName} in ${GCP_PROJECT}.`)
    process.exit(1)
  }
}
const CF_TOKEN = resolveSecret('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN')
const CF_ACCOUNT_ID = resolveSecret('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID')
const SUPABASE_URL = resolveSecret('SUPABASE_URL', 'SUPABASE_URL')
const SUPABASE_KEY = resolveSecret('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY')
const VERCEL_TOKEN = resolveSecret('VERCEL_API_TOKEN', 'VERCEL_API_TOKEN')
const VERCEL_PROJECT_ID = resolveSecret('VERCEL_PROJECT_ID', 'VERCEL_PROJECT_ID')

async function cfApi(path, opts = {}) {
  const r = await fetch(`${CF_API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const body = await r.text()
  let j
  try { j = JSON.parse(body) } catch {
    throw new Error(`Cloudflare ${path} → ${r.status} (non-JSON response): ${body.slice(0, 300)}`)
  }
  if (!r.ok || j.success === false) {
    throw new Error(`Cloudflare ${path} → ${r.status} ${JSON.stringify(j.errors || j).slice(0, 400)}`)
  }
  return j
}

async function resolveZoneId(domain = 'miyagisanchez.com') {
  const j = await cfApi(`/zones?name=${encodeURIComponent(domain)}&account.id=${CF_ACCOUNT_ID}`)
  const zone = j.result?.[0]
  if (!zone) throw new Error(`Zone not found for ${domain} in account ${CF_ACCOUNT_ID}.`)
  return zone.id
}

async function findCustomHostname(zoneId, hostname) {
  const j = await cfApi(`/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`)
  return (j.result ?? []).find((r) => r.hostname === hostname) ?? null
}

async function fetchLiveTenantDomains() {
  const url = `${SUPABASE_URL}/rest/v1/marketplace_shops?select=id,slug,custom_domain,custom_domain_verified,custom_domain_vercel_ok&custom_domain=not.is.null`
  const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } })
  if (!r.ok) throw new Error(`Supabase query failed: ${r.status} ${(await r.text()).slice(0, 300)}`)
  return r.json()
}

async function fetchVercelProjectDomains() {
  const domains = []
  let next
  do {
    const url = `${VERCEL_API}/v9/projects/${VERCEL_PROJECT_ID}/domains${next ? `?until=${next}` : ''}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } })
    if (!r.ok) throw new Error(`Vercel domains list failed: ${r.status} ${(await r.text()).slice(0, 300)}`)
    const j = await r.json()
    domains.push(...(j.domains ?? []).map((d) => d.name))
    next = j.pagination?.next
  } while (next)
  return domains
}

function isReady(hostname) {
  return hostname?.status === 'active' || hostname?.status === 'active_redeploying'
}

;(async () => {
  const zoneId = await resolveZoneId()

  if (ROLLBACK_DOMAIN) {
    console.log(`▶ Rollback: removing Cloudflare custom hostname for ${ROLLBACK_DOMAIN}`)
    const existing = await findCustomHostname(zoneId, ROLLBACK_DOMAIN)
    if (!existing) { console.log('  nothing to remove — no custom hostname found.'); return }
    console.log(`  found id ${existing.id} (status: ${existing.status})`)
    if (!APPLY) { console.log('\nDRY-RUN — re-run with --apply to actually delete it. The seller\'s live DNS is untouched either way.'); return }
    await cfApi(`/zones/${zoneId}/custom_hostnames/${existing.id}`, { method: 'DELETE' })
    console.log(`  ✓ removed. This does not affect the seller's live traffic (still served by whatever their DNS points at today).`)
    return
  }

  console.log('▶ Fetching live tenant domains from Supabase…')
  let shops = await fetchLiveTenantDomains()
  if (ONLY_DOMAIN) shops = shops.filter((s) => s.custom_domain === ONLY_DOMAIN)
  console.log(`  ${shops.length} shop(s) with a custom_domain set.`)

  console.log('▶ Cross-checking against Vercel\'s live project domain list…')
  const vercelDomains = new Set(await fetchVercelProjectDomains())
  const driftMissingFromVercel = shops.filter((s) => !vercelDomains.has(s.custom_domain))
  if (driftMissingFromVercel.length) {
    console.log(`  ⚠ ${driftMissingFromVercel.length} domain(s) in Supabase but NOT on the Vercel project — review before migrating:`)
    for (const s of driftMissingFromVercel) console.log(`    ${s.custom_domain} (shop ${s.slug ?? s.id})`)
  }

  console.log('\n▶ Cloudflare custom-hostname status per domain:')
  const rows = []
  for (const shop of shops) {
    const domain = shop.custom_domain
    let hostname = null
    try { hostname = await findCustomHostname(zoneId, domain) } catch (e) { console.log(`  ✗ ${domain}: lookup failed — ${e.message}`); continue }
    const ready = isReady(hostname)
    const action = hostname ? (ready ? 'already ready' : 'exists, pending validation') : (STATUS_ONLY ? 'not provisioned (status-only run)' : 'will pre-provision')
    console.log(`  ${domain.padEnd(35)} shop=${(shop.slug ?? shop.id).toString().padEnd(20)} cf_status=${(hostname?.status ?? 'none').padEnd(10)} → ${action}`)
    rows.push({ domain, shop: shop.slug ?? shop.id, cfStatus: hostname?.status ?? null, ready, existed: !!hostname })
  }

  if (STATUS_ONLY) {
    console.log('\n(--status: read-only, no changes made.)')
    return
  }

  const toCreate = rows.filter((r) => !r.existed)
  if (!APPLY) {
    console.log(`\nDRY-RUN — ${toCreate.length} domain(s) would be pre-provisioned as Cloudflare custom hostnames (TXT validation, no seller DNS change required). Re-run with --apply.`)
    return
  }

  console.log(`\n▶ Pre-provisioning ${toCreate.length} domain(s) (concurrency 8)…`)
  let ok = 0, fail = 0, idx = 0
  const created = []
  const worker = async () => {
    while (idx < toCreate.length) {
      const row = toCreate[idx++]
      try {
        const res = await cfApi(`/zones/${zoneId}/custom_hostnames`, {
          method: 'POST',
          body: JSON.stringify({
            hostname: row.domain,
            ssl: { method: 'txt', type: 'dv' },
            custom_origin_server: FALLBACK_ORIGIN,
          }),
        })
        created.push({ domain: row.domain, id: res.result.id, action: 'created' })
        ok++
      } catch (e) {
        console.error(`  ! ${row.domain}: ${e.message}`)
        fail++
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  console.log(`Done — created ${ok}, failed ${fail}.`)

  mkdirSync(REPORT_DIR, { recursive: true, mode: 0o700 })
  const reportPath = join(REPORT_DIR, `migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(reportPath, JSON.stringify({ ranAt: new Date().toISOString(), rows, created }, null, 2))
  console.log(`Report saved: ${reportPath} (rollback any domain with --rollback <domain> --apply)`)

  console.log('\n▶ Seller action list (nothing changes for them until they act):')
  for (const row of rows) {
    if (row.ready) { console.log(`  ${row.domain}: already ready — no action needed.`); continue }
    console.log(`  ${row.domain}: ask the seller to repoint their CNAME to ${FALLBACK_ORIGIN} (or re-run the one-click Cloudflare connect button in Ajustes → Canal, which now targets the new value).`)
  }
  if (fail) process.exit(1)
})().catch((e) => { console.error(e.message || e); process.exit(1) })
