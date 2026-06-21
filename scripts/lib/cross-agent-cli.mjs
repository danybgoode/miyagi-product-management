// cross-agent-cli.mjs — the shared CLI plumbing for the cross-agent second-opinion tools.
//
// One source of truth for driving a DIFFERENT model family's CLI (Codex or Antigravity), reused by both:
//   • scripts/cross-review.mjs  — advisory second opinion on a PR diff
//   • scripts/cross-panel.mjs   — advisory second opinion on a proposed plan (a scope/seed doc)
//
// It holds only the family-agnostic mechanics: presence/version checks, the per-CLI context-passing quirks
// (codex takes context on stdin; agy 1.0.7 has no stdin → context rides in argv, with a size cap), and the
// shared-prompt loader. The *framing* of the context (a PR diff vs a plan doc) and the output handling
// (post a PR comment vs print a panel) stay in each consuming script. Zero npm deps — Node 18+.
//
// ── Codex → Antigravity auto-fallback ───────────────────────────────────────────────────────────────────
// When the local Codex token has lapsed, `codex exec` exits non-zero with an AUTH error on stderr (e.g.
// "Your session has ended. Please log in again." / "refresh token was revoked" / 401). `runWithCodexFallback`
// detects that specific auth signal (NOT every error — a non-auth break or an empty diff still fails clearly)
// and retries once with Antigravity, returning `{ fellBack: true, from: 'codex', to: 'antigravity' }` so the
// caller can label the output. The trigger lives in the pure, testable `decideCodexFallback`; restoring Codex
// is `codex login` (see scripts/README.md → "Restoring a lapsed Codex token").

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

// label per agent. Drives both the CLI dispatch and the human-readable header.
export const AGENTS = { codex: 'Codex', antigravity: 'Antigravity' };

// Antigravity's headless CLI is new and its flags may shift between releases — pin the known-good version
// and warn (not fail) on a mismatch so a bump surfaces but doesn't block.
export const AGY_PINNED = '1.0.7';

// agy 1.0.7 has no stdin input, so the prompt+context ride in a single argv string. Guard well under the
// OS limit (macOS ARG_MAX is 1 MB incl. env) so a huge input fails clearly instead of an opaque E2BIG.
export const AGY_ARG_LIMIT = 256 * 1024;

export function die(msg) {
  process.stderr.write(`✗ ${msg}\n`);
  process.exit(1);
}

export function need(val, flag) {
  if (val === undefined || val.startsWith('-')) die(`${flag} requires a value`);
  return val;
}

// `cmd --version` exits non-zero only when the binary is missing (spawn .error) — a clean presence check.
export function ensureCmd(cmd, fix) {
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
  if (r.error) die(fix);
}

// Non-fatal sibling of ensureCmd: true if the binary is on PATH, false otherwise. Used by the fallback to
// decide whether Antigravity is even available before retrying — no die().
export function hasCmd(cmd) {
  return !spawnSync(cmd, ['--version'], { encoding: 'utf8' }).error;
}

export function ensureGh() {
  ensureCmd('gh', 'gh not found — install GitHub CLI (https://cli.github.com), then `gh auth login`.');
  const r = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
  if (r.status !== 0) die('gh is not authenticated — run `gh auth login`.');
}

// ── Branch → PR resolution + stale-HEAD guard (the "wrong-branch tax" fix) ───────────────────────────────
// cross-review takes an explicit <PR#> but never ties it to the current branch or checks the head SHA, so
// the FIRST run regularly reviews the wrong or a stale diff and gets rerun. These helpers let the command
// resolve the PR from the branch and refuse a stale local HEAD. They live here (the shared rail) so the
// resolver is a single source of truth alongside the Codex-fallback plumbing both scripts already import.

// Module-local git I/O: returns trimmed stdout, or null on any non-zero/spawn error (a clean "couldn't").
function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').trim() : null;
}

// Module-local gh I/O returning the structured result (so callers/tests can read stderr to classify failure).
function ghJson(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return { ok: r.status === 0, stdout: r.stdout || '', stderr: r.stderr || '' };
}

// First 8 chars of a SHA, for human-readable guard messages. Null-safe.
export function shortSha(sha) {
  return (sha || '').slice(0, 8);
}

// Pure stale-HEAD decision — the unit under test (no I/O, like decideCodexFallback). Given the local HEAD
// SHA, the PR's head SHA, and whether --force was passed, decide whether to proceed:
//   'match'          — SHAs equal → proceed silently.
//   'mismatch-force' — differ but --force → proceed with a warning.
//   'mismatch-block' — differ, no --force → refuse (review would be stale).
export function decideHeadGuard({ localHead, prHeadOid, force }) {
  if (localHead && prHeadOid && localHead === prHeadOid) return 'match';
  return force ? 'mismatch-force' : 'mismatch-block';
}

