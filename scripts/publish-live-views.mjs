#!/usr/bin/env node
// publish-live-views.mjs — reporthub-as-notion Sprint 2, Story 2.1/2.2: refreshes the hub's LIVE views
// without a fork redeploy. Publishes two overwrite-allowed objects to the report registry bucket
// (Story 2.1's new `allowOverwrite`/`live/` capability in scripts/lib/report-registry.mjs):
//
//   live/roadmap-status.json — the full reports-data.json payload (roadmap-to-notion.mjs --extract
//                               projected through scripts/lib/pmo-report-hub-data.mjs's
//                               buildReportHubData — the SAME generator the fork's hosted /reports
//                               library already used for its build-time-baked snapshot; this is that
//                               same output, just refreshed live instead of baked at deploy time).
//   packets/pmo-live-metrics.md — the PMO trend chart doc (scripts/lib/pmo-trend-view.mjs), reachable
//                               automatically at /r/pmo-live-metrics via Sprint 1's EXISTING resolver.
//                               Published under packets/ (not live/) with allowOverwrite:true — a
//                               non-"daily-" slug already resolves through packets/ on the read side
//                               (objectPathForSlug), so giving it a stable slug + overwrite makes the
//                               ALREADY-DEPLOYED /r/<slug> resolver serve it with ZERO fork-side changes.
//                               (live/roadmap-status.json needs a NEW fork-side JSON route instead,
//                               because reports.js fetches a raw JSON blob for its SPA state, not a
//                               markdown doc through the /docs viewer — see the fork PR for that route.)
//
// Env-var config only (REPORT_REGISTRY_BUCKET, GOOGLE_APPLICATION_CREDENTIALS_JSON /
// GOOGLE_APPLICATION_CREDENTIALS — the same two report-registry.mjs already reads); degrades gracefully
// on ANY failure (no credentials, unreachable bucket, roadmap extraction error) — logs to stderr and
// exits 0, never blocking whatever routine calls this. The hub's client-side fetch
// (public/reports.js in the fork) falls back to its last bundled snapshot on a failed/missing live
// fetch, so a failed publish here is a staleness issue, not an outage — this script follows the same
// soft-mode discipline as report-registry.mjs's other callers (LEARNINGS: env-var config, degrade
// gracefully, never block the routine that called you).
//
//   node scripts/publish-live-views.mjs             # publish both live objects
//   node scripts/publish-live-views.mjs --dry-run   # build both payloads, write neither

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { readLogFromBranch } from './lib/log-branch.mjs';
import { parsePmoLog } from './lib/pmo-window-log.mjs';
import { buildPmoMetricsMarkdown } from './lib/pmo-trend-view.mjs';
import { buildReportHubData } from './lib/pmo-report-hub-data.mjs';
import { RESOLVER_BASE_URL, publishLiveArtifact, resolveBucket, uploadReportPayload } from './lib/report-registry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LOG_BRANCH = 'claude/pmo-reports-log';
const LOG_BRANCH_PATH = 'pmo-reports.log';
export const PMO_METRICS_SLUG = 'pmo-live-metrics';
const PMO_METRICS_VIEW = {
  id: 'pmo-metrics',
  title: 'PMO metrics',
  description: 'Throughput y DORA-ish en el tiempo, generado desde el log operativo de pmo-report.mjs.',
  kind: 'metrics',
};

export function parseArgs(argv = process.argv.slice(2)) {
  return { dryRun: argv.includes('--dry-run') };
}

