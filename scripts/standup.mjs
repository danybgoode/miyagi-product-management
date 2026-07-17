#!/usr/bin/env node
// standup.mjs — gathers overnight signals across the 3 repos and posts a DELTA-ONLY Telegram standup.
//
// Signals: opened/merged PRs + CI status + merge-conflict state (gh, all 3 repos), the latest
// browser-smoke.yml run (frontend repo only — the backend has no per-branch preview / no Playwright),
// BUILD-ORDER.md drift (`node scripts/build-order.mjs --check`), open-PR state, and the stale-preview
// count (`node scripts/vercel-prune-previews.mjs --age 7`, dry-run — never `--apply`). The CI-red and
// conflict signals are this standup's OWN independent read — taken after babysit-pr has had a chance
// to act (it runs earlier in the same ops-nightly routine), so a "still red" line reflects state
// post-retry, not pre-retry.
//
// Delta-only: keeps scripts/standups.log (JSONL, one snapshot per run) and diffs the current gather
// against the LAST logged snapshot. Nothing changed → posts a one-line "quiet night" message instead of
// re-dumping everything. After a successful Telegram post, commits + pushes the updated log directly to
// `main` (path-scoped) so the next run — including a fresh nightly-routine session — has yesterday's
// state to diff against.
//
// Usage:
//   node scripts/standup.mjs             # gather, diff, post to Telegram, commit+push the log
//   node scripts/standup.mjs --dry-run   # gather + print the message only — read-only for git/Telegram
//                                         # (does NOT append to standups.log, does not touch Telegram or
//                                         # git); DOES still attempt the report-registry upload (S1.3,
//                                         # scripts/lib/report-registry.mjs) so a dry run can verify the
//                                         # short-link round-trip — that upload degrades to the existing
//                                         # URL-hash link on any failure, so it's safe with no bucket
//                                         # access configured at all.
//
// Reuse, don't rebuild: ensureGh()/die() (scripts/lib/cross-agent-cli.mjs), build-order.mjs --check,
// vercel-prune-previews.mjs dry-run, the api.telegram.org sendMessage shape from
// apps/miyagisanchez/lib/telegram.ts (reimplemented standalone — this script has no access to the app's
// node_modules/TS build). Zero npm deps — Node >=20 (global fetch, spawnSync).

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { ensureGh, die } from './lib/cross-agent-cli.mjs';
import { listPulls, getPullMergeability, getStatusRollup } from './lib/gh-rest.mjs';
import { formatPrList, telegramHtmlToConsoleText } from './lib/telegram-format.mjs';
import { readLogFromBranch, appendLineToBranch } from './lib/log-branch.mjs';
import { appendStandupArtifactsToMessage, buildStandupArtifacts } from './lib/standup-deck.mjs';
import { upgradeArtifactLinks } from './lib/report-registry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, '.claude/config/standup-post.json');

// The delta log lives on a dedicated `claude/`-prefixed branch, not committed to `main` — a routine's
// DEFAULT push scope already covers `claude/`-prefixed branches, so this needs no extra permission (see
// scripts/lib/log-branch.mjs for why: the "Allow unrestricted branch pushes" toggle failed to save live,
// 2026-07-02/03).
const LOG_BRANCH = 'claude/standup-log';
// Flat filename (no directory) — git mktree builds a single-level tree, and this branch holds nothing
// else, so there's no reason to nest it under scripts/.
const LOG_BRANCH_PATH = 'standups.log';

const DRY_RUN = process.argv.includes('--dry-run');

// Confirmed via `git remote -v` in each checkout (2026-07-02) — see the epic README for the deploy topology.
const REPOS = [
  'danybgoode/miyagi-product-management',
  'danybgoode/miyagisanchezcommerce',
  'danybgoode/medusa-bonsai-backend',
];
const SMOKE_REPO = 'danybgoode/miyagisanchezcommerce';
const SMOKE_WORKFLOW = 'browser-smoke.yml';

// vercel-prune-previews.mjs' own default is `--age 0` (flags EVERY non-production preview, including one
// from a PR opened yesterday) — not a meaningful "stale" signal for a standup. 7 days is our own choice.
const STALE_PREVIEW_AGE_DAYS = 7;

