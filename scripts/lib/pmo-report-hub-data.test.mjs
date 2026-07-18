import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReportHubData,
  buildRoadmapItemMarkdown,
  extractHeadings,
  firstUsefulParagraph,
  parseProgress,
  stripFrontmatter,
  summarizeRoadmapRows,
} from './pmo-report-hub-data.mjs';

const ROWS = [
  {
    name: 'PMO operational reports',
    slug: 'pmo-operational-reports',
    grain: 'Epic',
    status: 'Shipped',
    area: '09 Platform-infra',
    priority: 'Wave 1',
    risk: 'Low',
    sprint_progress: '12/12 stories',
    build_order: 3,
    doc_link: 'Roadmap/09-platform-infra/pmo-operational-reports/README.md',
  },
  {
    name: 'PMO operational reports - S3',
    slug: 'pmo-operational-reports--s3',
    grain: 'Sprint',
    status: 'Shipped',
    area: '09 Platform-infra',
    risk: 'Low',
    sprint_progress: '2/2 stories',
    build_order: 3,
    doc_link: 'Roadmap/09-platform-infra/pmo-operational-reports/sprint-3.md',
  },
  {
    name: 'Future report hub',
    slug: 'future-report-hub',
    grain: 'Seed',
    status: 'Ready',
    area: '09 Platform-infra',
    priority: 'Wave 2',
    risk: 'Low',
    sprint_progress: null,
    build_order: null,
    doc_link: 'Roadmap/00-ideas/seeds/future-report-hub.md',
  },
];

const DOCS = new Map([
  ['Roadmap/09-platform-infra/pmo-operational-reports/README.md', [
    '---',
    'status: shipped',
    '---',
    '',
    '# Epic: PMO operational reports',
    '',
    'Daniel wants to run the project like a PMO, communicating operational performance to stakeholders with scrum and DORA language while making the AI-agent-assisted pod easy to understand.',
    '',
    '## Why',
    'Useful context.',
    '',
    '## Scope',
    'Useful scope.',
  ].join('\n')],
  ['Roadmap/09-platform-infra/pmo-operational-reports/sprint-3.md', '# Sprint 3\n\nSprint delivery summary with enough public context to become the first useful paragraph for a generated report card.\n\n## Stories'],
  ['Roadmap/00-ideas/seeds/future-report-hub.md', '# Future\n\nA compact public-facing report hub idea for investors and clients who need a polished summary.'],
]);

test('stripFrontmatter removes only the opening YAML block', () => {
  assert.equal(stripFrontmatter('---\na: b\n---\n\n# Title'), '# Title');
  assert.equal(stripFrontmatter('# Title'), '# Title');
});

test('firstUsefulParagraph and extractHeadings make curated summaries', () => {
  const md = DOCS.get('Roadmap/09-platform-infra/pmo-operational-reports/README.md');
  assert.match(firstUsefulParagraph(md), /Daniel wants to run/);
  assert.deepEqual(extractHeadings(md), ['Why', 'Scope']);
});

test('parseProgress reads done and total story counts', () => {
  assert.deepEqual(parseProgress('12/15 stories'), { done: 12, total: 15, percent: 80 });
  assert.deepEqual(parseProgress('-'), { done: null, total: null, percent: null });
});

test('summarizeRoadmapRows counts public roadmap grains', () => {
  assert.deepEqual(summarizeRoadmapRows(ROWS), {
    total: 3,
    epics: 1,
    sprints: 1,
    seeds: 1,
    shippedEpics: 1,
    activeEpics: 0,
    scaffoldedEpics: 0,
    funnelSeeds: 1,
    byStatus: { Shipped: 1 },
    byArea: { '09 Platform-infra': 1 },
  });
});

// S2.1 regression: a seed that already shipped/scaffolded is NOT a funnel member, even though it's
// still grain:'Seed' — matches Roadmap/00-ideas/BUILD-ORDER.md's "Funnel" definition exactly (both this
// module and scripts/build-order.mjs import the funnel-status set from
// scripts/lib/roadmap-status-buckets.mjs, so this can't silently re-diverge).
test('summarizeRoadmapRows.funnelSeeds excludes seeds that have shipped/scaffolded/archived', () => {
  const rowsWithGraduatedSeed = [
    ...ROWS,
    { name: 'Graduated idea', slug: 'graduated-idea', grain: 'Seed', status: 'Shipped', area: '09 Platform-infra', doc_link: 'Roadmap/00-ideas/seeds/graduated-idea.md' },
    { name: 'Retired idea', slug: 'retired-idea', grain: 'Seed', status: 'Archived', area: '09 Platform-infra', doc_link: 'Roadmap/00-ideas/seeds/retired-idea.md' },
  ];
  const stats = summarizeRoadmapRows(rowsWithGraduatedSeed);
  assert.equal(stats.seeds, 3, 'all 3 seed rows still counted as seeds');
  assert.equal(stats.funnelSeeds, 1, 'only the Ready seed is a funnel member');
});

test('buildRoadmapItemMarkdown emits a polished SmallDocs report, not raw markdown', () => {
  const md = buildRoadmapItemMarkdown(ROWS[0], {
    markdown: DOCS.get(ROWS[0].doc_link),
    generatedAt: new Date('2026-07-14T00:00:00Z'),
  });
  assert.match(md, /^---\n/);
  assert.match(md, /# PMO operational reports/);
  assert.match(md, /## Resumen/);
  assert.match(md, /Abrir en GitHub/);
});

test('buildReportHubData creates relative SmallDocs links for hosted reports', () => {
  const data = buildReportHubData(ROWS, {
    generatedAt: new Date('2026-07-14T00:00:00Z'),
    readDoc: (docLink) => DOCS.get(docLink),
  });
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.stats.epics, 1);
  assert.equal(data.views.length, 5);
  assert.equal(data.items.length, 3);
  assert.ok(data.views.every((view) => view.href.startsWith('/docs#md=')));
  assert.ok(data.items.every((item) => item.href.startsWith('/docs#md=')));
  assert.ok(data.items.every((item) => item.sourceUrl.includes(item.sourcePath)));
});
