import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeRepoPath,
  isTestSurface,
  inspectPatch,
  decideAutoMerge,
  formatReport,
} from './smoke-triage-scope.mjs';

// A minimal `GET /pulls/{n}/files` entry. Every test builds from this so the shape stays honest to
// the real API rather than to whatever each test found convenient.
const file = (filename, patch, extra = {}) => ({ filename, status: 'modified', patch, ...extra });
const clean = (filename) => file(filename, '@@ -1 +1 @@\n-const a = 1\n+const a = 2\n');

test('normalizeRepoPath refuses anything that is not a plain repo-relative path', () => {
  assert.equal(normalizeRepoPath('e2e/foo.spec.ts'), 'e2e/foo.spec.ts');
  assert.equal(normalizeRepoPath('  e2e/foo.spec.ts  '), 'e2e/foo.spec.ts');

  // The whole reason normalization exists: this string starts with `e2e/` and is app code.
  assert.equal(normalizeRepoPath('e2e/../app/page.tsx'), null);
  assert.equal(normalizeRepoPath('/etc/passwd'), null);
  assert.equal(normalizeRepoPath('e2e\\foo.ts'), null);
  assert.equal(normalizeRepoPath('e2e//foo.ts'), null);
  assert.equal(normalizeRepoPath('./e2e/foo.ts'), null);
  assert.equal(normalizeRepoPath(''), null);
  assert.equal(normalizeRepoPath(undefined), null);
});

test('isTestSurface admits the smoke scaffolding and nothing else', () => {
  assert.equal(isTestSurface('e2e/pdp-gallery.browser.spec.ts'), true);
  assert.equal(isTestSurface('e2e/_helpers/gallery-fixture.ts'), true);
  assert.equal(isTestSurface('playwright.config.ts'), true);
  assert.equal(isTestSurface('.github/workflows/browser-smoke.yml'), true);
  assert.equal(isTestSurface('scripts/browser-smoke-summary.mjs'), true);

  assert.equal(isTestSurface('app/(shell)/l/[id]/Gallery.tsx'), false);
  assert.equal(isTestSurface('lib/flags.ts'), false);
  assert.equal(isTestSurface('components/feedback/Toast.tsx'), false);
  assert.equal(isTestSurface('supabase/migrations/20260101_x.sql'), false);

  // Allow-list, not deny-list: an unheard-of top-level directory is app code, not a gap.
  assert.equal(isTestSurface('packages/brand-new/index.ts'), false);

  // Adjacent names must not ride the prefix in.
  assert.equal(isTestSurface('e2e-legacy/foo.spec.ts'), false);
  assert.equal(isTestSurface('.github/workflows/ci.yml'), false);
  assert.equal(isTestSurface('playwright.config.ts.bak'), false);
});

test('a test-only diff that changes real behaviour is allowed', () => {
  const decision = decideAutoMerge([
    file('e2e/_helpers/gallery-fixture.ts',
      '@@ -75,7 +75,7 @@\n-  if (envOverride) return { listingId: envOverride, source: \'env\' }\n+  const pinned = await resolvePinnedListing(request, photos, envOverride)\n'),
    file('e2e/gallery-fixture.spec.ts',
      '@@ -1,1 +1,3 @@\n+  test(\'a live pin is used as-is\', async () => {\n+    expect(fixture).toEqual({ listingId: \'pinned_1\' })\n+  })\n'),
  ]);
  assert.equal(decision.verdict, 'allow');
  assert.equal(decision.exitCode, 0);
  assert.deepEqual(decision.blockers, []);
  assert.equal(decision.surface.length, 2);
});

test('one app-code file blocks the whole PR, however green it is', () => {
  const decision = decideAutoMerge([clean('e2e/pdp-gallery.browser.spec.ts'), clean('app/(shell)/l/[id]/Gallery.tsx')]);
  assert.equal(decision.verdict, 'block');
  assert.equal(decision.exitCode, 1);
  assert.deepEqual(decision.appCode, ['app/(shell)/l/[id]/Gallery.tsx']);
  assert.ok(decision.blockers.some((b) => b.id === 'outside-test-surface'));
});

test('a traversal path is app code, not test surface', () => {
  const decision = decideAutoMerge([clean('e2e/../app/page.tsx')]);
  assert.equal(decision.verdict, 'block');
  assert.ok(decision.blockers.some((b) => b.id === 'outside-test-surface'));
});

// ── The weakening gate: every cheap way to turn a red nightly green ────────────────────────────

test('adding test.skip() blocks, even inside the test surface', () => {
  const decision = decideAutoMerge([
    file('e2e/pdp-gallery.browser.spec.ts', '@@ -1 +1,2 @@\n+  test.skip(true, \'flaky\')\n'),
  ]);
  assert.equal(decision.verdict, 'block');
  assert.ok(decision.blockers.some((b) => b.id === 'skip-added'));
});

test('test.fixme, test.only and serial mode each block', () => {
  for (const [line, id] of [
    ['+  test.fixme(\'broken\', async () => {})', 'fixme-added'],
    ['+  test.only(\'just this one\', async () => {})', 'only-added'],
    ['+  test.describe.configure({ mode: \'serial\' })', 'serial-added'],
  ]) {
    const decision = decideAutoMerge([file('e2e/x.spec.ts', `@@ -1 +1,2 @@\n${line}\n`)]);
    assert.equal(decision.verdict, 'block', `${id} should block`);
    assert.ok(decision.blockers.some((b) => b.id === id), `${id} not detected in: ${line}`);
  }
});

