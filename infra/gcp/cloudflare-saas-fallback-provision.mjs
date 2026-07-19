#!/usr/bin/env node
// cloudflare-saas-fallback-provision.mjs — Story 4.1 (09-platform-infra frontend-vercel-to-cloudrun, Sprint 4).
//
// One-time zone setup for Cloudflare for SaaS (Custom Hostnames), the tenant-domain provider swap:
//   1. Create-if-absent a PROXIED A record `cname.<domain>` → the ALB's static IP. This is the
//      "fallback origin" hostname tenant custom hostnames route through — it must live INSIDE our
//      own zone and already resolve through Cloudflare's edge (LEARNINGS: proxied traffic must
//      terminate at Cloudflare, never skip straight to the ALB, or SNI-based custom-hostname
//      routing can't apply).
//   2. Register that hostname as the zone's Cloudflare-for-SaaS fallback origin
//      (PUT /zones/{zone_id}/custom_hostnames/fallback_origin).
// Idempotent — safe to re-run (create-if-absent record; the fallback-origin PUT is itself
// idempotent by design).
//
// Does NOT reissue the Origin CA cert. cloudflare-origin-cert.mjs already left a documented slot
// for this hostname (Sprint 2.2's comment) — reissue is a separate, deliberate step since it means
// deleting the existing local .pem and updating the ALB's --ssl-certificates, same live-cert
// discipline as Sprint 3.4's mschz.org extension:
//   rm .cf-origin-cert/origin.pem   # only after confirming the ALB's live cert reference elsewhere
//   node infra/gcp/cloudflare-origin-cert.mjs --hostnames miyagisanchez.com,*.miyagisanchez.com,cname.miyagisanchez.com
//   # then update miyagi-web-https-proxy's --ssl-certificates to the newly issued cert
//
// Prerequisite (flagged, not guessable from here): Cloudflare for SaaS / Custom Hostnames is a
// paid zone-level feature — confirm it's enabled on the miyagisanchez.com zone in the dashboard,
// and that CLOUDFLARE_API_TOKEN has the "SSL and Certificates" / "Cloudflare for SaaS" permission
// group (same 403-on-missing-scope shape as Sprint 2.1's "Zone→DNS" gap and Sprint 2.3's Bot Fight
// Mode gap) BEFORE running this live.
//
// Usage:
//   node infra/gcp/cloudflare-saas-fallback-provision.mjs                 # miyagisanchez.com, apply
//   node infra/gcp/cloudflare-saas-fallback-provision.mjs --dry-run       # print the plan only
//   node infra/gcp/cloudflare-saas-fallback-provision.mjs --domain foo.com --fallback-label cname
//
// Credentials — env var first, else `gcloud secrets versions access latest` against project
// miyagisanchezback-497722: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (same as the other
// Cloudflare scripts in this epic). Zero npm deps — Node 18+ (global fetch).

import { execFileSync } from 'node:child_process'

const GCP_PROJECT = process.env.PROJECT_ID || 'miyagisanchezback-497722' // env-overridable since gcp-account-migration S2 — the .sh family always was
const CF_API = 'https://api.cloudflare.com/client/v4'
const ALB_IP_NAME = 'miyagi-web-lb-ip' // matches provision-alb-frontend.sh's IP_NAME

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0) return def
  const next = process.argv[i + 1]
  return next && !next.startsWith('--') ? next : true
}
const DOMAIN = String(arg('domain', 'miyagisanchez.com'))
const FALLBACK_LABEL = String(arg('fallback-label', 'cname'))
const FALLBACK_HOST = `${FALLBACK_LABEL}.${DOMAIN}`
const DRY_RUN = !!arg('dry-run', false)

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

async function resolveZone(domain) {
  const j = await cfApi(`/zones?name=${encodeURIComponent(domain)}&account.id=${CF_ACCOUNT_ID}`)
  const zone = j.result?.[0]
  if (!zone) throw new Error(`Zone not found for ${domain} in account ${CF_ACCOUNT_ID}. Has it been staged (Sprint 2.1)?`)
  return zone
}

function resolveAlbStaticIp() {
  return execFileSync('gcloud', [
    'compute', 'addresses', 'describe', ALB_IP_NAME,
    '--global', `--project=${GCP_PROJECT}`, '--format=value(address)',
  ], { encoding: 'utf8' }).trim()
}

async function findRecord(zoneId, name) {
  const j = await cfApi(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`)
  return (j.result ?? [])[0] ?? null
}

;(async () => {
  console.log(`▶ Cloudflare for SaaS fallback-origin setup for ${DOMAIN}`)
  const albIp = resolveAlbStaticIp()
  console.log(`  ALB static IP: ${albIp}`)
  console.log(`  fallback origin hostname: ${FALLBACK_HOST}`)

  const zone = await resolveZone(DOMAIN)
  console.log(`  zone: ${zone.id} (status: ${zone.status})`)

  const existing = await findRecord(zone.id, FALLBACK_HOST)
  if (existing) {
    console.log(`  record ${FALLBACK_HOST} already exists: A ${existing.content} (proxied: ${existing.proxied})`)
    if (existing.content !== albIp || !existing.proxied) {
      console.log(`  ⚠ existing record does not match the expected A ${albIp} (proxied: true) — review before proceeding.`)
    }
  } else {
    console.log(`  will create: A ${FALLBACK_HOST} → ${albIp} (proxied: true)`)
    if (!DRY_RUN) {
      await cfApi(`/zones/${zone.id}/dns_records`, {
        method: 'POST',
        body: JSON.stringify({ type: 'A', name: FALLBACK_HOST, content: albIp, proxied: true, ttl: 1 }),
      })
      console.log(`  ✓ created A ${FALLBACK_HOST} → ${albIp} (proxied)`)
    }
  }

  console.log(`  will set zone fallback origin → ${FALLBACK_HOST}`)
  if (!DRY_RUN) {
    await cfApi(`/zones/${zone.id}/custom_hostnames/fallback_origin`, {
      method: 'PUT',
      body: JSON.stringify({ origin: FALLBACK_HOST }),
    })
    console.log(`  ✓ fallback origin set to ${FALLBACK_HOST}`)
  }

  if (DRY_RUN) {
    console.log('\nDRY-RUN — re-run without --dry-run to actually apply the above.')
  } else {
    console.log(`\n✓ Done. Next (separate, deliberate step — NOT run by this script):`)
    console.log(`  node infra/gcp/cloudflare-origin-cert.mjs --hostnames ${DOMAIN},*.${DOMAIN},${FALLBACK_HOST}`)
    console.log(`  then update miyagi-web-https-proxy's --ssl-certificates to the newly issued cert.`)
  }
})().catch((e) => { console.error(e.message || e); process.exit(1) })
