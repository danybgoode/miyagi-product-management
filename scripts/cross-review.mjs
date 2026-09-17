#!/usr/bin/env node
// cross-review.mjs — an ADVISORY cross-agent second opinion on a pull-request diff.
//
// Pipes `gh pr diff <PR#>` into a DIFFERENT model family's CLI (Codex or Antigravity) with the shared prompt
// (scripts/cross-review.prompt.md = the five AGENTS rules + WAYS single-pass discipline) and prints the
// findings. It is dev tooling, not app code, and it is deliberately:
//   • SINGLE-PASS — one read, no debate / iterate-to-convergence loop (our #1 token sink, out of scope).
//   • REQUIRED ON EVERY PR (2026-07-14 policy flip) — its findings must be fixed, or answered on the PR,
//     before merge. It still never approves or merges: CI + the risk-tier rule are the merge authority,
//     and HIGH-tier PRs also get a fresh `pr-reviewer` pass. Enforcement is by convention, not by a
//     required check — this runs locally, since a CI runner has no codex/agy auth.
//
// Usage:
//   node scripts/cross-review.mjs [PR#] --agent codex|antigravity [--repo owner/repo] [--force] [--dry-run]
//     [--skip-trivial] [--min-lines N]
//
// --skip-trivial is the CI cost guard: skip (exit 0, no comment) when the PR is docs-only or under
// --min-lines (default 10) changed lines, so "every PR" doesn't pay for a review on a typo. Off by default
// so the manual command always reviews.
//
// <PR#> is OPTIONAL: with none, the command resolves the open PR for the CURRENT branch (so the FIRST run
// reviews the right diff, no rerun) and refuses a stale local HEAD unless --force. An explicit <PR#> still
// overrides (and bypasses the stale guard — the deliberate escape hatch).
//
// Default posts the findings as a labeled, clearly-advisory PR comment; --dry-run prints instead.
// `gh` resolves the repo from the current directory; pass --repo to target another (e.g. the app repo).
// Zero npm deps — Node 18+. CLI plumbing is shared with cross-panel.mjs via scripts/lib/cross-agent-cli.mjs.
//
// The diff is passed through stripGeneratedFileDiffs() before it reaches the reviewer CLI — a large
// auto-generated file (a committed package-lock.json, ~12–19K lines) blew Codex's context window live
// (deploy-pipeline-tuning epic, 2026-07-11); the reviewer still sees THAT the file changed, just not its
// (huge, low-signal) content. See that function's header comment in cross-agent-cli.mjs for the full story.
// --include-lockfiles opts back into the raw, unstripped diff for the rare case of reviewing a hand-edited
// lockfile itself.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  AGENTS,
  die,
  need,
  ensureCmd,
  ensureGh,
  checkAgyVersion,
  loadPromptBody,
  runAntigravity,
  runVibe,
  runClaudeCode,
  AGENT_BIN,
  runDevin,
  runWithCodexFallback,
  resolveCurrentPr,
  currentHeadSha,
  decideHeadGuard,
  decideTrivialSkip,
  stripGeneratedFileDiffs,
  shortSha,
} from './lib/cross-agent-cli.mjs';
import {
  assertReviewOutput,
  cliVersionNote,
  decideSecurityPass,
  parseReviewConfig,
  isReReview,
  postReviewStatus,
  reviewMarker,
  RE_REVIEW_NOTE,
} from './lib/review-guard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, 'cross-review.prompt.md');
// `--lens security` swaps the prompt only. Everything else — agent selection, the codex→agy fallback,
// --skip-trivial, the version pin, the comment shape — is untouched, so the lens cannot regress the
// rail that reviews every other PR.
const SECURITY_PROMPT_PATH = join(__dirname, 'cross-review.security.prompt.md');
export const LENSES = ['security'];

const BANNER =
  '> **Cross-agent review — every finding is fixed, or answered on this PR, before merge. This does not authorize one.** ' +
  'CI and the risk-tier merge rule remain the only merge authority. A fresh `pr-reviewer` pass covers context independence; ' +
  'this is the family-independence pass: one single-pass read by a model family that did not build the diff.';

