// Frontend NEXT_PUBLIC_* Docker build-args hardening (fast-follow from
// checkout-cloudrun-localhost-fallback-outage / home-dynamic-rows-restore-
// and-polish S1 — two live prod bugs where a 'use client' file reading
// NEXT_PUBLIC_* directly baked in `undefined` because the Cloud Run image
// build never received these as Docker build-args, only as Cloud Run
// *runtime* env vars set after the image already existed).
//
// IMPORTANT — this repo boundary matters: `apps/miyagisanchez` (Dockerfile,
// cloudbuild.yaml) is a SEPARATE, independently-hosted GitHub repo
// (danybgoode/miyagisanchezcommerce) from this one
// (danybgoode/miyagi-product-management), with its own CI. Neither repo's
// checkout can see the other's files, so a single cross-repo guard test is
// not possible without a cross-repo PAT (a real cost this hardening task
// deliberately avoids taking on). The guard is therefore split into TWO
// self-contained halves, anchored to the SAME explicit `NEXT_PUBLIC_VARS`
// list (kept identical by convention, not by reading across the boundary):
//   • THIS file (root repo) — asserts deploy-frontend.sh's --set-env-vars
//     NEXT_PUBLIC_* set matches the list below.
//   • apps/miyagisanchez/e2e/frontend-build-args.spec.ts (app repo) —
//     asserts the Dockerfile builder-stage ARG/ENV set AND cloudbuild.yaml's
//     --build-arg set both match the SAME list.
// If a var is ever added/removed, both lists must be updated together — a
// residual manual-sync risk, but a far smaller one than an ENOENT'd guard
// that silently never runs (the mistake this file's first draft made before
// the repo-boundary was double-checked).
//
// Pure fs read, zero deps, same style as deploy-invariants-frontend.test.js.
// Run: `node --test infra/gcp/test/`

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const GCP_DIR = path.join(__dirname, '..')
const deploySrc = fs.readFileSync(path.join(GCP_DIR, 'deploy-frontend.sh'), 'utf8')

const eq = (a, b) => assert.deepEqual([...a].sort(), [...b].sort())

// The authoritative list — MUST stay identical to the NEXT_PUBLIC_VARS array
// in apps/miyagisanchez/e2e/frontend-build-args.spec.ts.
const NEXT_PUBLIC_VARS = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_MEDUSA_MXN_REGION_ID',
  'NEXT_PUBLIC_MP_PUBLIC_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'NEXT_PUBLIC_MEDUSA_STORE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
]

// --set-env-vars uses gcloud's custom `^~^`-delimited syntax (a plain comma
// would collide with values containing commas) — split on `~` after
// stripping the `^~^` prefix, take the key before each `=`.

function flagValue(src, flag) {
  const m = src.match(new RegExp(`--${flag}="([^"]*)"`))
  assert.ok(m, `expected --${flag}="..." in deploy-frontend.sh`)
  return m[1]
}

function deployNextPublicSet(src) {
  const raw = flagValue(src, 'set-env-vars').replace(/^\^~\^/, '')
  return new Set(
    raw
      .split('~')
      .map((tok) => tok.split('=')[0])
      .filter((key) => key.startsWith('NEXT_PUBLIC_')),
  )
}

test('deploy-frontend.sh sets exactly the expected NEXT_PUBLIC_* set (parity with the app repo\'s build-args guard)', () => {
  eq(deployNextPublicSet(deploySrc), new Set(NEXT_PUBLIC_VARS))
})

// --- the 6 default-bearing vars' literal defaults ---------------------------
// NEXT_PUBLIC_MEDUSA_STORE_URL is one level of indirection
// (`${NEXT_PUBLIC_MEDUSA_STORE_URL:-$MEDUSA_STORE_URL}`) — resolve through
// MEDUSA_STORE_URL's own default. These literals must match
// apps/miyagisanchez/cloudbuild.yaml's `substitutions:` block exactly (that
// parity is asserted from the app-repo side, in frontend-build-args.spec.ts,
// since only that repo can read cloudbuild.yaml).

const SUBSTITUTION_DEFAULTS = {
  NEXT_PUBLIC_MEDUSA_STORE_URL: 'https://api.miyagisanchez.com',
  NEXT_PUBLIC_SITE_URL: 'https://miyagisanchez.com',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/',
}

function deployScriptDefault(src, varName) {
  const direct = src.match(new RegExp(`${varName}="\\$\\{${varName}:-([^}"]*)\\}"`))
  assert.ok(direct, `expected a ${varName}:-default in deploy-frontend.sh`)
  const raw = direct[1]
  const indirection = raw.match(/^\$(\w+)$/)
  if (!indirection) return raw
  return deployScriptDefault(src, indirection[1])
}

test('deploy-frontend.sh\'s literal defaults match the expected values (must also match cloudbuild.yaml substitutions in the app repo)', () => {
  for (const [name, expected] of Object.entries(SUBSTITUTION_DEFAULTS)) {
    assert.equal(deployScriptDefault(deploySrc, name), expected, `${name}: deploy-frontend.sh's default drifted from the expected literal`)
  }
})

// --- provisioning parity: PUBLIC_BUILD_SECRETS backs the 7 non-reused vars --

const provisionSrc = fs.readFileSync(path.join(GCP_DIR, 'provision-frontend.sh'), 'utf8')

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

test('PUBLIC_BUILD_SECRETS provisions exactly the 7 real-key vars not already covered by SUPABASE_URL', () => {
  const provisioned = bashArray(provisionSrc, 'PUBLIC_BUILD_SECRETS')
  const expected = new Set(
    NEXT_PUBLIC_VARS.filter((n) => n in SUBSTITUTION_DEFAULTS === false && n !== 'NEXT_PUBLIC_SUPABASE_URL'),
  )
  eq(provisioned, expected)
})
