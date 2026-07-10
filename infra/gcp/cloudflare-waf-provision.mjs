#!/usr/bin/env node
// cloudflare-waf-provision.mjs — Story 2.3 (09-platform-infra frontend-vercel-to-cloudrun, Sprint 2).
//
// Enables Cloudflare Bot Fight Mode (free-tier bot mitigation, parity with Vercel's Bot Protection
// which this migration retires) and a custom WAF rule blocking the same probe-path shapes Vercel's
// firewall mitigated (`/wp-admin`, `.env`, `.git`, `wp-login.php`, `xmlrpc.php` — see
// e2e/not-found-shape.spec.ts and LEARNINGS' "Vercel WAF shadows app 404" note for the app-level
// equivalent this mirrors at the edge instead). Idempotent — a re-run just confirms the same state.
//
// Usage:
//   node infra/gcp/cloudflare-waf-provision.mjs
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
  // parsing that directly throws a SyntaxError that masks the real HTTP status (cross-review nit).
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

// Same probe-path shape Vercel's Bot Protection mitigated (LEARNINGS: test with a benign slug for
// the app's OWN 404 shape, but this rule specifically targets the classic scanner paths).
const PROBE_RULE_EXPRESSION = [
  '(http.request.uri.path contains "/wp-admin")',
  '(http.request.uri.path contains "wp-login.php")',
  '(http.request.uri.path contains "xmlrpc.php")',
  '(http.request.uri.path contains "/.env")',
  '(http.request.uri.path contains "/.git")',
  '(http.request.uri.path contains "admin.php")',
].join(' or ')

const RULE_DESCRIPTION = 'miyagi-web edge probe-path block (parity with retired Vercel Bot Protection)'

;(async () => {
  const zoneList = await cfApi(`/zones?name=${encodeURIComponent(DOMAIN)}`)
  const zone = zoneList.result?.[0]
  if (!zone) throw new Error(`Zone ${DOMAIN} not found`)
  console.log(`▶ Zone: ${zone.id} (${zone.name})`)

  // --- 1 · Bot Fight Mode (free-tier bot mitigation) ---
  // Soft-fail: this setting sits behind its own token permission group, distinct from the
  // general "Zone Settings" one — degrade gracefully rather than block the WAF rule (below,
  // which covers this story's literal acceptance test) on a third permission round-trip.
  try {
    const botSetting = await cfApi(`/zones/${zone.id}/settings/bot_fight_mode`)
    if (botSetting.result.value === 'on') {
      console.log('  = Bot Fight Mode already on')
    } else {
      await cfApi(`/zones/${zone.id}/settings/bot_fight_mode`, {
        method: 'PATCH',
        body: JSON.stringify({ value: 'on' }),
      })
      console.log('  + Bot Fight Mode enabled')
    }
  } catch (e) {
    console.log(`  ! Bot Fight Mode skipped (${e.message.slice(0, 120)}) — needs its own token permission; the WAF rule below still covers this story's acceptance test`)
  }

  // --- 2 · custom WAF rule blocking known probe paths (idempotent PUT on the entrypoint ruleset) ---
  // The http_request_firewall_custom phase's entrypoint ruleset is a single PUT-replaceable
  // resource per zone — read the current rules first so a re-run doesn't clobber any OTHER rule
  // a human added by hand in the dashboard; only add/update the one this script owns (matched by
  // its fixed description).
  let existingRules = []
  try {
    const entry = await cfApi(`/zones/${zone.id}/rulesets/phases/http_request_firewall_custom/entrypoint`)
    existingRules = entry.result?.rules ?? []
  } catch {
    // No entrypoint ruleset exists yet for this phase — starting from empty is correct.
  }

  const ownRule = {
    expression: PROBE_RULE_EXPRESSION,
    action: 'block',
    description: RULE_DESCRIPTION,
    enabled: true,
  }
  const otherRules = existingRules.filter((r) => r.description !== RULE_DESCRIPTION)
  const newRules = [...otherRules, ownRule]

  await cfApi(`/zones/${zone.id}/rulesets/phases/http_request_firewall_custom/entrypoint`, {
    method: 'PUT',
    body: JSON.stringify({ rules: newRules }),
  })
  console.log(`  = custom WAF rule in place (${otherRules.length} other rule(s) preserved untouched)`)

  console.log('\n✓ Done. Verify: curl -s -o /dev/null -w "%{http_code}" https://gcp.miyagisanchez.com/l/wp-admin  → expect 403')
})().catch((e) => { console.error(e.message || e); process.exit(1) })
