// owed-ledger.test.mjs — the categoriser and the no-loss guarantee. All pure: no spec tree, no I/O.

import test from 'node:test';
import assert from 'node:assert/strict';
import { categorise, extractMarkers, buildLedger, renderMarkdown, CATEGORIES } from './owed-ledger.mjs';

// ---- extraction ----

test('extractMarkers: finds the real comment shapes used in the tree', () => {
  const src = [
    'import { test } from "@playwright/test"',
    '// the authed promoter smoke is owed to Daniel per sprint-1.md',
    ' * live-Shopify-domain pull is owed to Daniel. See the epic README.',
    '// Owed (Daniel, one-time): the MS_TEST_* repo secrets',
    'const x = 1 // nothing to see here',
  ].join('\n');
  const found = extractMarkers(src, 'e2e/x.spec.ts');
  assert.equal(found.length, 3);
  assert.equal(found[0].line, 2);
  // Comment punctuation is stripped so the ledger reads as prose.
  assert.ok(!found[1].text.startsWith('*'));
  assert.match(found[2].text, /^Owed \(Daniel/);
});

test('extractMarkers: matching is case-insensitive and tolerates "owed (Daniel"', () => {
  assert.equal(extractMarkers('// OWED TO DANIEL', 'f.spec.ts').length, 1);
  assert.equal(extractMarkers('// owed (Daniel) — a manual check', 'f.spec.ts').length, 1);
});

test('extractMarkers: an unrelated mention of Daniel is not a marker', () => {
  assert.equal(extractMarkers('// Daniel asked for this copy change', 'f.spec.ts').length, 0);
});

test('extractMarkers: empty/undefined input yields nothing rather than throwing', () => {
  assert.deepEqual(extractMarkers('', 'f.spec.ts'), []);
  assert.deepEqual(extractMarkers(undefined, 'f.spec.ts'), []);
});

// ---- categorisation ----
//
// Order is the policy: money beats auth beats admin. A checkout smoke that also needs a login is
// money — it is the one to run first and the most expensive to get wrong.

test('categorise: money-path wins over auth when a marker mentions both', () => {
  assert.equal(categorise({ file: 'e2e/checkout.spec.ts', text: 'needs a signed-in buyer session and a real payment' }), 'money-path');
});

test('categorise: auth-path when a session is needed but no money is involved', () => {
  assert.equal(categorise({ file: 'e2e/promoter-preview.spec.ts', text: 'the authed promoter view is owed' }), 'auth-path');
});

test('categorise: admin-only for admin surfaces with no money or auth wording', () => {
  assert.equal(categorise({ file: 'e2e/admin-seleccion.spec.ts', text: 'the pinned ordering needs an eyeball' }), 'admin-only');
});

test('categorise: anything unplaceable goes to other — a to-triage list, never a bin', () => {
  assert.equal(categorise({ file: 'e2e/copy.spec.ts', text: 'a human should read the founder copy' }), 'other');
});

test('categorise: always returns a known category', () => {
  for (const f of ['a.spec.ts', 'e2e/admin/x.spec.ts', 'e2e/checkout/y.spec.ts']) {
    assert.ok(CATEGORIES.includes(categorise({ file: f, text: '' })));
  }
});

// ---- the no-loss guarantee ----
//
// A ledger that quietly loses items is worse than the scattered comments it replaced, because it
// looks authoritative. This is the assertion that makes the number trustworthy.

test('buildLedger: every input marker appears in exactly one category', () => {
  const markers = [
    { file: 'e2e/checkout.spec.ts', line: 1, text: 'real payment owed' },
    { file: 'e2e/login.spec.ts', line: 2, text: 'authed session owed' },
    { file: 'e2e/admin.spec.ts', line: 3, text: 'admin moderation owed' },
    { file: 'e2e/copy.spec.ts', line: 4, text: 'someone should read it' },
    { file: 'e2e/copy.spec.ts', line: 9, text: 'and this too' },
  ];
  const ledger = buildLedger(markers);
  assert.equal(ledger.total, 5);
  assert.equal(ledger.files, 4); // copy.spec.ts contributes two markers, one file
  const summed = CATEGORIES.reduce((n, c) => n + ledger.byCategory[c], 0);
  assert.equal(summed, markers.length, 'categorised count must equal input count');
});

test('buildLedger: an empty tree is zero, not a crash', () => {
  const ledger = buildLedger([]);
  assert.equal(ledger.total, 0);
  assert.equal(CATEGORIES.reduce((n, c) => n + ledger.byCategory[c], 0), 0);
});

// ---- rendering ----

test('renderMarkdown: says it is generated, so nobody hand-edits it', () => {
  const md = renderMarkdown(buildLedger([{ file: 'e2e/a.spec.ts', line: 1, text: 'owed' }]), '2026-07-26');
  assert.match(md, /GENERATED — do not hand-edit/);
  assert.match(md, /1 check\(s\) owed across 1 spec file\(s\)/);
});

test('renderMarkdown: names "other" as a to-triage list rather than a dumping ground', () => {
  const md = renderMarkdown(buildLedger([{ file: 'e2e/a.spec.ts', line: 1, text: 'owed' }]), '2026-07-26');
  assert.match(md, /not a bin, a to-triage list/);
});

test('renderMarkdown: an empty category is omitted rather than printed as a bare heading', () => {
  const md = renderMarkdown(buildLedger([{ file: 'e2e/checkout.spec.ts', line: 1, text: 'payment owed' }]), '2026-07-26');
  assert.match(md, /## money-path/);
  assert.doesNotMatch(md, /## admin-only \(0\)/);
});
