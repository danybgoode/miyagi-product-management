// weekly-recap.test.mjs — pure-logic coverage for weekly-recap.mjs's window tracker, git-log status-flip
// parser, retro-digest extractor, and message builder (no gh/git/network I/O — those are exercised live,
// --dry-run, against the real repo per the sprint's verification walkthrough).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWindow,
  parseStatusFlipsFromLog,
  epicNameFromReadme,
  extractRetroDigest,
  buildMessage,
} from './weekly-recap.mjs';

// ---- computeWindow ----

test('computeWindow: no prior log → falls back to a trailing 7 days', () => {
  const now = new Date('2026-07-09T10:00:00Z');
  const { sinceISO, untilISO } = computeWindow(null, now, null);
  assert.equal(sinceISO, '2026-07-02T10:00:00.000Z');
  assert.equal(untilISO, now.toISOString());
});

test('computeWindow: prior log → picks up exactly where the last run left off', () => {
  const now = new Date('2026-07-09T10:00:00Z');
  const last = { windowEnd: '2026-07-03T15:30:00.000Z' };
  const { sinceISO } = computeWindow(last, now, null);
  assert.equal(sinceISO, '2026-07-03T15:30:00.000Z');
});

test('computeWindow: --since override wins over both the log and the 7-day fallback', () => {
  const now = new Date('2026-07-09T10:00:00Z');
  const last = { windowEnd: '2026-07-03T15:30:00.000Z' };
  const { sinceISO } = computeWindow(last, now, '2026-06-01T00:00:00Z');
  assert.equal(sinceISO, '2026-06-01T00:00:00Z');
});

// ---- parseStatusFlipsFromLog ----

test('parseStatusFlipsFromLog: extracts a single shipped flip with its file', () => {
  const diff = [
    'commit abc123',
    'diff --git a/Roadmap/09-platform-infra/foo/README.md b/Roadmap/09-platform-infra/foo/README.md',
    '--- a/Roadmap/09-platform-infra/foo/README.md',
    '+++ b/Roadmap/09-platform-infra/foo/README.md',
    '@@ -1,3 +1,3 @@',
    ' ---',
    '-status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.',
    '+status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.',
    ' slug: foo',
  ].join('\n');
  const flips = parseStatusFlipsFromLog(diff);
  assert.deepEqual(flips, [{ file: 'Roadmap/09-platform-infra/foo/README.md', status: 'shipped' }]);
});

test('parseStatusFlipsFromLog: archived flip is also captured', () => {
  const diff = [
    'diff --git a/Roadmap/03-selling-and-shops/bar/README.md b/Roadmap/03-selling-and-shops/bar/README.md',
    '-status: in-progress',
    '+status: archived',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), [
    { file: 'Roadmap/03-selling-and-shops/bar/README.md', status: 'archived' },
  ]);
});

test('parseStatusFlipsFromLog: ignores non-terminal status values (e.g. scaffolded → in-progress)', () => {
  const diff = [
    'diff --git a/Roadmap/01-discovery-and-shopping/baz/README.md b/Roadmap/01-discovery-and-shopping/baz/README.md',
    '-status: scaffolded',
    '+status: in-progress',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), []);
});

test('parseStatusFlipsFromLog: two files in the same log → both captured independently', () => {
  const diff = [
    'diff --git a/Roadmap/09-platform-infra/one/README.md b/Roadmap/09-platform-infra/one/README.md',
    '-status: in-progress',
    '+status: shipped',
    'diff --git a/Roadmap/07-agentic-and-federated-commerce/two/README.md b/Roadmap/07-agentic-and-federated-commerce/two/README.md',
    '-status: in-progress',
    '+status: archived',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), [
    { file: 'Roadmap/09-platform-infra/one/README.md', status: 'shipped' },
    { file: 'Roadmap/07-agentic-and-federated-commerce/two/README.md', status: 'archived' },
  ]);
});

test('parseStatusFlipsFromLog: last chronological flip wins when a file flips twice (input pre-ordered oldest→newest)', () => {
  const diff = [
    'diff --git a/Roadmap/09-platform-infra/flappy/README.md b/Roadmap/09-platform-infra/flappy/README.md',
    '-status: scaffolded',
    '+status: in-progress',
    'diff --git a/Roadmap/09-platform-infra/flappy/README.md b/Roadmap/09-platform-infra/flappy/README.md',
    '-status: in-progress',
    '+status: shipped',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), [
    { file: 'Roadmap/09-platform-infra/flappy/README.md', status: 'shipped' },
  ]);
});