test('deleting an assertion blocks — the spec would test less than it did', () => {
  const decision = decideAutoMerge([
    file('e2e/pdp-gallery.browser.spec.ts',
      '@@ -1,3 +1,2 @@\n   await page.goto(url)\n-  await expect(page.getByTestId(\'gallery-counter\')).toBeVisible()\n'),
  ]);
  assert.equal(decision.verdict, 'block');
  assert.ok(decision.blockers.some((b) => b.id === 'assertion-deleted'));
});

test('deleting a spec FILE blocks', () => {
  const decision = decideAutoMerge([
    file('e2e/pdp-gallery.browser.spec.ts', '@@ -1,2 +0,0 @@\n-test(\'x\', () => {})\n', { status: 'removed' }),
  ]);
  assert.equal(decision.verdict, 'block');
  assert.ok(decision.blockers.some((b) => b.id === 'file-deleted'));
});

test('retiring the zero-photo spec blocks — correct, but the product owner\'s call, not the routine\'s', () => {
  // The real 2026-08-17 change. It was right, and it still must not auto-merge: the reason it was
  // right is that Daniel said so after it was surfaced to him twice.
  const decision = decideAutoMerge([
    file('e2e/pdp-gallery.browser.spec.ts',
      '@@ -169,10 +169,1 @@\n-test.describe(\'pdp · zero-image placeholder parity (browser)\', () => {\n'
      + '-    await expect(page.getByTestId(\'gallery-back\')).toBeVisible()\n'
      + '-    await expect(page.getByTestId(\'gallery-share\')).toBeVisible()\n'
      + '+ * RETIRED 2026-08-17: no public zero-photo listing exists.\n'),
  ]);
  assert.equal(decision.verdict, 'block');
  assert.ok(decision.blockers.some((b) => b.id === 'assertion-deleted'));
});

test('test.slow() is NOT a weakening — raising a timeout budget is a legitimate shipped fix', () => {
  // PR #349 did exactly this. A guard that rejects correct output is worse than one that misses a
  // rare fault: block this and the routine is useless for the commonest real failure it sees.
  const decision = decideAutoMerge([
    file('e2e/agent-prompt.browser.spec.ts', '@@ -1 +1,2 @@\n+  test.slow()\n'),
  ]);
  assert.equal(decision.verdict, 'allow');
});

test('a word ending in the pattern name is not the pattern', () => {
  const decision = decideAutoMerge([
    file('e2e/x.spec.ts', '@@ -1 +1,2 @@\n+  const shouldNotTest = maybeTest.skipped\n+  // mytest.skip is a comment about test.skip\n'),
  ]);
  // `mytest.skip(` never appears with a paren, and `maybeTest.skipped` is not a call.
  assert.equal(decision.verdict, 'allow');
});

test('diff headers are not scanned as content', () => {
  const decision = decideAutoMerge([
    file('e2e/x.spec.ts', '--- a/e2e/x.spec.ts\n+++ b/e2e/x.spec.ts\n@@ -1 +1 @@\n-const a = 1\n+const a = 2\n'),
  ]);
  assert.equal(decision.verdict, 'allow');
});

// ── Three states, never two ───────────────────────────────────────────────────────────────────

test('zero files is UNDECIDABLE, never allow', () => {
  for (const input of [[], null, undefined, 'nonsense']) {
    const decision = decideAutoMerge(input);
    assert.equal(decision.verdict, 'undecidable');
    assert.equal(decision.exitCode, 2);
  }
});

test('an unreadable patch is UNDECIDABLE, never allow', () => {
  // GitHub omits `patch` for binaries and for diffs past its size cap. "I could not look" is not
  // "it is fine" — this is the exact collapse AGENTS.md rule 5 bans.
  const decision = decideAutoMerge([file('e2e/fixtures/screenshot.png', undefined)]);
  assert.equal(decision.verdict, 'undecidable');
  assert.equal(decision.exitCode, 2);
  assert.ok(decision.blockers.some((b) => b.id === 'patch-unreadable'));
});

test('undecidable outranks block — a partly-unread diff must not report as merely blocked', () => {
  const decision = decideAutoMerge([clean('app/page.tsx'), file('e2e/img.png', undefined)]);
  assert.equal(decision.verdict, 'undecidable');
  assert.ok(decision.blockers.some((b) => b.id === 'outside-test-surface'));
  assert.ok(decision.blockers.some((b) => b.id === 'patch-unreadable'));
});

test('a pure rename carries no patch and is not undecidable', () => {
  const decision = decideAutoMerge([
    { filename: 'e2e/renamed.spec.ts', status: 'renamed', changes: 0 },
  ]);
  assert.equal(decision.verdict, 'allow');
});

test('formatReport names the verdict, the files and every blocker', () => {
  const report = formatReport(decideAutoMerge([
    clean('app/page.tsx'),
    file('e2e/x.spec.ts', '@@ -1 +1,2 @@\n+  test.skip(true)\n'),
  ]));
  assert.match(report, /^smoke-triage scope: BLOCK/);
  assert.match(report, /app code \(1\): app\/page\.tsx/);
  assert.match(report, /outside-test-surface/);
  assert.match(report, /skip-added/);
});
