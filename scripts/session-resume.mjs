#!/usr/bin/env node
// session-resume.mjs — the expensive half of session continuity (README.md D1): derive the TRUE state,
// live, across all 3 repos + the intent journal, and lead with what's surprising (D3). Never trust a
// stale doc or a resumed agent's pre-kill memory — this opens with real git/gh/DB reads.
//
// Usage:
//   node scripts/session-resume.mjs [--json] [--root <path>] [--journal-limit N] [--all-migrations]
//
// --root defaults to this script's own repo root (so apps/miyagisanchez + apps/backend resolve as
// siblings) — pass --root explicitly when running from a worktree of the root repo, since apps/* are
// gitignored, repo-local directories that a `git worktree add` of the ROOT repo does NOT populate (they
// are each their OWN separate git repo, absent from the worktree's tree entirely). Running without --root
// from inside such a worktree is not a bug: it correctly degrades those two repos to "path not found",
// which is itself one of D4's named degradation classes.
//
// Derives (D3's "full derived state"): current branch, ahead/behind origin/main, dirty/untracked files,
// `git worktree list` + each worktree's own dirty state, open PRs with mergeability + CI rollup, recently
// merged PRs — across the SAME 3 repos as standup.mjs, same reasoning (README.md). Plus migration drift
// (D5): repo migration files vs the live `supabase_migrations.schema_migrations`, both directions, via
// `supabase migration list --linked` (a read-only CLI call — this script NEVER applies a migration, never
// `db push`). That check only runs against a repo that actually owns a non-empty `supabase/migrations`
// directory — in this monorepo today that's `apps/miyagisanchez` only; apps/backend and the root repo are
// skipped uneventfully (not flagged as 100% drift) rather than compared against migration files that
// simply don't live there.
//
// Anomalies first (D3): a non-main branch with no open PR (the apps/backend / feat/order-payment-capture-
// state case that motivated this epic), a dirty tree (main or any worktree), an open PR with red CI or a
// conflict, migration drift in EITHER direction. Then the last N journal lines
// (scripts/lib/session-journal.mjs, read from claude/session-journal via scripts/lib/log-branch.mjs,
// reused unchanged). Then the full derived state.
//
// Degrades, never dies (D4): every gather step below returns `{ available: false, reason }` on failure
// instead of throwing — an unauthenticated gh, a missing/unreachable repo, an empty/unfetchable journal,
// or an unavailable migration check each produce a partial brief that NAMES the gap, never a stack trace.
//
// Reuse, don't rebuild: scripts/lib/gh-rest.mjs (listPulls/getPullMergeability/getStatusRollup) — REST-
// only on purpose (GraphQL is blocked in at least one routine sandbox); scripts/lib/log-branch.mjs
// (readLogFromBranch) unchanged. Zero new npm deps — Node >=18 (spawnSync).

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { listPulls, getPullMergeability, getStatusRollup } from './lib/gh-rest.mjs';
import { readLogFromBranch } from './lib/log-branch.mjs';
import { parseJournal, lastNEntries, formatEntry, JOURNAL_BRANCH, JOURNAL_PATH } from './lib/session-journal.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(__dirname, '..');

// The SAME 3 repos + reasoning as standup.mjs (README.md: "standup.mjs's 3-repo constant — the same
// three repos, same reasoning"). `dir` is relative to --root/DEFAULT_ROOT.
export const REPOS = [
  { repo: 'danybgoode/miyagi-product-management', dir: '.' },
  { repo: 'danybgoode/miyagisanchezcommerce', dir: 'apps/miyagisanchez' },
  { repo: 'danybgoode/medusa-bonsai-backend', dir: 'apps/backend' },
];

const JOURNAL_LIMIT_DEFAULT = 10;
const RECENT_MERGED_LIMIT = 8;
const MIGRATION_TIMEOUT_MS = 60000;

function lastLine(s) {
  return (s || '').trim().split('\n').filter(Boolean).pop() || 'unknown error';
}

