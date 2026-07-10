// cloudflare-waf-provision.test.mjs — Story 2.3 (09-platform-infra frontend-vercel-to-cloudrun,
// Sprint 2): static drift guard for the WAF provisioning script (infra is not Playwright-gated).
// Pure fs read, zero deps, no live Cloudflare calls. Run: `node --test infra/gcp/test/`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'cloudflare-waf-provision.mjs'), 'utf8')

test('cloudflare-waf-provision.mjs: the probe rule covers every classic scanner path Vercel mitigated', () => {
  for (const needle of ['wp-admin', 'wp-login.php', 'xmlrpc.php', '/.env', '/.git', 'admin.php']) {
    assert.ok(src.includes(needle), `expected the probe expression to include "${needle}"`)
  }
})

test('cloudflare-waf-provision.mjs: the rule action is block (403), not just log/challenge', () => {
  assert.match(src, /action:\s*'block'/)
})

test('cloudflare-waf-provision.mjs: PUT to the entrypoint preserves any OTHER existing rule (filters by own description only)', () => {
  assert.match(src, /otherRules\s*=\s*existingRules\.filter/, 'a re-run must not clobber a rule a human added by hand in the dashboard')
})

test('cloudflare-waf-provision.mjs: Bot Fight Mode failure degrades gracefully, does not abort the WAF rule', () => {
  const botModeIdx = src.indexOf('bot_fight_mode')
  const tryIdx = src.lastIndexOf('try {', botModeIdx)
  const catchIdx = src.indexOf('catch (e)', botModeIdx)
  assert.ok(tryIdx !== -1 && tryIdx < botModeIdx, 'expected the Bot Fight Mode call to be wrapped in try')
  assert.ok(catchIdx !== -1, 'expected a catch that logs and continues, not process.exit')
  const catchBlockEnd = src.indexOf('\n  }', catchIdx)
  const catchBody = src.slice(catchIdx, catchBlockEnd)
  assert.doesNotMatch(catchBody, /process\.exit/, 'a soft-fail must not exit the whole script')
})
