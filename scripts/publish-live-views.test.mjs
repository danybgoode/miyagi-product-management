import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PMO_METRICS_SLUG,
  loadRoadmapRows,
  parseArgs,
  publishPmoMetrics,
  publishRoadmapStatus,
  withPmoMetricsView,
} from './publish-live-views.mjs';
import { RESOLVER_BASE_URL } from './lib/report-registry.mjs';

test('parseArgs: --dry-run flag only, defaults to false', () => {
  assert.deepEqual(parseArgs([]), { dryRun: false });
  assert.deepEqual(parseArgs(['--dry-run']), { dryRun: true });
});

test('loadRoadmapRows parses the extractor stdout as JSON', () => {
  const rows = loadRoadmapRows({
    run: () => ({ status: 0, stdout: JSON.stringify([{ slug: 'a' }, { slug: 'b' }]) }),
  });
  assert.deepEqual(rows, [{ slug: 'a' }, { slug: 'b' }]);
});

test('loadRoadmapRows degrades to an empty array on a non-zero exit or invalid JSON', () => {
  assert.deepEqual(loadRoadmapRows({ run: () => ({ status: 1, stdout: '' }) }), []);
  assert.deepEqual(loadRoadmapRows({ run: () => ({ status: 0, stdout: 'not json' }) }), []);
});

test('withPmoMetricsView appends a stable pmo-metrics card without mutating the input', () => {
  const data = { views: [{ id: 'roadmap-board' }] };
  const result = withPmoMetricsView(data);
  assert.equal(data.views.length, 1, 'input must not be mutated');
  assert.equal(result.views.length, 2);
  assert.equal(result.views[1].id, 'pmo-metrics');
  assert.equal(result.views[1].href, `${RESOLVER_BASE_URL}/r/${PMO_METRICS_SLUG}`);
});

test('withPmoMetricsView honors a custom slug/baseUrl (used by tests/staging)', () => {
  const result = withPmoMetricsView({ views: [] }, { slug: 'custom-slug', baseUrl: 'https://example.test' });
  assert.equal(result.views[0].href, 'https://example.test/r/custom-slug');
});

// ---- publishRoadmapStatus orchestration --------------------------------------------------------------

const SAMPLE_ROWS = [
  {
    name: 'Sample epic', slug: 'sample-epic', grain: 'Epic', status: 'Shipped', area: '09 Platform-infra',
    risk: 'Low', sprint_progress: '3/3 stories', build_order: 1, doc_link: 'Roadmap/x/sample-epic/README.md',
  },
];

test('publishRoadmapStatus skips the publish (no throw) when the extractor returns no rows', async () => {
  const errors = [];
  const result = await publishRoadmapStatus({
    loadRows: () => [],
    logError: (m) => errors.push(m),
    logInfo: () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no-rows');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no rows/);
});

test('publishRoadmapStatus dry-run never calls the publisher', async () => {
  let called = false;
  const infos = [];
  const result = await publishRoadmapStatus({
    dryRun: true,
    loadRows: () => SAMPLE_ROWS,
    readDoc: () => '# Sample epic\n\nSome useful paragraph long enough to be picked as a summary line here.',
    generatedAt: new Date('2026-07-17T00:00:00Z'),
    publisher: async () => { called = true; return { ok: true }; },
    logInfo: (m) => infos.push(m),
  });
  assert.equal(called, false);
  assert.equal(result.dryRun, true);
  assert.ok(infos.some((m) => /dry run/.test(m)));
});

test('publishRoadmapStatus calls publisher with the full JSON payload including the pmo-metrics view', async () => {
  let seenArgs;
  const result = await publishRoadmapStatus({
    loadRows: () => SAMPLE_ROWS,
    readDoc: () => '# Sample epic\n\nSome useful paragraph long enough to be picked as a summary line here.',
    generatedAt: new Date('2026-07-17T00:00:00Z'),
    publisher: async (args) => { seenArgs = args; return { ok: true }; },
    logInfo: () => {},
  });
  assert.equal(result.ok, true);
  assert.equal(seenArgs.key, 'roadmap-status');
  assert.equal(seenArgs.ext, 'json');
  const parsed = JSON.parse(seenArgs.content);
  assert.equal(parsed.items.length, 1);
  assert.ok(parsed.views.some((v) => v.id === 'pmo-metrics'));
});

test('publishRoadmapStatus reports the failure reason without throwing when the publisher fails', async () => {
  const errors = [];
  const result = await publishRoadmapStatus({
    loadRows: () => SAMPLE_ROWS,
    readDoc: () => '# Sample epic\n\nSome useful paragraph long enough to be picked as a summary line here.',
    publisher: async () => ({ ok: false, reason: 'no-credentials' }),
    logError: (m) => errors.push(m),
    logInfo: () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no-credentials');
  assert.ok(errors.some((m) => /no-credentials/.test(m)));
});

// ---- publishPmoMetrics orchestration -------------------------------------------------------------------

test('publishPmoMetrics dry-run never calls the uploader', async () => {
  let called = false;
  const infos = [];
  const result = await publishPmoMetrics({
    dryRun: true,
    loadLog: () => null,
    uploader: async () => { called = true; return { ok: true }; },
    logInfo: (m) => infos.push(m),
  });
  assert.equal(called, false);
  assert.equal(result.dryRun, true);
  assert.ok(infos.some((m) => /dry run/.test(m)));
});

test('publishPmoMetrics passes the stable slug + allowOverwrite:true to the uploader', async () => {
  let seenArgs;
  const result = await publishPmoMetrics({
    loadLog: () => '{"windowEnd":"2026-07-14T00:00:00Z","summary":{"shippedStories":2,"shippedEpics":1,"deploys":3,"changeFailProxy":0,"learningsPromotions":1}}\n',
    uploader: async (args) => { seenArgs = args; return { ok: true }; },
    logInfo: () => {},
  });
  assert.equal(result.ok, true);
  assert.equal(seenArgs.slug, PMO_METRICS_SLUG);
  assert.equal(seenArgs.allowOverwrite, true);
  assert.match(seenArgs.markdown, /```chart/);
});

test('publishPmoMetrics tolerates a missing/unreadable log (empty history, no throw)', async () => {
  let seenArgs;
  const result = await publishPmoMetrics({
    loadLog: () => null,
    uploader: async (args) => { seenArgs = args; return { ok: true }; },
    logInfo: () => {},
  });
  assert.equal(result.ok, true);
  assert.match(seenArgs.markdown, /Sin datos todavia/);
});

test('publishPmoMetrics reports the failure reason without throwing when the uploader fails', async () => {
  const errors = [];
  const result = await publishPmoMetrics({
    loadLog: () => null,
    uploader: async () => ({ ok: false, reason: 'no-credentials' }),
    logError: (m) => errors.push(m),
    logInfo: () => {},
  });
  assert.equal(result.ok, false);
  assert.ok(errors.some((m) => /no-credentials/.test(m)));
});
