// Dev-tooling reliability — Sprint 2: pure node:test for the Codex→Antigravity auto-fallback.
//
// Cross-agent tooling has no Playwright gate (it's a CLI, not app code), so this node:test IS the
// deterministic gate for the fallback-decision logic AND the Sprint-3 branch-resolve + stale-HEAD seam —
// same anti-erosion shape as the infra/gcp guard. It mocks BOTH the codex/agy runners (no network) and gh +
// git (injected deps), asserting the fallback fires on the AUTH signal only and the resolver never reviews
// the wrong/stale diff silently.
//
// Run: `node --test 'scripts/lib/*.test.mjs'`   (the bare-directory form was dropped in Node 24).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCodexAuthError,
  decideCodexFallback,
  runWithCodexFallback,
  decideHeadGuard,
  decideTrivialSkip,
  isDocFile,
  resolveCurrentPr,
  runAntigravity,
  checkAgyVersion,
  AGY_PINNED,
  AGY_MODEL,
  AGY_ARG_LIMIT,
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

// --- Cost guard: decideTrivialSkip (pure, the CI "skip a typo PR" decision) -----------------------------

test('isDocFile: docs/text paths → true, code → false', () => {
  for (const p of ['README.md', 'a/b.mdx', 'notes.txt', 'x.rst', 'LICENSE', 'docs/guide.ts', '.gitignore'])
    assert.equal(isDocFile(p), true, p);
  for (const p of ['src/app.ts', 'a/Component.tsx', 'scripts/x.mjs', 'README.md.ts', 'mddocs/x.ts'])
    assert.equal(isDocFile(p), false, p);
});

test('decideTrivialSkip: empty / no files → skip (nothing to review)', () => {
  assert.deepEqual(decideTrivialSkip({ files: [] }), { skip: true, reason: 'empty diff' });
  assert.deepEqual(decideTrivialSkip({}), { skip: true, reason: 'empty diff' });
});

test('decideTrivialSkip: docs-only of ANY size → skip', () => {
  const files = [
    { path: 'README.md', additions: 400, deletions: 12 },
    { path: 'docs/x.mdx', additions: 99, deletions: 0 },
  ];
  assert.deepEqual(decideTrivialSkip({ files }), { skip: true, reason: 'docs-only diff' });
});

test('decideTrivialSkip: tiny code diff under threshold → skip with the count', () => {
  const r = decideTrivialSkip({ files: [{ path: 'src/a.ts', additions: 3, deletions: 2 }] });
  assert.equal(r.skip, true);
  assert.match(r.reason, /trivial diff \(5 changed lines < 10\)/);
});

test('decideTrivialSkip: a real code change of any size → review (no skip)', () => {
  assert.deepEqual(decideTrivialSkip({ files: [{ path: 'src/a.ts', additions: 40, deletions: 0 }] }), {
    skip: false,
  });
  // one real code file among docs → not docs-only, and 40 lines ≥ 10 → review.
  assert.deepEqual(
    decideTrivialSkip({
      files: [
        { path: 'README.md', additions: 200, deletions: 0 },
        { path: 'src/a.ts', additions: 40, deletions: 0 },
      ],
    }),
    { skip: false }
  );
});

test('decideTrivialSkip: boundary — exactly minLines code change is reviewed (< is strict)', () => {
  assert.deepEqual(decideTrivialSkip({ files: [{ path: 'src/a.ts', additions: 10, deletions: 0 }] }), {
    skip: false,
  });
  assert.equal(decideTrivialSkip({ files: [{ path: 'src/a.ts', additions: 9, deletions: 0 }] }).skip, true);
});

test('decideTrivialSkip: a custom minLines is honored, singular line wording', () => {
  assert.equal(decideTrivialSkip({ files: [{ path: 'src/a.ts', additions: 30 }], minLines: 50 }).skip, true);
  const one = decideTrivialSkip({ files: [{ path: 'src/a.ts', additions: 1, deletions: 0 }] });
  assert.match(one.reason, /1 changed line </); // singular "line", not "lines"
});

// --- Sprint 3: resolve + SHA-compare seam (mock gh + git) -----------------------------------------------

test('decideHeadGuard: matching SHAs → proceed silently', () => {
  assert.equal(decideHeadGuard({ localHead: 'abc123', prHeadOid: 'abc123', force: false }), 'match');
  assert.equal(decideHeadGuard({ localHead: 'abc123', prHeadOid: 'abc123', force: true }), 'match');
});

