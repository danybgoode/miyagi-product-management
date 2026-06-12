// Backend Production Readiness — Sprint 4, Story 4.2: static drift guard.
//
// Infra is NOT Playwright-gated, so this pure-logic node:test is the deterministic
// safety net for the S3 hardening + the S4 env/secret reconcile. It reads the two
// deploy scripts and FAILS if a future edit erodes any invariant — the same
// anti-erosion shape as the raw-color / monolith guards (LEARNINGS → Build & QA).
//
// What it locks in:
//   • startup probe is HTTP GET /health (not the old bare tcpSocket:8080)   [S3]
//   • a liveness probe on /health exists                                     [S3]
//   • the probe flags stay byte-identical between prod + staging scripts     [S3]
//   • deploy.sh ADMIN_CORS default still carries the admin's own origin      [S3]
//   • each script's --set-env-vars / --set-secrets name set === the live     [S4]
//     Cloud Run config it deploys (captured 2026-06-12 from `gcloud run
//     services describe`). This is what stops the §5 drift from recurring —
//     a full `deploy.sh` re-run had silently diverged from live and would error.
//
// Pure fs read, zero deps. Run: `node --test infra/gcp/test/`
// Mirrors the apps/backend/infra/gcp/cicd-telegram-notifier/test/ node:test pattern.

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const GCP_DIR = path.join(__dirname, '..')
const prodSrc = fs.readFileSync(path.join(GCP_DIR, 'deploy.sh'), 'utf8')
const stagingSrc = fs.readFileSync(path.join(GCP_DIR, 'deploy-staging.sh'), 'utf8')

// --- parsing helpers -------------------------------------------------------

// Pull the quoted value of a `--flag="..."` (single line, no embedded quotes).
function flagValue(src, flag) {
  const m = src.match(new RegExp(`--${flag}="([^"]*)"`))
  assert.ok(m, `expected --${flag}="..." in the script`)
  return m[1]
}

// Container env NAMEs from --set-env-vars. gcloud's "^@^" prefix sets "@" as the
// delimiter; tokens are NAME=VALUE → take NAME.
function envNames(src) {
  let v = flagValue(src, 'set-env-vars')
  const delim = v.match(/^\^(.)\^/)
  assert.ok(delim, 'expected a ^<delim>^ prefix on --set-env-vars')
  v = v.slice(delim[0].length)
  return new Set(v.split(delim[1]).filter(Boolean).map((t) => t.split('=')[0]))
}

// Container env NAMEs from --set-secrets (comma-delimited CONTAINER=SECRET:ver).
// We assert on the CONTAINER name (left side) — that is what the running service
// sees and what `describe` reports, so it compares cleanly to the live config
// even where staging maps a *_STAGING secret onto the same container name.
function secretNames(src) {
  return new Set(
    flagValue(src, 'set-secrets')
      .split(',')
      .filter(Boolean)
      .map((t) => t.split('=')[0]),
  )
}

// Full CONTAINER → BACKING-SECRET map (strip the :version). Container names alone
// don't catch a wrong *backing* (e.g. a prod container bound to a `_STAGING` secret),
// so the parity tests below also assert the backing-secret naming convention.
function secretMap(src) {
  const m = {}
  for (const t of flagValue(src, 'set-secrets').split(',').filter(Boolean)) {
    const [container, rhs] = [t.split('=')[0], t.slice(t.indexOf('=') + 1)]
    m[container] = rhs.replace(/:[^:]*$/, '') // drop ":latest" / ":2"
  }
  return m
}

// Raw NAME=VALUE map from --set-env-vars (for asserting plain-env *values*, e.g.
// ENVIA_SANDBOX must be the literal `false` default, not flipped to a secret/true).
function envMap(src) {
  let v = flagValue(src, 'set-env-vars')
  const delim = v.match(/^\^(.)\^/)
  v = v.slice(delim[0].length)
  const m = {}
  for (const t of v.split(delim[1]).filter(Boolean)) {
    m[t.split('=')[0]] = t.slice(t.indexOf('=') + 1)
  }
  return m
}

const eq = (a, b) => assert.deepEqual([...a].sort(), [...b].sort())

// --- live manifests (source of truth: `gcloud run services describe`, 2026-06-12) ---

const PROD = {
  env: [
    'NODE_ENV', 'MEDUSA_WORKER_MODE', 'MEDUSA_BACKEND_URL', 'STORE_CORS',
    'ADMIN_CORS', 'AUTH_CORS', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'MEDUSA_SALES_CHANNEL_ID', 'ENVIA_SANDBOX', // ENVIA_SANDBOX is a PLAIN env on prod
  ],
  secrets: [
    'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'COOKIE_SECRET', 'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET', 'MP_ACCESS_TOKEN', 'CLERK_SECRET_KEY',
    'MEDUSA_INTERNAL_SECRET', 'ENVIA_API_KEY', 'MP_CLIENT_ID', 'MP_CLIENT_SECRET',
    'FLAGSMITH_ENVIRONMENT_KEY',
  ],
}