// ============================================================================================
// PURE derive/format seam — unit-tested without gh/git/a database (scripts/session-resume.test.mjs).
// Every function below takes already-gathered facts and makes no I/O call of its own.
// ============================================================================================

// `git worktree list --porcelain` → an array of { path, branch, detached, locked, bare }. Blocks are
// separated by a blank line; `branch refs/heads/X` → X (bare ref name, no `refs/heads/` prefix).
export function parseWorktreeListPorcelain(text) {
  const blocks = (text || '').trim().split(/\n\n+/).filter(Boolean);
  return blocks.map((block) => {
    const out = { path: null, branch: null, detached: false, locked: false, bare: false };
    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) out.path = line.slice('worktree '.length).trim();
      else if (line.startsWith('branch ')) out.branch = line.slice('branch '.length).replace('refs/heads/', '').trim();
      else if (line === 'detached') out.detached = true;
      else if (line.startsWith('locked')) out.locked = true;
      else if (line === 'bare') out.bare = true;
    }
    return out;
  });
}

// `supabase migration list --linked` prints a 3-column ASCII table (Local | Remote | Time), NOT
// machine-readable JSON even with `-o json` (confirmed live, CLI 2.98.1 — the flag is accepted but
// ignored for this subcommand), so this parses the pretty table directly. A blank Local column means
// "applied remotely, no local file"; a blank Remote column means "local file, not applied remotely" — D5
// wants BOTH directions. Header/separator rows (`Local | Remote | ...`, `---|---|---`) are skipped; a
// data row needs at least one 14-digit timestamp version in either column.
export function parseMigrationListTable(text) {
  const rows = [];
  for (const raw of (text || '').split('\n')) {
    if (!raw.includes('|')) continue;
    const parts = raw.split('|').map((s) => s.trim());
    if (parts.length < 2) continue;
    const [local, remote] = parts;
    if (/^local$/i.test(local) || /^-+$/.test(local.replace(/\s/g, ''))) continue;
    const localVer = /^\d{14}$/.test(local) ? local : null;
    const remoteVer = /^\d{14}$/.test(remote) ? remote : null;
    if (!localVer && !remoteVer) continue;
    rows.push({ local: localVer, remote: remoteVer });
  }
  // A version is APPLIED if it appears in the remote column of ANY row — not merely of its own row.
  // Two local files may share one timestamp (we have exactly that: 20260711120000 is used by both
  // `..._migrations_connector_enabled_flag.sql` and `..._seller_shell_on_sell_enabled_flag.sql`).
  // `schema_migrations` is keyed by version, so it can only ever record ONE of them, and the CLI then
  // prints the pair as two rows: `local|remote` for the recorded one and `local|<blank>` for the other.
  //
  // Reading that blank row naively as "unapplied" is FALSE — verified live 2026-07-26: the version is in
  // schema_migrations and both flag rows exist in platform_flags. Worse, it is false on the one signal
  // that has to be trustworthy: it would send someone to re-apply an already-applied migration. So a
  // version present anywhere in the remote column is applied, and the duplicate is reported as what it
  // actually is — a version collision, which is a real (if minor) repo defect worth naming once.
  const appliedVersions = new Set(rows.map((r) => r.remote).filter(Boolean));
  const localVersions = rows.map((r) => r.local).filter(Boolean);
  const localSet = new Set(localVersions);

  const seen = new Set();
  const duplicateLocalVersions = [];
  for (const v of localVersions) {
    if (seen.has(v) && !duplicateLocalVersions.includes(v)) duplicateLocalVersions.push(v);
    seen.add(v);
  }

  return {
    rows,
    unappliedLocal: [...new Set(localVersions.filter((v) => !appliedVersions.has(v)))],
    appliedNoFile: [...new Set(rows.map((r) => r.remote).filter((v) => v && !localSet.has(v)))],
    duplicateLocalVersions,
  };
}

