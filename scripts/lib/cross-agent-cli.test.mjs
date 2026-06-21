// Dev-tooling reliability — Sprint 2: pure node:test for the Codex→Antigravity auto-fallback.
//
// Cross-agent tooling has no Playwright gate (it's a CLI, not app code), so this node:test IS the
// deterministic gate for the fallback-decision logic — same anti-erosion shape as the infra/gcp guard.
// It mocks BOTH runners (no codex/agy/network) and asserts the fallback fires on the AUTH signal only.
//
// Run: `node --test scripts/lib/`   (or `node --test scripts/lib/cross-agent-cli.test.js`)

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCodexAuthError,
  decideCodexFallback,
  runWithCodexFallback,
} from './cross-agent-cli.mjs';

// The real stderr a live revoked Codex token emits (captured 2026-06-21) — the trigger must match THIS.
const REVOKED_TOKEN_STDERR = `Reading additional input from stdin...
ERROR codex_login::auth::manager: Failed to refresh token: 401 Unauthorized: { "code": "refresh_token_invalidated" }
ERROR codex_login::auth::manager: Failed to refresh token: Your access token could not be refreshed because your refresh token was revoked. Please log out and sign in again.`;

test('isCodexAuthError: the real revoked-token stderr → true', () => {
  assert.equal(isCodexAuthError(REVOKED_TOKEN_STDERR), true);
});

test('isCodexAuthError: assorted auth phrasings → true', () => {
  assert.equal(isCodexAuthError('Your session has ended. Please log in again.'), true);
  assert.equal(isCodexAuthError('401 Unauthorized'), true);
  assert.equal(isCodexAuthError('the access token is expired'), true);
});

test('isCodexAuthError: non-auth failures → false (no fallback for these)', () => {
  assert.equal(isCodexAuthError('PR #5 has an empty diff (wrong number or repo?).'), false);
  assert.equal(isCodexAuthError('agy not found — install the Antigravity CLI'), false);
  assert.equal(isCodexAuthError('unknown error'), false);
  assert.equal(isCodexAuthError(''), false);
});

test('decideCodexFallback: exhaustive truth table', () => {
  // codexOk short-circuits regardless of the rest.
  assert.equal(decideCodexFallback({ codexOk: true, authFailed: false, agyAvailable: false }), 'use-codex');
  assert.equal(decideCodexFallback({ codexOk: true, authFailed: true, agyAvailable: true }), 'use-codex');
  // non-auth failure never falls back.
  assert.equal(decideCodexFallback({ codexOk: false, authFailed: false, agyAvailable: true }), 'fail-non-auth');
  // auth failure + agy present → fall back; agy absent → both-dead.
  assert.equal(decideCodexFallback({ codexOk: false, authFailed: true, agyAvailable: true }), 'fallback');
  assert.equal(decideCodexFallback({ codexOk: false, authFailed: true, agyAvailable: false }), 'fail-both-dead');
});

// --- orchestrator with mocked runners -------------------------------------------------------------------

// Build injectable deps with spies. `codex` shapes the tryCodex result; agy presence + fail are configurable.
function deps({ codex, agyAvailable = true }) {
  const calls = { antigravity: 0, failMsg: null, warnMsg: null };
  return {
    calls,
    tryCodex: () => codex,
    runAntigravity: () => {
      calls.antigravity++;
      return 'ANTIGRAVITY FINDINGS';
    },
    hasCmd: () => agyAvailable,
    // die() exits the process; the test substitutes a throwing fail to assert the message instead.
    fail: (m) => {
      calls.failMsg = m;
      throw new Error(m);
    },
    warn: (m) => {
      calls.warnMsg = m;
    },
  };
}

const ARGS = { prompt: 'p', stdin: 'diff', antigravityArgv: 'full-argv' };

test('runWithCodexFallback: codex healthy → use codex, no fallback, agy untouched', () => {
  const d = deps({ codex: { ok: true, text: 'CODEX FINDINGS', authFailed: false, stderr: '' } });
  const r = runWithCodexFallback(ARGS, d);
  assert.deepEqual(r, { findings: 'CODEX FINDINGS', fellBack: false });
  assert.equal(d.calls.antigravity, 0);
});

test('runWithCodexFallback: dead token + agy present → falls back to Antigravity (labeled signal)', () => {
  const d = deps({
    codex: { ok: false, text: '', authFailed: true, stderr: REVOKED_TOKEN_STDERR },
    agyAvailable: true,
  });
  const r = runWithCodexFallback(ARGS, d);
  assert.deepEqual(r, {
    findings: 'ANTIGRAVITY FINDINGS',
    fellBack: true,
    from: 'codex',
    to: 'antigravity',
  });
  assert.equal(d.calls.antigravity, 1);
  assert.match(d.calls.warnMsg, /Codex unavailable.*codex login/i); // restore hint emitted
});

test('runWithCodexFallback: non-auth codex failure → fails clearly, NO fallback', () => {
  const d = deps({
    codex: { ok: false, text: '', authFailed: false, stderr: 'internal error: boom' },
    agyAvailable: true,
  });
  assert.throws(() => runWithCodexFallback(ARGS, d), /non-auth/);
  assert.equal(d.calls.antigravity, 0);
});

test('runWithCodexFallback: dead token + agy ALSO unavailable → one-line failure naming both fixes', () => {
  const d = deps({
    codex: { ok: false, text: '', authFailed: true, stderr: REVOKED_TOKEN_STDERR },
    agyAvailable: false,
  });
  assert.throws(() => runWithCodexFallback(ARGS, d), (e) => {
    assert.match(e.message, /codex login/i);
    assert.match(e.message, /agy|antigravity/i);
    return true;
  });
  assert.equal(d.calls.antigravity, 0);
});
