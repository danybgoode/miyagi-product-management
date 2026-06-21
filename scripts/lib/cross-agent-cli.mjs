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
