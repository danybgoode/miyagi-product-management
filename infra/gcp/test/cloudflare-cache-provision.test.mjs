// Deterministic contract for the one Cloudflare Cache Rules owner. No live API calls.
// Run: node --test infra/gcp/test/cloudflare-cache-provision.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CANONICAL_OWN_RULES,
  CloudflareApiError,
  DOMAIN,
  HOMEPAGE_RULE_DESCRIPTION,
  IMG_PROXY_RULE_DESCRIPTION,
  PUBLIC_READ_RULE_DESCRIPTION,
  PUBLIC_READ_RULE_EXPRESSION,
  applyCanonicalRules,
  inspectOwnedRuleState,
  isNoEntrypointError,
  main,
  matchesPublicReadRule,
  reconcileOwnedRules,
} from '../cloudflare-cache-provision.mjs'

const tokenEnv = { CLOUDFLARE_API_TOKEN: 'test-token' }
const zone = { id: 'zone-1', name: DOMAIN }

function jsonResponse(status, value) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(value) },
  }
}

function textResponse(status, value) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return value },
  }
}

function queuedFetch(responses) {
  const calls = []
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts })
    const next = responses.shift()
    if (next instanceof Error) throw next
    assert.ok(next, `unexpected fetch call: ${url}`)
    return next
  }
  return { fetchImpl, calls }
}

function zoneResponse(result = [zone]) {
  return jsonResponse(200, { success: true, result })
}

function rulesResponse(rules) {
  return jsonResponse(200, { success: true, result: { rules } })
}

function withProviderMetadata(rule, index) {
  return { id: `rule-${index}`, version: '8', last_updated: '2026-08-22', ref: rule.description, ...structuredClone(rule) }
}

const exactLiveRules = () => CANONICAL_OWN_RULES.map(withProviderMetadata)

test('public-read expression matches only locked empty-query first-party route shapes', () => {
  const included = [
    { host: DOMAIN, path: '/mx/s/piezas-unicas' },
    { host: `www.${DOMAIN}`, path: '/mx/l/prod_123' },
    { host: DOMAIN, path: '/embed/s/piezas-unicas' },
    { host: `panfleto.${DOMAIN}`, path: '/' },
    { host: `some-other-shop.${DOMAIN}`, path: '/l/prod_123' },
  ]
  const excluded = [
    { host: DOMAIN, path: '/mx/s/piezas-unicas', query: 'preview=1' },
    { host: DOMAIN, path: '/embed/s/piezas-unicas', query: 'lang=en' },
    { host: 'tienda.example.com', path: '/' },
    { host: `www.${DOMAIN}`, path: '/' },
    { host: DOMAIN, path: '/s/piezas-unicas' },
    { host: DOMAIN, path: '/l/prod_123' },
    { host: DOMAIN, path: '/us/l/prod_123' },
    { host: `panfleto.${DOMAIN}`, path: '/shop/manage/settings' },
  ]
  for (const request of included) assert.equal(matchesPublicReadRule(request), true, JSON.stringify(request))
  for (const request of excluded) assert.equal(matchesPublicReadRule(request), false, JSON.stringify(request))

  assert.match(PUBLIC_READ_RULE_EXPRESSION, /http\.request\.uri\.query eq ""/)
  assert.match(PUBLIC_READ_RULE_EXPRESSION, /starts_with\(http\.request\.uri\.path, "\/mx\/s\/"\)/)
  assert.match(PUBLIC_READ_RULE_EXPRESSION, /starts_with\(http\.request\.uri\.path, "\/mx\/l\/"\)/)
  assert.match(PUBLIC_READ_RULE_EXPRESSION, /starts_with\(http\.request\.uri\.path, "\/embed\/s\/"\)/)
  assert.match(PUBLIC_READ_RULE_EXPRESSION, /ends_with\(http\.host, "\.miyagisanchez\.com"\)/)
  assert.doesNotMatch(PUBLIC_READ_RULE_EXPRESSION, /matches|contains|panfleto/)
})

test('public-read rule uses fail-closed origin TTL policy and the default host/full-URL cache key', () => {
  const publicRule = CANONICAL_OWN_RULES.find((rule) => rule.description === PUBLIC_READ_RULE_DESCRIPTION)
  assert.deepEqual(publicRule.action_parameters, {
    cache: true,
    edge_ttl: { mode: 'bypass_by_default' },
  })
  assert.equal('cache_key' in publicRule.action_parameters, false)
  assert.equal(CANONICAL_OWN_RULES.filter((rule) => rule.description === PUBLIC_READ_RULE_DESCRIPTION).length, 1)

  const homepage = CANONICAL_OWN_RULES.find((rule) => rule.description === HOMEPAGE_RULE_DESCRIPTION)
  const image = CANONICAL_OWN_RULES.find((rule) => rule.description === IMG_PROXY_RULE_DESCRIPTION)
  assert.equal(homepage.action_parameters.edge_ttl.mode, 'respect_origin')
  assert.equal(image.action_parameters.edge_ttl.mode, 'respect_origin')
})