const HELP = `cross-review.mjs — the required cross-agent review of a PR diff (run on EVERY PR).

Usage:
  node scripts/cross-review.mjs [PR#] --agent codex|antigravity [--repo owner/repo] [--force] [--dry-run]

[PR#] is optional — omit it to review the open PR for the CURRENT branch.

Flags:
  --agent <name>       reviewer CLI: ${Object.keys(AGENTS).join('|')} (default: codex).
                       codex→antigravity auto-fall-back on a dead codex token; when BOTH codex and
                       agy are quota-capped, use --agent devin (a third, independent quota pool).
  --repo  owner/repo   target a specific repo (default: the repo of the current directory)
  --force              proceed even when local HEAD differs from the resolved PR head (auto-resolve only)
  --skip-trivial       skip (exit 0, no comment) when the PR is docs-only or under --min-lines changed lines
  --min-lines N        trivial-diff threshold for --skip-trivial (default: 10)
  --include-lockfiles  send the RAW diff, including generated files (package-lock.json, yarn.lock, etc.) —
                       normally stripped to a placeholder to avoid blowing the reviewer's context window
  --dry-run            print the comment instead of posting it (alias: --no-comment)
  -h, --help           show this help

With no [PR#], resolves the branch's PR via \`gh pr view\` and refuses a stale local HEAD unless --force.
An explicit [PR#] overrides resolution and bypasses the stale guard.

Mandatory on every PR (WAYS-OF-WORKING → Review & merge). Its findings must be resolved or answered
before merge; the output itself never approves, merges, or authorizes anything.`;

function parseArgs(argv) {
  const out = {
    pr: null,
    agent: 'codex',
    repo: null,
    force: false,
    dryRun: false,
    skipTrivial: false,
    lens: null,
    minLines: 10,
    includeLockfiles: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--dry-run' || a === '--no-comment') out.dryRun = true;
    else if (a === '--force') out.force = true;
    else if (a === '--skip-trivial') out.skipTrivial = true;
    else if (a === '--include-lockfiles') out.includeLockfiles = true;
    else if (a === '--min-lines') out.minLines = parseMinLines(need(argv[++i], '--min-lines'));
    else if (a.startsWith('--min-lines=')) out.minLines = parseMinLines(a.slice('--min-lines='.length));
    else if (a === '--lens') out.lens = need(argv[++i], '--lens');
    else if (a.startsWith('--lens=')) out.lens = a.slice('--lens='.length);
    else if (a === '--agent') out.agent = need(argv[++i], '--agent');
    else if (a.startsWith('--agent=')) out.agent = a.slice('--agent='.length);
    else if (a === '--repo') out.repo = need(argv[++i], '--repo');
    else if (a.startsWith('--repo=')) out.repo = a.slice('--repo='.length);
    else if (!a.startsWith('-') && out.pr === null) out.pr = a;
    else die(`unknown argument '${a}' (try --help)`);
  }
  // Validate the lens at parse time so the CLI fails fast with a clear message, matching every other
  // bad-argument path here. promptPathFor throws for programmatic callers.
  if (out.lens && !LENSES.includes(out.lens)) {
    die(`unknown --lens '${out.lens}' (expected: ${LENSES.join(' | ')})`);
  }
  return out;
}

function parseMinLines(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) die(`--min-lines must be a non-negative integer, got '${v}'.`);
  return n;
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

/** Comment bodies already on the PR, for re-review convergence. [] on any failure (degrade to first pass). */
/** The PR body, for the `risk: high` half of the security trigger. '' on any failure. */
function ghBody(pr, repo) {
  const args = ['pr', 'view', String(pr), '--json', 'body'];
  if (repo) args.push('--repo', repo);
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) return '';
  try {
    return JSON.parse(r.stdout || '{}').body || '';
  } catch {
    return '';
  }
}

/** The project's review config. A missing/invalid file is FATAL: defaulting it would silently mean "never run the security lens". */
function loadReviewConfig() {
  try {
    return parseReviewConfig(JSON.parse(readFileSync(join(__dirname, 'review-config.json'), 'utf8')));
  } catch (e) {
    die(`scripts/review-config.json is missing or invalid (${e.message}). It decides which PRs get the security lens — a default would silently mean "never".`);
  }
}

/** The PR head sha, pinned before the review runs. null when gh cannot say — never a guess. */
function ghHeadSha(pr, repo) {
  const args = ['pr', 'view', String(pr), '--json', 'headRefOid'];
  if (repo) args.push('--repo', repo);
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout || '{}').headRefOid || null;
  } catch {
    return null;
  }
}

