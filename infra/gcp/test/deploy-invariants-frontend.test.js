// 09-platform-infra frontend-vercel-to-cloudrun — Sprint 1, Story 1.3: static
// drift guard for the frontend deploy script, mirroring the backend's
// deploy-invariants.test.js pattern (infra is not Playwright-gated, so this
// pure-logic node:test is the deterministic safety net).
//
// What it locks in:
//   • startup + liveness probes hit /api/health via HTTP GET (not tcpSocket)
//   • no --vpc-connector flag — the frontend deliberately has no VPC egress
//     (Supabase/Upstash are HTTPS/REST; Medusa is reached over
//     MEDUSA_STORE_URL, not the DB) — a future edit re-adding one would be a
//     silent, unnecessary widening of this service's network reach
//   • the reused-secret set and the new-secret set each match what
//     provision-frontend.sh / deploy-frontend.sh actually wire up
//
// Pure fs read, zero deps. Run: `node --test infra/gcp/test/`

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const GCP_DIR = path.join(__dirname, '..')
const deploySrc = fs.readFileSync(path.join(GCP_DIR, 'deploy-frontend.sh'), 'utf8')
const provisionSrc = fs.readFileSync(path.join(GCP_DIR, 'provision-frontend.sh'), 'utf8')

function flagValue(src, flag) {
  const m = src.match(new RegExp(`--${flag}="([^"]*)"`))
  assert.ok(m, `expected --${flag}="..." in deploy-frontend.sh`)
  return m[1]
}

// Container env NAMEs from --set-secrets (comma-delimited CONTAINER=SECRET:ver).
function secretNames(src) {
  return new Set(
    flagValue(src, 'set-secrets')
      .split(',')
      .filter(Boolean)
      .map((t) => t.split('=')[0]),
  )
}

// The BACKING secret NAMEs (right-hand side, minus ":version") — this is what
// provision-frontend.sh actually creates/grants access to, which can differ
// from the container name (e.g. container TELEGRAM_CHAT_ID backs onto secret
// TELEGRAM_CHAT_ID_APP).
function secretBackingNames(src) {
  return new Set(
    flagValue(src, 'set-secrets')
      .split(',')
      .filter(Boolean)
      .map((t) => t.slice(t.indexOf('=') + 1).replace(/:[^:]*$/, '')),
  )
}

const eq = (a, b) => assert.deepEqual([...a].sort(), [...b].sort())

// --- probe invariants --------------------------------------------------------

test('deploy-frontend.sh: startup probe is HTTP GET /api/health (not tcpSocket)', () => {
  const p = flagValue(deploySrc, 'startup-probe')
  assert.match(p, /httpGet\.path=\/api\/health/, 'startup probe must hit /api/health')
  assert.doesNotMatch(p, /tcpSocket/, 'startup probe must not regress to a TCP socket')
})

test('deploy-frontend.sh: liveness probe on /api/health exists', () => {
  const p = flagValue(deploySrc, 'liveness-probe')
  assert.match(p, /httpGet\.path=\/api\/health/, 'liveness probe must hit /api/health')
})

// --- no VPC connector invariant ----------------------------------------------
// The frontend never talks to Cloud SQL/Redis directly — a future edit adding
// --vpc-connector would silently widen this service's network reach for no
// reason. Lock in its absence the same way the backend locks in its presence.

test('deploy-frontend.sh: does NOT bind a VPC connector', () => {
  assert.doesNotMatch(deploySrc, /--vpc-connector/, 'frontend has no VPC egress need — see script header')
})

// --- allow-unauthenticated (this is the public-facing app) -------------------

test('deploy-frontend.sh: allows unauthenticated access (public app)', () => {
  assert.match(deploySrc, /--allow-unauthenticated/)
})

// --- secret classification parity -------------------------------------------
// Keeps provision-frontend.sh's REUSED_SECRETS / NEW_SECRETS arrays (which
// grant IAM access) in sync with what deploy-frontend.sh actually
// --set-secrets onto the running container.

function bashArray(src, varName) {
  const m = src.match(new RegExp(`${varName}=\\(([\\s\\S]*?)\\n\\)`))
  assert.ok(m, `expected a ${varName}=(...) array in provision-frontend.sh`)
  return new Set(
    m[1]
      .split('\n')
      .map((line) => line.split('#')[0].trim())
      .filter(Boolean),
  )
}

test('every REUSED + NEW secret in provision-frontend.sh is bound in deploy-frontend.sh', () => {
  const reused = bashArray(provisionSrc, 'REUSED_SECRETS')
  const fresh = bashArray(provisionSrc, 'NEW_SECRETS')
  const provisioned = new Set([...reused, ...fresh])
  const deployedBacking = secretBackingNames(deploySrc)

  for (const name of provisioned) {
    assert.ok(
      deployedBacking.has(name),
      `provision-frontend.sh grants access to secret "${name}" but no container in deploy-frontend.sh backs onto it`,
    )
  }
})

test('every secret deploy-frontend.sh binds is provisioned by provision-frontend.sh', () => {
  const reused = bashArray(provisionSrc, 'REUSED_SECRETS')
  const fresh = bashArray(provisionSrc, 'NEW_SECRETS')
  const provisioned = new Set([...reused, ...fresh])
  eq(secretBackingNames(deploySrc), provisioned)
})
