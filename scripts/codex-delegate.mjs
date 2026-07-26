#!/usr/bin/env node
// codex-delegate.mjs — hand a BOUNDED task to a Codex subagent, with model routing by task shape.
//
// ── Why this exists (Daniel's call, 2026-07-26: codex is now a paid account) ───────────────────
// Until now Codex was used for exactly one thing here: a single-pass advisory review
// (cross-review.mjs). A paid account makes it a genuine second *worker* pool, not just a second
// opinion — and that matters for a specific, measured reason: this session lost three Claude builders
// at once to a shared session cap, twice in one day. A second family with an independent quota is the
// only structural answer to that, and `LEARNINGS.md` already names session limits as "the new
// flakiness".
//
// ── The model roster, PROBED not assumed (2026-07-26) ─────────────────────────────────────────
// Model self-reports are unreliable: asked for its slug, this CLI answered "gpt-5-codex", which the
// API then REJECTS as invalid. So the roster below comes from testing which slugs the account
// actually accepts, which is the only trustworthy signal:
//
//     gpt-5.6-sol     ACCEPTED — frontier tier
//     gpt-5.6-terra   ACCEPTED — the workhorse (current config default, effort high)
//     gpt-5-codex     REJECTED (invalid_request_error)
//     anything else   REJECTED
//
// ── Routing: by RISK and BOUNDEDNESS, not by "cheaper model builds" ───────────────────────────
// This is not a guess. The 2026-07-19 Codex/Sol controlled trial recorded in
// `00-ideas/seeds/ai-adoption-maturity-benchmark.md` found routing worked when expressed as risk +
// boundedness, and that a blanket "cheaper model builds" rule did not. Its recommendation, adopted
// here verbatim: keep the frontier model on commerce authorization, money paths, production state and
// scope-merging decisions; give the workhorse narrow UI/test/audit work with explicit file ownership.
//
// Daniel's standing preference is Terra — Sol is frontier and is not the default. `--task` picks for
// you; `--model` overrides when you have a reason.
//
// ── What this tool deliberately does NOT do ───────────────────────────────────────────────────
// It does not merge, push, open PRs, or apply migrations. A delegated subagent produces a diff and a
// report; the orchestrator reviews and lands it. That preserves the rule the whole process rests on:
// **the builder never merges their own PR**, and a different family building something does not make
// it self-approving.
//
// Usage:
//   node scripts/codex-delegate.mjs --task <kind> --prompt-file <f> [--cwd <dir>] [--model <slug>]
//   node scripts/codex-delegate.mjs --task audit --prompt "find every route missing a tenant scope"
//   node scripts/codex-delegate.mjs --list-tasks

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { die, need, ensureCmd } from './lib/cross-agent-cli.mjs';

// Probed live, not assumed. Update ONLY after re-probing — a slug that has been retired fails as an
// opaque invalid_request_error, which reads like a bug in this script rather than a stale constant.
export const CODEX_MODELS = {
  frontier: 'gpt-5.6-sol',
  workhorse: 'gpt-5.6-terra',
};

/**
 * Task kinds → model + sandbox + effort.
 *
 * `sandbox` is the safety boundary and is chosen by whether the task must WRITE:
 *   read-only       — audits, reviews, investigations. Cannot modify the tree at all.
 *   workspace-write — builds. Confined to the working directory.
 * `danger-full-access` is deliberately unreachable from this tool.
 */
export const TASKS = {
  // ── Frontier: judgement that is expensive to get wrong ────────────────────────────────────
  'security-audit': {
    model: 'frontier',
    sandbox: 'read-only',
    effort: 'high',
    why: 'Authorization and money-path reasoning; a missed IDOR is the costliest defect class we ship.',
  },
  'money-path': {
    model: 'frontier',
    sandbox: 'workspace-write',
    effort: 'high',
    why: 'Payments, payouts, checkout, order state — the trial kept the frontier model on exactly this.',
  },
  'architecture': {
    model: 'frontier',
    sandbox: 'read-only',
    effort: 'high',
    why: 'Cross-cutting design and scope-merging calls, where re-deriving the wrong contract is expensive.',
  },

  // ── Workhorse: bounded, reversible, explicit file ownership ───────────────────────────────
  build: {
    model: 'workhorse',
    sandbox: 'workspace-write',
    effort: 'high',
    why: 'Mechanical implementation over a locked contract — the default for a sprint with a build contract.',
  },
  audit: {
    model: 'workhorse',
    sandbox: 'read-only',
    effort: 'high',
    why: 'Bounded codebase questions. Read-only, so it cannot "helpfully" fix what it finds.',
  },
  test: {
    model: 'workhorse',
    sandbox: 'workspace-write',
    effort: 'medium',
    why: 'Writing specs against existing behaviour; the shape is well-established here.',
  },
  ci: {
    model: 'workhorse',
    sandbox: 'workspace-write',
    effort: 'medium',
    why: 'Workflow/config edits — narrow blast radius, verified by the run itself.',
  },
};