function ghComments(pr, repo) {
  const args = ['pr', 'view', String(pr), '--json', 'comments'];
  if (repo) args.push('--repo', repo);
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) return [];
  try {
    return (JSON.parse(r.stdout || '{}').comments || []).map((c) => c.body || '');
  } catch {
    return [];
  }
}

// Changed-file stats for the cost guard: [{ path, additions, deletions }, …]. Returns [] on any failure so
// the guard degrades to "not trivial" (review runs) rather than silently skipping on a transient gh hiccup.
function ghFiles(pr, repo) {
  const args = ['pr', 'view', String(pr), '--json', 'files'];
  if (repo) args.push('--repo', repo);
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) return [];
  try {
    return JSON.parse(r.stdout || '{}').files || [];
  } catch {
    return [];
  }
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
  if (agent === 'devin') {
    // Devin takes the whole thing in a prompt FILE (no argv cap), so it reuses agy's embedded-diff framing.
    return { findings: runDevin(agyArgv(prompt, diff)), fellBack: false };
  }
  if (agent === 'vibe') {
    return { findings: runVibe(agyArgv(prompt, diff)), fellBack: false };
  }
  if (agent === 'claude') {
    // stdin, like codex — same prompt body, so the pass is comparable.
    return { findings: runClaudeCode(prompt, diff), fellBack: false };
  }
  die(`unknown --agent '${agent}'; use ${Object.keys(AGENTS).join('|')}`);
}

// Records the selected reviewer's model without leaking one CLI's configuration into another's label.
// Codex reads its local config; Vibe exposes an active-model env override but otherwise owns its default.
// Returns null when Codex cannot be determined — a missing attribution is safer than a false one.
export function resolveReviewModel(agent, fellBack, deps = {}) {
  const { env = process.env, readCfg = defaultReadCodexConfig } = deps;
  if (fellBack || agent === 'antigravity') return env.AGY_MODEL || 'agy default pair';
  if (agent === 'devin') return 'devin default';
  if (agent === 'vibe') return env.VIBE_MODEL || env.VIBE_ACTIVE_MODEL || 'vibe configured default';
  if (env.CODEX_MODEL) return env.CODEX_MODEL;
  const cfg = readCfg();
  const m = cfg && /^\s*model\s*=\s*"([^"]+)"/m.exec(cfg);
  if (!m) return null;
  const effort = cfg && /^\s*model_reasoning_effort\s*=\s*"([^"]+)"/m.exec(cfg);
  return effort ? `${m[1]} (effort: ${effort[1]})` : m[1];
}

function defaultReadCodexConfig() {
  try {
    return readFileSync(join(homedir(), '.codex', 'config.toml'), 'utf8');
  } catch {
    return null;
  }
}

// THROWS rather than die()s: a pure function that exits the process cannot be unit-tested, and
// silently defaulting to the general prompt would be the worst failure available here — the operator
// would believe a security pass ran while a general review actually did. The CLI still validates at
// parse time (below), so the user-facing error is unchanged.
export function promptPathFor(lens) {
  if (!lens) return PROMPT_PATH;
  if (!LENSES.includes(lens)) throw new Error(`unknown lens '${lens}' (expected: ${LENSES.join(' | ')})`);
  return SECURITY_PROMPT_PATH;
}