test('reconciliation preserves unrelated objects/order, collapses owned duplicates, and appends one canonical copy each', () => {
  const unrelatedA = { id: 'manual-a', description: 'manual A', action: 'set_cache_settings', enabled: false }
  const unrelatedB = { id: 'manual-b', description: 'manual B', expression: 'true', custom: { keep: 'exactly' } }
  const driftedHomepage = { ...structuredClone(CANONICAL_OWN_RULES[0]), enabled: false }
  const duplicatePublic = structuredClone(CANONICAL_OWN_RULES[2])
  const existing = [unrelatedA, duplicatePublic, unrelatedB, driftedHomepage, duplicatePublic]

  const result = reconcileOwnedRules(existing)
  assert.equal(result.changed, true)
  assert.equal(result.rules[0], unrelatedA)
  assert.equal(result.rules[1], unrelatedB)
  assert.deepEqual(result.rules.slice(2), CANONICAL_OWN_RULES)
  for (const description of [HOMEPAGE_RULE_DESCRIPTION, IMG_PROXY_RULE_DESCRIPTION, PUBLIC_READ_RULE_DESCRIPTION]) {
    assert.equal(result.rules.filter((rule) => rule.description === description).length, 1)
  }
})

test('reconciliation is an idempotent no-op when canonical provider-decorated state is exact and unique', () => {
  const unrelated = { id: 'manual', description: 'manual rule', untouched: true }
  const existing = [unrelated, ...exactLiveRules()]
  const result = reconcileOwnedRules(existing)
  assert.equal(result.changed, false)
  assert.equal(result.rules, existing)
  assert.equal(result.state.exact, true)
})

test('inspection distinguishes exact, absent, drifted, duplicate, and misplaced owned states', () => {
  assert.equal(inspectOwnedRuleState(exactLiveRules()).exact, true)

  const absent = inspectOwnedRuleState(exactLiveRules().slice(0, 2))
  assert.deepEqual(absent.absent, [PUBLIC_READ_RULE_DESCRIPTION])

  const driftRules = exactLiveRules()
  driftRules[2].action_parameters.edge_ttl.mode = 'respect_origin'
  assert.deepEqual(inspectOwnedRuleState(driftRules).drifted, [PUBLIC_READ_RULE_DESCRIPTION])

  const duplicateRules = [...exactLiveRules(), structuredClone(CANONICAL_OWN_RULES[2])]
  assert.deepEqual(inspectOwnedRuleState(duplicateRules).duplicates, [PUBLIC_READ_RULE_DESCRIPTION])

  const misplaced = exactLiveRules()
  misplaced.unshift(misplaced.pop())
  assert.match(inspectOwnedRuleState(misplaced).reasons.join(' '), /canonical appended tail/)
})

test('only Cloudflare code 10003 is classified as a known-absent entrypoint', () => {
  assert.equal(isNoEntrypointError(new CloudflareApiError('absent', { status: 404, codes: [10003] })), true)
  for (const error of [
    new CloudflareApiError('auth', { status: 401, codes: [10000] }),
    new CloudflareApiError('permission', { status: 403, codes: [10000] }),
    new CloudflareApiError('rate', { status: 429, codes: [10003] }),
    new Error('message happens to contain 10003'),
  ]) assert.equal(isNoEntrypointError(error), false, 'classification uses structured code without swallowing unavailable HTTP classes')
})

test('--verify-only is GET-only and returns 0 exact; 1 absent/drift/duplicate/zone absent/10003', async () => {
  const cases = [
    { name: 'exact', responses: [zoneResponse(), rulesResponse(exactLiveRules())], exit: 0 },
    { name: 'zone absent', responses: [zoneResponse([])], exit: 1 },
    { name: 'rule absent', responses: [zoneResponse(), rulesResponse(exactLiveRules().slice(0, 2))], exit: 1 },
    { name: 'duplicate', responses: [zoneResponse(), rulesResponse([...exactLiveRules(), CANONICAL_OWN_RULES[2]])], exit: 1 },
    {
      name: 'entrypoint 10003',
      responses: [zoneResponse(), jsonResponse(404, { success: false, errors: [{ code: 10003, message: 'missing' }] })],
      exit: 1,
    },
  ]
  for (const fixture of cases) {
    const io = queuedFetch(fixture.responses)
    const exit = await main(['--verify-only'], { ...io, env: tokenEnv, log() {}, error() {} })
    assert.equal(exit, fixture.exit, fixture.name)
    assert.ok(io.calls.every((call) => call.opts.method === 'GET'), `${fixture.name}: verifier attempted a write`)
  }
})