/** Pure routing decision, so the policy is pinned by a test rather than by reading the runner. */
export function planDelegation({ task, modelOverride }) {
  const spec = TASKS[task];
  if (!spec) die(`unknown --task '${task}' (expected: ${Object.keys(TASKS).join(' | ')})`);
  const model = modelOverride || CODEX_MODELS[spec.model];
  // An override is allowed but must still be a slug we have PROBED. A typo'd slug fails deep inside
  // codex as an opaque 400, minutes later — catching it here costs nothing.
  if (modelOverride && !Object.values(CODEX_MODELS).includes(modelOverride)) {
    die(
      `--model '${modelOverride}' is not a probed slug. Known: ${Object.values(CODEX_MODELS).join(', ')}.\n` +
        `  Re-probe before adding one: \`codex exec -m <slug> 'say OK'\` — an unknown slug returns invalid_request_error.`
    );
  }
  return { model, sandbox: spec.sandbox, effort: spec.effort, why: spec.why, tier: spec.model };
}

/**
 * The contract prepended to every delegated prompt.
 *
 * A subagent from another family has none of this repo's context and none of its habits. Stating the
 * boundaries every time is cheaper than discovering a violation in review — and two of these are
 * process rules a foreign agent has no way to infer.
 */
export function buildDelegatePrompt({ task, body, plan }) {
  return [
    `You are a delegated subagent working inside an existing production codebase.`,
    `Task kind: **${task}** (${plan.why})`,
    '',
    '## Hard boundaries — these are not suggestions',
    '',
    plan.sandbox === 'read-only'
      ? '- **You are READ-ONLY.** Investigate and report. Do not modify, create or delete any file.'
      : '- You may edit files in the working directory only.',
    '- **Never** run `git push`, open a pull request, merge anything, or apply a database migration.',
    '- **Never** run a destructive or irreversible command (`rm -rf`, `db push`, `--apply`, force-push).',
    '- Do not install dependencies or change lockfiles unless the task explicitly says to.',
    '- If the task turns out to rest on a false premise, **stop and say so**. Reporting that a premise',
    '  is wrong is a successful outcome here; working around it silently is the failure this codebase',
    '  has been bitten by most often.',
    '',
    '## What to return',
    '',
    '- What you changed (or found), and where — file and line.',
    '- What you verified, and how. State plainly what you did NOT verify.',
    '- Anything you were unsure about, rather than a confident guess.',
    '',
    '---',
    '',
    body,
  ].join('\n');
}

export function buildCodexArgs({ model, sandbox, effort, prompt }) {
  return [
    'exec',
    '-m',
    model,
    '--sandbox',
    sandbox,
    '-c',
    `model_reasoning_effort="${effort}"`,
    prompt,
  ];
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--list-tasks')) {
    for (const [k, v] of Object.entries(TASKS)) {
      writeSync(1, `${k.padEnd(16)} ${CODEX_MODELS[v.model].padEnd(15)} ${v.sandbox.padEnd(16)} ${v.why}\n`);
    }
    return;
  }

  let task = null;
  let promptFile = null;
  let promptInline = null;
  let modelOverride = null;
  let cwd = process.cwd();
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--task') task = need(argv[++i], '--task');
    else if (a === '--prompt-file') promptFile = need(argv[++i], '--prompt-file');
    else if (a === '--prompt') promptInline = need(argv[++i], '--prompt');
    else if (a === '--model') modelOverride = need(argv[++i], '--model');
    else if (a === '--cwd') cwd = resolve(need(argv[++i], '--cwd'));
    else if (a === '--dry-run') dryRun = true;
    else die(`unknown argument '${a}'`);
  }

  if (!task) die('--task is required (see --list-tasks)');
  if (!promptFile && !promptInline) die('one of --prompt-file or --prompt is required');
  if (promptFile && !existsSync(promptFile)) die(`--prompt-file '${promptFile}' does not exist`);

  const body = promptInline || readFileSync(promptFile, 'utf8');
  const plan = planDelegation({ task, modelOverride });
  const prompt = buildDelegatePrompt({ task, body, plan });
  const args = buildCodexArgs({ ...plan, prompt });

  process.stderr.write(
    `codex-delegate: task=${task} model=${plan.model} (${plan.tier}) sandbox=${plan.sandbox} effort=${plan.effort}\n` +
      `  ${plan.why}\n`
  );

  if (dryRun) {
    writeSync(1, `${prompt}\n`);
    return;
  }

  ensureCmd('codex', 'codex not found — install the Codex CLI (see scripts/README.md).');
  const r = spawnSync('codex', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.error) die(`codex failed to spawn: ${r.error.message}`);
  process.exit(r.status ?? 1);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