test('parseStatusFlipsFromLog: a bare "+++ b/..." diff header line never matches as a status line', () => {
  const diff = [
    'diff --git a/Roadmap/09-platform-infra/foo/README.md b/Roadmap/09-platform-infra/foo/README.md',
    '+++ b/Roadmap/09-platform-infra/foo/README.md',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), []);
});

// ---- epicNameFromReadme ----

test('epicNameFromReadme: strips a leading "Epic:" prefix from the H1', () => {
  const md = '---\nstatus: shipped\n---\n\n# Epic: Ops routines & reporting — standup, weekly recap\n\nMore.';
  assert.equal(epicNameFromReadme(md, 'Roadmap/09-platform-infra/ops-routines-reporting/README.md'), 'Ops routines & reporting — standup, weekly recap');
});

test('epicNameFromReadme: no H1 → falls back to the slug from the path', () => {
  assert.equal(epicNameFromReadme('no heading here', 'Roadmap/09-platform-infra/some-slug/README.md'), 'some-slug');
});

// ---- extractRetroDigest ----

test('extractRetroDigest: pulls the first paragraph under "## What shipped"', () => {
  const md = [
    '# Retrospective — Foo',
    '',
    '**Shipped:** 2026-07-02.',
    '',
    '## What shipped',
    'The thing that shipped, in one paragraph spanning',
    'multiple lines of the same block.',
    '',
    '- a bullet that should NOT be included',
    '',
    '## What went well',
    'Something else entirely.',
  ].join('\n');
  const digest = extractRetroDigest(md, 1000);
  assert.match(digest, /^The thing that shipped/);
  assert.doesNotMatch(digest, /bullet/);
});

test('extractRetroDigest: caps at maxChars with an ellipsis', () => {
  const md = `## What shipped\n${'x'.repeat(500)}\n\n## Next`;
  const digest = extractRetroDigest(md, 50);
  assert.equal(digest.length, 51); // 50 chars + the ellipsis char
  assert.ok(digest.endsWith('…'));
});

test('extractRetroDigest: no "## What shipped" section → null, not a throw', () => {
  assert.equal(extractRetroDigest('# Retrospective — Foo\n\nJust some text.', 300), null);
});

// ---- buildMessage ----

test('buildMessage: fully quiet week collapses to a one-line message', () => {
  const msg = buildMessage({
    sinceISO: '2026-07-02T00:00:00Z',
    untilISO: '2026-07-09T00:00:00Z',
    repoResults: [
      { repo: 'danybgoode/miyagi-product-management', available: true, prs: [] },
      { repo: 'danybgoode/miyagisanchezcommerce', available: true, prs: [] },
      { repo: 'danybgoode/medusa-bonsai-backend', available: true, prs: [] },
    ],
    shippedEpics: [],
  });
  assert.match(msg, /Quiet week/);
});

test('buildMessage: a merged PR and a shipped epic both surface, with the retro digest', () => {
  const msg = buildMessage({
    sinceISO: '2026-07-02T00:00:00Z',
    untilISO: '2026-07-09T00:00:00Z',
    repoResults: [
      { repo: 'danybgoode/miyagi-product-management', available: true, prs: [] },
      {
        repo: 'danybgoode/miyagisanchezcommerce',
        available: true,
        prs: [{ number: 200, title: 'feat: something', url: 'https://x' }],
      },
      { repo: 'danybgoode/medusa-bonsai-backend', available: true, prs: [] },
    ],
    shippedEpics: [{ file: 'x/README.md', status: 'shipped', name: 'Cool Epic', retroDigest: 'It shipped well.' }],
  });
  assert.match(msg, /#200 feat: something/);
  assert.match(msg, /Cool Epic/);
  assert.match(msg, /It shipped well\./);
  assert.doesNotMatch(msg, /Quiet week/);
});

test('buildMessage: an unavailable repo is labeled, not silently dropped', () => {
  const msg = buildMessage({
    sinceISO: '2026-07-02T00:00:00Z',
    untilISO: '2026-07-09T00:00:00Z',
    repoResults: [
      { repo: 'danybgoode/miyagi-product-management', available: false, prs: [] },
      { repo: 'danybgoode/miyagisanchezcommerce', available: true, prs: [] },
      { repo: 'danybgoode/medusa-bonsai-backend', available: true, prs: [] },
    ],
    shippedEpics: [],
  });
  assert.match(msg, /miyagi-product-management: unavailable/);
});
