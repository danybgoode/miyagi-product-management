#!/usr/bin/env node
// cloudflare-cache-provision.mjs — Sprint 3 (09-platform-infra deploy-pipeline-tuning).
//
// Adds a scoped Cloudflare Cache Rule so the confirmed-static homepage (`/`) is served straight
// from Cloudflare's edge instead of round-tripping to Cloud Run on every request. This is the
// epic's one genuinely new capability — nothing in this repo has cached anything at Cloudflare's
// edge before this (Cloud CDN is explicitly disabled at the ALB).
//
// CONFIRMED_STATIC_PATHS is the single source of truth for what this rule caches, and it must
// match exactly what Sprint 3's S3.1 live origin probe found cacheable (see sprint-3.md) — do NOT
// widen this list without re-running that probe first. The `(shell)` subtree (every seller
// storefront) reads `headers()` and is genuinely dynamic; a probe found `/faq` and `/politicas`
// 404 (a separate, pre-existing bug, unrelated to caching).
//
// Mode: respect origin `Cache-Control` — this rule does NOT set a forced edge TTL, so Next's own
// `s-maxage=60` (from `app/(site)/page.tsx`'s `revalidate`) keeps driving the actual edge TTL.
//
// Usage:
//   node infra/gcp/cloudflare-cache-provision.mjs
//
// Credentials: same resolution as the sibling Cloudflare scripts (env var, else Secret Manager).
// Zero npm deps — Node 18+ (global fetch).

import { execFileSync } from 'node:child_process'

const GCP_PROJECT = 'miyagisanchezback-497722'
const CF_API = 'https://api.cloudflare.com/client/v4'
const DOMAIN = 'miyagisanchez.com'

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

async function cfApi(path, opts = {}) {
  const r = await fetch(`${CF_API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  // Read as text first — an outage/edge error (502/504) returns an HTML page, not JSON, and
  // parsing that directly throws a SyntaxError that masks the real HTTP status.
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

// Sprint 3 S3.1's confirmed-cacheable path list — see sprint-3.md for the live probe evidence.
const CONFIRMED_STATIC_PATHS = ['/']

// Scoped to the apex + www host only — deliberately excludes every shop subdomain/custom domain,
// since `x-miyagi-channel` custom-domain routing means the same path can render differently per
// host, and this rule must never cache anything that varies by tenant.
const HOST_EXPRESSION = `(http.host eq "${DOMAIN}" or http.host eq "www.${DOMAIN}")`
const PATH_EXPRESSION = CONFIRMED_STATIC_PATHS.map((p) => `http.request.uri.path eq "${p}"`).join(' or ')
const CACHE_RULE_EXPRESSION = `${HOST_EXPRESSION} and (${PATH_EXPRESSION})`

const RULE_DESCRIPTION = 'miyagi-web edge cache — confirmed-static paths only (Sprint 3, deploy-pipeline-tuning)'

;(async () => {
  const zoneList = await cfApi(`/zones?name=${encodeURIComponent(DOMAIN)}`)
  const zone = zoneList.result?.[0]
  if (!zone) throw new Error(`Zone ${DOMAIN} not found`)
  console.log(`▶ Zone: ${zone.id} (${zone.name})`)

  // The http_request_cache_settings phase's entrypoint ruleset is a single PUT-replaceable
  // resource per zone — read the current rules first so a re-run doesn't clobber any OTHER rule a
  // human added by hand in the dashboard; only add/update the one this script owns (matched by its
  // fixed description). Unlike the WAF script's Bot Fight Mode step, this call is NOT soft-failed:
  // the Cache Rule is the entire point of this script, so a permission error should surface
  // loudly (the token needs the "Cache Rules: Edit" zone permission).
  let existingRules = []
  try {
    const entry = await cfApi(`/zones/${zone.id}/rulesets/phases/http_request_cache_settings/entrypoint`)
    existingRules = entry.result?.rules ?? []
  } catch (e) {
    // Cloudflare error code 10003 = "no entrypoint ruleset in this phase yet" — starting from
    // empty is correct. Any OTHER failure (permission lost, 5xx, transient network) must NOT fall
    // through to a PUT that would silently clobber existing Cache Rules — rethrow (cross-review
    // finding, fixed pre-merge).
    if (!/"code":\s*10003/.test(e.message)) throw e
  }

  const ownRule = {
    expression: CACHE_RULE_EXPRESSION,
    action: 'set_cache_settings',
    action_parameters: {
      cache: true,
      edge_ttl: { mode: 'respect_origin' },
    },
    description: RULE_DESCRIPTION,
    enabled: true,
  }
  const otherRules = existingRules.filter((r) => r.description !== RULE_DESCRIPTION)
  const newRules = [...otherRules, ownRule]

  await cfApi(`/zones/${zone.id}/rulesets/phases/http_request_cache_settings/entrypoint`, {
    method: 'PUT',
    body: JSON.stringify({ rules: newRules }),
  })
  console.log(`  = cache rule in place for ${CONFIRMED_STATIC_PATHS.join(', ')} (${otherRules.length} other rule(s) preserved untouched)`)

  console.log('\n✓ Done. Verify: curl -sI https://miyagisanchez.com/ (run twice — first may be MISS, second should show cf-cache-status: HIT)')
})().catch((e) => { console.error(e.message || e); process.exit(1) })