// `model` is recorded because the reviewer model is MACHINE-LOCAL state that no artifact used to
// capture: CODEX_MODEL defaults to null, so cross-review inherits whatever ~/.codex/config.toml says.
// If that config drifts, review strength changes family and nothing notices. Naming it makes the
// review auditable; when it genuinely cannot be resolved we say so rather than printing a default
// that may be wrong.
export function buildComment(agentLabel, findings, fellBack, { lens = null, model = null, version = null, reReview = false, securityOwed = null } = {}) {
  // When codex fell back, make it unmistakable so nobody reads an Antigravity review as a Codex one.
  const header = fellBack ? `${AGENTS.antigravity} — Codex unavailable` : agentLabel;
  const title = lens
    ? `### 🔐 Cross-agent review — ${lens} lens (${header})`
    : `### 🔎 Cross-agent review (${header})`;
  const attribution = `\n\n_Model: ${model || 'unrecorded — resolve failed'}${version ? ` · ${version}` : ''}._`;
  // A security pass that reads as a clean bill of health is worse than none. State the limit inline.
  const limit = lens === 'security'
    ? `\n\n> **Scope of this pass:** one advisory, single-pass read by a different model family. It is **not** static analysis, not exhaustive, and not a required check. A clean result here is not a security guarantee.`
    : '';
  // A general pass on a security-path PR must not read as the whole review.
  const owed = securityOwed
    ? `\n\n> ⚠ **The security lens is OWED on this PR** (${securityOwed}) and has not run here. This general pass is not a substitute for it.`
    : '';
  const convergence = reReview ? `\n\n> **Re-review:** Blocking/Important findings only — earlier nits are deliberately not repeated.` : '';
  return `${title}\n\n${BANNER}${attribution}${limit}${owed}${convergence}\n\n---\n\n${findings}\n`;
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
  let { pr, agent, repo, force, dryRun, skipTrivial, lens, minLines, includeLockfiles, help } = parseArgs(
    process.argv.slice(2)
  );
  if (help) {
    process.stdout.write(HELP + '\n');
    process.exit(0);
  }
  if (pr !== null && !/^\d+$/.test(String(pr))) die(`PR number must be numeric, got '${pr}'.`);
  if (!AGENTS[agent]) die(`unknown --agent '${agent}'; use ${Object.keys(AGENTS).join('|')}`);

  ensureGh();

  // No <PR#> → resolve the open PR for the current branch and guard against a stale local HEAD, so the
  // FIRST run reviews the right diff. An explicit <PR#> skips both (the deliberate escape hatch).
  if (pr === null) {
    const resolved = resolveCurrentPr({ repo });
    pr = String(resolved.number);
    process.stderr.write(`Resolved PR #${pr} from branch \`${resolved.headRefName}\`.\n`);

    const localHead = currentHeadSha();
    const action = decideHeadGuard({ localHead, prHeadOid: resolved.headRefOid, force });
    if (action === 'mismatch-block') {
      die(
        `local HEAD (${shortSha(localHead)}) differs from PR #${pr} head (${shortSha(resolved.headRefOid)}) ` +
          `— push first, or pass --force (or an explicit <PR#>) to review anyway.`
      );
    }
    if (action === 'mismatch-force') {
      process.stderr.write(
        `⚠ local HEAD (${shortSha(localHead)}) differs from PR #${pr} head ` +
          `(${shortSha(resolved.headRefOid)}) — proceeding due to --force.\n`
      );
    }
  }
  // The security lens is triggered by the CHANGED PATHS, not by judgement (ways-of-work-lean-pass D7).
  // The router prints both commands, but a hand-run general pass must not silently stand in for a missing
  // security pass — so this run says so, on stderr AND in the posted comment where a PR reader sees it.
  let securityOwed = null;
  if (!lens) {
    const cfg = loadReviewConfig();
    const decision = decideSecurityPass({ files: ghFiles(pr, repo), body: ghBody(pr, repo), securityPaths: cfg.securityPaths });
    if (decision.run) {
      securityOwed = decision.reason;
      process.stderr.write(`⚠ this PR triggers the security lens (${decision.reason}) — run: node scripts/cross-review.mjs ${pr}${repo ? ` --repo ${repo}` : ''} --agent <another-family> --lens security\n`);
    }
  }

  // Cost guard (CI): bail before installing/running the reviewer when the diff is trivial/docs-only.
  if (skipTrivial) {
    const { skip, reason } = decideTrivialSkip({ files: ghFiles(pr, repo), minLines });
    if (skip) {
      process.stderr.write(`cross-review skipped (${reason}) — PR #${pr}.\n`);
      process.exit(0);
    }
  }

  // Pin the commit being reviewed BEFORE the reviewer runs: a push mid-review would otherwise move the
  // status onto a commit nobody read, and the re-review check needs to tell a new commit from a retry.
  const reviewedSha = ghHeadSha(pr, repo);

  // Post PENDING before the CLI is even checked. A version-pin mismatch or a dead token exits the
  // script BEFORE the guard runs (observed live on PR #177, where the agy pin refused the run), and an
  // ABSENT status is indistinguishable from "never ran". A stuck `pending` is visibly not-clean.
  if (!dryRun)
    postReviewStatus({ pr, repo, state: 'pending', lens, sha: reviewedSha, description: `${AGENTS[agent]} reviewing…` });

  if (agent === 'codex') {
    ensureCmd('codex', 'codex not found — install Codex CLI (https://github.com/openai/codex) and `codex login`.');
  } else if (agent === 'antigravity') {
    ensureCmd('agy', 'agy not found — install the Antigravity CLI and authenticate it, then retry.');
    checkAgyVersion();
  } else if (agent === 'vibe') {
    ensureCmd(AGENT_BIN.vibe, 'vibe not found — install the Mistral Vibe CLI (`uv tool install mistral-vibe`) and authenticate it, then retry.');
  } else if (agent === 'claude') {
    ensureCmd(AGENT_BIN.claude, 'claude not found — install Claude Code (https://claude.com/claude-code) and run `claude auth login`, then retry.');
  }

  // Re-review convergence (ways-of-work-lean-pass D8): a prior pass for THIS lens means Blocking/Important only.
  const reReview = isReReview(ghComments(pr, repo), lens, reviewedSha);
  const prompt = loadPromptBody(promptPathFor(lens)) + (reReview ? RE_REVIEW_NOTE : '');
  const rawDiff = ghDiff(pr, repo);
  let diff = rawDiff;
  if (!includeLockfiles) {
    const stripped = stripGeneratedFileDiffs(rawDiff);
    diff = stripped.diff;
    if (stripped.strippedFiles.length) {
      process.stderr.write(
        `Omitted ${stripped.strippedFiles.length} generated file diff(s) to fit the reviewer's context ` +
          `window: ${stripped.strippedFiles.join(', ')} (pass --include-lockfiles to send the raw diff).\n`
      );
    }
  }
  const { findings, fellBack } = runReview(agent, prompt, diff);

  // THE GUARD (ways-of-work-lean-pass D9). With ONE external pass, a CLI that exits 0 with nothing to say
  // reads exactly like a clean review and nothing contradicts it. A structureless reply FAILS the run and
  // fails the PR's `cross-review/<lens>` status rather than posting a comment that looks like a pass.
  const verdict = assertReviewOutput(findings);
  if (!verdict.ok) {
    const who = fellBack ? AGENTS.antigravity : AGENTS[agent];
    if (!dryRun) {
      const st = postReviewStatus({ pr, repo, state: 'failure', lens, sha: reviewedSha, description: `${who}: ${verdict.reason}` });
      process.stderr.write(st.posted ? `✗ marked cross-review/${lens || 'general'} FAILED on PR #${pr}.\n` : `✗ could not post the failing status (${st.detail}).\n`);
    }
    // NEVER destroy a reply the run paid for: a false reject would otherwise cost a full re-run, which is
    // exactly how a guard trains people to bypass it.
    process.stderr.write(
      `\n───── ${who}'s full reply, rejected by the output guard ─────\n${findings || '(empty)'}\n───── end of reply ─────\n`
    );
    die(`${who} did not return a review: ${verdict.reason}`);
  }

  // Resolve the model actually used. CODEX_MODEL wins when set; otherwise codex inherits its config
  // default, which we read rather than guess. agy/devin report their own via the runner.
  const body = buildComment(AGENTS[agent], findings, fellBack, {
    lens,
    model: resolveReviewModel(agent, fellBack),
    version: cliVersionNote(fellBack ? 'antigravity' : agent),
    reReview,
    securityOwed,
  }) + reviewMarker({ lens, sha: reviewedSha });
  if (dryRun) {
    process.stdout.write(body);
    process.stderr.write('\n(dry-run — no comment posted)\n');
  } else {
    const url = postComment(pr, repo, body);
    process.stderr.write(`✓ Review comment posted${url ? `: ${url}` : ''}\n`);
    const st = postReviewStatus({ pr, repo, state: 'success', lens, sha: reviewedSha,
      description: `review produced by ${AGENTS[agent]} (${verdict.reason}) — not a verdict` });
    process.stderr.write(st.posted ? `✓ cross-review/${lens || 'general'} status: success.\n` : `⚠ review posted but its status did not (${st.detail}).\n`);
  }
}

// Guarded like every other script here (build-order, standup, prose-draft…). It used to call main()
// unconditionally, which meant merely IMPORTING this module ran a review — so its pure helpers could
// not be unit-tested at all. That is why `resolveReviewModel` and `promptPathFor` now have coverage.
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
