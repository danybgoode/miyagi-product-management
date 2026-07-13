import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSmallDocsUrl,
  buildTemplateData,
  fillPmoTemplate,
  fillTemplate,
} from './pmo-templates.mjs';

const METRICS = {
  window: { sinceISO: '2026-07-01T00:00:00Z', untilISO: '2026-07-08T00:00:00Z' },
  throughput: { shippedStories: 8, shippedEpics: 2, closedEpics: 2 },
  prCycleTime: { medianHours: 9.5, averageHours: 12.2, p90Hours: 24 },
  epicLeadTime: { medianDays: 4, averageDays: 5 },
  deployFrequency: { total: 6 },
  changeFailProxy: { count: 1 },
  docOps: {
    learningsPromotions: 3,
    retroCoverage: { covered: 2, total: 2, percent: 100 },
  },
};

test('buildTemplateData maps PMO metrics into stable template fields', () => {
  assert.deepEqual(buildTemplateData(METRICS, {
    generatedAt: new Date('2026-07-09T12:00:00Z'),
    benchmarks: { deploys: 1, prCycleMedianHours: 72 },
  }), {
    window: {
      sinceISO: '2026-07-01T00:00:00Z',
      untilISO: '2026-07-08T00:00:00Z',
      label: '2026-07-01 a 2026-07-08',
      generatedDate: '2026-07-09',
    },
    throughput: { shippedStories: 8, shippedEpics: 2, closedEpics: 2 },
    cycle: { medianHours: 9.5, averageHours: 12.2, p90Hours: 24 },
    epics: { medianDays: 4, averageDays: 5 },
    deploys: { total: 6 },
    quality: { changeFailProxy: 1 },
    docOps: { learningsPromotions: 3, retroCovered: 2, retroTotal: 2, retroPercent: 100 },
    benchmarks: {
      storiesShipped: 0,
      epicsShipped: 0,
      deploys: 1,
      prCycleMedianHours: 72,
      epicLeadMedianDays: 0,
      changeFailProxy: 0,
      learningsPromotions: 0,
      retroCoveragePercent: 0,
    },
  });
});

test('fillTemplate replaces dotted placeholders and leaves unknown placeholders visible', () => {
  const output = fillTemplate(
    'Semana {{ window.label }}: {{throughput.shippedStories}} historias; {{missing.value}}.',
    METRICS,
    { generatedAt: new Date('2026-07-09T12:00:00Z') }
  );
  assert.equal(output, 'Semana 2026-07-01 a 2026-07-08: 8 historias; {{missing.value}}.');
});

test('weekly story-deck fixture fills to exact smalldocs markdown markers', () => {
  const output = fillPmoTemplate('weekly', METRICS, { generatedAt: new Date('2026-07-09T12:00:00Z') });
  assert.match(output, /^---\ntitle: "PMO semanal - 2026-07-01 a 2026-07-08"/);
  assert.match(output, /#metric: 8/);
  assert.match(output, /"values":\[8,2,6,1\]/);
  assert.match(output, /Diferencial, no experimento controlado\./);
  assert.doesNotMatch(output, /\{\{/);
});

test('monthly packet fixture fills table and chart output', () => {
  const output = fillPmoTemplate('monthly', METRICS, { generatedAt: new Date('2026-07-09T12:00:00Z') });
  assert.match(output, /\| Historias shipped \| 8 \|/);
  assert.match(output, /\| Ciclo PR mediano \| 9.5h \|/);
  assert.match(output, /"values":\[8,2,6,3\]/);
  assert.doesNotMatch(output, /\{\{/);
});

test('metrics sheet fixture exports live formula cells', () => {
  const output = fillPmoTemplate('sheet', METRICS, {
    generatedAt: new Date('2026-07-09T12:00:00Z'),
    benchmarks: { storiesShipped: 4, deploys: 1, prCycleMedianHours: 72, retroCoveragePercent: 80 },
  });
  assert.equal(output, `---
title: "PMO metrics sheet - 2026-07-01 a 2026-07-08"
styles:
  fontFamily: "Inter"
  baseFontSize: 15
  lineHeight: 1.6
---

# PMO metrics sheet - 2026-07-01 a 2026-07-08

\`\`\`cells
Metric,Value,Benchmark,Differential
Stories shipped,8,4,=B2-C2
Epics shipped,2,0,=B3-C3
Deploys,6,1,=B4-C4
PR cycle median hours,9.5,72,=B5-C5
Epic lead median days,4,0,=B6-C6
Change-fail proxy,1,0,=B7-C7
LEARNINGS promotions,3,0,=B8-C8
Retro coverage %,100,80,=B9-C9
\`\`\`

Notas:

- Las formulas exportan a Excel como formulas vivas.
- Los benchmarks se cargan desde \`benchmarks.json\` cuando existe; hasta entonces usan ceros de fixture.
- La lectura es diferencial operativo, no experimento controlado.
`);
});

test('buildSmallDocsUrl emits a smalldocs hash URL with md payload and optional present mode', () => {
  const url = buildSmallDocsUrl('# Hola', { baseUrl: 'https://example.test', present: true });
  assert.match(url, /^https:\/\/example\.test\/#md=/);
  assert.match(url, /present=0/);
});
