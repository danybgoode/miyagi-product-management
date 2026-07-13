#!/usr/bin/env node
// pmo-report.mjs — gather PMO operational metrics for the current report window.
//
// This is intentionally a root-repo script, not an app surface. It reuses the ops-routines rail:
// REST-only GitHub reads (gh-rest), the weekly-recap-style window log, log-branch persistence, and the
// Telegram formatter's length guard. Delivery to Telegram/decks comes in later sprints; Sprint 1 prints
// the report and persists the window only on non-dry runs.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { searchMergedPrs } from './lib/gh-rest.mjs';
import { readLogFromBranch, appendLineToBranch } from './lib/log-branch.mjs';
import { truncateForTelegram } from './lib/telegram-format.mjs';
import { buildSmallDocsUrl, fillPmoTemplate } from './lib/pmo-templates.mjs';
import { parseStatusFlipsFromLog, filterFlipsToWindow } from './weekly-recap.mjs';
import {
  baselineSummary,
  formatBaselineSummary,
  summarizePmoMetrics,
} from './lib/pmo-metrics.mjs';
import {
  computePmoWindow,
  formatPmoReport,
  lastPmoLogEntry,
  pmoLogLine,
} from './lib/pmo-window-log.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LOG_BRANCH = 'claude/pmo-reports-log';
const LOG_BRANCH_PATH = 'pmo-reports.log';
const LOG_MESSAGE = 'chore(pmo): append operational report window';

const REPOS = [
  'danybgoode/miyagi-product-management',
  'danybgoode/miyagisanchezcommerce',
  'danybgoode/medusa-bonsai-backend',
];
const DEPLOY_REPOS = [
  'danybgoode/miyagisanchezcommerce',
  'danybgoode/medusa-bonsai-backend',
];

export function parseArgs(argv) {
  const has = (flag) => argv.includes(flag);
  const value = (flag) => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : argv[i + 1] || null;
  };
  return {
    dryRun: has('--dry-run'),
    weekly: has('--weekly'),
    monthly: has('--monthly'),
    sheet: has('--sheet'),
    open: has('--open'),
    sinceISO: value('--since'),
    untilISO: value('--until'),
  };
}

function git(args, opts = {}) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
}