function runNode(args) {
  return spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// Injectable `run` for tests — no live process spawn needed to exercise the parsing branch.
export function loadRoadmapRows({ run = runNode } = {}) {
  const result = run(['scripts/roadmap-to-notion.mjs', '--extract']);
  if (result.status !== 0) return [];
  try {
    return JSON.parse(result.stdout || '[]');
  } catch {
    return [];
  }
}

// Pure — appends the stable "PMO metrics" card to a buildReportHubData() payload's views array. Kept as
// its own function (not folded into buildReportHubData itself) so that generator stays untouched and
// reusable for its original local-build caller (scripts/pmo-report-hub-data.mjs, which writes a
// developer-machine snapshot for the fork's build-time bake) — this augmentation is specific to the
// live/registry publish path.
export function withPmoMetricsView(data, { slug = PMO_METRICS_SLUG, baseUrl = RESOLVER_BASE_URL } = {}) {
  return {
    ...data,
    views: [...data.views, { ...PMO_METRICS_VIEW, href: `${baseUrl}/r/${slug}` }],
  };
}

export async function publishRoadmapStatus({
  dryRun = false,
  logInfo = console.log,
  logError = console.error,
  loadRows = loadRoadmapRows,
  readDoc = (docLink) => readFileSync(join(ROOT, docLink), 'utf8'),
  generatedAt = new Date(),
  publisher = publishLiveArtifact,
} = {}) {
  const rows = loadRows();
  if (!rows.length) {
    logError('publish-live-views: roadmap-to-notion.mjs --extract returned no rows — skipping roadmap-status publish.');
    return { ok: false, reason: 'no-rows' };
  }
  const data = withPmoMetricsView(buildReportHubData(rows, { generatedAt, readDoc }));
  const json = JSON.stringify(data);
  if (dryRun) {
    logInfo(
      `publish-live-views: dry run — would publish live/roadmap-status.json ` +
        `(${data.items.length} items, ${data.views.length} views, ${json.length} bytes); no write performed.`
    );
    return { ok: true, dryRun: true };
  }
  const result = await publisher({ key: 'roadmap-status', content: json, ext: 'json' });
  if (!result.ok) logError(`publish-live-views: roadmap-status publish failed (${result.reason}).`);
  else logInfo(`publish-live-views: published live/roadmap-status.json (${data.items.length} items, ${data.views.length} views).`);
  return result;
}

export async function publishPmoMetrics({
  dryRun = false,
  logInfo = console.log,
  logError = console.error,
  loadLog = () => readLogFromBranch({ cwd: ROOT, branch: LOG_BRANCH, path: LOG_BRANCH_PATH }),
  generatedAt = new Date(),
  uploader = uploadReportPayload,
} = {}) {
  const logEntries = parsePmoLog(loadLog());
  const markdown = buildPmoMetricsMarkdown({ logEntries, generatedAt });
  if (dryRun) {
    logInfo(
      `publish-live-views: dry run — would publish packets/${PMO_METRICS_SLUG}.md ` +
        `(${logEntries.length} window(s) plotted); no write performed.`
    );
    return { ok: true, dryRun: true };
  }
  // Published as a STABLE packets/ slug (not live/) with allowOverwrite:true — see this file's header
  // comment for why: it makes /r/pmo-live-metrics resolve through Sprint 1's EXISTING, already-deployed
  // resolver with no fork-side change required for this half of the story.
  const result = await uploader({
    bucket: resolveBucket(),
    slug: PMO_METRICS_SLUG,
    markdown,
    contentType: 'text/markdown; charset=utf-8',
    allowOverwrite: true,
  });
  if (!result.ok) logError(`publish-live-views: pmo-metrics publish failed (${result.reason}).`);
  else logInfo(`publish-live-views: published packets/${PMO_METRICS_SLUG}.md (${logEntries.length} window(s)) — ${RESOLVER_BASE_URL}/r/${PMO_METRICS_SLUG}`);
  return result;
}

async function main() {
  const args = parseArgs();
  const roadmapResult = await publishRoadmapStatus({ dryRun: args.dryRun });
  const metricsResult = await publishPmoMetrics({ dryRun: args.dryRun });

  // Never fail the routine on a publish failure — the hub's client-side fetch falls back to its last
  // bundled snapshot (public/reports.js in the fork). A non-zero exit here is reserved for genuine
  // usage errors (there are none today — parseArgs never throws), matching every other report script's
  // soft-mode discipline.
  if (!roadmapResult.ok && !args.dryRun) console.error('publish-live-views: roadmap-status stayed stale this run.');
  if (!metricsResult.ok && !args.dryRun) console.error('publish-live-views: pmo-metrics stayed stale this run.');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) await main();
