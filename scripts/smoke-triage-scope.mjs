#!/usr/bin/env node
// smoke-triage-scope.mjs — may the nightly smoke-triage routine merge THIS diff by itself?
//
// WHY THIS EXISTS AS A FILE, AND NOT AS A PARAGRAPH IN THE ROUTINE PROMPT.
//
// Routine B (scripts/routines/smoke-triage.prompt.md) used to stop at a draft PR. Three nights
// running — 2026-08-15/16/17 — it produced a draft nobody merged, and the 08-16 and 08-17 drafts
// independently re-diagnosed the SAME defect from scratch. The nightly stayed red the whole time.
// A fixer that cannot land its fix is a fixer that re-does its work every night.
//
// So the routine now merges. The question that decides everything is "merge WHAT?", and that
// question must not be answered by a model reading its own diff at 10:00 UTC with nobody watching.
// It is a deterministic, reviewable predicate, so it lives here with node:test coverage — the same
// reasoning that moved the prod-smoke checks out of a cloud text box and into scripts/prod-smoke.mjs.
//
// TWO INDEPENDENT GATES, BOTH MUST PASS.
//
//   1. SURFACE — every changed path is test scaffolding (e2e/, the Playwright config, the browser
//      smoke workflow). A fix to app/, lib/ or components/ changes what customers get and stays a
//      draft for a human, no matter how green it is. This is Daniel's call, 2026-08-17.
//
//   2. NO WEAKENING — the diff must not make the smoke pass by asking it to test less. This is the
//      one that actually needs machinery. "Never weaken the test" has been written in the routine
//      prompt since it was created, and a prompt rule is a request; deleting a red spec is the
//      single cheapest way for any agent to turn a red nightly green, and it looks like a fix in
//      every summary it would write about itself. So it is checked against the patch, not asked for.
//
// Gate 2 deliberately blocks things that are RIGHT but not the routine's to decide. Retiring the
// zero-photo gallery spec on 2026-08-17 was correct — and it was correct because the product owner
// said so, after it had been surfaced to him twice. Blocked-to-draft is not "rejected"; it is the
// same PR, waiting for the person whose call it is. That is the intended cost.
//
// A blocked diff is NEVER discarded and never silently trimmed to fit. The routine opens the draft
// PR exactly as before and pings. Degrading to yesterday's behaviour is the correct failure mode.
//
//   node scripts/smoke-triage-scope.mjs --repo <owner/name> --pr <n>   # decide a live PR
//   node scripts/smoke-triage-scope.mjs --json                          # machine-readable
//
// Exit codes are three-valued (AGENTS.md — "three states, never two"):
//   0  auto-merge ALLOWED
//   1  auto-merge BLOCKED — open/keep the draft PR and ping (a normal, expected outcome)
//   2  UNDECIDABLE — the diff could not be read at all. Never treat this as either answer.

import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

// ── Gate 1: the test surface ──────────────────────────────────────────────────────────────────
//
// An allow-list, not a deny-list. A deny-list of "app code" silently admits every directory nobody
// thought of — including ones that do not exist yet. Whatever is not named here is app code by
// default, which is the safe direction to be wrong in for a gate that ends in a production deploy.
export const TEST_SURFACE = [
  { prefix: 'e2e/', why: 'the Playwright specs and their helpers — the smoke itself' },
  { exact: 'playwright.config.ts', why: 'projects, timeouts, workers — how the smoke runs' },
  { exact: '.github/workflows/browser-smoke.yml', why: 'the nightly detector workflow' },
  { prefix: 'scripts/browser-smoke-', why: 'the smoke reporting helpers' },
];

/**
 * Normalize before matching, because `e2e/../app/page.tsx` starts with `e2e/` and is app code.
 * Returns null for anything that is not a plain repo-relative forward-slash path — absolute paths,
 * traversal that escapes the root, backslashes, empty segments. Null is REJECTED by the caller
 * rather than skipped: an unparseable path is a path we did not check, not a path that is fine.
 */
export function normalizeRepoPath(raw) {
  if (typeof raw !== 'string') return null;
  const path = raw.trim();
  if (!path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) return null;
  const out = [];
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') return null; // `a//b` and `./a` are not shapes git emits
    if (segment === '..') return null;                   // never resolve — just refuse
    out.push(segment);
  }
  return out.join('/');
}