// A statusCheckRollup (scripts/lib/gh-rest.mjs's buildStatusRollup shape) has at least one hard failure —
// same predicate babysit-pr.mjs's decideBabysitActions uses for "failingChecks".
export function rollupHasFailure(rollup) {
  return (
    Array.isArray(rollup) &&
    rollup.some((c) => c.conclusion === 'FAILURE' || c.conclusion === 'ERROR' || c.state === 'FAILURE')
  );
}

export function rollupHasPending(rollup) {
  return (
    Array.isArray(rollup) &&
    rollup.some((c) => !c.conclusion && (c.status === 'IN_PROGRESS' || c.status === 'QUEUED' || c.status === 'PENDING'))
  );
}

// THE motivating anomaly (README.md, epic Why): a non-main, non-detached branch with no open PR pointing
// at it. `openPrs` is a TRI-STATE: an array (gh reachable — even empty is a confirmed "no PRs"), or
// anything else (gh unavailable — we genuinely don't know, so this must NOT claim a false positive; that
// case is surfaced as a GAP instead, never as a confirmed anomaly).
export function decideStrayBranch({ branch, detached, openPrs }) {
  if (!branch || detached || branch === 'main') return null;
  if (!Array.isArray(openPrs)) return null;
  const hasPr = openPrs.some((pr) => pr.headRefName === branch);
  if (hasPr) return null;
  return {
    type: 'stray-branch',
    detail: `on branch \`${branch}\` with no open PR — leftover state from an earlier session (the case that motivated this epic).`,
  };
}

export function decideDirtyTree({ label, dirtyFiles }) {
  if (!dirtyFiles) return null;
  return { type: 'dirty-tree', detail: `${label}: ${dirtyFiles} uncommitted/untracked file${dirtyFiles === 1 ? '' : 's'}.` };
}

export function decideWorktreeAnomalies(worktrees) {
  return (worktrees || [])
    .filter((w) => w.dirty)
    .map((w) => ({ type: 'dirty-tree', detail: `worktree ${w.path} (branch ${w.branch || 'detached'}): uncommitted changes.` }));
}

export function decidePrAnomalies(open) {
  const out = [];
  for (const pr of open || []) {
    if (pr.mergeable === 'CONFLICTING') {
      out.push({ type: 'pr-conflict', detail: `PR #${pr.number} "${pr.title}" (${pr.url}) has a merge conflict.` });
    }
    if (pr.ciFailing) {
      out.push({ type: 'pr-ci-red', detail: `PR #${pr.number} "${pr.title}" (${pr.url}) has red CI.` });
    }
  }
  return out;
}

// The two directions of migration drift are NOT equally urgent, and treating them as equal broke this
// report's whole purpose on its first real run (2026-07-26): 36 orphans buried the 3 genuinely
// actionable anomalies, which is precisely the attention failure D3 exists to prevent.
//
//   unappliedLocal — a file exists, the live table has no such version. DANGEROUS and per-item: code
//     that reads a new column against an unmigrated table breaks a live path. Every one is listed.
//
//   appliedNoFile ("orphans") — the live table has a version with no local file. This is the EXPECTED
//     residue of our documented workflow, not a defect: WAYS-OF-WORKING records that the Supabase MCP
//     `apply_migration` stamps its OWN timestamp as the version, so the row and the filename diverge
//     unless someone realigns `schema_migrations` by hand afterwards. Most orphans are therefore old
//     applies nobody realigned — real, but historical and never actionable at session-resume time.
//     Collapsed to ONE counted line that still names the versions, so the information is kept and the
//     signal is not drowned. `--all-migrations` restores the per-item listing when that is the task.
export function decideMigrationAnomalies({ repo, unappliedLocal, appliedNoFile, duplicateLocalVersions, expandOrphans = false }) {
  const out = [];
  for (const v of unappliedLocal || []) {
    out.push({ repo, type: 'migration-unapplied', detail: `migration ${v} has a file but is NOT in the live schema_migrations table.` });
  }
  for (const v of duplicateLocalVersions || []) {
    out.push({
      repo,
      type: 'migration-duplicate-version',
      detail:
        `two or more local migration files share version ${v}. schema_migrations is keyed by version, ` +
        `so only one can ever be recorded — the others are permanently unrecordable. The effect may still ` +
        `be applied; check before re-running anything.`,
    });
  }
  const orphans = appliedNoFile || [];
  if (expandOrphans) {
    for (const v of orphans) {
      out.push({ repo, type: 'migration-orphan', detail: `schema_migrations has version ${v} applied live with no matching local file.` });
    }
  } else if (orphans.length) {
    const shown = orphans.slice(0, 5).join(', ');
    const more = orphans.length > 5 ? `, +${orphans.length - 5} more` : '';
    out.push({
      repo,
      type: 'migration-orphan-summary',
      detail:
        `${orphans.length} applied version(s) have no matching local file (${shown}${more}). ` +
        `Usually the known MCP-timestamp/filename divergence, not unshipped work — re-run with --all-migrations to list them.`,
    });
  }
  return out;
}