function runNode(args) {
  return spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function loadRoadmapRows() {
  const result = runNode(['scripts/roadmap-to-notion.mjs', '--extract']);
  if (result.status !== 0) return [];
  try {
    return JSON.parse(result.stdout || '[]');
  } catch {
    return [];
  }
}

function loadLogContent({ dryRun }) {
  if (!dryRun) return readLogFromBranch({ cwd: ROOT, branch: LOG_BRANCH, path: LOG_BRANCH_PATH });
  const result = git(['show', `origin/${LOG_BRANCH}:${LOG_BRANCH_PATH}`]);
  return result.status === 0 ? result.stdout : null;
}

function gatherRepoResults(sinceISO, untilISO) {
  return REPOS.map((repo) => {
    const prs = searchMergedPrs({ repo, sinceDate: sinceISO.slice(0, 10), base: 'main' });
    if (prs === null) return { repo, available: false, prs: [], openPrs: [] };
    return {
      repo,
      available: true,
      prs: prs.filter((pr) => pr.mergedAt >= sinceISO && pr.mergedAt < untilISO),
      openPrs: [],
    };
  });
}

function gatherEpicStatusFlips(sinceISO, untilISO) {
  const result = git([
    'log',
    '--since', sinceISO,
    '--until', untilISO,
    '--date=iso-strict',
    '-p',
    '--reverse',
    '--',
    'Roadmap/*/*/README.md',
  ]);
  if (result.status !== 0) return [];
  return filterFlipsToWindow(parseStatusFlipsFromLog(result.stdout || ''), sinceISO, untilISO);
}

function epicSlugFromPath(path) {
  const m = /^Roadmap\/((?:0[1-9]|10)-[^/]+)\/([^/]+)\//.exec(path);
  return m ? `${m[1]}/${m[2]}` : null;
}

function gatherDocOpsInputs(sinceISO, untilISO, epicStatusFlips) {
  const result = git([
    'log',
    '--since', sinceISO,
    '--until', untilISO,
    '--name-only',
    '--pretty=format:commit:%H',
    '--',
    'Roadmap',
  ]);
  const paths = result.status === 0
    ? result.stdout.split('\n').filter((line) => line.startsWith('Roadmap/'))
    : [];
  const docChanges = paths.flatMap((path) => {
    const epicSlug = epicSlugFromPath(path);
    return epicSlug ? [{ epicSlug, path }] : [];
  });
  const learningsPromotions = [...new Set(paths.filter((path) => path === 'Roadmap/LEARNINGS.md'))]
    .map((path) => ({ path }));
  const shippedEpics = epicStatusFlips
    .filter((flip) => flip.status === 'shipped')
    .map((flip) => ({
      slug: epicSlugFromPath(flip.file),
      hasRetrospective: existsSync(join(ROOT, dirname(flip.file), 'RETROSPECTIVE.md')),
    }));
  return { docChanges, learningsPromotions, shippedEpics };
}

function firstCommitDateForPath(path) {
  const result = git(['log', '--diff-filter=A', '--follow', '--format=%aI', '--reverse', '--', path]);
  if (result.status !== 0) return null;
  return result.stdout.trim().split('\n').filter(Boolean)[0] || null;
}

function gatherEpicLeadInputs(epicStatusFlips) {
  return epicStatusFlips.filter((flip) => flip.status === 'shipped').flatMap((flip) => {
    const scaffoldedAt = firstCommitDateForPath(flip.file);
    if (!scaffoldedAt) return [];
    return [{ slug: epicSlugFromPath(flip.file), scaffoldedAt, shippedAt: flip.date }];
  });
}

export function buildReport({ window, repoResults, roadmapRows, epicStatusFlips, docOpsInputs, epicLeadInputs }) {
  const prs = repoResults.flatMap((result) => result.prs);
  const metrics = summarizePmoMetrics({
    ...window,
    deployRepos: DEPLOY_REPOS,
    repoResults,
    prs,
    changeItems: prs,
    epics: epicLeadInputs,
    roadmapRows,
    epicStatusFlips,
    storyShipEvents: [],
    ...docOpsInputs,
  });
  const baselineLine = window.baseline
    ? formatBaselineSummary(baselineSummary({ repoResults, roadmapRows, docChanges: docOpsInputs.docChanges }))
    : null;
  return { metrics, text: truncateForTelegram(formatPmoReport({ metrics, baselineLine }), 4096) };
}

export function buildReportArtifacts(metrics, args) {
  const artifacts = [];
  for (const [name, enabled] of [
    ['weekly', args.weekly],
    ['monthly', args.monthly],
    ['sheet', args.sheet],
  ]) {
    if (!enabled) continue;
    const markdown = fillPmoTemplate(name, metrics);
    artifacts.push({
      name,
      markdown,
      url: buildSmallDocsUrl(markdown, { present: name === 'weekly' }),
    });
  }
  return artifacts;
}

function openUrl(url) {
  if (process.platform !== 'darwin') return false;
  const result = spawnSync('open', [url], { encoding: 'utf8' });
  return result.status === 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const logContent = loadLogContent({ dryRun: args.dryRun });
  const lastLog = lastPmoLogEntry(logContent);
  const window = computePmoWindow(lastLog, new Date(), args);

  const roadmapRows = loadRoadmapRows();
  const repoResults = gatherRepoResults(window.sinceISO, window.untilISO);
  const epicStatusFlips = gatherEpicStatusFlips(window.sinceISO, window.untilISO);
  const docOpsInputs = gatherDocOpsInputs(window.sinceISO, window.untilISO, epicStatusFlips);
  const epicLeadInputs = gatherEpicLeadInputs(epicStatusFlips);
  const { metrics, text } = buildReport({ window, repoResults, roadmapRows, epicStatusFlips, docOpsInputs, epicLeadInputs });

  console.log(text);
  const artifacts = buildReportArtifacts(metrics, args);
  for (const artifact of artifacts) {
    console.log(`\nSmallDocs ${artifact.name}: ${artifact.url}`);
    if (args.open) {
      const opened = openUrl(artifact.url);
      console.log(opened ? `Opened ${artifact.name} in the browser.` : `Could not auto-open ${artifact.name}; use the URL above.`);
    }
  }

  if (args.dryRun) {
    console.log('\nDry run: window log not updated.');
    return;
  }

  const ok = appendLineToBranch({
    cwd: ROOT,
    branch: LOG_BRANCH,
    path: LOG_BRANCH_PATH,
    line: pmoLogLine({ window, metrics, baselineEstablished: !!window.baseline }),
    message: LOG_MESSAGE,
  });
  if (!ok) {
    console.error(`Failed to persist ${LOG_BRANCH_PATH} on ${LOG_BRANCH}.`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) await main();