export function isTestSurface(rawPath) {
  const path = normalizeRepoPath(rawPath);
  if (path === null) return false;
  return TEST_SURFACE.some((rule) =>
    rule.exact ? path === rule.exact : path.startsWith(rule.prefix));
}

// ── Gate 2: weakening detection ───────────────────────────────────────────────────────────────
//
// Each pattern below is a way to make a red suite green without fixing anything. They are matched
// against ADDED lines (`+`) in the unified diff, except DELETED_ASSERTION which is the mirror case:
// an assertion that used to run and now does not.
//
// `test.slow()` is deliberately absent. Raising a timeout budget is a legitimate fix the repo has
// shipped (#349) and blocking it would make the routine useless for the most common real failure.
// Timeouts are also self-correcting: a budget that is too generous still fails when the thing is
// genuinely broken. Skips and deletions are not — they stop asking the question entirely.
export const WEAKENING_PATTERNS = [
  { id: 'skip-added', re: /(^|[^\w.])test\.skip\s*\(/, why: 'test.skip() added — the spec stops running' },
  { id: 'describe-skip-added', re: /(^|[^\w.])(test|describe)\.describe\.skip\s*\(|(^|[^\w.])describe\.skip\s*\(/, why: 'a whole describe block skipped' },
  { id: 'fixme-added', re: /(^|[^\w.])test\.fixme\s*\(/, why: 'test.fixme() added — the spec is marked as expected-to-fail' },
  { id: 'only-added', re: /(^|[^\w.])(test|describe)\.only\s*\(/, why: 'test.only() added — every OTHER spec in the file stops running' },
  { id: 'serial-added', re: /mode:\s*['"`]serial['"`]/, why: 'serial mode added — a failure there logs as "did not run", which reads as green-by-skip' },
];

/** An assertion that ran yesterday and does not run today. */
export const DELETED_ASSERTION = {
  id: 'assertion-deleted',
  re: /(^|[^\w.])(expect|expectListingFound)\s*\(/,
  why: 'an assertion was removed — the spec now tests less than it did',
};

/**
 * Read one file's unified-diff patch for weakenings.
 *
 * A file with NO patch is not a clean file. GitHub omits `patch` for binary blobs and for diffs
 * past its size cap, and "I could not read the diff" must not resolve to "the diff is fine" —
 * that is the confident-empty-result failure AGENTS.md rule 5 bans. It returns `readable: false`,
 * which the caller turns into UNDECIDABLE, not into a pass.
 */
export function inspectPatch(file) {
  const findings = [];
  const patch = file?.patch;
  if (typeof patch !== 'string' || patch === '') {
    // A pure rename/mode change legitimately carries no patch and changes no behaviour.
    if (file?.status === 'renamed' && (file?.changes ?? 0) === 0) return { readable: true, findings };
    return { readable: false, findings };
  }

  if (file.status === 'removed') {
    findings.push({ id: 'file-deleted', path: file.filename, why: 'a spec file was deleted outright' });
  }

  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue; // headers, not content
    const body = line.slice(1);
    if (line.startsWith('+')) {
      for (const p of WEAKENING_PATTERNS) {
        if (p.re.test(body)) findings.push({ id: p.id, path: file.filename, why: p.why, line: body.trim() });
      }
    } else if (line.startsWith('-')) {
      if (DELETED_ASSERTION.re.test(body)) {
        findings.push({ id: DELETED_ASSERTION.id, path: file.filename, why: DELETED_ASSERTION.why, line: body.trim() });
      }
    }
  }
  return { readable: true, findings };
}

// ── The decision ──────────────────────────────────────────────────────────────────────────────

/**
 * @param {Array<{filename: string, status?: string, patch?: string, changes?: number}>} files
 *        exactly the shape of `GET /repos/{owner}/{repo}/pulls/{n}/files`.
 * @returns {{verdict: 'allow'|'block'|'undecidable', exitCode: 0|1|2, blockers: object[], surface: string[], appCode: string[]}}
 */
export function decideAutoMerge(files) {
  // An empty file list is UNDECIDABLE, never `allow`. A PR with no files is not a safe PR; it is a
  // symptom — a bad ref, a failed API call, a truncated page. "Exited green having run nothing"
  // is the exact failure this repo deletes scripts for.
  if (!Array.isArray(files) || files.length === 0) {
    return {
      verdict: 'undecidable', exitCode: 2, surface: [], appCode: [],
      blockers: [{ id: 'no-files', why: 'the PR reported zero changed files — the diff was not read, so nothing was checked' }],
    };
  }

  const surface = [];
  const appCode = [];
  const blockers = [];
  let undecidable = false;

  for (const file of files) {
    const path = file?.filename;
    if (isTestSurface(path)) surface.push(path);
    else {
      appCode.push(path ?? String(path));
      blockers.push({
        id: 'outside-test-surface', path: path ?? String(path),
        why: 'not test scaffolding — a change here reaches production, so a human reads it',
      });
    }

    const { readable, findings } = inspectPatch(file);
    if (!readable) {
      undecidable = true;
      blockers.push({ id: 'patch-unreadable', path, why: 'GitHub returned no patch for this file (binary or too large) — it could not be checked' });
    }
    blockers.push(...findings);
  }

  if (undecidable) return { verdict: 'undecidable', exitCode: 2, blockers, surface, appCode };
  if (blockers.length > 0) return { verdict: 'block', exitCode: 1, blockers, surface, appCode };
  return { verdict: 'allow', exitCode: 0, blockers: [], surface, appCode };
}

export function formatReport(decision) {
  const lines = [];
  const headline = {
    allow: 'ALLOW — auto-merge permitted: test scaffolding only, nothing weakened',
    block: 'BLOCK — open/keep the DRAFT PR and ping Daniel',
    undecidable: 'UNDECIDABLE — the diff could not be fully read; treat as BLOCK and say so',
  }[decision.verdict];
  lines.push(`smoke-triage scope: ${headline}`);
  if (decision.surface.length) lines.push(`  test surface (${decision.surface.length}): ${decision.surface.join(', ')}`);
  if (decision.appCode.length) lines.push(`  app code (${decision.appCode.length}): ${decision.appCode.join(', ')}`);
  for (const b of decision.blockers) {
    lines.push(`  ✗ [${b.id}]${b.path ? ` ${b.path}` : ''} — ${b.why}${b.line ? `\n      ${b.line}` : ''}`);
  }
  return lines.join('\n');
}

// ── I/O shell ─────────────────────────────────────────────────────────────────────────────────
//
// REST only, via gh. `gh pr view --json` reaches GraphQL internally, which is blocked in at least
// one live routine sandbox (scripts/lib/gh-rest.mjs records the same constraint).

async function fetchFiles(repo, pr, deps) {
  const { execFileSync } = deps;
  const out = execFileSync('gh', ['api', '--paginate', `repos/${repo}/pulls/${pr}/files`], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  // --paginate concatenates JSON arrays; stitch them back into one.
  return JSON.parse(`[${out.trim().replace(/\]\s*\[/g, ',').replace(/^\[|\]$/g, '')}]`);
}

export async function main(argv, deps = {}) {
  const { values } = parseArgs({
    args: argv,
    options: { repo: { type: 'string' }, pr: { type: 'string' }, json: { type: 'boolean', default: false } },
    allowPositionals: false,
  });
  if (!values.repo || !values.pr) {
    process.stderr.write('usage: smoke-triage-scope.mjs --repo <owner/name> --pr <number> [--json]\n');
    return 2;
  }

  let files;
  try {
    const { execFileSync } = await import('node:child_process');
    files = await fetchFiles(values.repo, values.pr, { execFileSync, ...deps });
  } catch (error) {
    // Could not ask. That is state 2 — not "nothing to worry about".
    const message = `UNDECIDABLE — could not read PR ${values.repo}#${values.pr}: ${error.message}`;
    process.stdout.write(values.json ? `${JSON.stringify({ verdict: 'undecidable', error: message })}\n` : `${message}\n`);
    return 2;
  }

  const decision = decideAutoMerge(files);
  process.stdout.write(values.json ? `${JSON.stringify(decision, null, 2)}\n` : `${formatReport(decision)}\n`);
  return decision.exitCode;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
