import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendStandupArtifactsToMessage,
  buildStandupArtifacts,
  buildStandupDeckData,
  buildStandupDeckMarkdown,
  fillStandupTemplate,
  telegramHtmlToMarkdown,
} from './standup-deck.mjs';
import { telegramHtmlVisibleLength } from './telegram-format.mjs';

const SNAPSHOT = {
  ts: '2026-07-14T12:00:00Z',
  repos: {
    'danybgoode/miyagi-product-management': {
      openNumbers: [84],
      mergedNumbers: [82, 83],
      failingOpenNumbers: [],
      conflictingOpenNumbers: [],
    },
    'danybgoode/miyagisanchezcommerce': {
      openNumbers: [250, 251],
      mergedNumbers: [249],
      failingOpenNumbers: [251],
      conflictingOpenNumbers: [],
    },
  },
  smoke: { conclusion: 'success', status: 'completed', createdAt: '2026-07-14T05:00:00Z' },
  buildOrderDrifted: false,
  stalePreviews: 3,
};

test('telegramHtmlToMarkdown keeps standup emphasis readable in SmallDocs markdown', () => {
  assert.equal(
    telegramHtmlToMarkdown('✅ <b>miyagi-product-management</b> merged: #84 PMO &amp; reporting'),
    '✅ **miyagi-product-management** merged: #84 PMO & reporting'
  );
});

test('buildStandupDeckData summarizes repo and guard signals', () => {
  const data = buildStandupDeckData({
    snapshot: SNAPSHOT,
    deltaLines: ['✅ <b>miyagi-product-management</b> merged: #84 PMO'],
    generatedAt: new Date('2026-07-14T13:00:00Z'),
  });
  assert.equal(data.deck.aspectRatio, '16:9');
  assert.equal(data.window.date, '2026-07-14');
  assert.match(data.summary.bullets, /\*\*miyagi-product-management\*\* merged: #84 PMO/);
  assert.match(data.repos.bullets, /^- \*\*miyagi-product-management:\*\*/m);
  assert.match(data.repos.bullets, /miyagisanchezcommerce:\*\* 2 open; 1 red; 0 conflicts/);
  assert.equal(data.guards.browserSmoke, 'success (2026-07-14)');
  assert.equal(data.guards.buildOrder, 'up to date');
  assert.equal(data.guards.stalePreviews, '3');
});

test('fillStandupTemplate replaces dotted placeholders and leaves unknowns visible', () => {
  const out = fillStandupTemplate('{{window.date}} {{missing.value}}', {
    window: { date: '2026-07-14' },
  });
  assert.equal(out, '2026-07-14 {{missing.value}}');
});

test('buildStandupDeckMarkdown emits a landscape SmallDocs slide deck with no unresolved placeholders', () => {
  const markdown = buildStandupDeckMarkdown({
    snapshot: SNAPSHOT,
    deltaLines: ['🌙 Quiet night'],
    generatedAt: new Date('2026-07-14T13:00:00Z'),
  });
  assert.match(markdown, /^---\ntitle: "Standup diario - 2026-07-14"/);
  assert.match(markdown, /slideAspectRatio: "16:9"/);
  assert.match(markdown, /~~~slide/);
  assert.match(markdown, /#title: Standup diario/);
  assert.match(markdown, /#title: Qué cambió/);
  assert.doesNotMatch(markdown, /\{\{/);
});

test('buildStandupArtifacts returns a SmallDocs presentation URL', () => {
  const [artifact] = buildStandupArtifacts({
    snapshot: SNAPSHOT,
    deltaLines: ['🌙 Quiet night'],
    generatedAt: new Date('2026-07-14T13:00:00Z'),
  });
  assert.equal(artifact.name, 'standup');
  assert.match(artifact.url, /^https:\/\/pmo-smalldocs-oehqqtyoia-uk\.a\.run\.app\/#md=/);
  assert.match(artifact.url, /present=0/);
});

test('appendStandupArtifactsToMessage preserves artifact links when truncating the headline text', () => {
  const result = appendStandupArtifactsToMessage(
    `<b>Standup</b>\n${'x'.repeat(200)}`,
    [{ name: 'standup', url: 'https://example.test/#md=abc&present=0' }],
    120
  );
  assert.ok(telegramHtmlVisibleLength(result) <= 120);
  assert.match(result, /SmallDocs standup: <a href="https:\/\/example\.test\/#md=abc&amp;present=0">abrir daily story<\/a>$/);
  assert.match(result, /…/);
});

test('appendStandupArtifactsToMessage keeps very long SmallDocs hrefs whole because only the label is visible', () => {
  const href = `https://example.test/#md=${'x'.repeat(1200)}&present=0`;
  const result = appendStandupArtifactsToMessage(
    `<b>Standup</b>\n${'x'.repeat(200)}`,
    [{ name: 'standup', url: href }],
    120
  );
  assert.ok(telegramHtmlVisibleLength(result) <= 120);
  assert.match(result, new RegExp(`${'x'.repeat(1200)}&amp;present=0">abrir daily story</a>$`));
});