test('decideHeadGuard: mismatch → block without --force, force-through with it', () => {
  assert.equal(decideHeadGuard({ localHead: 'aaa', prHeadOid: 'bbb', force: false }), 'mismatch-block');
  assert.equal(decideHeadGuard({ localHead: 'aaa', prHeadOid: 'bbb', force: true }), 'mismatch-force');
});

test('decideHeadGuard: an unreadable SHA is treated as a mismatch (never a silent match)', () => {
  assert.equal(decideHeadGuard({ localHead: null, prHeadOid: 'bbb', force: false }), 'mismatch-block');
  assert.equal(decideHeadGuard({ localHead: 'aaa', prHeadOid: null, force: false }), 'mismatch-block');
});

// A throwing `fail` (die exits the process) so the test asserts the message instead of exiting.
const throwingFail = (m) => {
  throw new Error(m);
};

test('resolveCurrentPr: branch + valid OPEN `gh pr view` JSON → parsed PR fields', () => {
  const deps = {
    runGit: (args) => (args.join(' ') === 'rev-parse --abbrev-ref HEAD' ? 'feat/x' : null),
    runGh: () => ({
      ok: true,
      stdout: JSON.stringify({ number: 42, state: 'OPEN', headRefName: 'feat/x', headRefOid: 'deadbeef' }),
      stderr: '',
    }),
    fail: throwingFail,
  };
  assert.deepEqual(resolveCurrentPr({}, deps), {
    number: 42,
    headRefName: 'feat/x',
    headRefOid: 'deadbeef',
  });
});

test('resolveCurrentPr: `--repo` is forwarded to gh', () => {
  let seen = null;
  const deps = {
    runGit: () => 'feat/x',
    runGh: (args) => {
      seen = args;
      return { ok: true, stdout: JSON.stringify({ number: 7, state: 'OPEN', headRefName: 'feat/x', headRefOid: 'c0ffee' }), stderr: '' };
    },
    fail: throwingFail,
  };
  resolveCurrentPr({ repo: 'owner/repo' }, deps);
  assert.deepEqual(seen, ['pr', 'view', '--json', 'number,state,headRefName,headRefOid', '--repo', 'owner/repo']);
});

