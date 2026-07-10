// provision-monitoring-frontend.test.mjs — Story 3.5 (09-platform-infra
// frontend-vercel-to-cloudrun, Sprint 3): static drift guard for the SERVICE_NAME=frontend
// extension to provision-monitoring.sh, mirroring the repo's pure fs-read pattern (infra is
// not Playwright-gated). Zero deps, no live gcloud calls. Run: `node --test infra/gcp/test/`.
//
// Locks in the one real drift point found while extending this script: the frontend's health
// path is /api/health (confirmed in deploy-frontend.sh's probes), NOT /health like the
// backend — a copy-paste of the backend's case block would silently point the frontend's
// uptime check at a 404.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'provision-monitoring.sh'), 'utf8')

function caseBody(serviceName) {
  // Extract the `serviceName) ... ;;` block within the outer `case "$SERVICE_NAME" in`.
  const m = src.match(new RegExp(`\\n  ${serviceName}\\)([\\s\\S]*?)\\n    ;;\\n  (?:backend|frontend|\\*)`))
  assert.ok(m, `expected a "${serviceName})" case block in the SERVICE_NAME switch`)
  return m[1]
}

test('provision-monitoring.sh: SERVICE_NAME defaults to backend (unchanged behavior)', () => {
  assert.match(src, /SERVICE_NAME="\$\{SERVICE_NAME:-backend\}"/)
})

test('provision-monitoring.sh: frontend case resolves SERVICE=miyagi-web', () => {
  assert.match(caseBody('frontend'), /SERVICE="miyagi-web"/)
})

test('provision-monitoring.sh: frontend uptime path is /api/health, NOT /health', () => {
  const body = caseBody('frontend')
  assert.match(body, /UPTIME_PATH="\/api\/health"/, 'frontend health route is /api/health per deploy-frontend.sh probes')
})

test('provision-monitoring.sh: backend uptime path stays /health (regression guard)', () => {
  const body = caseBody('backend')
  assert.match(body, /UPTIME_PATH="\/health"/)
})

test('provision-monitoring.sh: frontend prod target defaults UPTIME_HOST to the canonical domain', () => {
  const body = caseBody('frontend')
  assert.match(body, /prod\)[\s\S]{0,200}UPTIME_HOST="\$\{UPTIME_HOST:-miyagisanchez\.com\}"/)
})

test('provision-monitoring.sh: frontend staging target resolves the live miyagi-web *.run.app host', () => {
  const body = caseBody('frontend')
  assert.match(body, /staging\)[\s\S]{0,300}gcloud run services describe miyagi-web/)
})

test('provision-monitoring.sh: an unknown SERVICE_NAME exits non-zero', () => {
  assert.match(src, /SERVICE_NAME must be 'backend' or 'frontend'/)
  assert.match(src, /exit 1/)
})

// --- alert-name collision guard: PFX is derived from SERVICE (service-unique), never from
// SERVICE_NAME alone, so [miyagi-web] and [medusa-web] alert displayNames can never collide ---

test('provision-monitoring.sh: PFX is derived from the resolved SERVICE, not a static string', () => {
  assert.match(src, /PFX="\[\$\{SERVICE\}\]"/)
})

// --- the "backend errors (logs)" display-name string must NOT be renamed for the frontend
// path — apply_policy's idempotency matches on displayName; renaming it would orphan the
// already-live backend policy in prod instead of reconciling it ---

test('provision-monitoring.sh: the backend errors (logs) policy displayName text is unchanged (idempotency safety)', () => {
  assert.match(src, /apply_policy "\$\{PFX\} backend errors \(logs\)"/)
})
