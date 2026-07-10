// alb-invariants.test.mjs — Story 2.2 (09-platform-infra frontend-vercel-to-cloudrun, Sprint 2):
// static drift guard for the ALB provisioning script, mirroring
// infra/gcp/test/deploy-invariants-frontend.test.js's flagValue()-on-script-text pattern (infra is
// not Playwright-gated). Pure fs read, zero deps, no live gcloud calls. Run:
// `node --test infra/gcp/test/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'provision-alb-frontend.sh'), 'utf8')

// --- no Cloud CDN — Cloudflare is the only CDN/edge layer this migration uses ---------------

test('provision-alb-frontend.sh: backend service explicitly disables Cloud CDN', () => {
  assert.match(src, /--no-enable-cdn/, 'the backend service must lock the "Cloudflare only" decision in the script text')
})

test('provision-alb-frontend.sh: never passes --enable-cdn (the opposite flag)', () => {
  assert.doesNotMatch(src, /(?<!no-)--enable-cdn\b/, 'a bare --enable-cdn would silently turn Cloud CDN back on')
})

// --- serverless NEG backend must never carry a health-checks flag ----------------------------
// (unsupported for serverless NEGs — Cloud Run manages its own health)

test('provision-alb-frontend.sh: backend service does not set --health-checks', () => {
  assert.doesNotMatch(src, /--health-checks/, 'serverless NEG backends reject --health-checks')
})

// --- the portName gotcha fix must stay in place -----------------------------------------------
// (found live: --protocol=HTTPS auto-fills portName="https", which a serverless NEG backend
// rejects on add-backend — the script must PATCH it away before attaching the NEG)

test('provision-alb-frontend.sh: clears the auto-filled "https" portName before add-backend', () => {
  const patchIdx = src.indexOf('"portName": null')
  // Match the real invocation, not the explanatory header comment (which also mentions
  // "add-backend" in prose, earlier in the file than the actual fix).
  const addBackendIdx = src.indexOf('gcloud compute backend-services add-backend')
  assert.ok(patchIdx !== -1, 'expected the portName-clearing PATCH to still be present')
  assert.ok(addBackendIdx !== -1, 'expected an add-backend invocation')
  assert.ok(patchIdx < addBackendIdx, 'the portName fix must run BEFORE add-backend, not after')
})

// --- Cloud Armor: ingress lock to Cloudflare only ----------------------------------------------

test('provision-alb-frontend.sh: creates a Cloud Armor policy and attaches it to the backend', () => {
  assert.match(src, /security-policies create/)
  assert.match(src, /--security-policy="\$ARMOR_POLICY"/)
})

test('provision-alb-frontend.sh: default rule is flipped to deny (allowlist-only policy)', () => {
  assert.match(src, /--action=deny-403/)
})

test('provision-alb-frontend.sh: fetches Cloudflare\'s ranges from BOTH ips-v4 and ips-v6', () => {
  assert.match(src, /cloudflare\.com\/ips-v4/)
  assert.match(src, /cloudflare\.com\/ips-v6/)
})

test('provision-alb-frontend.sh: sorts the Cloudflare CIDR list before assigning priorities (re-run stability)', () => {
  assert.match(src, /\|\s*sort/, 'an unsorted list would drift rule priorities across re-runs as Cloudflare reorders its published list')
})

// --- self-managed cert, never Google-managed ---------------------------------------------------

test('provision-alb-frontend.sh: ssl cert is self-managed (--certificate/--private-key), never --domains', () => {
  assert.match(src, /--certificate="\$CERT_FILE"/)
  assert.match(src, /--private-key="\$KEY_FILE"/)
  assert.doesNotMatch(src, /ssl-certificates create[\s\S]{0,200}--domains=/, 'a --domains flag would trigger Google-managed ACME provisioning instead of the Cloudflare Origin CA cert')
})

// --- idempotency shape: every named resource is describe-guarded before create ------------------

for (const resource of [
  'addresses',
  'network-endpoint-groups',
  'ssl-certificates',
  'security-policies',
  'backend-services',
  'url-maps',
  'target-https-proxies',
  'forwarding-rules',
]) {
  test(`provision-alb-frontend.sh: ${resource} is guarded by a describe check before create`, () => {
    const createIdx = src.indexOf(`compute ${resource} create`)
    assert.ok(createIdx !== -1, `expected a "compute ${resource} create" call`)
    const describeIdx = src.lastIndexOf(`compute ${resource} describe`, createIdx)
    assert.ok(describeIdx !== -1 && describeIdx < createIdx, `expected a preceding "compute ${resource} describe" guard`)
  })
}