// Aggregates every anomaly category, across all repos + the migration check, in D3's "anomalies first"
// intent. Order: per-repo (stray branch, dirty tree, worktree dirt, PR conflict, PR CI-red), then
// migration drift. `repoStates`/`migrationResults` are the already-gathered facts (this function does no
// I/O of its own — the pure seam the contract requires).
export function buildAnomalies({ repoStates, migrationResults, expandOrphans = false }) {
  const anomalies = [];
  for (const rs of repoStates || []) {
    if (rs.git?.available) {
      const openPrs = rs.gh?.available ? rs.gh.open : undefined; // undefined → decideStrayBranch treats as "unknown"
      const stray = decideStrayBranch({ branch: rs.git.branch, detached: rs.git.detached, openPrs });
      if (stray) anomalies.push({ repo: rs.repo, ...stray });
      const dirty = decideDirtyTree({ label: rs.dir, dirtyFiles: rs.git.dirtyFiles });
      if (dirty) anomalies.push({ repo: rs.repo, ...dirty });
      for (const wt of decideWorktreeAnomalies(rs.git.worktrees)) anomalies.push({ repo: rs.repo, ...wt });
    }
    if (rs.gh?.available) {
      for (const a of decidePrAnomalies(rs.gh.open)) anomalies.push({ repo: rs.repo, ...a });
    }
  }
  for (const m of migrationResults || []) {
    if (m.available) {
      for (const a of decideMigrationAnomalies({ ...m, expandOrphans })) anomalies.push(a);
    }
  }
  return anomalies;
}

// D4: names every degraded source instead of silently dropping it. A missing repo path, an
// unauthenticated/unreachable gh, an unavailable migration check, and an empty/unfetchable journal all
// land here — distinct from `buildAnomalies`, which only reports CONFIRMED surprising states.
export function buildGaps({ repoStates, migrationResults, journalAvailable, journalReason }) {
  const gaps = [];
  for (const rs of repoStates || []) {
    if (!rs.git?.available) gaps.push(`${rs.repo}: git state unavailable — ${rs.git?.reason || 'unknown reason'}.`);
    if (!rs.gh?.available) {
      gaps.push(
        `${rs.repo}: PR/CI state unavailable — ${rs.gh?.reason || 'gh unavailable'}. Stray-branch/CI/conflict checks skipped.`
      );
    }
  }
  for (const m of migrationResults || []) {
    if (!m.available) gaps.push(`${m.repo}: migration drift check unavailable — ${m.reason || 'unknown reason'}.`);
  }
  if (!journalAvailable) {
    gaps.push(`journal unavailable — ${journalReason || 'claude/session-journal has no entries yet, or could not be fetched'}.`);
  }
  return gaps;
}

// Assembles the full report object — the SAME shape feeds both --json and the human renderer below, so
// neither can drift from the other.
export function buildReport({
  repoStates,
  migrationResults,
  journalEntries,
  journalAvailable,
  journalReason,
  journalLimit = JOURNAL_LIMIT_DEFAULT,
  expandOrphans = false,
  generatedAt,
}) {
  return {
    generatedAt: generatedAt || new Date().toISOString(),
    anomalies: buildAnomalies({ repoStates, migrationResults, expandOrphans }),
    gaps: buildGaps({ repoStates, migrationResults, journalAvailable, journalReason }),
    journal: {
      available: journalAvailable,
      reason: journalAvailable ? null : journalReason || null,
      totalEntries: (journalEntries || []).length,
      recent: lastNEntries(journalEntries || [], journalLimit),
    },
    repos: repoStates,
    migrations: migrationResults,
  };
}