// gh stderr signalling "this branch has no associated PR" — kept TIGHT to gh's actual no-PR message so a
// repo/remote/auth misconfig (e.g. a bad --repo) falls through to the generic error instead of being masked
// as "no open PR" and sending the operator chasing the wrong fix.
function isNoPrError(stderr) {
  return /no (?:open )?pull requests? found/i.test(stderr || '');
}

// Resolve the open PR for the CURRENT branch via `gh pr view --json …`. Injectable (`deps`) so a pure
// node:test can mock gh + git with no network. Returns { number, headRefName, headRefOid }, or fail()s with a
// clear, actionable message (detached HEAD / no open PR / gh error) — never a stack trace.
export function resolveCurrentPr({ repo } = {}, deps = {}) {
  const { runGit = git, runGh = ghJson, fail = die } = deps;

  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!branch || branch === 'HEAD')
    return fail('detached HEAD / not on a branch — checkout the PR branch or pass <PR#> explicitly.');

  const args = ['pr', 'view', '--json', 'number,state,headRefName,headRefOid'];
  if (repo) args.push('--repo', repo);
  const res = runGh(args);
  if (!res.ok) {
    if (isNoPrError(res.stderr))
      return fail(`no open PR for branch \`${branch}\` — push/open one or pass <PR#>.`);
    return fail(`gh pr view failed for branch \`${branch}\`: ${lastLine(res.stderr)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    return fail(`could not parse \`gh pr view\` output for branch \`${branch}\`.`);
  }
  if (!parsed || typeof parsed.number !== 'number')
    return fail(`\`gh pr view\` returned no PR number for branch \`${branch}\`.`);
  // gh resolves a MERGED/CLOSED PR too (e.g. a reused branch name) — only an OPEN PR is a valid review target.
  if (parsed.state && parsed.state !== 'OPEN')
    return fail(
      `no open PR for branch \`${branch}\` (found #${parsed.number}, state ${parsed.state}) — ` +
        `push/open one or pass <PR#>.`
    );
  return { number: parsed.number, headRefName: parsed.headRefName, headRefOid: parsed.headRefOid };
}

// The local HEAD SHA (`git rev-parse HEAD`), or null if it can't be read. Injectable for tests.
export function currentHeadSha(deps = {}) {
  const { runGit = git } = deps;
  return runGit(['rev-parse', 'HEAD']);
}

export function checkAgyVersion() {
  const r = spawnSync('agy', ['--version'], { encoding: 'utf8' });
  const v = ((r.stdout || '') + (r.stderr || '')).trim().match(/\d+\.\d+\.\d+/);
  if (v && v[0] !== AGY_PINNED) {
    process.stderr.write(
      `⚠ agy ${v[0]} (pinned ${AGY_PINNED}) — flags may have shifted; verify the output.\n`
    );
  }
}

// Load a shared `*.prompt.md`. The doc opens with an HTML-comment header; the prompt is everything below
// the first `---` line. Returns the trimmed body, or dies with a clear message.
export function loadPromptBody(path) {
  if (!existsSync(path)) die(`shared prompt missing at ${path}`);
  const raw = readFileSync(path, 'utf8');
  const marker = raw.indexOf('\n---');
  const body = (marker === -1 ? raw : raw.slice(marker + '\n---'.length)).trim();
  if (!body) die(`shared prompt at ${path} is empty.`);
  return body;
}

// `opts.soft` makes a runner return null (with a stderr warning) instead of die()-ing on failure — used
// for non-essential passes (e.g. cross-panel's contradiction synthesis) that should degrade, not abort.
function fail(soft, msg) {
  if (soft) {
    process.stderr.write(`⚠ ${msg}\n`);
    return null;
  }
  die(msg);
}

// Last non-empty line of a stderr blob — the human-readable tail used in failure messages.
function lastLine(stderr) {
  return (stderr || '').trim().split('\n').filter(Boolean).pop() || 'unknown error';
}