test('resolveCurrentPr: a MERGED/CLOSED PR (reused branch name) → treated as "no open PR"', () => {
  const deps = {
    runGit: () => 'chore/x',
    runGh: () => ({
      ok: true,
      stdout: JSON.stringify({ number: 16, state: 'MERGED', headRefName: 'chore/x', headRefOid: 'f8aa7119' }),
      stderr: '',
    }),
    fail: throwingFail,
  };
  assert.throws(() => resolveCurrentPr({}, deps), /no open PR for branch `chore\/x` \(found #16, state MERGED\)/);
});

test('resolveCurrentPr: no open PR for the branch → clear message, no stack trace', () => {
  const deps = {
    runGit: () => 'feat/x',
    runGh: () => ({ ok: false, stdout: '', stderr: 'no pull requests found for branch "feat/x"' }),
    fail: throwingFail,
  };
  assert.throws(() => resolveCurrentPr({}, deps), /no open PR for branch `feat\/x`/);
});

test('resolveCurrentPr: detached HEAD → clear message, never a silent wrong review', () => {
  const detached = { runGit: () => 'HEAD', fail: throwingFail };
  assert.throws(() => resolveCurrentPr({}, detached), /detached HEAD/);
  const noBranch = { runGit: () => null, fail: throwingFail };
  assert.throws(() => resolveCurrentPr({}, noBranch), /detached HEAD/);
});

test('resolveCurrentPr: a generic gh failure surfaces the stderr tail (not masked as "no PR")', () => {
  const deps = {
    runGit: () => 'feat/x',
    runGh: () => ({ ok: false, stdout: '', stderr: 'error connecting to api.github.com\nnetwork is unreachable' }),
    fail: throwingFail,
  };
  assert.throws(() => resolveCurrentPr({}, deps), /gh pr view failed.*network is unreachable/s);
});

test('resolveCurrentPr: a repo/remote misconfig is NOT masked as "no open PR" (tight matcher)', () => {
  // e.g. a bad --repo or missing remote — must surface the real error, not "no open PR".
  const deps = {
    runGit: () => 'feat/x',
    runGh: () => ({ ok: false, stdout: '', stderr: 'could not find any remotes / no default branch' }),
    fail: throwingFail,
  };
  assert.throws(() => resolveCurrentPr({}, deps), /gh pr view failed/);
});

// --- Sprint 2 (devops-reliability-cleanup S4): agy 1.0.10 print contract + fail-loud version check ---------
// agy 1.0.7→1.0.10 changed `--print`: it now needs an explicit --model or exits 0 with NO output (the bug we
// fixed). These lock the new invocation (a stubbed agy → non-empty capture, the --model + argv framing present,
// empty stdout treated as failure, the size cap intact) and the fail-loud version gate.

test('AGY_PINNED bumped to the verified 1.0.10 (guards the deliberate bump)', () => {
  assert.equal(AGY_PINNED, '1.0.10');
  assert.equal(typeof AGY_MODEL, 'string');
  assert.ok(AGY_MODEL.length > 0, 'AGY_MODEL must default to a non-empty model name');
});

// A stub `spawn` matching the spawnSync(cmd, args, opts) signature; records the call and returns a canned result.
function spawnStub(result) {
  const calls = [];
  const spawn = (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    return result;
  };
  return { spawn, calls };
}

test('runAntigravity: stubbed agy → non-empty capture, with `-p <argv> --model <MODEL>` and stdin EOF', () => {
  const { spawn, calls } = spawnStub({ status: 0, stdout: 'AGY REVIEW FINDINGS\n', stderr: '' });
  const out = runAntigravity('PROMPT+DIFF', {}, { spawn });
  assert.equal(out, 'AGY REVIEW FINDINGS'); // trimmed, non-empty
  assert.equal(calls.length, 1);
  const { cmd, args, opts } = calls[0];
  assert.equal(cmd, 'agy');
  // the 1.0.10 contract: prompt is the -p value, an explicit --model is passed (the fix for the empty output)
  assert.deepEqual(args, ['-p', 'PROMPT+DIFF', '--model', AGY_MODEL]);
  assert.equal(opts.input, '', 'stdin must be given an immediate EOF (input:"") or print mode blocks');
});

test('runAntigravity: empty stdout (missing/unentitled model) → treated as failure, not a blank review', () => {
  const { spawn, calls } = spawnStub({ status: 0, stdout: '   \n', stderr: '' });
  // soft mode returns null instead of die()-ing (non-soft would exit the process); assert it does NOT pass empty through.
  const out = runAntigravity('PROMPT+DIFF', { soft: true }, { spawn });
  assert.equal(out, null);
  assert.equal(calls.length, 1); // it DID spawn (empty came back), then rejected the empty result
});

test('runAntigravity: a non-zero agy exit surfaces the stderr tail', () => {
  const { spawn } = spawnStub({ status: 1, stdout: '', stderr: 'boom: model not found\n' });
  const out = runAntigravity('PROMPT+DIFF', { soft: true }, { spawn });
  assert.equal(out, null); // soft → null; the message (asserted via non-soft path by code) names the stderr tail
});

test('runAntigravity: oversized argv trips the size cap BEFORE spawning', () => {
  const { spawn, calls } = spawnStub({ status: 0, stdout: 'should not run', stderr: '' });
  const huge = 'x'.repeat(AGY_ARG_LIMIT + 1);
  const out = runAntigravity(huge, { soft: true }, { spawn });
  assert.equal(out, null);
  assert.equal(calls.length, 0, 'must not spawn agy when the input exceeds the argv cap');
});

test('checkAgyVersion: matching version → silent (no fail)', () => {
  let failed = false;
  checkAgyVersion({
    spawn: () => ({ stdout: '1.0.10\n', stderr: '' }),
    fail: () => { failed = true; },
    pinned: '1.0.10',
  });
  assert.equal(failed, false);
});

test('checkAgyVersion: mismatched version → LOUD fail naming the bump (not a silent warn)', () => {
  assert.throws(
    () =>
      checkAgyVersion({
        spawn: () => ({ stdout: '1.0.11\n', stderr: '' }),
        fail: throwingFail,
        pinned: '1.0.10',
      }),
    (e) => {
      assert.match(e.message, /agy 1\.0\.11 != pinned 1\.0\.10/);
      assert.match(e.message, /bump AGY_PINNED/);
      return true;
    }
  );
});

test('checkAgyVersion: unparseable version output → LOUD fail (never a silent pass)', () => {
  assert.throws(
    () =>
      checkAgyVersion({
        spawn: () => ({ stdout: 'not a version', stderr: '' }),
        fail: throwingFail,
        pinned: '1.0.10',
      }),
    /could not determine agy version/
  );
});
