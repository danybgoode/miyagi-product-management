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

// The swap is done (Story 3.1 shipped 2026-07-10) — apps/miyagisanchez/vercel.json's `crons`
// block has been removed entirely, so these schedules are hardcoded here as the sole source of
// truth going forward (they were cross-checked against vercel.json's verbatim values before the
// swap; that comparison is now moot since there's nothing left in vercel.json to compare against).
const EXPECTED_JOBS = [
  { name: 'frontend-order-autoconfirm', path: '/api/cron/order-autoconfirm', schedule: '0 9 * * *', headerShape: 'x-cron-secret' },
  { name: 'frontend-print-pending', path: '/api/cron/print-pending', schedule: '0 8 * * *', headerShape: 'x-cron-secret' },
  { name: 'frontend-domain-lapse-sweep', path: '/api/cron/domain-lapse-sweep', schedule: '0 7 * * *', headerShape: 'bearer' },
  { name: 'frontend-launchpad-campaigns', path: '/api/cron/launchpad-campaigns', schedule: '0 6 * * *', headerShape: 'x-cron-secret' },
]

// --- all 4 jobs present -----------------------------------------------------------------------

for (const job of EXPECTED_JOBS) {
  test(`provision-scheduler-frontend.sh: declares job ${job.name}`, () => {
    assert.match(src, new RegExp(job.name), `expected job name "${job.name}" in the script`)
  })
}

// --- schedules match the original vercel.json values verbatim (now hardcoded above) -----------

test('provision-scheduler-frontend.sh: every schedule matches the original vercel.json values', () => {
  for (const job of EXPECTED_JOBS) {
    const escaped = job.schedule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    assert.match(
      src,
      new RegExp(`\\|${escaped}\\|${job.path.replace(/\//g, '\\/')}\\|`),
      `expected schedule "${job.schedule}" paired with path "${job.path}" in the script`,
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

// --- create vs update use the CORRECT headers flag name -----------------------------------
// Regression guard: `gcloud scheduler jobs update http` takes --update-headers, NOT --headers
// (create-only flag) -- passing the wrong one on update errors "unrecognized arguments" and
// gcloud echoes the full invocation, INCLUDING THE SECRET VALUE, back in that error text. This
// bit live during Sprint 3.1's rehearsal (2026-07-10) and forced a secret rotation.

test('provision-scheduler-frontend.sh: switches to --update-headers on the update path, not --headers', () => {
  assert.match(src, /HEADERS_FLAG="--headers"/)
  assert.match(src, /\[ "\$ACTION" = "update" \] && HEADERS_FLAG="--update-headers"/)
})

test('provision-scheduler-frontend.sh: the gcloud invocation uses the resolved HEADERS_FLAG variable, not a hardcoded --headers', () => {
  assert.match(src, /"\$\{HEADERS_FLAG\}=\$\{HEADERS\}"/)
  assert.doesNotMatch(src, /--headers="\$HEADERS"/, 'a hardcoded --headers would break the update path again')
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