test('--verify-only returns 2 and the required warning for missing secret/auth/permission/rate/5xx/non-JSON/network', async () => {
  const cases = [
    {
      name: 'missing secret',
      env: {},
      deps: { execFileSyncImpl() { throw new Error('not available') } },
    },
    { name: '401', env: tokenEnv, responses: [jsonResponse(401, { success: false, errors: [{ code: 10000 }] })] },
    { name: '403', env: tokenEnv, responses: [jsonResponse(403, { success: false, errors: [{ code: 10000 }] })] },
    { name: '429', env: tokenEnv, responses: [jsonResponse(429, { success: false, errors: [{ code: 1015 }] })] },
    { name: '500', env: tokenEnv, responses: [jsonResponse(500, { success: false, errors: [{ code: 1000 }] })] },
    { name: 'non-JSON', env: tokenEnv, responses: [textResponse(502, '<html>bad gateway</html>')] },
    { name: 'network', env: tokenEnv, responses: [new Error('getaddrinfo ENOTFOUND')] },
    {
      name: 'response stream network',
      env: tokenEnv,
      responses: [{ ok: true, status: 200, async text() { throw new Error('socket reset') } }],
    },
  ]
  for (const fixture of cases) {
    const errors = []
    const io = fixture.responses ? queuedFetch(fixture.responses) : { calls: [] }
    const exit = await main(['--verify-only'], {
      ...io,
      ...(fixture.deps || {}),
      env: fixture.env,
      log() {},
      error(message) { errors.push(message) },
    })
    assert.equal(exit, 2, fixture.name)
    assert.match(errors.join('\n'), /UNAVAILABLE — not evidence of health/, fixture.name)
  }
})

test('--verify-only treats ordinary 4xx API errors as failures, not unavailable infrastructure', async () => {
  for (const fixture of [
    jsonResponse(400, { success: false, errors: [{ code: 1001, message: 'bad request' }] }),
    jsonResponse(404, { success: false, errors: [{ code: 1001, message: 'not found' }] }),
  ]) {
    const errors = []
    const io = queuedFetch([zoneResponse(), fixture])
    const exit = await main(['--verify-only'], {
      ...io,
      env: tokenEnv,
      log() {},
      error(message) { errors.push(message) },
    })
    assert.equal(exit, 1)
    assert.doesNotMatch(errors.join('\n'), /UNAVAILABLE/)
  }
})

test('apply skips PUT when exact and otherwise sends one preserving reconciliation; a 403 GET stops before PUT', async () => {
  const exactIo = queuedFetch([zoneResponse(), rulesResponse(exactLiveRules())])
  const exact = await applyCanonicalRules({ env: tokenEnv }, exactIo)
  assert.equal(exact.put, false)
  assert.equal(exactIo.calls.length, 2)

  const manual = { id: 'manual', description: 'manual rule', expression: 'true' }
  const putIo = queuedFetch([zoneResponse(), rulesResponse([manual]), jsonResponse(200, { success: true, result: {} })])
  const applied = await applyCanonicalRules({ env: tokenEnv }, putIo)
  assert.equal(applied.put, true)
  assert.deepEqual(JSON.parse(putIo.calls[2].opts.body).rules, [manual, ...CANONICAL_OWN_RULES])
  assert.equal(putIo.calls[2].opts.method, 'PUT')

  const deniedIo = queuedFetch([
    zoneResponse(),
    jsonResponse(403, { success: false, errors: [{ code: 10000, message: 'permission denied' }] }),
  ])
  await assert.rejects(() => applyCanonicalRules({ env: tokenEnv }, deniedIo), /403/)
  assert.equal(deniedIo.calls.length, 2, 'a permission-denied read must never fall through to PUT')
})

test('apply stops and verify reports unavailable when a successful entrypoint payload has no rules array', async () => {
  for (const result of [{}, { rules: null }, { rules: {} }]) {
    const applyIo = queuedFetch([zoneResponse(), jsonResponse(200, { success: true, result })])
    await assert.rejects(() => applyCanonicalRules({ env: tokenEnv }, applyIo), /rules array/)
    assert.equal(applyIo.calls.length, 2, 'malformed live state must never reach PUT')

    const errors = []
    const verifyIo = queuedFetch([zoneResponse(), jsonResponse(200, { success: true, result })])
    const exit = await main(['--verify-only'], {
      ...verifyIo,
      env: tokenEnv,
      log() {},
      error(message) { errors.push(message) },
    })
    assert.equal(exit, 2)
    assert.match(errors.join('\n'), /UNAVAILABLE — not evidence of health/)
  }
})

test('--rollback removes only the owned public-read rule and is idempotent when absent', async () => {
  const manual = { id: 'manual', description: 'manual rule', expression: 'true' }
  const live = [manual, ...exactLiveRules()]
  const io = queuedFetch([zoneResponse(), rulesResponse(live), jsonResponse(200, { success: true, result: {} })])
  const exit = await main(['--rollback'], { ...io, env: tokenEnv, log() {}, error() {} })
  assert.equal(exit, 0)
  assert.equal(io.calls[2].opts.method, 'PUT')
  assert.deepEqual(
    JSON.parse(io.calls[2].opts.body).rules,
    live.filter((rule) => rule.description !== PUBLIC_READ_RULE_DESCRIPTION),
  )

  const absent = live.filter((rule) => rule.description !== PUBLIC_READ_RULE_DESCRIPTION)
  const noOpIo = queuedFetch([zoneResponse(), rulesResponse(absent)])
  assert.equal(await main(['--rollback'], { ...noOpIo, env: tokenEnv, log() {}, error() {} }), 0)
  assert.equal(noOpIo.calls.length, 2)
})
