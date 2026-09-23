import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideFlagReadKeyAnomaly, gatherFlagKeyHealth } from './golden-flag-key-health.mjs'

const NOW = '2026-09-22T12:00:00.000Z'
const key = (overrides) => ({
  id: 'k',
  type: 'flag_read',
  label: 'prod',
  scope: 'production',
  expiresAt: '2026-10-22T23:17:42.802Z',
  revokedAt: null,
  ...overrides,
})

test('a production key with a month left is healthy', () => {
  assert.equal(decideFlagReadKeyAnomaly({ keys: [key()] }, { nowISO: NOW }), null)
})

test('the 2026-09-22 shape: the only key EXPIRED yet listed "active" → anomaly naming the date', () => {
  const a = decideFlagReadKeyAnomaly(
    { keys: [key({ expiresAt: '2026-09-09T15:16:14.396+00:00' })] },
    { nowISO: NOW },
  )
  assert.equal(a.type, 'golden-flag-key')
  assert.match(a.detail, /NO unexpired production flag_read key/)
  assert.match(a.detail, /2026-09-09/)
})

test('expiring inside the warning window → anomaly with the day count', () => {
  const a = decideFlagReadKeyAnomaly({ keys: [key({ expiresAt: '2026-09-25T00:00:00Z' })] }, { nowISO: NOW })
  assert.match(a.detail, /expires 2026-09-25 \(3 day\(s\)\)/)
})

test('a fresh key beside an EXPIRING one still warns — we cannot see which key production mounts', () => {
  // codex blocking finding on #189: judging by the newest key hides a minted-but-never-deployed rotation.
  const keys = [key({ id: 'old', expiresAt: '2026-09-24T00:00:00Z' }), key({ id: 'new' })]
  assert.match(decideFlagReadKeyAnomaly({ keys }, { nowISO: NOW }).detail, /expires 2026-09-24/)
})

test('an expired-but-unrevoked key beside a valid one is an anomaly (revoke it after rolling)', () => {
  const keys = [key({ id: 'deadbeef-1', expiresAt: '2026-09-09T00:00:00Z' }), key({ id: 'new' })]
  const a = decideFlagReadKeyAnomaly({ keys }, { nowISO: NOW })
  assert.match(a.detail, /EXPIRED but not revoked \(deadbeef\)/)
})

test('after a clean rotation (old key revoked) exactly one healthy key is healthy', () => {
  const keys = [key({ id: 'old', expiresAt: '2026-09-09T00:00:00Z', revokedAt: '2026-09-22T00:00:00Z' }), key({ id: 'new' })]
  assert.equal(decideFlagReadKeyAnomaly({ keys }, { nowISO: NOW }), null)
})

test('an unreadable expiry is an anomaly, never healthy', () => {
  assert.match(decideFlagReadKeyAnomaly({ keys: [key({ expiresAt: 'not-a-date' })] }, { nowISO: NOW }).detail, /unreadable/)
})

test('revoked, other-environment and other-type keys never count as production read keys', () => {
  const keys = [
    key({ revokedAt: '2026-09-01T00:00:00Z' }),
    key({ scope: 'preview' }),
    key({ type: 'flag_sync', scope: 'frontend' }),
  ]
  assert.match(decideFlagReadKeyAnomaly({ keys }, { nowISO: NOW }).detail, /NO unexpired/)
})

test('the warning starts exactly 7 days out, not a day late (codex should-fix)', () => {
  // Key expires 2026-10-22 23:17; on 2026-10-15 23:17 it is exactly 7 days away.
  const expiring = { keys: [key({ expiresAt: '2026-10-22T23:17:42.802Z' })] }
  assert.ok(decideFlagReadKeyAnomaly(expiring, { nowISO: '2026-10-15T23:17:42.802Z' }))
  assert.equal(decideFlagReadKeyAnomaly(expiring, { nowISO: '2026-10-15T23:17:00.000Z' }), null)
})

test('a non-expiring key is healthy', () => {
  assert.equal(decideFlagReadKeyAnomaly({ keys: [key({ expiresAt: null })] }, { nowISO: NOW }), null)
})

test('gather: an unauthenticated or missing gf is UNAVAILABLE, never an empty healthy list', () => {
  const unauthed = gatherFlagKeyHealth({ env: {}, run: () => ({ status: 2, stdout: '', stderr: 'Not signed in.\nmore' }) })
  assert.deepEqual(unauthed, { available: false, reason: 'gf unavailable — Not signed in.' })
  const missing = gatherFlagKeyHealth({ env: {}, run: () => ({ error: new Error('spawn npx ENOENT') }) })
  assert.equal(missing.available, false)
  const garbage = gatherFlagKeyHealth({ env: {}, run: () => ({ status: 0, stdout: '{}' }) })
  assert.equal(garbage.available, false)
})

test('gather: asks gf for the miyagisanchez keys as JSON', () => {
  const calls = []
  const out = gatherFlagKeyHealth({
    env: { GF_BIN: 'gf' },
    run: (command, args) => {
      calls.push([command, ...args])
      return { status: 0, stdout: JSON.stringify({ project: 'miyagisanchez', keys: [key()] }) }
    },
  })
  assert.equal(out.available, true)
  assert.deepEqual(calls, [['gf', '--project', 'miyagisanchez', '--json', 'keys', 'ls']])
})
