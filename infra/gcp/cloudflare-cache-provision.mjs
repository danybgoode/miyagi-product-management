#!/usr/bin/env node
// cloudflare-cache-provision.mjs — the single owner of miyagi-web Cache Rules.
//
// The homepage rule came from deploy-pipeline-tuning S3, /api/img from
// hyper-performant-website S1, and the public-read HTML rule from hyper-performant-runtime S2.
// Keep them together: the phase entrypoint is one PUT-replaceable resource, so independent
// mutators can overwrite one another. D20 keeps the public-read rule on Cloudflare's Free-plan
// expression language and leaves claim/privacy decisions at the origin.
//
// Usage:
//   node infra/gcp/cloudflare-cache-provision.mjs
//   node infra/gcp/cloudflare-cache-provision.mjs --verify-only  # GET-only live invariant
//
// Credentials: env var, else Secret Manager. Zero npm dependencies; Node 18+ global fetch.

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

const DEFAULT_GCP_PROJECT = 'miyagisanchez-prod'
const CF_API = 'https://api.cloudflare.com/client/v4'
export const DOMAIN = 'miyagisanchez.com'

export const HOMEPAGE_RULE_DESCRIPTION = 'miyagi-web edge cache — confirmed-static paths only (Sprint 3, deploy-pipeline-tuning)'
export const IMG_PROXY_RULE_DESCRIPTION = 'miyagi-web edge cache — /api/img proxy variants (S1, hyper-performant-website)'
export const PUBLIC_READ_RULE_DESCRIPTION = 'miyagi-web edge cache — public read HTML (S2, hyper-performant-runtime)'

const HOST_EXPRESSION = `(http.host eq "${DOMAIN}" or http.host eq "www.${DOMAIN}")`
const HOMEPAGE_RULE_EXPRESSION = `${HOST_EXPRESSION} and (http.request.uri.path eq "/")`
const IMG_PROXY_RULE_EXPRESSION = `${HOST_EXPRESSION} and (http.request.uri.path eq "/api/img")`

const MARKETPLACE_PUBLIC_PREFIXES = ['/mx/s/', '/mx/l/', '/embed/s/']
const SUBDOMAIN_PUBLIC_PREFIXES = ['/l/']

// D10/D11/D20: every matched URL has an empty query; apex/www owns marketplace + embed,
// while only first-party *.miyagisanchez.com hosts (excluding www) own shop root + PDP.
// A custom domain cannot satisfy either host branch. Do not name a product fixture here: entitlement
// and privacy are origin decisions, and missing/no-store origin policy is fail-closed by the TTL mode.
export const PUBLIC_READ_RULE_EXPRESSION = [
  '(http.request.uri.query eq "")',
  'and',
  '(',
  `(${HOST_EXPRESSION} and (${MARKETPLACE_PUBLIC_PREFIXES.map((prefix) => `starts_with(http.request.uri.path, "${prefix}")`).join(' or ')}))`,
  'or',
  `((ends_with(http.host, ".${DOMAIN}") and http.host ne "www.${DOMAIN}") and (http.request.uri.path eq "/" or ${SUBDOMAIN_PUBLIC_PREFIXES.map((prefix) => `starts_with(http.request.uri.path, "${prefix}")`).join(' or ')}))`,
  ')',
].join(' ')

export function matchesPublicReadRule({ host, path, query = '' }) {
  if (query !== '') return false
  if (host === DOMAIN || host === `www.${DOMAIN}`) {
    return MARKETPLACE_PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))
  }
  const isFirstPartySubdomain = host.endsWith(`.${DOMAIN}`) && host !== `www.${DOMAIN}`
  return isFirstPartySubdomain && (path === '/' || SUBDOMAIN_PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix)))
}

export const CANONICAL_OWN_RULES = [
  {
    expression: HOMEPAGE_RULE_EXPRESSION,
    action: 'set_cache_settings',
    action_parameters: { cache: true, edge_ttl: { mode: 'respect_origin' } },
    description: HOMEPAGE_RULE_DESCRIPTION,
    enabled: true,
  },
  {
    expression: IMG_PROXY_RULE_EXPRESSION,
    action: 'set_cache_settings',
    action_parameters: { cache: true, edge_ttl: { mode: 'respect_origin' } },
    description: IMG_PROXY_RULE_DESCRIPTION,
    enabled: true,
  },
  {
    expression: PUBLIC_READ_RULE_EXPRESSION,
    action: 'set_cache_settings',
    action_parameters: { cache: true, edge_ttl: { mode: 'bypass_by_default' } },
    description: PUBLIC_READ_RULE_DESCRIPTION,
    enabled: true,
  },
]

const OWN_DESCRIPTIONS = new Set(CANONICAL_OWN_RULES.map((rule) => rule.description))

