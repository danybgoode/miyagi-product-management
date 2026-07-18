import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDocOpsChart,
  buildDoraChart,
  buildPmoMetricsMarkdown,
  buildThroughputChart,
  recentWindows,
} from './pmo-trend-view.mjs';

const WINDOWS = [
  { ts: '2026-06-23T00:00:00Z', windowStart: '2026-06-16T00:00:00Z', windowEnd: '2026-06-23T00:00:00Z', summary: { shippedStories: 3, shippedEpics: 1, deploys: 5, changeFailProxy: 0, learningsPromotions: 1 } },
  { ts: '2026-06-30T00:00:00Z', windowStart: '2026-06-23T00:00:00Z', windowEnd: '2026-06-30T00:00:00Z', summary: { shippedStories: 5, shippedEpics: 2, deploys: 8, changeFailProxy: 1, learningsPromotions: 2 } },
  { ts: '2026-07-07T00:00:00Z', windowStart: '2026-06-30T00:00:00Z', windowEnd: '2026-07-07T00:00:00Z', summary: { shippedStories: 2, shippedEpics: 0, deploys: 4, changeFailProxy: 0, learningsPromotions: 0 } },
];

test('recentWindows tail-slices to maxWindows, oldest-first, without mutating the source', () => {
  const copy = WINDOWS.map((w) => ({ ...w }));
  const result = recentWindows(copy, 2);
  assert.deepEqual(result.map((w) => w.windowEnd), ['2026-06-30T00:00:00Z', '2026-07-07T00:00:00Z']);
  assert.equal(copy.length, 3, 'source array must not be mutated');
});

test('recentWindows tolerates null/undefined/empty input', () => {
  assert.deepEqual(recentWindows(null), []);
  assert.deepEqual(recentWindows(undefined), []);
  assert.deepEqual(recentWindows([]), []);
});

test('buildThroughputChart maps summary.shippedStories/shippedEpics into a two-dataset line chart', () => {
  const chart = buildThroughputChart(WINDOWS);
  assert.equal(chart.type, 'line');
  assert.equal(chart.labels.length, 3);
  assert.equal(chart.datasets.length, 2);
  assert.deepEqual(chart.datasets[0].values, [3, 5, 2]);
  assert.deepEqual(chart.datasets[1].values, [1, 2, 0]);
});

test('buildDoraChart maps summary.deploys/changeFailProxy into a two-dataset line chart', () => {
  const chart = buildDoraChart(WINDOWS);
  assert.equal(chart.type, 'line');
  assert.deepEqual(chart.datasets[0].values, [5, 8, 4]);
  assert.deepEqual(chart.datasets[1].values, [0, 1, 0]);
});

test('buildDocOpsChart maps summary.learningsPromotions into a single-series bar chart', () => {
  const chart = buildDocOpsChart(WINDOWS);
  assert.equal(chart.type, 'bar');
  assert.deepEqual(chart.values, [1, 2, 0]);
});

test('chart builders tolerate a missing summary field (defaults to 0, never throws/NaN)', () => {
  const sparse = [{ windowEnd: '2026-07-07T00:00:00Z', summary: {} }, { windowEnd: '2026-07-14T00:00:00Z' }];
  const chart = buildThroughputChart(sparse);
  assert.deepEqual(chart.datasets[0].values, [0, 0]);
  assert.deepEqual(chart.datasets[1].values, [0, 0]);
});

test('buildThroughputChart respects maxWindows (only the most recent N)', () => {
  const chart = buildThroughputChart(WINDOWS, { maxWindows: 1 });
  assert.equal(chart.labels.length, 1);
  assert.deepEqual(chart.datasets[0].values, [2]);
});

// ---- buildPmoMetricsMarkdown: the assembled doc ------------------------------------------------------

test('buildPmoMetricsMarkdown embeds three valid ```chart fenced blocks with parseable JSON', () => {
  const markdown = buildPmoMetricsMarkdown({ logEntries: WINDOWS, generatedAt: new Date('2026-07-14T00:00:00Z') });
  const blocks = [...markdown.matchAll(/```chart\n(.+?)\n```/gs)].map((m) => m[1]);
  assert.equal(blocks.length, 3);
  for (const block of blocks) {
    const parsed = JSON.parse(block); // must be valid single-line JSON — SmallDocs' chart renderer requires it
    assert.ok(parsed.type);
  }
});

test('buildPmoMetricsMarkdown front matter parses as YAML-shaped (title + styles keys present)', () => {
  const markdown = buildPmoMetricsMarkdown({ logEntries: WINDOWS, generatedAt: new Date('2026-07-14T00:00:00Z') });
  assert.match(markdown, /^---\ntitle: "PMO metrics - Miyagi Reports"/);
  assert.match(markdown, /\n---\n/);
});

test('buildPmoMetricsMarkdown degrades to a "no data yet" placeholder for an empty log, no charts', () => {
  const markdown = buildPmoMetricsMarkdown({ logEntries: [], generatedAt: new Date('2026-07-14T00:00:00Z') });
  assert.match(markdown, /Sin datos todavia/);
  assert.equal(markdown.includes('```chart'), false);
});

test('buildPmoMetricsMarkdown is deterministic for the same inputs (safe to re-publish/overwrite)', () => {
  const a = buildPmoMetricsMarkdown({ logEntries: WINDOWS, generatedAt: new Date('2026-07-14T00:00:00Z') });
  const b = buildPmoMetricsMarkdown({ logEntries: WINDOWS, generatedAt: new Date('2026-07-14T00:00:00Z') });
  assert.equal(a, b);
});
