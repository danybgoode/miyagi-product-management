import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReport,
  buildReportArtifacts,
  gatherRepoResults,
  loadLogContent,
  parseArgs,
  shouldPersistWindow,
} from '../pmo-report.mjs';

test('parseArgs reads dry-run and explicit window overrides', () => {
  assert.deepEqual(parseArgs(['--dry-run', '--weekly', '--open', '--since', '2026-07-01T00:00:00Z', '--until', '2026-07-08T00:00:00Z']), {
    dryRun: true,
    weekly: true,
    monthly: false,
    sheet: false,
    open: true,
    sinceISO: '2026-07-01T00:00:00Z',
    untilISO: '2026-07-08T00:00:00Z',
  });
});

test('parseArgs makes monthly produce both packet and sheet', () => {
  assert.deepEqual(parseArgs(['--monthly']), {
    dryRun: false,
    weekly: false,
    monthly: true,
    sheet: true,
    open: false,
    sinceISO: null,
    untilISO: null,
  });
});

test('shouldPersistWindow advances scheduled reports but not on-demand artifacts', () => {
  assert.equal(shouldPersistWindow(parseArgs(['--weekly'])), true);
  assert.equal(shouldPersistWindow(parseArgs([])), true);
  assert.equal(shouldPersistWindow(parseArgs(['--dry-run', '--weekly'])), false);
  assert.equal(shouldPersistWindow(parseArgs(['--monthly'])), false);
  assert.equal(shouldPersistWindow(parseArgs(['--sheet'])), false);
});

test('buildReport uses injected data and does not perform script I/O when imported', () => {
  const { metrics, text } = buildReport({
    window: {
      sinceISO: '2026-07-01T00:00:00Z',
      untilISO: '2026-07-08T00:00:00Z',
      baseline: true,
    },
    repoResults: [
      {
        repo: 'danybgoode/miyagisanchezcommerce',
        available: true,
        openPrs: [{ number: 10 }],
        prs: [{ number: 1, title: 'hotfix: restore', createdAt: '2026-07-01T00:00:00Z', mergedAt: '2026-07-02T00:00:00Z' }],
      },
      { repo: 'danybgoode/medusa-bonsai-backend', available: true, openPrs: [], prs: [] },
    ],
    roadmapRows: [{ grain: 'Sprint', sprint_progress: '2/3 stories' }],
    epicStatusFlips: [{ status: 'shipped', date: '2026-07-03T00:00:00Z' }],
    docOpsInputs: {
      docChanges: [{ epicSlug: 'pmo', path: 'Roadmap/09-platform-infra/pmo/sprint-1.md' }],
      learningsPromotions: [],
      shippedEpics: [{ slug: 'pmo', hasRetrospective: true }],
    },
    epicLeadInputs: [{ scaffoldedAt: '2026-07-01T00:00:00Z', shippedAt: '2026-07-03T00:00:00Z' }],
  });
  assert.equal(metrics.deployFrequency.total, 1);
  assert.equal(metrics.changeFailProxy.count, 1);
  assert.match(text, /PMO operational report/);
  assert.match(text, /baseline established/);
  assert.match(text, /Roadmap progress 2\/3 stories/);
});

test('loadLogContent always reads the fetched remote log branch, including dry-run preflight', () => {
  let reads = 0;
  assert.equal(loadLogContent({
    readRemoteLog: () => {
      reads += 1;
      return '{"untilISO":"fresh"}\n';
    },
  }), '{"untilISO":"fresh"}\n');
  assert.equal(reads, 1);
});

test('gatherRepoResults populates open PRs from REST listPulls', () => {
  const results = gatherRepoResults('2026-07-01T00:00:00Z', '2026-07-08T00:00:00Z', {
    searchMerged: ({ repo }) => ([
      { repo, number: 1, title: 'feat: inside', mergedAt: '2026-07-02T00:00:00Z' },
      { repo, number: 2, title: 'feat: outside', mergedAt: '2026-07-09T00:00:00Z' },
    ]),
    listOpen: ({ repo }) => ([{ repo, number: 10, title: 'open work' }]),
  });
  assert.equal(results.length, 3);
  assert.ok(results.every((result) => result.available));
  assert.ok(results.every((result) => result.prs.length === 1));
  assert.ok(results.every((result) => result.openPrs.length === 1));
});

test('buildReportArtifacts fills requested templates and emits smalldocs URLs', () => {
  const metrics = {
    window: { sinceISO: '2026-07-01T00:00:00Z', untilISO: '2026-07-08T00:00:00Z' },
    throughput: { shippedStories: 1, shippedEpics: 1, closedEpics: 1 },
    prCycleTime: { medianHours: 2, averageHours: 3, p90Hours: 4 },
    epicLeadTime: { medianDays: 5, averageDays: 6 },
    deployFrequency: { total: 7 },
    changeFailProxy: { count: 0 },
    docOps: { learningsPromotions: 1, retroCoverage: { covered: 1, total: 1, percent: 100 } },
  };
  const artifacts = buildReportArtifacts(metrics, { weekly: true, monthly: false, sheet: true });
  assert.deepEqual(artifacts.map((a) => a.name), ['weekly', 'sheet']);
  assert.match(artifacts[0].markdown, /PMO semanal/);
  assert.match(artifacts[0].markdown, /benchmark DORA\/Four Keys daily: \*\*3\*\*/);
  assert.match(artifacts[0].url, /present=0/);
  assert.match(artifacts[1].markdown, /```cells/);
  assert.match(artifacts[1].markdown, /Change-failure proxy %,0,15,lower is better/);
  assert.match(artifacts[1].url, /^https:\/\/pmo-smalldocs-/);
});

test('buildReportArtifacts treats monthly as packet plus sheet', () => {
  const metrics = {
    window: { sinceISO: '2026-07-01T00:00:00Z', untilISO: '2026-07-08T00:00:00Z' },
    throughput: { shippedStories: 1, shippedEpics: 1, closedEpics: 1 },
    prCycleTime: { medianHours: 2, averageHours: 3, p90Hours: 4 },
    epicLeadTime: { medianDays: 5, averageDays: 6 },
    deployFrequency: { total: 7 },
    changeFailProxy: { count: 0 },
    docOps: { learningsPromotions: 1, retroCoverage: { covered: 1, total: 1, percent: 100 } },
  };
  const artifacts = buildReportArtifacts(metrics, parseArgs(['--monthly']));
  assert.deepEqual(artifacts.map((a) => a.name), ['monthly', 'sheet']);
});
