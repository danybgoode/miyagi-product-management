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

// codex exec: the prompt rides as an argv string, the context is piped on stdin (codex appends it as a
// <stdin> block). The caller passes the already-composed prompt and the raw context text.
export function runCodex(prompt, stdin, opts = {}) {
  const r = spawnSync('codex', ['exec', prompt], {
    input: stdin,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    const last = (r.stderr || '').trim().split('\n').filter(Boolean).pop() || 'unknown error';
    return fail(opts.soft, `codex exec failed: ${last}`);
  }
  return (r.stdout || '').trim();
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
