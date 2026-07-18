// Config-guard for provision-report-registry.sh (reporthub-as-notion S1.1) —
// same anti-erosion shape as deploy-invariants / frontend-build-args: a pure
// fs-read node:test asserting the script's load-bearing constants, so a casual
// edit that would strand the hub's /r/<slug> resolver (bucket rename, lifecycle
// prefix change, IAM role swap) reds `node --test infra/gcp/test/` instead of
// silently breaking short links.
//
// The RESOLVER side (danybgoode/smalldocs fork) and the report scripts
// (scripts/lib/report-registry.mjs) hardcode the same bucket names by
// convention — if a name here changes, those must change in the same wave.

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const src = fs.readFileSync(path.join(__dirname, '..', 'provision-report-registry.sh'), 'utf8')

test('registry buckets are the canonical names (prod + staging), in us-east4', () => {
  assert.match(src, /BUCKET="miyagi-pmo-reports"/)
  assert.match(src, /BUCKET="miyagi-pmo-reports-staging"/)
  assert.match(src, /REGION="us-east4"/)
  assert.match(src, /PROJECT_ID:-miyagisanchezback-497722/)
})

test('lifecycle: only daily/ expires, at 90 days', () => {
  assert.match(src, /DAILY_PREFIX="daily\/"/)
  assert.match(src, /DAILY_TTL_DAYS=90/)
  assert.match(src, /"matchesPrefix": \["\$\{DAILY_PREFIX\}"\]/)
  // the Delete action must be conditioned — a bare Delete rule would TTL everything
  assert.match(src, /"action": \{"type": "Delete"\}/)
})

test('access model: public reads, writer-SA writes, uniform bucket-level access', () => {
  assert.match(src, /--uniform-bucket-level-access/)
  assert.match(src, /allUsers/)
  assert.match(src, /pmo-report-writer/)
  assert.match(src, /roles\/storage\.objectUser/)
  // writer binding is BUCKET-scoped, never project-level
  assert.ok(!/gcloud projects add-iam-policy-binding/.test(src), 'no project-level IAM binding')
})

test('public read role is legacyObjectReader (read, NO list) — never objectViewer (which includes list)', () => {
  // objectViewer's permission set includes storage.objects.list, which would let anyone enumerate every
  // report ever written via the bucket's public listing API. legacyObjectReader grants get-by-name only.
  // Anchored per-invocation (add vs remove), not a blank-line block split — the two gcloud commands sit
  // back-to-back with no blank line between them, so a block split would merge them into one.
  const addAllUsersRole = /gcloud storage buckets add-iam-policy-binding[^\n]*\n\s*--project="[^"]*"\s*\\\n\s*--member="allUsers"\s*\\\n\s*--role="([^"]+)"/.exec(src)
  assert.ok(addAllUsersRole, 'expected an add-iam-policy-binding invocation for --member="allUsers"')
  assert.equal(addAllUsersRole[1], 'roles/storage.legacyObjectReader')

  // The only remaining mention of objectViewer must be in a REMOVE (best-effort cleanup of the old,
  // over-broad binding on a bucket provisioned before this fix), never an ADD.
  const removeAllUsersRole = /gcloud storage buckets remove-iam-policy-binding[^\n]*\n\s*--project="[^"]*"\s*\\\n\s*--member="allUsers"\s*\\\n\s*--role="([^"]+)"/.exec(src)
  assert.ok(removeAllUsersRole, 'expected a remove-iam-policy-binding invocation for --member="allUsers"')
  assert.equal(removeAllUsersRole[1], 'roles/storage.objectViewer')
})

test('idempotency: bucket and SA are create-if-absent', () => {
  assert.match(src, /buckets describe .* >\/dev\/null 2>&1/)
  assert.match(src, /service-accounts describe .* >\/dev\/null 2>&1/)
})
