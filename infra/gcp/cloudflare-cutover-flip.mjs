#!/usr/bin/env node
// cloudflare-cutover-flip.mjs — Story 3.4 (09-platform-infra frontend-vercel-to-cloudrun, Sprint 3).
//
// Flips the apex (`<domain>`) and wildcard (`*.<domain>`) DNS records in a Cloudflare zone from
// DNS-only (pointing at Vercel, staged in Sprint 2.1) to proxied, pointing at the GCP ALB's static
// IP — the actual traffic cutover. Dry-run by default (vercel-prune-previews.mjs convention);
// nothing is written until --apply. Every flip writes a timestamped JSON snapshot of the PRE-flip
// record state (content + proxied) to --snapshot-dir, so --rollback can restore it exactly —
// "flip the records back" needs both proxied AND content reverted, not just proxied, since the
// apex/wildcard records' content changes from Vercel's value to the ALB IP.
//
// This story is Daniel's to execute personally (the epic's HIGH-risk cutover gate) — this script
// is the prepared, reviewed tool, not something run autonomously.
//
// Usage:
//   node infra/gcp/cloudflare-cutover-flip.mjs                              # dry-run, miyagisanchez.com
//   node infra/gcp/cloudflare-cutover-flip.mjs --apply                      # actually flip
//   node infra/gcp/cloudflare-cutover-flip.mjs --domain mschz.org --apply   # the redirector domain
//   node infra/gcp/cloudflare-cutover-flip.mjs --rollback <snapshot-file>   # revert from a snapshot
//
// Credentials — env var first, else `gcloud secrets versions access latest` against project
// miyagisanchez-prod: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (same as
// cloudflare-zone-stage.mjs). Zero npm deps — Node 18+ (global fetch).

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const GCP_PROJECT = process.env.PROJECT_ID || 'miyagisanchez-prod' // env-overridable since gcp-account-migration S2 — the .sh family always was
const CF_API = 'https://api.cloudflare.com/client/v4'
const ALB_IP_NAME = 'miyagi-web-lb-ip' // matches provision-alb-frontend.sh's IP_NAME
const REGION_GLOBAL = true

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0) return def
  const next = process.argv[i + 1]
  return next && !next.startsWith('--') ? next : true
}
const DOMAIN = String(arg('domain', 'miyagisanchez.com'))
const APPLY = !!arg('apply', false)
const ROLLBACK_FILE = arg('rollback', undefined)
const SNAPSHOT_DIR = String(arg('snapshot-dir', join(process.cwd(), '.cf-cutover-snapshots')))

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

function resolveAlbStaticIp() {
  return execFileSync('gcloud', [
    'compute', 'addresses', 'describe', ALB_IP_NAME,
    ...(REGION_GLOBAL ? ['--global'] : []),
    `--project=${GCP_PROJECT}`,
    '--format=value(address)',
  ], { encoding: 'utf8' }).trim()
}

async function resolveZone(domain) {
  const list = await cfApi(`/zones?name=${encodeURIComponent(domain)}&account.id=${CF_ACCOUNT_ID}`)
  if (!list.result || !list.result.length) throw new Error(`No Cloudflare zone found for ${domain}`)
  return list.result[0]
}

