#!/usr/bin/env node
// review-route.mjs — decide WHO reviews a PR, given who built it and what it risks.
//
// ── The problem this solves ───────────────────────────────────────────────────────────────────
// We now build with three families (Claude, Codex, agy) instead of one. "Run cross-review" was
// unambiguous when Claude built everything and Codex always reviewed; it is ambiguous the moment a
// Codex subagent writes the diff, because the default `--agent codex` would have **Codex reviewing
// Codex** — a same-family pass wearing the label of a cross-family one. That is a silent downgrade of
// the review layer, and nothing in the old flow would have caught it.
//
// ── Two axes of independence, and they are not interchangeable ────────────────────────────────
// WAYS-OF-WORKING has always distinguished these; this tool makes the distinction executable.
//
//   FAMILY independence  — a different model family, with different blind spots.
//                          Delivered by cross-review.mjs (codex / agy / devin).
//   CONTEXT independence — an agent that did not hold the diff in its head while writing it.
//                          Delivered by a fresh `pr-reviewer` subagent.
//
// Both matter, and the recorded evidence says the SECOND has the better track record here: the fresh
// Claude reviewer caught the emission-gate flag and the consent-boundary holes that every external
// tool missed. So "a different family reviewed it" is not a substitute for "a fresh agent read it",
// and a policy that swapped one for the other would drop the layer that has actually been catching
// money-path bugs.
//
// ── The policy ────────────────────────────────────────────────────────────────────────────────
//   1. The builder's own family NEVER reviews its own diff.
//   2. The cross-family reviewer rotates to the highest-preference family that did NOT build.
//   3. The fresh Claude reviewer is MANDATORY on HIGH tier, optional on LOW.
//
// Rule 3 is what makes this cheaper rather than merely different: a LOW-tier PR built by Codex is
// reviewed by agy plus the deterministic gate, and costs ZERO Claude review tokens. That is only safe
// because the gate got materially stronger (lint now runs in both repos, coverage is measured, the
// owed ledger is generated, a security lens exists) — WAYS-OF-WORKING's own instruction is to let the
// deterministic gate carry the repetitive checking and have the reviewer read once.
//
// Usage:
//   node scripts/review-route.mjs --builder codex --tier low  <PR#> [--repo <owner/name>]
//   node scripts/review-route.mjs --builder claude --tier high <PR#> --run
//   node scripts/review-route.mjs --builder agy --tier low --json <PR#>

import { spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { die, need, hasCmd } from './lib/cross-agent-cli.mjs';

/** Who can BUILD. `claude` is the host family; the rest are delegated/external. */
export const BUILDERS = ['claude', 'codex', 'agy', 'devin'];

/**
 * Cross-family reviewers in preference order.
 *
 * codex first: paid account, the established workhorse, strongest observed review signal.
 * agy second: genuinely separate quota pool (Gemini → GPT-OSS), so it survives a codex cap.
 * devin LAST and only as a fallback: its findings were mostly false positives on the sample it was
 * tried on, and it now carries prose duty — spending it on review would put the register at risk for
 * a weaker signal.
 */
export const CROSS_FAMILY_PREFERENCE = ['codex', 'agy', 'devin'];

/** `cross-review.mjs --agent` takes the long name for antigravity. */
const AGENT_FLAG = { codex: 'codex', agy: 'antigravity', devin: 'devin' };

/**
 * THE POLICY. Pure — no I/O, no availability probing — so it is pinned by tests and reads as one
 * decision rather than being spread through the runner.
 *
 * `available` lets the caller narrow to installed CLIs without changing the policy itself.
 */
// THROWS rather than die()s — a pure function that exits the process cannot be unit-tested, and the
// policy is the one thing here most worth pinning. The CLI validates the same values at parse time, so
// the user-facing error is unchanged.
export function planReview({ builder, tier, available = CROSS_FAMILY_PREFERENCE, forceFresh = false }) {
  if (!BUILDERS.includes(builder)) throw new Error(`unknown builder '${builder}' (expected: ${BUILDERS.join(' | ')})`);
  if (!['low', 'high'].includes(tier)) throw new Error(`tier must be low or high, got '${tier}'`);

  // Rule 1 + 2: drop the builder's own family, then take the highest-preference survivor.
  const eligible = CROSS_FAMILY_PREFERENCE.filter((f) => f !== builder && available.includes(f));
  const crossFamily = eligible[0] ?? null;

  // Rule 3. On HIGH the fresh reviewer is mandatory REGARDLESS of who built — including when Codex
  // built it, because family independence and context independence are different properties and HIGH
  // tier is where the second one has been earning its cost.
  const freshReviewer = tier === 'high' || forceFresh;

  const reasons = [];
  if (crossFamily) {
    reasons.push(
      builder === crossFamily
        ? `impossible` // unreachable; kept so a future edit that breaks rule 1 fails loudly
        : `${crossFamily} reviews because ${builder} built it — a family never reviews its own diff.`
    );
  } else {
    reasons.push(
      `NO cross-family reviewer available: ${builder} built it and no other family is installed. ` +
        `The cross-family layer is DARK for this PR — say so in the PR body rather than letting a ` +
        `missing layer look like a clean one.`
    );
  }
  reasons.push(
    freshReviewer
      ? tier === 'high'
        ? `Fresh pr-reviewer is MANDATORY on HIGH tier — context independence is the axis that has caught this repo's money-path bugs.`
        : `Fresh pr-reviewer requested explicitly on a LOW-tier PR.`
      : `No fresh pr-reviewer: LOW tier. The deterministic gate (typecheck + build + lint + suite + guards) carries the repetitive checking.`
  );

  return {
    builder,
    tier,
    crossFamily,
    crossFamilyAgentFlag: crossFamily ? AGENT_FLAG[crossFamily] : null,
    freshReviewer,
    freshReviewerModel: freshReviewer ? 'opus' : null, // review is inverted: the strongest model reads the riskiest diff
    reasons,
  };
}

/** Render the plan for a human, including the exact command to run. */
export function renderPlan(plan, pr, repo) {
  const l = [];
  l.push(`Review plan — PR #${pr}${repo ? ` (${repo})` : ''}`);
  l.push(`  built by:      ${plan.builder}`);
  l.push(`  risk tier:     ${plan.tier.toUpperCase()}`);
  l.push(`  cross-family:  ${plan.crossFamily ?? '⚠ NONE AVAILABLE'}`);
  l.push(`  fresh reviewer: ${plan.freshReviewer ? `YES (${plan.freshReviewerModel})` : 'no'}`);
  l.push('');
  for (const r of plan.reasons) l.push(`  · ${r}`);
  l.push('');
  if (plan.crossFamily) {
    l.push('  Run:');
    l.push(`    node scripts/cross-review.mjs ${pr}${repo ? ` --repo ${repo}` : ''} --agent ${plan.crossFamilyAgentFlag}`);
  }
  if (plan.freshReviewer) {
    l.push(`    use the pr-reviewer subagent on PR #${pr}   (a DIFFERENT agent than the builder)`);
  }
  return l.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  let builder = null;
  let tier = null;
  let pr = null;
  let repo = null;
  let run = false;
  let json = false;
  let forceFresh = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--builder') builder = need(argv[++i], '--builder');
    else if (a === '--tier') tier = need(argv[++i], '--tier');
    else if (a === '--repo') repo = need(argv[++i], '--repo');
    else if (a === '--run') run = true;
    else if (a === '--json') json = true;
    else if (a === '--fresh') forceFresh = true;
    else if (!a.startsWith('-') && pr === null) pr = a;
    else die(`unknown argument '${a}'`);
  }
  if (!builder) die('--builder is required (who wrote the diff): ' + BUILDERS.join(' | '));
  if (!tier) die('--tier is required (low | high)');
  if (!pr) die('a PR number is required');
  // Validate here so the CLI fails fast with the house error style; planReview throws for callers.
  if (!BUILDERS.includes(builder)) die(`unknown --builder '${builder}' (expected: ${BUILDERS.join(' | ')})`);
  if (!['low', 'high'].includes(tier)) die(`--tier must be low or high, got '${tier}'`);

  // Availability narrows the choice but never the policy — an unavailable family is reported as a
  // DARK layer rather than silently substituted.
  const available = CROSS_FAMILY_PREFERENCE.filter((f) => hasCmd(f === 'agy' ? 'agy' : f));
  const plan = planReview({ builder, tier, available, forceFresh });

  if (json) {
    writeSync(1, `${JSON.stringify({ pr, repo, ...plan }, null, 2)}\n`);
    return;
  }
  writeSync(1, `${renderPlan(plan, pr, repo)}\n`);

  if (run && plan.crossFamily) {
    const args = ['scripts/cross-review.mjs', String(pr), '--agent', plan.crossFamilyAgentFlag];
    if (repo) args.push('--repo', repo);
    process.stderr.write(`\n▶ running cross-review with ${plan.crossFamily}…\n`);
    const r = spawnSync('node', args, { stdio: 'inherit' });
    process.exit(r.status ?? 1);
  }
  if (run && !plan.crossFamily) {
    die('--run requested but no cross-family reviewer is available; the layer is dark for this PR.');
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
