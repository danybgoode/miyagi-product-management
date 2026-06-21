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
// Zero npm deps — Node 18+. CLI plumbing is shared with cross-panel.mjs via scripts/lib/cross-agent-cli.mjs.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  AGENTS,
  die,
  need,
  ensureCmd,
  ensureGh,
  checkAgyVersion,
  loadPromptBody,
  runAntigravity,
  runWithCodexFallback,
} from './lib/cross-agent-cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, 'cross-review.prompt.md');

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

// agy 1.0.7 has no stdin, so the diff rides embedded in the argv string (same framing codex gets on stdin).
function agyArgv(prompt, diff) {
  return `${prompt}\n\n## PR diff to review\n\n\`\`\`diff\n${diff}\n\`\`\`\n`;
}

// Returns { findings, fellBack[, from, to] }. The codex path auto-falls-back to Antigravity on a dead token.
function runReview(agent, prompt, diff) {
  if (agent === 'codex') {
    return runWithCodexFallback({ prompt, stdin: diff, antigravityArgv: agyArgv(prompt, diff) });
  }
  if (agent === 'antigravity') {
    return { findings: runAntigravity(agyArgv(prompt, diff)), fellBack: false };
  }
  die(`unknown --agent '${agent}'; use ${Object.keys(AGENTS).join('|')}`);
}

function buildComment(agentLabel, findings, fellBack) {
  // When codex fell back, make it unmistakable so nobody reads an Antigravity review as a Codex one.
  const header = fellBack ? `${AGENTS.antigravity} — Codex unavailable` : agentLabel;
  return `### 🔎 Cross-agent review (${header})\n\n${BANNER}\n\n---\n\n${findings}\n`;
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

  const prompt = loadPromptBody(PROMPT_PATH);
  const diff = ghDiff(pr, repo);
  const { findings, fellBack } = runReview(agent, prompt, diff);
  if (!findings) die(`${fellBack ? AGENTS.antigravity : AGENTS[agent]} returned no output.`);

  const body = buildComment(AGENTS[agent], findings, fellBack);
  if (dryRun) {
    process.stdout.write(body);
    process.stderr.write('\n(dry-run — no comment posted)\n');
  } else {
    const url = postComment(pr, repo, body);
    process.stderr.write(`✓ Advisory comment posted${url ? `: ${url}` : ''}\n`);
  }
}

main();