const MAX_PRS_SHOWN_PER_REPO = 12; // caps a busy-night delta listing before it dominates the message
const TELEGRAM_MAX_CHARS = 4096; // Telegram sendMessage's hard text limit — a safety net, not the primary control

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shortRepo(repo) {
  return repo.split('/')[1] || repo;
}

// ---- gather: gh-backed signals (each degrades to `available: false` on any gh error — one repo being
// unreachable/unauthed never kills the whole run) ----

function ghJson(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout || 'null');
  } catch {
    return null;
  }
}

// REST-only (scripts/lib/gh-rest.mjs) — `gh pr list --json` hits GraphQL internally, which is blocked in
// at least one live routine sandbox (confirmed 2026-07-02). The list endpoint alone doesn't carry
// mergeable/check-status, so those are one extra pair of REST calls per OPEN PR only (bounded — typically
// a handful, never the full 50-item history list).
function gatherRepoPrs(repo) {
  const prs = listPulls({ repo, state: 'all', perPage: 50 });
  if (prs === null) return { repo, available: false };

  const open = prs.filter((p) => p.state === 'OPEN');
  const merged = prs.filter((p) => p.state === 'MERGED');

  const failingOpenNumbers = [];
  const conflictingOpenNumbers = [];
  for (const p of open) {
    const mergeable = getPullMergeability({ repo, number: p.number });
    if (mergeable === 'CONFLICTING') conflictingOpenNumbers.push(p.number);
    if (p.headSha) {
      const rollup = getStatusRollup({ repo, sha: p.headSha }) || [];
      const failing = rollup.some((c) => c.conclusion === 'FAILURE' || c.conclusion === 'ERROR' || c.state === 'FAILURE');
      if (failing) failingOpenNumbers.push(p.number);
    }
  }

  return {
    repo,
    available: true,
    openNumbers: open.map((p) => p.number),
    mergedNumbers: merged.map((p) => p.number),
    failingOpenNumbers,
    // Surfaced by babysit-pr's own advisory comment too — this is the standup's independent read of the
    // same fact, taken AFTER babysit-pr has had a chance to act (it runs earlier in the ops-nightly routine).
    conflictingOpenNumbers,
    // small lookup for rendering human-readable delta lines
    byNumber: Object.fromEntries(prs.map((p) => [p.number, { title: p.title, url: p.url }])),
  };
}

function gatherSmoke() {
  const runs = ghJson([
    'run', 'list', '--repo', SMOKE_REPO, '--workflow', SMOKE_WORKFLOW, '-L', '1',
    '--json', 'conclusion,status,createdAt,url',
  ]);
  if (runs === null || !runs.length) return { available: false };
  const r = runs[0];
  return { available: true, conclusion: r.conclusion, status: r.status, createdAt: r.createdAt, url: r.url };
}

// ---- gather: local scripts ----