const STAGING = {
  env: [
    'NODE_ENV', 'MEDUSA_WORKER_MODE', 'STORE_CORS', 'ADMIN_CORS', 'AUTH_CORS',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'MEDUSA_SALES_CHANNEL_ID',
  ],
  secrets: [
    'DATABASE_URL', 'JWT_SECRET', 'COOKIE_SECRET', 'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET', 'MP_ACCESS_TOKEN', 'CLERK_SECRET_KEY',
    'MEDUSA_INTERNAL_SECRET', 'ENVIA_API_KEY',
    'ENVIA_SANDBOX', // staging keeps ENVIA_SANDBOX as a *_STAGING SECRET (asymmetry vs prod)
  ],
}

// --- S3 probe invariants ---------------------------------------------------

for (const [name, src] of [['deploy.sh', prodSrc], ['deploy-staging.sh', stagingSrc]]) {
  test(`${name}: startup probe is HTTP GET /health (not tcpSocket)`, () => {
    const p = flagValue(src, 'startup-probe')
    assert.match(p, /httpGet\.path=\/health/, 'startup probe must hit /health')
    assert.doesNotMatch(p, /tcpSocket/, 'startup probe must not regress to a TCP socket')
  })

  test(`${name}: liveness probe on /health exists`, () => {
    const p = flagValue(src, 'liveness-probe')
    assert.match(p, /httpGet\.path=\/health/, 'liveness probe must hit /health')
  })
}

test('probe flags stay byte-identical between prod + staging', () => {
  assert.equal(flagValue(prodSrc, 'startup-probe'), flagValue(stagingSrc, 'startup-probe'))
  assert.equal(flagValue(prodSrc, 'liveness-probe'), flagValue(stagingSrc, 'liveness-probe'))
})

// --- S3 ADMIN_CORS invariant (prod only — staging admin is same-origin localhost) ---

test('deploy.sh ADMIN_CORS default includes the admin origin api.miyagisanchez.com', () => {
  const m = prodSrc.match(/ADMIN_CORS="\$\{ADMIN_CORS:-([^}]*)\}"/)
  assert.ok(m, 'expected an ADMIN_CORS default in deploy.sh')
  assert.ok(
    m[1].split(',').includes('https://api.miyagisanchez.com'),
    'ADMIN_CORS default must keep https://api.miyagisanchez.com (the admin SPA origin)',
  )
})

// --- S4 env/secret parity vs live (the §5 anti-drift guard) -----------------

test('deploy.sh env names === live medusa-web', () => eq(envNames(prodSrc), new Set(PROD.env)))
test('deploy.sh secret names === live medusa-web', () => eq(secretNames(prodSrc), new Set(PROD.secrets)))
test('deploy-staging.sh env names === live medusa-web-staging', () => eq(envNames(stagingSrc), new Set(STAGING.env)))
test('deploy-staging.sh secret names === live medusa-web-staging', () => eq(secretNames(stagingSrc), new Set(STAGING.secrets)))

// The crux of the §5 reconcile, asserted explicitly for legibility:
test('ENVIA_SANDBOX classification matches each environment', () => {
  // prod: plain env, never a secret (no ENVIA_SANDBOX secret shell exists)
  assert.ok(envNames(prodSrc).has('ENVIA_SANDBOX'), 'prod ENVIA_SANDBOX must be a plain env var')
  assert.ok(!secretNames(prodSrc).has('ENVIA_SANDBOX'), 'prod ENVIA_SANDBOX must NOT be a secret')
  // staging: bound as the ENVIA_SANDBOX_STAGING secret, not a plain env
  assert.ok(secretNames(stagingSrc).has('ENVIA_SANDBOX'), 'staging ENVIA_SANDBOX must be a secret')
  assert.ok(!envNames(stagingSrc).has('ENVIA_SANDBOX'), 'staging ENVIA_SANDBOX must NOT be a plain env var')
})

test('deploy.sh binds the 3 secrets the §5 drift was missing', () => {
  for (const s of ['MP_CLIENT_ID', 'MP_CLIENT_SECRET', 'FLAGSMITH_ENVIRONMENT_KEY']) {
    assert.ok(secretNames(prodSrc).has(s), `deploy.sh must bind ${s} (dropped before S4 reconcile)`)
  }
})

// Backing-secret convention (catches a container bound to the WRONG secret — e.g. a
// prod container pointed at a `_STAGING` secret, which container-name parity alone misses).
test('deploy.sh secrets back onto same-named secrets (no _STAGING leak into prod)', () => {
  for (const [container, backing] of Object.entries(secretMap(prodSrc))) {
    assert.equal(backing, container, `prod ${container} must back onto secret "${container}", not "${backing}"`)
  }
})
test('deploy-staging.sh secrets back onto *_STAGING secrets', () => {
  for (const [container, backing] of Object.entries(secretMap(stagingSrc))) {
    assert.equal(backing, `${container}_STAGING`, `staging ${container} must back onto "${container}_STAGING", not "${backing}"`)
  }
})

// ENVIA_SANDBOX must stay a plain env pinned to the `false` default on prod (the §5 crux —
// container-name parity wouldn't catch it being flipped to `true` or to a secret).
test('deploy.sh ENVIA_SANDBOX env value is the false default', () => {
  assert.equal(envMap(prodSrc).ENVIA_SANDBOX, '${ENVIA_SANDBOX:-false}',
    'prod ENVIA_SANDBOX must be the plain-env `${ENVIA_SANDBOX:-false}` default')
})
