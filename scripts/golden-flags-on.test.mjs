import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flagsServingTrue, gfCommand, main, parseArgs } from './golden-flags-on.mjs'

const cell = (environment, serving, state = 'on') => ({ environment, state, version: 1, serving, readable: true, updatedAt: null })

const BODY = {
  project: 'miyagisanchez',
  environments: [],
  flags: [
    { key: 'pdp_redesign', environments: [cell('production', true), cell('preview', true)] },
    // Activated ("on") yet SERVING false — must not count as live. State and serving are different facts.
    { key: 'shipping.envia_enabled', environments: [cell('production', false, 'on')] },
    // Never activated in production.
    { key: 'launchpad.enabled', environments: [cell('production', null, 'never'), cell('preview', true)] },
    { key: 'checkout.stripe_enabled', environments: [cell('production', true)] },
  ],
}

test('lists only the keys SERVING true in the requested environment, sorted', () => {
  assert.deepEqual(flagsServingTrue(BODY), ['checkout.stripe_enabled', 'pdp_redesign'])
  assert.deepEqual(flagsServingTrue(BODY, 'preview'), ['launchpad.enabled', 'pdp_redesign'])
})

test('an activated flag that serves false is NOT live', () => {
  assert.ok(!flagsServingTrue(BODY).includes('shipping.envia_enabled'))
})

test('a malformed body throws instead of reading as "nothing is on"', () => {
  assert.throws(() => flagsServingTrue({}), /no flags array/)
  assert.throws(() => flagsServingTrue({ flags: [{ key: 1 }] }), /malformed/)
})

test('parseArgs defaults to production / miyagisanchez', () => {
  assert.deepEqual(parseArgs([]), { environment: 'production', project: 'miyagisanchez' })
  assert.deepEqual(parseArgs(['--env', 'preview', '--project', 'x']), { environment: 'preview', project: 'x' })
})

test('gfCommand honours GF_BIN, else the published CLI via npx', () => {
  assert.deepEqual(gfCommand({ GF_BIN: 'node /tmp/gf.js' }), ['node', '/tmp/gf.js'])
  assert.deepEqual(gfCommand({}), ['npx', '--yes', '@golden-frijoles/cli'])
})

test('main prints one key per line and asks gf for the right project as JSON', () => {
  const calls = []
  const run = (command, args) => {
    calls.push([command, ...args])
    return { status: 0, stdout: JSON.stringify(BODY), stderr: '' }
  }
  const out = main([], { run, env: { GF_BIN: 'gf' } })
  assert.equal(out.code, 0)
  assert.equal(out.stdout, 'checkout.stripe_enabled\npdp_redesign\n')
  assert.deepEqual(calls, [['gf', '--project', 'miyagisanchez', '--json', 'flags', 'ls']])
})

test('rule 5: an unauthenticated / missing gf FAILS (non-zero) — never an empty success', () => {
  const unauthed = main([], { run: () => ({ status: 2, stdout: '', stderr: 'Not signed in.' }), env: {} })
  assert.equal(unauthed.code, 1)
  assert.equal(unauthed.stdout, '')
  assert.match(unauthed.stderr, /unavailable — Not signed in/)

  const missing = main([], { run: () => ({ error: new Error('spawn gf ENOENT') }), env: {} })
  assert.equal(missing.code, 1)
  assert.match(missing.stderr, /ENOENT/)

  const garbage = main([], { run: () => ({ status: 0, stdout: 'not json' }), env: {} })
  assert.equal(garbage.code, 1)
})
