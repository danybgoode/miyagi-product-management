// weekly-recap.test.mjs — pure-logic coverage for weekly-recap.mjs's window tracker, git-log status-flip
// parser, retro-digest extractor, and message builder (no gh/git/network I/O — those are exercised live,
// --dry-run, against the real repo per the sprint's verification walkthrough).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWindow,
  parseStatusFlipsFromLog,
  filterFlipsToWindow,
  epicNameFromReadme,
  extractRetroDigest,
  buildMessage,
} from './weekly-recap.mjs';

// ---- computeWindow ----

test('computeWindow: no prior log → falls back to a trailing 7 days', () => {
  const now = new Date('2026-07-09T10:00:00Z');
  const { sinceISO, untilISO } = computeWindow(null, now, null, null);
  assert.equal(sinceISO, '2026-07-02T10:00:00.000Z');
  assert.equal(untilISO, now.toISOString());
});

test('computeWindow: prior log → picks up exactly where the last run left off', () => {
  const now = new Date('2026-07-09T10:00:00Z');
  const last = { windowEnd: '2026-07-03T15:30:00.000Z' };
  const { sinceISO } = computeWindow(last, now, null, null);
  assert.equal(sinceISO, '2026-07-03T15:30:00.000Z');
});

test('computeWindow: --since override wins over both the log and the 7-day fallback', () => {
  const now = new Date('2026-07-09T10:00:00Z');
  const last = { windowEnd: '2026-07-03T15:30:00.000Z' };
  const { sinceISO } = computeWindow(last, now, '2026-06-01T00:00:00Z', null);
  assert.equal(sinceISO, '2026-06-01T00:00:00Z');
});

test('computeWindow: --until override bounds the window instead of "now"', () => {
  const now = new Date('2026-07-09T10:00:00Z');
  const { untilISO } = computeWindow(null, now, '2026-06-01T00:00:00Z', '2026-06-30T23:59:59Z');
  assert.equal(untilISO, '2026-06-30T23:59:59Z');
});

// ---- parseStatusFlipsFromLog ----

test('parseStatusFlipsFromLog: extracts a single shipped flip with its file and commit date', () => {
  const diff = [
    'commit abc123',
    'Date:   2026-07-02T04:59:06+00:00',
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
  assert.deepEqual(flips, [
    { file: 'Roadmap/09-platform-infra/foo/README.md', status: 'shipped', date: '2026-07-02T04:59:06+00:00' },
  ]);
});

test('parseStatusFlipsFromLog: archived flip is also captured', () => {
  const diff = [
    'Date:   2026-07-02T05:00:00+00:00',
    'diff --git a/Roadmap/03-selling-and-shops/bar/README.md b/Roadmap/03-selling-and-shops/bar/README.md',
    '-status: in-progress',
    '+status: archived',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), [
    { file: 'Roadmap/03-selling-and-shops/bar/README.md', status: 'archived', date: '2026-07-02T05:00:00+00:00' },
  ]);
});

test('parseStatusFlipsFromLog: ignores non-terminal status values (e.g. scaffolded → in-progress)', () => {
  const diff = [
    'Date:   2026-07-02T05:00:00+00:00',
    'diff --git a/Roadmap/01-discovery-and-shopping/baz/README.md b/Roadmap/01-discovery-and-shopping/baz/README.md',
    '-status: scaffolded',
    '+status: in-progress',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), []);
});

test('parseStatusFlipsFromLog: two files in the same log → both captured independently with their own dates', () => {
  const diff = [
    'Date:   2026-07-01T10:00:00+00:00',
    'diff --git a/Roadmap/09-platform-infra/one/README.md b/Roadmap/09-platform-infra/one/README.md',
    '-status: in-progress',
    '+status: shipped',
    'Date:   2026-07-02T11:00:00+00:00',
    'diff --git a/Roadmap/07-agentic-and-federated-commerce/two/README.md b/Roadmap/07-agentic-and-federated-commerce/two/README.md',
    '-status: in-progress',
    '+status: archived',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), [
    { file: 'Roadmap/09-platform-infra/one/README.md', status: 'shipped', date: '2026-07-01T10:00:00+00:00' },
    { file: 'Roadmap/07-agentic-and-federated-commerce/two/README.md', status: 'archived', date: '2026-07-02T11:00:00+00:00' },
  ]);
});

test('parseStatusFlipsFromLog: last chronological flip (and its date) wins when a file flips twice (input pre-ordered oldest→newest)', () => {
  const diff = [
    'Date:   2026-07-01T09:00:00+00:00',
    'diff --git a/Roadmap/09-platform-infra/flappy/README.md b/Roadmap/09-platform-infra/flappy/README.md',
    '-status: scaffolded',
    '+status: in-progress',
    'Date:   2026-07-02T09:00:00+00:00',
    'diff --git a/Roadmap/09-platform-infra/flappy/README.md b/Roadmap/09-platform-infra/flappy/README.md',
    '-status: in-progress',
    '+status: shipped',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), [
    { file: 'Roadmap/09-platform-infra/flappy/README.md', status: 'shipped', date: '2026-07-02T09:00:00+00:00' },
  ]);
});