async function fetchAllRecords(zoneId) {
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

// Only ever touches the apex/wildcard's ROUTING records (A/AAAA/CNAME) — every other record
// sharing the same name (CAA, TXT google-site-verification, MX, etc.) is left untouched, as is
// every other hostname (Clerk, email, custom hostnames, etc.). Filtering by name alone would
// also match CAA/TXT records at the apex — confirmed live via a dry-run against the real zone
// (miyagisanchez.com carries 3 CAA + 1 TXT record at the apex) before this filter was added;
// without it, --apply would have overwritten those non-routing records with an A record.
const ROUTING_TYPES = new Set(['A', 'AAAA', 'CNAME'])
// gcp-account-migration S3 (Daniel approved 2026-07-19): the account-migration cutover must flip
// FOUR names, not two — live zone truth carries an explicit `www` A record the wildcard never
// matches, and `api` moves off its DNS-only CNAME→ghs.googlehosted.com (Cloud Run domain mapping)
// onto the ALB as a proxied A record (host rule provisioned dark in provision-alb-frontend.sh §6b).
// Defaulted for miyagisanchez.com only — other domains (mschz.org) keep the original apex+wildcard
// semantics unless --extra-hosts is passed explicitly.
const EXTRA_HOSTS = String(arg('extra-hosts', DOMAIN === 'miyagisanchez.com' ? 'www,api' : ''))
  .split(',').map((h) => h.trim()).filter(Boolean)
function selectCutoverRecords(records, domain) {
  const names = new Set([domain, `*.${domain}`, ...EXTRA_HOSTS.map((h) => `${h}.${domain}`)])
  return records.filter((r) => names.has(r.name) && ROUTING_TYPES.has(r.type))
}

async function patchRecord(zoneId, record, { content, proxied, type }) {
  return cfApi(`/zones/${zoneId}/dns_records/${record.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ content, proxied, type: type ?? record.type }),
  })
}

async function deleteRecord(zoneId, recordId) {
  return cfApi(`/zones/${zoneId}/dns_records/${recordId}`, { method: 'DELETE' })
}

async function createRecord(zoneId, { type, name, content, proxied, ttl }) {
  return cfApi(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({ type, name, content, proxied, ttl: ttl || 1 }),
  })
}

// Vercel's real zone export commonly carries TWO A records per name (dual-IP redundancy — e.g.
// both the apex and the wildcard had 2 records each here). Retargeting every one of them to the
// SAME new ALB IP would create duplicate (type, name, content) tuples, which Cloudflare's API
// rejects outright (error 81058 "An identical record already exists") — confirmed live
// (2026-07-10): the first record in a name-group patched fine, the second one 400'd, leaving a
// genuinely inconsistent split state (one record correctly pointing at the ALB, its sibling still
// pointing at Vercel) until this was found and fixed. Fix: group by name, PATCH only the first
// record in each group to the new target, DELETE the rest (never patch two records to an
// identical value).
function groupByName(records) {
  const groups = new Map()
  for (const r of records) {
    if (!groups.has(r.name)) groups.set(r.name, [])
    groups.get(r.name).push(r)
  }
  return groups
}

;(async () => {
  if (ROLLBACK_FILE) {
    console.log(`▶ Rolling back from snapshot ${ROLLBACK_FILE}`)
    const snapshot = JSON.parse(readFileSync(ROLLBACK_FILE, 'utf8'))
    const zone = await resolveZone(snapshot.domain)
    // A record marked action:"patch" still exists (same id) — PATCH it back. A record marked
    // action:"delete" no longer exists in Cloudflare at all — it must be re-CREATED, not patched
    // (its id is gone).
    for (const rec of snapshot.records) {
      const verb = rec.action === 'delete' ? 're-creating' : 'restoring'
      console.log(`  ${verb} ${rec.name}: content=${rec.content} proxied=${rec.proxied} type=${rec.type}`)
      if (!APPLY) continue
      if (rec.action === 'delete') await createRecord(zone.id, { type: rec.type, name: rec.name, content: rec.content, proxied: rec.proxied })
      else await patchRecord(zone.id, { id: rec.id }, { content: rec.content, proxied: rec.proxied, type: rec.type })
    }
    if (!APPLY) console.log('\nDRY-RUN — re-run with --apply to actually restore the above.')
    else console.log('\n✓ Rollback applied.')
    return
  }

  console.log(`▶ Cutover flip for ${DOMAIN} (apex + wildcard${EXTRA_HOSTS.length ? ' + ' + EXTRA_HOSTS.join('/') : ''})`)
  const albIp = resolveAlbStaticIp()
  console.log(`  ALB static IP: ${albIp}`)

  const zone = await resolveZone(DOMAIN)
  console.log(`  zone: ${zone.id} (status: ${zone.status})`)

  const all = await fetchAllRecords(zone.id)
  const targets = selectCutoverRecords(all, DOMAIN)
  if (targets.length === 0) {
    console.log(`  ✗ no apex/wildcard records found for ${DOMAIN} — nothing to flip. Has the zone been staged (Sprint 2.1)?`)
    return
  }

  const groups = groupByName(targets)
  console.log(`  found ${targets.length} record(s) across ${groups.size} name(s) to flip:`)
  for (const [name, recs] of groups) {
    const [keep, ...drop] = recs
    console.log(`    ${keep.type} ${name} → ${keep.content} (proxied: ${keep.proxied}) ⇒ A ${name} → ${albIp} (proxied: true)`)
    for (const d of drop) {
      console.log(`    ${d.type} ${name} → ${d.content} (proxied: ${d.proxied}) ⇒ DELETE (duplicate name — Cloudflare rejects 2 identical records)`)
    }
  }

  if (!APPLY) {
    console.log('\nDRY-RUN — re-run with --apply to actually flip the above. Nothing was changed.')
    return
  }

  const snapshotRecords = []
  for (const recs of groups.values()) {
    const [keep, ...drop] = recs
    snapshotRecords.push({ id: keep.id, name: keep.name, type: keep.type, content: keep.content, proxied: keep.proxied, action: 'patch' })
    for (const d of drop) snapshotRecords.push({ id: d.id, name: d.name, type: d.type, content: d.content, proxied: d.proxied, action: 'delete' })
  }

  mkdirSync(SNAPSHOT_DIR, { recursive: true, mode: 0o700 })
  const snapshotPath = join(SNAPSHOT_DIR, `${DOMAIN}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(snapshotPath, JSON.stringify({ domain: DOMAIN, flippedAt: new Date().toISOString(), records: snapshotRecords }, null, 2))
  console.log(`  ▶ pre-flip snapshot saved: ${snapshotPath} (rollback with --rollback ${snapshotPath})`)

  for (const [name, recs] of groups) {
    const [keep, ...drop] = recs
    await patchRecord(zone.id, keep, { content: albIp, proxied: true, type: 'A' })
    console.log(`  ✓ flipped ${name} → A ${albIp} (proxied)`)
    for (const d of drop) {
      await deleteRecord(zone.id, d.id)
      console.log(`  ✓ deleted duplicate ${d.type} ${name} → ${d.content}`)
    }
  }
  console.log(`\n✓ Cutover flip applied for ${DOMAIN}. Verify: https://${DOMAIN}/ should now show a cf-ray header AND serve from Cloud Run.`)
})().catch((e) => { console.error(e.message || e); process.exit(1) })