function comparableOwnedRule(rule) {
  // Cloudflare decorates GET results with provider metadata that is not accepted/owned config.
  // Strip only those documented decorations; any other extra field is meaningful drift.
  const { id: _id, version: _version, last_updated: _lastUpdated, ref: _ref, ...configured } = rule
  return configured
}

function rulesEqual(left, right) {
  return isDeepStrictEqual(comparableOwnedRule(left), comparableOwnedRule(right))
}

export function inspectOwnedRuleState(existingRules) {
  const counts = new Map(CANONICAL_OWN_RULES.map((rule) => [rule.description, 0]))
  for (const rule of existingRules) {
    if (counts.has(rule.description)) counts.set(rule.description, counts.get(rule.description) + 1)
  }

  const absent = [...counts].filter(([, count]) => count === 0).map(([description]) => description)
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([description]) => description)
  const canonicalTail = existingRules.slice(-CANONICAL_OWN_RULES.length)
  const exactTail = canonicalTail.length === CANONICAL_OWN_RULES.length &&
    canonicalTail.every((rule, index) => rulesEqual(rule, CANONICAL_OWN_RULES[index]))
  const ownedCount = [...counts.values()].reduce((sum, count) => sum + count, 0)
  const drifted = CANONICAL_OWN_RULES
    .filter((canonical) => {
      const matches = existingRules.filter((rule) => rule.description === canonical.description)
      return matches.length === 1 && !rulesEqual(matches[0], canonical)
    })
    .map((rule) => rule.description)

  const exact = absent.length === 0 && duplicates.length === 0 && drifted.length === 0 &&
    ownedCount === CANONICAL_OWN_RULES.length && exactTail
  const reasons = []
  if (absent.length) reasons.push(`absent: ${absent.join(', ')}`)
  if (duplicates.length) reasons.push(`duplicate: ${duplicates.join(', ')}`)
  if (drifted.length) reasons.push(`drifted: ${drifted.join(', ')}`)
  if (!exact && absent.length === 0 && duplicates.length === 0 && drifted.length === 0) {
    reasons.push('owned rules are not the canonical appended tail')
  }
  return { exact, absent, duplicates, drifted, reasons }
}

export function reconcileOwnedRules(existingRules) {
  const state = inspectOwnedRuleState(existingRules)
  if (state.exact) return { changed: false, rules: existingRules, state }

  // Filtering only our fixed descriptions preserves every unrelated object byte-for-byte and in
  // the same relative order. Appending one canonical copy also collapses any duplicate owned rules.
  const unrelatedRules = existingRules.filter((rule) => !OWN_DESCRIPTIONS.has(rule.description))
  return { changed: true, rules: [...unrelatedRules, ...CANONICAL_OWN_RULES], state }
}

export class CloudflareApiError extends Error {
  constructor(message, { status = null, codes = [], kind = 'api' } = {}) {
    super(message)
    this.name = 'CloudflareApiError'
    this.status = status
    this.codes = codes
    this.kind = kind
  }
}

export class MissingSecretError extends Error {
  constructor(message) {
    super(message)
    this.name = 'MissingSecretError'
  }
}

function errorCodes(json) {
  return Array.isArray(json?.errors)
    ? json.errors.map((error) => Number(error?.code)).filter(Number.isFinite)
    : []
}

export function isNoEntrypointError(error) {
  return error instanceof CloudflareApiError && error.codes.includes(10003) &&
    error.status !== 401 && error.status !== 403 && error.status !== 429 &&
    !(error.status !== null && error.status >= 500)
}

export function isUnavailableError(error) {
  if (error instanceof MissingSecretError) return true
  if (!(error instanceof CloudflareApiError)) return false
  if (isNoEntrypointError(error)) return false
  return error.kind === 'network' || error.kind === 'non-json' || error.status === 401 ||
    error.status === 403 || error.status === 429 || (error.status !== null && error.status >= 500) ||
    error.kind === 'api'
}

