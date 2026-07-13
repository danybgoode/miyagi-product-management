import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, parseArgs } from '../pmo-report.mjs';

test('parseArgs reads dry-run and explicit window overrides', () => {
  assert.deepEqual(parseArgs(['--dry-run', '--since', '2026-07-01T00:00:00Z', '--until', '2026-07-08T00:00:00Z']), {
    dryRun: true,
    sinceISO: '2026-07-01T00:00:00Z',
    untilISO: '2026-07-08T00:00:00Z',
  });
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
