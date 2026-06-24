// DevOps reliability cleanup — Sprint 2, Story 2b: deterministic gate for the Cloud SQL
// backup-failure alert. Infra isn't Playwright-gated, so this pure node:test IS the gate
// (same shape as deploy-invariants.test.js, auto-run by .github/workflows/infra-guard.yml).
//
// It exercises the REAL freshness predicate (infra/gcp/backups/cloudsql-check/backup-freshness.py)
// by spawning it with fixture `gcloud … --format=json` on stdin and a pinned NOW, asserting the
// exit code (0 healthy / 1 unhealthy / 2 bad input) + the human reason. A couple of cheap fs
// asserts also lock the bash wrapper's alert idiom so a future edit can't silently drop it.

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const CHECK_DIR = path.join(__dirname, '..', 'backups', 'cloudsql-check')
const PREDICATE = path.join(CHECK_DIR, 'backup-freshness.py')

// A pinned "now" so age math is deterministic; backup times are expressed relative to it.
const NOW = 1782216000 // 2026-06-23T12:00:00Z (any fixed epoch works)
const iso = (hoursAgo) => new Date((NOW - hoursAgo * 3600) * 1000).toISOString()

// Run the predicate with fixture JSON on stdin; returns { code, reason }.
function run(backups, { maxAgeHours = 26 } = {}) {
  const input = typeof backups === 'string' ? backups : JSON.stringify(backups)
  const r = spawnSync('python3', [PREDICATE], {
    input,
    encoding: 'utf8',
    env: { ...process.env, NOW: String(NOW), MAX_AGE_HOURS: String(maxAgeHours) },
  })
  if (r.error) throw r.error // python3 missing → surface it (the predicate runtime must exist)
  return { code: r.status, reason: (r.stdout || '').trim() }
}

const auto = (overrides) => ({ id: '111', type: 'AUTOMATED', status: 'SUCCESSFUL', endTime: iso(2), ...overrides })

test('healthy: a fresh SUCCESSFUL automated backup (2h ago) → exit 0, no alert', () => {
  const { code, reason } = run([auto()])
  assert.equal(code, 0)
  assert.match(reason, /SUCCESSFUL automated backup .*ago/)
})

test('unhealthy: empty list → exit 1, "no AUTOMATED backups"', () => {
  const { code, reason } = run([])
  assert.equal(code, 1)
  assert.match(reason, /no AUTOMATED Cloud SQL backups/)
})

test('unhealthy: latest automated FAILED, none successful → exit 1, names the status', () => {
  const { code, reason } = run([auto({ status: 'FAILED', endTime: iso(1) })])
  assert.equal(code, 1)
  assert.match(reason, /no SUCCESSFUL automated backup .*status=FAILED/)
})

test('unhealthy: SUCCESSFUL but STALE (30h ago > 26h) → exit 1, reports the age', () => {
  const { code, reason } = run([auto({ endTime: iso(30) })])
  assert.equal(code, 1)
  assert.match(reason, /30\.0h old/)
})

test('robust: a RUNNING newest does NOT mask a good SUCCESSFUL one earlier in the window', () => {
  // newest is RUNNING (1h ago, no endTime); a SUCCESSFUL automated finished 5h ago → still healthy.
  const { code, reason } = run([
    auto({ id: 'running', status: 'RUNNING', endTime: null, startTime: iso(1) }),
    auto({ id: 'good', status: 'SUCCESSFUL', endTime: iso(5) }),
  ])
  assert.equal(code, 0)
  assert.match(reason, /id good/)
})

test('unhealthy: only ON_DEMAND backups (no AUTOMATED) → exit 1', () => {
  const { code, reason } = run([{ id: '9', type: 'ON_DEMAND', status: 'SUCCESSFUL', endTime: iso(1) }])
  assert.equal(code, 1)
  assert.match(reason, /no AUTOMATED/)
})

test('bad input: malformed JSON → exit 2 (the wrapper alerts on this too)', () => {
  const { code, reason } = run('{not json', {})
  assert.equal(code, 2)
  assert.match(reason, /could not parse/)
})

test('custom MAX_AGE_HOURS is honored (1h window → a 2h-old backup is stale)', () => {
  const { code } = run([auto({ endTime: iso(2) })], { maxAgeHours: 1 })
  assert.equal(code, 1)
})

// --- the bash wrapper keeps the failure-alert idiom (cheap anti-erosion fs asserts) ---

const wrapperSrc = fs.readFileSync(path.join(CHECK_DIR, 'check-cloudsql-backup.sh'), 'utf8')

test('check-cloudsql-backup.sh: strict bash + reuses the Telegram alert idiom', () => {
  assert.match(wrapperSrc, /set -euo pipefail/, 'must be strict bash')
  assert.match(wrapperSrc, /TELEGRAM_BOT_TOKEN/, 'must alert via the Telegram bot token')
  assert.match(wrapperSrc, /TELEGRAM_CICD_CHAT_ID/, 'must target the CI/CD ops chat')
  assert.match(wrapperSrc, /gcloud sql backups list/, 'must list Cloud SQL backups')
  assert.match(wrapperSrc, /backup-freshness\.py/, 'must delegate the decision to the pure predicate')
})

test('check-cloudsql-backup.sh: a failed gcloud listing ALSO alerts (no silent blind spot)', () => {
  assert.match(wrapperSrc, /could not list backups/, 'a gcloud failure must page, not exit silently')
})