export async function cfApi(path, { token, method = 'GET', body } = {}, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch
  let response
  try {
    response = await fetchImpl(`${CF_API}${path}`, {
      method,
      body,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    throw new CloudflareApiError(`Cloudflare ${path} → network/DNS failure: ${error.message || error}`, { kind: 'network' })
  }

  let text
  try {
    text = await response.text()
  } catch (error) {
    throw new CloudflareApiError(`Cloudflare ${path} → network failure while reading response: ${error.message || error}`, {
      status: response.status,
      kind: 'network',
    })
  }
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new CloudflareApiError(`Cloudflare ${path} → ${response.status} (non-JSON response): ${text.slice(0, 300)}`, {
      status: response.status,
      kind: 'non-json',
    })
  }
  if (!response.ok || json.success === false) {
    throw new CloudflareApiError(`Cloudflare ${path} → ${response.status} ${JSON.stringify(json.errors || json).slice(0, 400)}`, {
      status: response.status,
      codes: errorCodes(json),
    })
  }
  return json
}

export function resolveToken(env, deps = {}) {
  if (env.CLOUDFLARE_API_TOKEN) return env.CLOUDFLARE_API_TOKEN
  const project = env.PROJECT_ID || DEFAULT_GCP_PROJECT
  const execImpl = deps.execFileSyncImpl || execFileSync
  try {
    const token = execImpl('gcloud', [
      'secrets', 'versions', 'access', 'latest',
      '--secret=CLOUDFLARE_API_TOKEN', `--project=${project}`,
    ], { encoding: 'utf8' }).trim()
    if (token) return token
  } catch {
    // The caller assigns the mode-specific exit code; verification must report this as unavailable.
  }
  throw new MissingSecretError(`Could not resolve CLOUDFLARE_API_TOKEN from the environment or Secret Manager in ${project}`)
}

const entrypointPath = (zoneId) => `/zones/${zoneId}/rulesets/phases/http_request_cache_settings/entrypoint`

async function readZone(token, deps) {
  const zoneList = await cfApi(`/zones?name=${encodeURIComponent(DOMAIN)}`, { token }, deps)
  return zoneList.result?.[0] ?? null
}

async function readEntrypointRules(zoneId, token, deps) {
  const entry = await cfApi(entrypointPath(zoneId), { token }, deps)
  return entry.result?.rules ?? []
}

export async function verifyLiveInvariant({ env = process.env } = {}, deps = {}) {
  const token = resolveToken(env, deps)
  const zone = await readZone(token, deps)
  if (!zone) return { status: 'drift', reason: `zone ${DOMAIN} absent` }
  try {
    const rules = await readEntrypointRules(zone.id, token, deps)
    const state = inspectOwnedRuleState(rules)
    return state.exact
      ? { status: 'exact', zone, state }
      : { status: 'drift', zone, state, reason: state.reasons.join('; ') }
  } catch (error) {
    if (isNoEntrypointError(error)) return { status: 'drift', zone, reason: 'cache-settings entrypoint absent (Cloudflare code 10003)' }
    throw error
  }
}

export async function applyCanonicalRules({ env = process.env } = {}, deps = {}) {
  const token = resolveToken(env, deps)
  const zone = await readZone(token, deps)
  if (!zone) throw new Error(`Zone ${DOMAIN} not found`)

  let existingRules
  try {
    existingRules = await readEntrypointRules(zone.id, token, deps)
  } catch (error) {
    // Only 10003 means the phase has no entrypoint. Never convert auth, rate-limit, 5xx,
    // non-JSON or network failures into an empty list followed by a destructive replacement PUT.
    if (!isNoEntrypointError(error)) throw error
    existingRules = []
  }

  const reconciliation = reconcileOwnedRules(existingRules)
  if (!reconciliation.changed) return { status: 'exact', zone, put: false, reconciliation }

  await cfApi(entrypointPath(zone.id), {
    token,
    method: 'PUT',
    body: JSON.stringify({ rules: reconciliation.rules }),
  }, deps)
  return { status: 'applied', zone, put: true, reconciliation }
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const log = deps.log || console.log
  const errorLog = deps.error || console.error
  const verifyOnly = argv.includes('--verify-only')
  if (argv.some((arg) => arg !== '--verify-only')) {
    errorLog('Usage: node infra/gcp/cloudflare-cache-provision.mjs [--verify-only]')
    return 1
  }

  try {
    if (verifyOnly) {
      const result = await verifyLiveInvariant({ env: deps.env || process.env }, deps)
      if (result.status === 'exact') {
        log(`✓ EXACT — ${PUBLIC_READ_RULE_DESCRIPTION} and sibling owned rules are canonical and unique`)
        return 0
      }
      errorLog(`✗ DRIFT — ${result.reason}`)
      return 1
    }

    const result = await applyCanonicalRules({ env: deps.env || process.env }, deps)
    log(`▶ Zone: ${result.zone.id} (${result.zone.name})`)
    if (!result.put) {
      log('  = owned cache rules already canonical and unique; PUT skipped')
    } else {
      const preserved = result.reconciliation.rules.length - CANONICAL_OWN_RULES.length
      log(`  = cache rules reconciled (${preserved} unrelated rule(s) preserved in order)`)
    }
    log('\n✓ Done. Run --verify-only, then probe each eligible channel twice for an isolated MISS → HIT.')
    return 0
  } catch (error) {
    if (verifyOnly && isUnavailableError(error)) {
      errorLog(`UNAVAILABLE — not evidence of health: ${error.message || error}`)
      return 2
    }
    errorLog(error.message || error)
    return 1
  }
}

const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
if (isDirectExecution) process.exitCode = await main()