// Low-level codex exec: prompt rides as an argv string, context is piped on stdin (codex appends it as a
// <stdin> block). Returns the raw spawn result — callers decide how to interpret status/stdout/stderr.
function execCodex(prompt, stdin) {
  return spawnSync('codex', ['exec', prompt], {
    input: stdin,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

// codex exec wrapper preserving the original contract: returns trimmed stdout, or fail()s (die unless soft).
export function runCodex(prompt, stdin, opts = {}) {
  const r = execCodex(prompt, stdin);
  if (r.status !== 0) return fail(opts.soft, `codex exec failed: ${lastLine(r.stderr)}`);
  return (r.stdout || '').trim();
}

// Soft, STRUCTURED codex run — never dies. Exposes stderr so the caller can tell an auth failure (token
// lapsed → fall back) from a non-auth failure (real break → surface it). This is the "degrade, don't die"
// soft mode made structured; runCodex stays the string-returning variant for its existing direct callers.
export function tryCodex(prompt, stdin) {
  const r = execCodex(prompt, stdin);
  const stderr = r.stderr || '';
  return {
    ok: r.status === 0,
    text: (r.stdout || '').trim(),
    authFailed: r.status !== 0 && isCodexAuthError(stderr),
    stderr,
  };
}

// True when codex's stderr carries an AUTHENTICATION failure (lapsed/revoked/expired token) — the only
// signal that should trigger the Antigravity fallback. Confirmed against a live revoked token (2026-06-21):
// "Failed to refresh token: 401 Unauthorized … refresh_token_invalidated", "Your session has ended. Please
// log in again.", "your refresh token was revoked. Please log out and sign in again." Kept tight to auth so
// a genuine non-auth error (empty diff, internal break) falls through and fails clearly instead.
export function isCodexAuthError(stderr) {
  return /refresh[_ ]?token|session has ended|log ?in again|sign in again|401 unauthorized|token (?:was|is|could not be) (?:revoked|refreshed|expired|invalid)|not authenticated|unauthorized/i.test(
    stderr || ''
  );
}

// Pure fallback decision — the unit under test. Given the outcome of a codex attempt and whether agy is
// available, return the action to take. No I/O, no exit.
export function decideCodexFallback({ codexOk, authFailed, agyAvailable }) {
  if (codexOk) return 'use-codex';
  if (!authFailed) return 'fail-non-auth'; // codex broke for a non-auth reason — don't mask it behind a fallback
  if (!agyAvailable) return 'fail-both-dead';
  return 'fallback';
}

// Orchestrate codex with a one-shot Antigravity fallback on an auth failure. `deps` is injectable so a
// pure node:test can mock both runners (no network). Returns { findings, fellBack[, from, to] }.
export function runWithCodexFallback(
  { prompt, stdin, antigravityArgv },
  deps = {}
) {
  const {
    tryCodex: tryCodexFn = tryCodex,
    runAntigravity: runAntigravityFn = runAntigravity,
    hasCmd: hasCmdFn = hasCmd,
    fail: failFn = die,
    warn = (m) => process.stderr.write(`${m}\n`),
  } = deps;

  const codex = tryCodexFn(prompt, stdin);
  const action = decideCodexFallback({
    codexOk: codex.ok,
    authFailed: codex.authFailed,
    agyAvailable: hasCmdFn('agy'),
  });

  switch (action) {
    case 'use-codex':
      return { findings: codex.text, fellBack: false };
    case 'fail-non-auth':
      return failFn(`codex exec failed (non-auth): ${lastLine(codex.stderr)}`);
    case 'fail-both-dead':
      return failFn(
        'Codex token revoked AND Antigravity unavailable — restore Codex with `codex login`, ' +
          'or install + authenticate the Antigravity CLI (agy).'
      );
    case 'fallback':
    default:
      warn('⚠ Codex unavailable (token revoked) → falling back to Antigravity. Restore: `codex login`.');
      return {
        findings: runAntigravityFn(antigravityArgv),
        fellBack: true,
        from: 'codex',
        to: 'antigravity',
      };
  }
}

// agy -p: agy 1.0.7 has no stdin block and no --output-format json — the caller must embed the context in
// `fullArgv` (prompt + framed context), and we enforce the argv size cap here so an oversized input fails
// with a clear message rather than an opaque E2BIG.
export function runAntigravity(fullArgv, opts = {}) {
  if (Buffer.byteLength(fullArgv, 'utf8') > AGY_ARG_LIMIT) {
    return fail(
      opts.soft,
      `input too large for antigravity (${Math.round(Buffer.byteLength(fullArgv) / 1024)} KB > ` +
        `${AGY_ARG_LIMIT / 1024} KB; agy has no stdin input) — use --agent codex instead.`
    );
  }
  const r = spawnSync('agy', ['-p', fullArgv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    const last = (r.stderr || '').trim().split('\n').filter(Boolean).pop() || 'unknown error';
    return fail(opts.soft, `agy -p failed: ${last}`);
  }
  return (r.stdout || '').trim();
}