// D3's exact order: (1) anomalies, (2) last N journal lines, (3) full derived state. Gaps ride right
// after anomalies — both are "read this before you trust anything below" content.
export function renderHumanReport(report) {
  const lines = [];
  lines.push(`Session resume — ${report.generatedAt}`);
  lines.push('');
  lines.push(report.anomalies.length ? `⚠ ANOMALIES (${report.anomalies.length})` : '✓ No anomalies detected.');
  for (const a of report.anomalies) {
    lines.push(`  - [${a.type}]${a.repo ? ` ${a.repo}:` : ''} ${a.detail}`);
  }

  if (report.gaps.length) {
    lines.push('');
    lines.push(`Degraded sources (${report.gaps.length}) — named, not silently dropped (D4):`);
    for (const g of report.gaps) lines.push(`  - ${g}`);
  }

  lines.push('');
  lines.push(
    `Journal — last ${report.journal.recent.length} of ${report.journal.totalEntries}${
      report.journal.available ? '' : ' (unavailable)'
    }:`
  );
  if (!report.journal.recent.length) {
    lines.push(`  (none${report.journal.available ? ' yet' : `: ${report.journal.reason || 'unavailable'}`})`);
  } else {
    for (const e of report.journal.recent) lines.push(`  ${formatEntry(e)}`);
  }

  lines.push('');
  lines.push('Full derived state:');
  for (const rs of report.repos) {
    lines.push(`- ${rs.repo} (${rs.dir}):`);
    if (rs.git?.available) {
      lines.push(
        `    branch: ${rs.git.branch}${rs.git.detached ? ' (detached)' : ''}; ` +
          `ahead ${rs.git.ahead ?? '?'} / behind ${rs.git.behind ?? '?'} vs origin/main; ` +
          `dirty files: ${rs.git.dirtyFiles ?? '?'}`
      );
      for (const w of rs.git.worktrees || []) {
        lines.push(`    worktree: ${w.path} (${w.branch || 'detached'})${w.dirty ? ' [dirty]' : ''}`);
      }
    } else {
      lines.push(`    git: unavailable (${rs.git?.reason || 'unknown'})`);
    }
    if (rs.gh?.available) {
      lines.push(`    open PRs: ${(rs.gh.open || []).length}; recently merged: ${(rs.gh.recentMerged || []).length}`);
      for (const pr of rs.gh.open || []) {
        lines.push(
          `      #${pr.number} ${pr.title} [${pr.headRefName}] mergeable=${pr.mergeable} ` +
            `ciFailing=${pr.ciFailing} ciPending=${pr.ciPending}`
        );
      }
    } else {
      lines.push(`    gh: unavailable (${rs.gh?.reason || 'unknown'})`);
    }
  }

  if (report.migrations?.length) {
    lines.push('');
    lines.push('Migration drift (D5, read-only):');
    for (const m of report.migrations) {
      if (m.available) {
        lines.push(`  - ${m.repo}: ${m.unappliedLocal.length} unapplied local file(s); ${m.appliedNoFile.length} applied-with-no-file.`);
      } else {
        lines.push(`  - ${m.repo}: unavailable (${m.reason})`);
      }
    }
  }

  return lines.join('\n');
}

// ============================================================================================
// I/O gather layer — every function degrades to `{ available: false, reason }` on failure (D4);
// none of these throw. `deps` is injectable throughout so scripts/session-resume.test.mjs can drive every
// degradation path with no real git/gh/network/DB.
// ============================================================================================

