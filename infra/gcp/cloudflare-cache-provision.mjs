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

const GCP_PROJECT = process.env.PROJECT_ID || 'miyagisanchezback-497722' // env-overridable since gcp-account-migration S2 — the .sh family always was
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

// hyper-performant-website S1's image proxy (/api/img) — extension-less, so Cloudflare's default
// file-extension caching never touches it and EVERY request re-fetched + re-encoded on Cloud Run
// (13-14 s per variant, cf-cache-status: DYNAMIC — measured live 2026-07-18, the exact miss the
// nightly browser-smoke timeouts surfaced). The route itself marks success responses
// `public, max-age=31536000, immutable` (URLs are content-addressed by url+w+q+format) and its
// error responses carry NO Cache-Control — so respect_origin caches exactly the good encodes and
// never the 4xx/5xx paths. Same-host scoping as the static rule.
const IMG_PROXY_RULE_DESCRIPTION = 'miyagi-web edge cache — /api/img proxy variants (S1, hyper-performant-website)'
const IMG_PROXY_EXPRESSION = `${HOST_EXPRESSION} and (http.request.uri.path eq "/api/img")`

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
  const imgProxyRule = {
    expression: IMG_PROXY_EXPRESSION,
    action: 'set_cache_settings',
    action_parameters: {
      cache: true,
      edge_ttl: { mode: 'respect_origin' },
    },
    description: IMG_PROXY_RULE_DESCRIPTION,
    enabled: true,
  }
  const OWN_DESCRIPTIONS = new Set([RULE_DESCRIPTION, IMG_PROXY_RULE_DESCRIPTION])
  const otherRules = existingRules.filter((r) => !OWN_DESCRIPTIONS.has(r.description))
  const newRules = [...otherRules, ownRule, imgProxyRule]

  await cfApi(`/zones/${zone.id}/rulesets/phases/http_request_cache_settings/entrypoint`, {
    method: 'PUT',
    body: JSON.stringify({ rules: newRules }),
  })
  console.log(`  = cache rules in place for ${CONFIRMED_STATIC_PATHS.join(', ')} + /api/img (${otherRules.length} other rule(s) preserved untouched)`)

  console.log('\n✓ Done. Verify: curl -sI https://miyagisanchez.com/ and any /api/img?url=…&w=… URL (run twice — first MISS, second should show cf-cache-status: HIT)')
})().catch((e) => { console.error(e.message || e); process.exit(1) })