test('parseStatusFlipsFromLog: a bare "+++ b/..." diff header line never matches as a status line', () => {
  const diff = [
    'Date:   2026-07-02T05:00:00+00:00',
    'diff --git a/Roadmap/09-platform-infra/foo/README.md b/Roadmap/09-platform-infra/foo/README.md',
    '+++ b/Roadmap/09-platform-infra/foo/README.md',
  ].join('\n');
  assert.deepEqual(parseStatusFlipsFromLog(diff), []);
});

// ---- filterFlipsToWindow ----

test('filterFlipsToWindow: a flip inside the window is kept', () => {
  const flips = [{ file: 'a/README.md', status: 'shipped', date: '2026-07-02T12:00:00+00:00' }];
  assert.deepEqual(
    filterFlipsToWindow(flips, '2026-07-01T00:00:00Z', '2026-07-09T00:00:00Z'),
    flips
  );
});

test('filterFlipsToWindow: a flip exactly ON the lower bound is INCLUDED (half-open, closed at the start)', () => {
  const flips = [{ file: 'a/README.md', status: 'shipped', date: '2026-07-01T00:00:00Z' }];
  assert.equal(filterFlipsToWindow(flips, '2026-07-01T00:00:00Z', '2026-07-09T00:00:00Z').length, 1);
});

test('filterFlipsToWindow: a flip exactly ON the upper bound is EXCLUDED (half-open, open at the end) — this is what stops a boundary-second commit double-counting across two consecutive runs', () => {
  const flips = [{ file: 'a/README.md', status: 'shipped', date: '2026-07-09T00:00:00Z' }];
  assert.equal(filterFlipsToWindow(flips, '2026-07-01T00:00:00Z', '2026-07-09T00:00:00Z').length, 0);
});

test('filterFlipsToWindow: a flip before sinceISO or at/after untilISO is dropped', () => {
  const flips = [
    { file: 'before/README.md', status: 'shipped', date: '2026-06-30T23:59:59Z' },
    { file: 'inside/README.md', status: 'shipped', date: '2026-07-05T00:00:00Z' },
    { file: 'after/README.md', status: 'shipped', date: '2026-07-09T00:00:01Z' },
  ];
  const kept = filterFlipsToWindow(flips, '2026-07-01T00:00:00Z', '2026-07-09T00:00:00Z');
  assert.deepEqual(kept.map((f) => f.file), ['inside/README.md']);
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

// formatPrList / truncateForTelegram now live in scripts/lib/telegram-format.mjs (shared with
// standup.mjs) — their coverage moved to scripts/lib/telegram-format.test.mjs.

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
    shippedEpics: { available: true, epics: [] },
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
    shippedEpics: {
      available: true,
      epics: [{ file: 'x/README.md', status: 'shipped', name: 'Cool Epic', retroDigest: 'It shipped well.' }],
    },
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
    shippedEpics: { available: true, epics: [] },
  });
  assert.match(msg, /miyagi-product-management: unavailable/);
});

test('buildMessage: an unavailable epic read is labeled, never folded into "none"/quiet-week', () => {
  const msg = buildMessage({
    sinceISO: '2026-07-02T00:00:00Z',
    untilISO: '2026-07-09T00:00:00Z',
    repoResults: [
      { repo: 'danybgoode/miyagi-product-management', available: true, prs: [] },
      { repo: 'danybgoode/miyagisanchezcommerce', available: true, prs: [] },
      { repo: 'danybgoode/medusa-bonsai-backend', available: true, prs: [] },
    ],
    shippedEpics: { available: false, epics: [] },
  });
  assert.match(msg, /unavailable \(git log read failed\)/);
  assert.doesNotMatch(msg, /Quiet week/);
});

test('buildMessage: a busy repo caps its listed PRs via formatPrList (message stays well under 4096 chars)', () => {
  const busyPrs = Array.from({ length: 40 }, (_, i) => ({
    number: i + 1,
    title: `feat(something): a reasonably long PR title number ${i + 1}`,
  }));
  const msg = buildMessage({
    sinceISO: '2026-06-25T00:00:00Z',
    untilISO: '2026-07-02T00:00:00Z',
    repoResults: [
      { repo: 'danybgoode/miyagi-product-management', available: true, prs: [] },
      { repo: 'danybgoode/miyagisanchezcommerce', available: true, prs: busyPrs },
      { repo: 'danybgoode/medusa-bonsai-backend', available: true, prs: [] },
    ],
    shippedEpics: { available: true, epics: [] },
  });
  assert.match(msg, /miyagisanchezcommerce \(40\):/); // the header count stays exact
  assert.match(msg, /…and 28 more/); // only 12 titles listed, per MAX_PRS_SHOWN_PER_REPO
  assert.ok(msg.length < 4096);
});

test('buildMessage: a repo that hit the gh fetch cap is flagged as possibly-incomplete, not silently trusted', () => {
  const msg = buildMessage({
    sinceISO: '2026-06-01T00:00:00Z',
    untilISO: '2026-06-30T23:59:59Z',
    repoResults: [
      { repo: 'danybgoode/miyagi-product-management', available: true, prs: [] },
      {
        repo: 'danybgoode/miyagisanchezcommerce',
        available: true,
        capped: true,
        prs: [{ number: 1, title: 'x' }],
      },
      { repo: 'danybgoode/medusa-bonsai-backend', available: true, prs: [] },
    ],
    shippedEpics: { available: true, epics: [] },
  });
  assert.match(msg, /hit the fetch cap/);
});