function git(args, cwd, spawn) {
  return spawn('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

function gatherRepoGit({ dir, root, existsSyncFn, spawn }) {
  const path = join(root, dir);
  if (!existsSyncFn(path)) return { available: false, reason: `path not found: ${path}` };
  if (!existsSyncFn(join(path, '.git'))) return { available: false, reason: `not a git repo: ${path}` };

  const branchRes = git(['rev-parse', '--abbrev-ref', 'HEAD'], path, spawn);
  if (branchRes.error || branchRes.status !== 0) {
    return { available: false, reason: `git rev-parse failed: ${lastLine(branchRes.stderr)}` };
  }
  const branch = branchRes.stdout.trim();
  const detached = branch === 'HEAD';

  const statusRes = git(['status', '--porcelain'], path, spawn);
  const dirtyFiles = statusRes.status === 0 ? statusRes.stdout.split('\n').filter(Boolean).length : null;

  // Best-effort, local-refs-only (no fetch — a read-only resume must not have a network side effect on
  // every invocation); a stale origin/main tracking ref just means a stale ahead/behind count, reported
  // as `?` below rather than guessed at.
  let ahead = null;
  let behind = null;
  const abRes = git(['rev-list', '--left-right', '--count', 'origin/main...HEAD'], path, spawn);
  if (abRes.status === 0) {
    const parts = abRes.stdout.trim().split(/\s+/).map(Number);
    if (parts.length === 2 && parts.every(Number.isFinite)) [behind, ahead] = parts;
  }

  const wtRes = git(['worktree', 'list', '--porcelain'], path, spawn);
  let worktrees = [];
  if (wtRes.status === 0) {
    worktrees = parseWorktreeListPorcelain(wtRes.stdout)
      .filter((w) => w.path && resolve(w.path) !== resolve(path))
      .map((w) => {
        const stRes = existsSyncFn(w.path) ? git(['status', '--porcelain'], w.path, spawn) : null;
        const dirty = stRes && stRes.status === 0 ? stRes.stdout.trim().length > 0 : null;
        return { path: w.path, branch: w.branch, detached: w.detached, dirty };
      });
  }

  return { available: true, path, branch, detached, ahead, behind, dirtyFiles, worktrees };
}

function gatherRepoGh({ repo, listPullsFn, mergeFn, rollupFn }) {
  const all = listPullsFn({ repo, state: 'all', perPage: 50 });
  if (all === null) return { available: false, reason: 'gh unavailable, unauthenticated, or the repo could not be reached' };

  const open = all.filter((p) => p.state === 'OPEN');
  const recentMerged = all.filter((p) => p.state === 'MERGED').slice(0, RECENT_MERGED_LIMIT);

  const openDetailed = open.map((p) => {
    const mergeable = mergeFn({ repo, number: p.number });
    const rollup = p.headSha ? rollupFn({ repo, sha: p.headSha }) : null;
    return {
      number: p.number,
      title: p.title,
      url: p.url,
      headRefName: p.headRefName,
      mergeable,
      ciAvailable: rollup !== null,
      ciFailing: rollupHasFailure(rollup),
      ciPending: rollupHasPending(rollup),
    };
  });

  return { available: true, open: openDetailed, recentMerged };
}

function gatherMigrationDrift({ root, existsSyncFn, readdirSyncFn, spawn }) {
  const results = [];
  for (const r of REPOS) {
    const migDir = join(root, r.dir, 'supabase', 'migrations');
    if (!existsSyncFn(migDir)) continue; // no migration files owned here — not this repo's concern
    let files;
    try {
      files = readdirSyncFn(migDir).filter((f) => f.endsWith('.sql'));
    } catch {
      files = [];
    }
    if (!files.length) continue;

    const cwd = join(root, r.dir);
    const res = spawn('supabase', ['migration', 'list', '--linked'], {
      cwd,
      encoding: 'utf8',
      timeout: MIGRATION_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (res.error || res.status !== 0) {
      results.push({
        repo: r.repo,
        available: false,
        reason: res.error ? res.error.message : `supabase migration list failed: ${lastLine(res.stderr)}`,
      });
      continue;
    }
    results.push({ repo: r.repo, available: true, fileCount: files.length, ...parseMigrationListTable(res.stdout) });
  }
  return results;
}

function gatherJournal({ root, readLogFromBranchFn }) {
  const content = readLogFromBranchFn({ cwd: root, branch: JOURNAL_BRANCH, path: JOURNAL_PATH });
  if (!content) {
    return {
      available: false,
      reason: 'claude/session-journal has no entries yet, or could not be fetched (network/auth)',
      entries: [],
    };
  }
  return { available: true, reason: null, entries: parseJournal(content) };
}

// ============================================================================================
// CLI wiring
// ============================================================================================

export function parseArgs(argv) {
  const out = { json: false, root: DEFAULT_ROOT, journalLimit: JOURNAL_LIMIT_DEFAULT, expandOrphans: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--root') out.root = resolve(argv[++i]);
    else if (a === '--journal-limit') out.journalLimit = Number(argv[++i]);
    else if (a === '--all-migrations') out.expandOrphans = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`unknown argument '${a}'`);
  }
  return out;
}

function help() {
  return [
    'Usage: node scripts/session-resume.mjs [--json] [--root <path>] [--journal-limit N] [--all-migrations]',
    '',
    'Derives live state across the 3 repos (git/gh/migrations) and the session journal; leads with',
    'anomalies (D3). Degrades, never dies (D4): an unauthenticated gh, a missing repo, an empty',
    'journal, or an unavailable DB read each produce a partial brief naming the gap, never a crash.',
  ].join('\n');
}

// `deps` fully injectable (mirrors cross-agent-cli.mjs's runWithCodexFallback pattern) — every gather
// function above already degrades internally, so main() itself needs no extra try/catch to satisfy D4;
// the outer try/catch below is a last-resort net for a truly unexpected throw (e.g. a permissions error
// on a repo path), which still must produce a partial brief, never an uncaught stack trace.
export async function main(argv = process.argv.slice(2), deps = {}) {
  const {
    log = console.log,
    warn = console.error,
    existsSyncFn = existsSync,
    readdirSyncFn = readdirSync,
    spawn = spawnSync,
    listPullsFn = listPulls,
    mergeFn = getPullMergeability,
    rollupFn = getStatusRollup,
    readLogFromBranchFn = readLogFromBranch,
    now,
  } = deps;

  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    warn(`✗ ${e.message}\n\n${help()}`);
    return 1;
  }
  if (args.help) {
    log(help());
    return 0;
  }

  try {
    const repoStates = REPOS.map((r) => ({
      repo: r.repo,
      dir: r.dir,
      git: gatherRepoGit({ dir: r.dir, root: args.root, existsSyncFn, spawn }),
      gh: gatherRepoGh({ repo: r.repo, listPullsFn, mergeFn, rollupFn }),
    }));

    const migrationResults = gatherMigrationDrift({ root: args.root, existsSyncFn, readdirSyncFn, spawn });
    const journal = gatherJournal({ root: args.root, readLogFromBranchFn });

    const report = buildReport({
      repoStates,
      migrationResults,
      journalEntries: journal.entries,
      journalAvailable: journal.available,
      journalReason: journal.reason,
      journalLimit: args.journalLimit,
      expandOrphans: args.expandOrphans,
      generatedAt: (now || new Date()).toISOString(),
    });

    log(args.json ? JSON.stringify(report, null, 2) : renderHumanReport(report));
    return 0;
  } catch (e) {
    // Last-resort net (D4: degrade, never die) — should be unreachable given every gather function above
    // already catches its own failure mode, but a resume tool must never stack-trace on a bad day.
    warn(`⚠ session-resume: unexpected error, showing a partial/empty brief instead of crashing: ${e.message}`);
    log(
      renderHumanReport(
        buildReport({
          repoStates: [],
          migrationResults: [],
          journalEntries: [],
          journalAvailable: false,
          journalReason: `session-resume crashed before the journal could be read: ${e.message}`,
        })
      )
    );
    return 0;
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().then((code) => {
    process.exitCode = code;
  });
}
