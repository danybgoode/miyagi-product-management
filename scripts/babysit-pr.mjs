#!/usr/bin/env node
// babysit-pr.mjs — ADVISORY PR watch for a single open PR: retries flaky CI (re-runs failed workflow
// runs), surfaces merge conflicts, and posts ONE advisory comment summarizing what it did — never
// merges, never rebases, never touches commit-status/check-run APIs. A green/clean PR gets NO comment
// (silent no-op — same "green → no noise" discipline as smoke-triage/roadmap-hygiene).
//
// Usage:
//   node scripts/babysit-pr.mjs <PR#> --repo owner/repo [--dry-run]
//
// --dry-run is fully read-only: no `gh run rerun`, no `gh pr comment` — prints what it WOULD do.
//
// Reuse, don't rebuild: ensureGh()/die() (scripts/lib/cross-agent-cli.mjs). Zero new npm deps — Node 18+.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { ensureGh, die } from './lib/cross-agent-cli.mjs';

const BANNER =
  '🤖 **babysit-pr — advisory PR watch (Claude).** Never merges; never a required check — a plain ' +
  'comment structurally can\'t become one.';

function parseArgs(argv) {
  const out = { pr: null, repo: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--repo') out.repo = argv[++i];
    else if (a.startsWith('--repo=')) out.repo = a.slice('--repo='.length);
    else if (!a.startsWith('-') && out.pr === null) out.pr = a;
    else die(`unknown argument '${a}'`);
  }
  if (out.pr === null) die('usage: node scripts/babysit-pr.mjs <PR#> --repo owner/repo [--dry-run]');
  if (!out.repo) die('--repo owner/repo is required (babysit-pr watches PRs across 3 repos, none is a default).');
  return out;
}

function gh(args, opts = {}) {
  return spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...opts });
}

function ghJson(args) {
  const r = gh(args);
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout || 'null');
  } catch {
    return null;
  }
}

// Pure — the unit under test. No I/O. Classifies what babysit-pr should do for this PR's current state.
// checks: array of { name, conclusion, status } (from statusCheckRollup). Returns:
//   { conflict, failingChecks: [{name}], pendingChecks: [{name}], allClean }
export function decideBabysitActions({ mergeable, checks }) {
  const list = Array.isArray(checks) ? checks : [];
  const conflict = mergeable === 'CONFLICTING';
  const failingChecks = list.filter(
    (c) => c.conclusion === 'FAILURE' || c.conclusion === 'ERROR' || c.conclusion === 'TIMED_OUT'
  );
  const pendingChecks = list.filter(
    (c) => !c.conclusion && (c.status === 'IN_PROGRESS' || c.status === 'QUEUED' || c.status === 'PENDING')
  );
  return {
    conflict,
    failingChecks,
    pendingChecks,
    allClean: !conflict && failingChecks.length === 0,
  };
}

function fetchPr(pr, repo) {
  return ghJson([
    'pr',
    'view',
    String(pr),
    '--repo',
    repo,
    '--json',
    'number,state,url,mergeable,mergeStateStatus,headRefName,statusCheckRollup',
  ]);
}

// The most recent failing workflow-run ids on this PR's branch, so a failing check can be re-run.
// Degrades to [] on any gh error — a run-resolution failure for one PR must never crash the batch.
function failingRunIdsForBranch(repo, headRefName) {
  const runs = ghJson(['run', 'list', '--repo', repo, '--branch', headRefName, '--json', 'databaseId,conclusion', '-L', '20']);
  if (!runs) return [];
  return runs.filter((r) => r.conclusion === 'failure' || r.conclusion === 'timed_out').map((r) => r.databaseId);
}

function rerun(repo, runId) {
  const r = gh(['run', 'rerun', String(runId), '--failed', '--repo', repo]);
  return r.status === 0;
}

function buildComment({ conflict, retried, dryRun, stillPendingNames }) {
  const lines = [BANNER, ''];
  lines.push(conflict ? '⚠️ Merge conflict detected — needs a human rebase/resolve; not something this tool does.' : '✅ No merge conflict.');
  if (retried.length) {
    const verb = dryRun ? 'Would retry' : 'Retried';
    lines.push(`🔁 ${verb} failing CI run(s): ${retried.map((id) => `#${id}`).join(', ')}.`);
  } else {
    lines.push('🔁 No failing CI runs needed a retry.');
  }
  if (stillPendingNames.length) {
    lines.push(`⏳ Still pending: ${stillPendingNames.join(', ')}.`);
  }
  return lines.join('\n');
}

function postComment(pr, repo, body) {
  const r = gh(['pr', 'comment', String(pr), '--repo', repo, '--body-file', '-'], { input: body });
  if (r.status !== 0) die(`gh pr comment failed for #${pr}: ${(r.stderr || '').trim().split('\n')[0] || 'unknown error'}`);
  return (r.stdout || '').trim();
}

function main() {
  const { pr, repo, dryRun } = parseArgs(process.argv.slice(2));
  ensureGh();

  const info = fetchPr(pr, repo);
  if (!info) die(`gh pr view failed for #${pr} in ${repo}.`);
  if (info.state !== 'OPEN') {
    console.log(`PR #${pr} (${repo}) is ${info.state}, not OPEN — nothing to babysit.`);
    return;
  }

  const decision = decideBabysitActions({ mergeable: info.mergeable, checks: info.statusCheckRollup || [] });

  if (decision.allClean) {
    console.log(`PR #${pr} (${repo}) is clean (no conflict, no failing checks) — no comment posted.`);
    return;
  }

  const retried = [];
  if (decision.failingChecks.length) {
    const failingRunIds = failingRunIdsForBranch(repo, info.headRefName);
    for (const runId of failingRunIds) {
      if (dryRun) {
        console.log(`DRY-RUN — would rerun failed run #${runId} in ${repo}.`);
        retried.push(runId);
        continue;
      }
      const ok = rerun(repo, runId);
      if (ok) retried.push(runId);
      else console.error(`babysit-pr: rerun failed for run #${runId} in ${repo} — continuing.`);
    }
  }

  const stillPendingNames = decision.pendingChecks.map((c) => c.name).filter(Boolean);
  const body = buildComment({ conflict: decision.conflict, retried, dryRun, stillPendingNames });

  if (dryRun) {
    console.log('DRY-RUN — would post this advisory comment:\n');
    console.log(body);
    return;
  }

  const url = postComment(pr, repo, body);
  console.log(`✓ Advisory comment posted on #${pr} (${repo})${url ? `: ${url}` : ''}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) main();
