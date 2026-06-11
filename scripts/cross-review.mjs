#!/usr/bin/env node
// cross-review.mjs — an ADVISORY cross-agent second opinion on a pull-request diff.
//
// Pipes `gh pr diff <PR#>` into a DIFFERENT model family's CLI (Codex or Antigravity) with the shared prompt
// (scripts/cross-review.prompt.md = the five AGENTS rules + WAYS single-pass discipline) and prints the
// findings. It is dev tooling, not app code, and it is deliberately:
//   • SINGLE-PASS — one read, no debate / iterate-to-convergence loop (our #1 token sink, out of scope).
//   • ADVISORY ONLY — never gates, blocks, or merges. CI + the Claude reviewer + the risk-tier rule decide.
//
// Usage:
//   node scripts/cross-review.mjs <PR#> --agent codex|antigravity [--repo owner/repo] [--dry-run]
//
// Default posts the findings as a labeled, clearly-advisory PR comment; --dry-run prints instead.
// `gh` resolves the repo from the current directory; pass --repo to target another (e.g. the app repo).
// Zero npm deps — Node 18+ (uses global process / child_process).

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, 'cross-review.prompt.md');

// label per agent.
const AGENTS = { codex: 'Codex', antigravity: 'Antigravity' };

// Antigravity's headless CLI is new and its flags may shift between releases — pin the known-good
// version and warn (not fail) on a mismatch so a bump surfaces but doesn't block.
const AGY_PINNED = '1.0.7';

const BANNER =
  '> **Advisory only — not a gate, does not authorize merge.** ' +
  'CI + the Claude reviewer + the risk-tier rule remain authoritative. ' +
  'This is a single-pass second opinion from a different model family.';

const HELP = `cross-review.mjs — advisory cross-agent second opinion on a PR diff.

Usage:
  node scripts/cross-review.mjs <PR#> --agent codex|antigravity [--repo owner/repo] [--dry-run]

Flags:
  --agent <name>      reviewer CLI: ${Object.keys(AGENTS).join('|')} (default: codex)
  --repo  owner/repo  target a specific repo (default: the repo of the current directory)
  --dry-run           print the comment instead of posting it (alias: --no-comment)
  -h, --help          show this help

Advisory only — the output never gates, blocks, or authorizes a merge.`;

function die(msg) {
  process.stderr.write(`✗ ${msg}\n`);
  process.exit(1);
}

function need(val, flag) {
  if (val === undefined || val.startsWith('-')) die(`${flag} requires a value`);
  return val;
}

function parseArgs(argv) {
  const out = { pr: null, agent: 'codex', repo: null, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--dry-run' || a === '--no-comment') out.dryRun = true;
    else if (a === '--agent') out.agent = need(argv[++i], '--agent');
    else if (a.startsWith('--agent=')) out.agent = a.slice('--agent='.length);
    else if (a === '--repo') out.repo = need(argv[++i], '--repo');
    else if (a.startsWith('--repo=')) out.repo = a.slice('--repo='.length);
    else if (!a.startsWith('-') && out.pr === null) out.pr = a;
    else die(`unknown argument '${a}' (try --help)`);
  }
  return out;
}

// `cmd --version` exits non-zero only when the binary is missing (spawn .error) — a clean presence check.
function ensureCmd(cmd, fix) {
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
  if (r.error) die(fix);
}

function ensureGh() {
  ensureCmd('gh', 'gh not found — install GitHub CLI (https://cli.github.com), then `gh auth login`.');
  const r = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
  if (r.status !== 0) die('gh is not authenticated — run `gh auth login`.');
}

function loadPrompt() {
  if (!existsSync(PROMPT_PATH)) die(`shared prompt missing at ${PROMPT_PATH}`);
  const raw = readFileSync(PROMPT_PATH, 'utf8');
  // The doc opens with an HTML-comment header; the prompt is everything below the first `---` line.
  const marker = raw.indexOf('\n---');
  const body = (marker === -1 ? raw : raw.slice(marker + '\n---'.length)).trim();
  if (!body) die(`shared prompt at ${PROMPT_PATH} is empty.`);
  return body;
}

function ghDiff(pr, repo) {
  const args = ['pr', 'diff', String(pr)];
  if (repo) args.push('--repo', repo);
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    const first = (r.stderr || '').trim().split('\n')[0] || 'unknown error';
    die(`gh pr diff failed for #${pr}: ${first}`);
  }
  if (!r.stdout || !r.stdout.trim()) die(`PR #${pr} has an empty diff (wrong number or repo?).`);
  return r.stdout;
}

