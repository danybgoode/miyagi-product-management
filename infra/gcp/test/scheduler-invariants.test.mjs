// scheduler-invariants.test.mjs — Story 3.1 (09-platform-infra frontend-vercel-to-cloudrun,
// Sprint 3): static drift guard for provision-scheduler-frontend.sh, mirroring
// alb-invariants.test.mjs's pure fs-read pattern (infra is not Playwright-gated). Zero deps,
// no live gcloud calls. Run: `node --test infra/gcp/test/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'provision-scheduler-frontend.sh'), 'utf8')
const vercelJson = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'apps', 'miyagisanchez', 'vercel.json'), 'utf8'),
)

const EXPECTED_JOBS = [
  { name: 'frontend-order-autoconfirm', path: '/api/cron/order-autoconfirm', headerShape: 'x-cron-secret' },
  { name: 'frontend-print-pending', path: '/api/cron/print-pending', headerShape: 'x-cron-secret' },
  { name: 'frontend-domain-lapse-sweep', path: '/api/cron/domain-lapse-sweep', headerShape: 'bearer' },
  { name: 'frontend-launchpad-campaigns', path: '/api/cron/launchpad-campaigns', headerShape: 'x-cron-secret' },
]

// --- all 4 jobs present, one per vercel.json cron -------------------------------------------

for (const job of EXPECTED_JOBS) {
  test(`provision-scheduler-frontend.sh: declares job ${job.name}`, () => {
    assert.match(src, new RegExp(job.name), `expected job name "${job.name}" in the script`)
  })
}

test('provision-scheduler-frontend.sh: covers exactly the 4 crons vercel.json declares', () => {
  const vercelPaths = new Set((vercelJson.crons ?? []).map((c) => c.path))
  assert.equal(vercelPaths.size, 4, 'expected vercel.json to still declare exactly 4 crons at this point in the migration')
  for (const job of EXPECTED_JOBS) {
    assert.ok(vercelPaths.has(job.path), `expected vercel.json to declare a cron for ${job.path}`)
  }
})

// --- schedules match vercel.json's verbatim (regression: a change to one and not the other) --

test('provision-scheduler-frontend.sh: every schedule matches vercel.json verbatim', () => {
  for (const cron of vercelJson.crons) {
    const escaped = cron.schedule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    assert.match(
      src,
      new RegExp(`\\|${escaped}\\|${cron.path.replace(/\//g, '\\/')}\\|`),
      `expected schedule "${cron.schedule}" paired with path "${cron.path}" in the script`,
    )
  }
})

// --- time-zone must be explicit UTC (vercel.json has no timezone block → defaults UTC) -------

test('provision-scheduler-frontend.sh: sets --time-zone="Etc/UTC" explicitly', () => {
  assert.match(src, /--time-zone="Etc\/UTC"/)
})

// --- domain-lapse-sweep is Bearer-only, fail-closed — regression guard -----------------------

test('provision-scheduler-frontend.sh: frontend-domain-lapse-sweep is wired as "bearer", not "x-cron-secret"', () => {
  const line = src.split('\n').find((l) => l.includes('frontend-domain-lapse-sweep'))
  assert.ok(line, 'expected a JOBS entry for frontend-domain-lapse-sweep')
  assert.match(line, /\|bearer"$/, 'domain-lapse-sweep route only accepts Authorization: Bearer, never x-cron-secret')
})

test('provision-scheduler-frontend.sh: Bearer-shaped jobs build an Authorization header, not x-cron-secret', () => {
  assert.match(src, /HEADERS="Authorization=Bearer \$\{CRON_SECRET_VALUE\}"/)
})

// --- every job is paused right after create/update — never silently left enabled -------------

test('provision-scheduler-frontend.sh: create/update is followed by an unconditional pause in the same loop body', () => {
  const createIdx = src.indexOf('jobs "$ACTION" http "$NAME"')
  const pauseAfterIdx = src.lastIndexOf('jobs pause "$NAME"')
  assert.ok(createIdx !== -1, 'expected a create/update invocation')
  assert.ok(pauseAfterIdx !== -1 && pauseAfterIdx > createIdx, 'expected a pause call after create/update, not before')
})

// --- --enable / --disable are the ONLY way jobs change state; provisioning never resumes -----

test('provision-scheduler-frontend.sh: provisioning (no flag) never calls resume', () => {
  // The only "resume" call must be gated inside the --enable branch (MODE=enable), never in
  // the default create/update path — enforced structurally: resume appears once, inside the
  // `case "$MODE" in enable)` block, before the create/update block begins.
  const resumeIdx = src.indexOf('jobs resume "$NAME"')
  const caseIdx = src.indexOf('case "$MODE" in')
  const createIdx = src.indexOf('jobs "$ACTION" http "$NAME"')
  assert.ok(resumeIdx !== -1, 'expected a resume call for the --enable path')
  assert.ok(resumeIdx > caseIdx && resumeIdx < createIdx, 'resume must live inside the MODE case-switch, before the create/update block')
})

// --- refuses to provision with an empty CRON_SECRET -------------------------------------------

test('provision-scheduler-frontend.sh: exits non-zero if CRON_SECRET is empty during provisioning', () => {
  assert.match(src, /CRON_SECRET has no value in Secret Manager/)
  assert.match(src, /exit 1/)
})

// --- never prints the secret value --------------------------------------------------------------

test('provision-scheduler-frontend.sh: never echoes CRON_SECRET_VALUE on its own', () => {
  assert.doesNotMatch(src, /echo.*CRON_SECRET_VALUE(?!.*HEADERS)/, 'the raw secret value must never be echoed to logs')
})

// --- targets the live resolved Cloud Run URL, never a hardcoded host --------------------------

test('provision-scheduler-frontend.sh: resolves the Cloud Run URL live, never hardcodes a *.run.app host', () => {
  assert.match(src, /gcloud run services describe "\$SERVICE".*--format='value\(status\.url\)'/)
  assert.doesNotMatch(src, /https:\/\/miyagi-web-[a-z0-9]+\.[a-z0-9-]+\.run\.app/, 'must not hardcode a specific revision/project-hash URL')
})
