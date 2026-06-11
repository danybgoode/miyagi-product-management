#!/usr/bin/env node
// cross-review.mjs — an ADVISORY cross-agent second opinion on a pull-request diff.
//
// Pipes `gh pr diff <PR#>` into a DIFFERENT model family's CLI (Codex) with the shared reviewer prompt
// (scripts/cross-review.prompt.md = the five AGENTS rules + WAYS single-pass discipline) and prints the
// findings. It is dev tooling, not app code, and it is deliberately:
//   • SINGLE-PASS — one read, no debate / iterate-to-convergence loop (our #1 token sink, out of scope).
//   • ADVISORY ONLY — never gates, blocks, or merges. CI + the Claude reviewer + the risk-tier rule decide.
//
// Usage:
//   node scripts/cross-review.mjs <PR#> --agent codex [--repo owner/repo]
//
// `gh` resolves the repo from the current directory; pass --repo to target another (e.g. the app repo).
// Zero npm deps — Node 18+ (uses global process / child_process).

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, 'cross-review.prompt.md');

// label per agent; antigravity is wired in Story 1.3.
const AGENTS = { codex: 'Codex' };

const HELP = `cross-review.mjs — advisory cross-agent second opinion on a PR diff.

Usage:
  node scripts/cross-review.mjs <PR#> --agent codex [--repo owner/repo]

Flags:
  --agent <name>     reviewer CLI: ${Object.keys(AGENTS).join('|')} (default: codex)
  --repo  owner/repo  target a specific repo (default: the repo of the current directory)
  -h, --help         show this help

Advisory only — the output never gates, blocks, or authorizes a merge.`;

function die(msg) {
  process.stderr.write(`✗ ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { pr: null, agent: 'codex', repo: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--agent') out.agent = argv[++i];
    else if (a.startsWith('--agent=')) out.agent = a.slice('--agent='.length);
    else if (a === '--repo') out.repo = argv[++i];
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

function main() {
  const { pr, agent, repo, help } = parseArgs(process.argv.slice(2));
  if (help) {
    process.stdout.write(HELP + '\n');
    process.exit(0);
  }
  if (pr === null) die('missing <PR#>. Usage: node scripts/cross-review.mjs <PR#> --agent codex');
  if (!/^\d+$/.test(String(pr))) die(`PR number must be numeric, got '${pr}'.`);
  if (!AGENTS[agent]) die(`unknown --agent '${agent}'; use ${Object.keys(AGENTS).join('|')}`);

  ensureGh();
  ensureCmd('codex', 'codex not found — install Codex CLI (https://github.com/openai/codex) and `codex login`.');

  const prompt = loadPrompt();
  const diff = ghDiff(pr, repo);
  const findings = runCodex(prompt, diff);
  if (!findings) die('codex returned no output.');
  process.stdout.write(findings + '\n');
}

main();