function runCodex(prompt, diff) {
  // codex exec: prompt as arg, the diff piped on stdin (appended as a <stdin> block by codex).
  const r = spawnSync('codex', ['exec', prompt], {
    input: diff,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    const last = (r.stderr || '').trim().split('\n').filter(Boolean).pop() || 'unknown error';
    die(`codex exec failed: ${last}`);
  }
  return (r.stdout || '').trim();
}

function checkAgyVersion() {
  const r = spawnSync('agy', ['--version'], { encoding: 'utf8' });
  const v = ((r.stdout || '') + (r.stderr || '')).trim().match(/\d+\.\d+\.\d+/);
  if (v && v[0] !== AGY_PINNED) {
    process.stderr.write(
      `⚠ agy ${v[0]} (pinned ${AGY_PINNED}) — flags may have shifted; verify the output.\n`
    );
  }
}

// agy 1.0.7 has no stdin input, so the prompt+diff ride in a single argv string. Guard well under the
// OS limit (macOS ARG_MAX is 1 MB incl. env) so a huge PR fails clearly instead of an opaque E2BIG.
const AGY_ARG_LIMIT = 256 * 1024;

function runAntigravity(prompt, diff) {
  // agy 1.0.7 has no stdin block and no --output-format json — embed the diff in the prompt, take text.
  const full = `${prompt}\n\n## PR diff to review\n\n\`\`\`diff\n${diff}\n\`\`\`\n`;
  if (Buffer.byteLength(full, 'utf8') > AGY_ARG_LIMIT) {
    die(
      `diff too large for antigravity (${Math.round(Buffer.byteLength(full) / 1024)} KB > ` +
        `${AGY_ARG_LIMIT / 1024} KB; agy has no stdin input) — use --agent codex for this PR.`
    );
  }
  const r = spawnSync('agy', ['-p', full], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    const last = (r.stderr || '').trim().split('\n').filter(Boolean).pop() || 'unknown error';
    die(`agy -p failed: ${last}`);
  }
  return (r.stdout || '').trim();
}

function runReview(agent, prompt, diff) {
  if (agent === 'codex') return runCodex(prompt, diff);
  if (agent === 'antigravity') return runAntigravity(prompt, diff);
  die(`unknown --agent '${agent}'; use ${Object.keys(AGENTS).join('|')}`);
}

function buildComment(agentLabel, findings) {
  return `### 🔎 Cross-agent review (${agentLabel})\n\n${BANNER}\n\n---\n\n${findings}\n`;
}

function postComment(pr, repo, body) {
  const args = ['pr', 'comment', String(pr)];
  if (repo) args.push('--repo', repo);
  args.push('--body-file', '-'); // pipe the body on stdin → no shell-escaping pitfalls
  const r = spawnSync('gh', args, { input: body, encoding: 'utf8' });
  if (r.status !== 0) {
    const first = (r.stderr || '').trim().split('\n')[0] || 'unknown error';
    die(`gh pr comment failed for #${pr}: ${first}`);
  }
  return (r.stdout || '').trim(); // gh prints the comment URL
}

function main() {
  const { pr, agent, repo, dryRun, help } = parseArgs(process.argv.slice(2));
  if (help) {
    process.stdout.write(HELP + '\n');
    process.exit(0);
  }
  if (pr === null) die('missing <PR#>. Usage: node scripts/cross-review.mjs <PR#> --agent codex');
  if (!/^\d+$/.test(String(pr))) die(`PR number must be numeric, got '${pr}'.`);
  if (!AGENTS[agent]) die(`unknown --agent '${agent}'; use ${Object.keys(AGENTS).join('|')}`);

  ensureGh();
  if (agent === 'codex') {
    ensureCmd('codex', 'codex not found — install Codex CLI (https://github.com/openai/codex) and `codex login`.');
  } else if (agent === 'antigravity') {
    ensureCmd('agy', 'agy not found — install the Antigravity CLI and authenticate it, then retry.');
    checkAgyVersion();
  }

  const prompt = loadPrompt();
  const diff = ghDiff(pr, repo);
  const findings = runReview(agent, prompt, diff);
  if (!findings) die(`${AGENTS[agent]} returned no output.`);

  const body = buildComment(AGENTS[agent], findings);
  if (dryRun) {
    process.stdout.write(body);
    process.stderr.write('\n(dry-run — no comment posted)\n');
  } else {
    const url = postComment(pr, repo, body);
    process.stderr.write(`✓ Advisory comment posted${url ? `: ${url}` : ''}\n`);
  }
}

main();