function gatherBuildOrderDrift() {
  const r = spawnSync('node', ['scripts/build-order.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  return { drifted: r.status !== 0 };
}

function gatherStalePreviews() {
  const r = spawnSync('node', ['scripts/vercel-prune-previews.mjs', '--age', String(STALE_PREVIEW_AGE_DAYS)], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0 && !r.stdout) return { available: false };
  const m = (r.stdout || '').match(/Preview deployments to remove[^:]*:\s*(\d+)/);
  return { available: m != null, count: m ? Number(m[1]) : null };
}

// ---- config / secrets ----

// config.json is gitignored and a routine's cloud sandbox is a fresh checkout every run — it has no
// mechanism to persist a locally-written config.json across separate runs. So a routine environment
// can't rely on the interactive AskUserQuestion-then-write-config.json flow; it needs TELEGRAM_CHAT_ID
// as an env var instead (the same var already required for the optional failure-ping), which this
// falls back to when config.json doesn't exist. A local/interactive run still prefers config.json.
function loadChatId() {
  if (existsSync(CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
      if (cfg.chat_id) return cfg.chat_id;
    } catch {
      /* fall through to the env var */
    }
  }
  return process.env.TELEGRAM_CHAT_ID || null;
}

// ---- delta log (JSONL, one line per run — lives on a dedicated branch, see below) ----

function loadLastRun() {
  const content = readLogFromBranch({ cwd: ROOT, branch: LOG_BRANCH, path: LOG_BRANCH_PATH });
  if (!content) return null;
  const lines = content.trim().split('\n').filter(Boolean);
  if (!lines.length) return null;
  try {
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

function buildSnapshot({ repoSignals, smoke, buildOrder, previews }) {
  return {
    ts: new Date().toISOString(),
    repos: Object.fromEntries(
      repoSignals.map((r) => [
        r.repo,
        r.available
          ? {
              openNumbers: r.openNumbers,
              mergedNumbers: r.mergedNumbers,
              failingOpenNumbers: r.failingOpenNumbers,
              conflictingOpenNumbers: r.conflictingOpenNumbers,
            }
          : null,
      ])
    ),
    smoke: smoke.available ? { conclusion: smoke.conclusion, status: smoke.status, createdAt: smoke.createdAt } : null,
    buildOrderDrifted: buildOrder.drifted,
    stalePreviews: previews.available ? previews.count : null,
  };
}

// Pure — the unit that matters for "run twice, second run says no change". No I/O.
//
// A missing/wiped `prevRepo` baseline is NOT the same as "everything happened last night" — enumerating
// gh's entire recent-PR window as "new" overflows Telegram's 4096-char limit and crashes before ever
// posting or persisting a log (confirmed live, 2026-07-02/03: standups.log had never been committed, so
// every run re-derived a from-scratch "merged: <100+ PR titles>" dump and died). On a missing baseline,
// emit ONE bounded summary line per repo (counts only, no per-PR title enumeration) instead.
export function diffSnapshots(prev, cur, repoSignals) {
  const lines = [];
  const byNumberByRepo = Object.fromEntries(repoSignals.map((r) => [r.repo, r.byNumber || {}]));

  for (const [repo, curRepo] of Object.entries(cur.repos)) {
    if (!curRepo) continue; // this repo was unavailable this run
    const label = esc(shortRepo(repo));
    const prevRepo = prev?.repos?.[repo] || null;
    const byNumber = byNumberByRepo[repo] || {};

    if (!prevRepo) {
      lines.push(
        `📋 <b>${label}</b> baseline established (${curRepo.openNumbers.length} open, ` +
          `${curRepo.mergedNumbers.length} recently merged) — deltas start next run.`
      );
      continue;
    }

    const prevMerged = new Set(prevRepo.mergedNumbers || []);
    const newMerged = curRepo.mergedNumbers.filter((n) => !prevMerged.has(n));
    if (newMerged.length) {
      const titled = newMerged.map((n) => ({ number: n, title: byNumber[n]?.title || '' }));
      lines.push(`✅ <b>${label}</b> merged: ${formatPrList(titled, MAX_PRS_SHOWN_PER_REPO)}`);
    }

    const prevOpenSet = new Set(prevRepo.openNumbers || []);
    const newOpened = curRepo.openNumbers.filter((n) => !prevOpenSet.has(n));
    if (newOpened.length) {
      const titled = newOpened.map((n) => ({ number: n, title: byNumber[n]?.title || '' }));
      lines.push(`🆕 <b>${label}</b> opened: ${formatPrList(titled, MAX_PRS_SHOWN_PER_REPO)}`);
    }

    const prevFailing = new Set(prevRepo.failingOpenNumbers || []);
    const newFailing = curRepo.failingOpenNumbers.filter((n) => !prevFailing.has(n));
    if (newFailing.length) lines.push(`🔴 <b>${label}</b> CI red on open PR: ${newFailing.map((n) => `#${n}`).join(', ')}`);

    const prevConflicting = new Set(prevRepo.conflictingOpenNumbers || []);
    const newConflicting = (curRepo.conflictingOpenNumbers || []).filter((n) => !prevConflicting.has(n));
    if (newConflicting.length) lines.push(`⚠️ <b>${label}</b> merge conflict on open PR: ${newConflicting.map((n) => `#${n}`).join(', ')}`);

    if (prevRepo.openNumbers?.length !== curRepo.openNumbers.length) {
      lines.push(`📋 <b>${label}</b> open PRs: ${curRepo.openNumbers.length}`);
    }
  }

  const prevSmokeKey = prev?.smoke ? `${prev.smoke.conclusion}|${prev.smoke.createdAt}` : null;
  const curSmokeKey = cur.smoke ? `${cur.smoke.conclusion}|${cur.smoke.createdAt}` : null;
  if (prevSmokeKey !== curSmokeKey) {
    lines.push(cur.smoke ? `🧪 Browser smoke: ${cur.smoke.conclusion || cur.smoke.status || 'unknown'}` : '🧪 Browser smoke: unavailable');
  }

  if (!prev || prev.buildOrderDrifted !== cur.buildOrderDrifted) {
    lines.push(
      cur.buildOrderDrifted
        ? '⚠️ BUILD-ORDER.md is stale — run node scripts/build-order.mjs'
        : '✅ BUILD-ORDER.md up to date'
    );
  }

  if (!prev || prev.stalePreviews !== cur.stalePreviews) {
    lines.push(
      cur.stalePreviews == null
        ? '🧹 Stale previews: unavailable'
        : `🧹 Stale previews (>${STALE_PREVIEW_AGE_DAYS}d): ${cur.stalePreviews}`
    );
  }

  return lines;
}

// ---- Telegram ----

async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) die('TELEGRAM_BOT_TOKEN is not set — export it before running standup.mjs.');
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10000),
  });
  let body = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) die(`Telegram sendMessage failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
}

// ---- log persistence (scripts/lib/log-branch.mjs — a dedicated claude/-prefixed branch) ----

function appendRunAndPush(snapshot) {
  const ok = appendLineToBranch({
    cwd: ROOT,
    branch: LOG_BRANCH,
    path: LOG_BRANCH_PATH,
    line: `${JSON.stringify(snapshot)}\n`,
    message: `chore(standup): log ${new Date().toISOString().slice(0, 10)}`,
  });
  if (!ok) {
    console.error(
      `standup: writing the updated log to ${LOG_BRANCH} failed — the next run (esp. a fresh routine ` +
        `session) won't see today's snapshot and will re-derive its baseline.`
    );
  }
}

// ---- main ----

async function main() {
  ensureGh();

  const repoSignals = REPOS.map(gatherRepoPrs);
  const smoke = gatherSmoke();
  const buildOrder = gatherBuildOrderDrift();
  const previews = gatherStalePreviews();

  const cur = buildSnapshot({ repoSignals, smoke, buildOrder, previews });
  const prev = loadLastRun();
  const deltaLines = diffSnapshots(prev, cur, repoSignals);

  const header = `<b>Standup · ${cur.ts.slice(0, 10)}</b>`;
  const rawMessage = deltaLines.length ? [header, ...deltaLines].join('\n') : `${header}\n🌙 Quiet night — nothing new since the last standup.`;
  const artifacts = buildStandupArtifacts({ snapshot: cur, deltaLines, generatedAt: new Date(cur.ts) });
  // reporthub-as-notion S1.3: try to upgrade the standup deck's URL-hash link to a short gs://-backed
  // /r/<slug> link (scripts/lib/report-registry.mjs). Runs even in --dry-run — it's a new, additive
  // write to the public report registry, not a git/Telegram mutation, so it stays inside --dry-run's
  // "read-only" contract for git and Telegram while still letting a dry run round-trip-verify the
  // upload. On any upload failure the artifact keeps the URL-hash link it already had.
  await upgradeArtifactLinks(artifacts, { date: new Date(cur.ts) });
  // Last-resort safety net for Telegram's hard 4096-char limit — the per-repo caps above (baseline
  // summary lines, formatPrList) should already keep any normal night well under this.
  const message = appendStandupArtifactsToMessage(rawMessage, artifacts, TELEGRAM_MAX_CHARS);

  console.log(telegramHtmlToConsoleText(message));

  if (!DRY_RUN) {
    const chatId = loadChatId();
    if (!chatId) {
      die(
        `No Telegram chat id configured — set "chat_id" in ${CONFIG_PATH} ` +
          `(copy .claude/config/standup-post.example.json, or let the standup-post skill ask via AskUserQuestion).`
      );
    }
    await sendTelegram(chatId, message);
  }

  if (!DRY_RUN) {
    appendRunAndPush(cur);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
