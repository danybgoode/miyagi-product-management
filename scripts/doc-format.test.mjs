// doc-format.test.mjs — pure-logic coverage for doc-format.mjs's per-doc-type checkers.
// No file-tree walking / execFileSync here (that's exercised live via `node scripts/doc-format.mjs`
// itself, per Sprint 1's smoke walkthrough) — these are the offense-detection rules in isolation,
// fed literal doc content, mirroring lib/design-token-audit.ts's negative-fixture test shape.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEpicReadme, checkSprintDoc, checkRetrospective } from './doc-format.mjs';

// ── checkEpicReadme ──────────────────────────────────────────────────────────

test('checkEpicReadme: a fully canonical README has zero offenses', () => {
  // Scope-seed link must resolve to a REAL file (existsRelative checks it) — point at this epic's
  // own real seed rather than a fabricated path, so the fixture doesn't depend on mocking fs.
  const content = `---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: doc-format-consistency
---

# Epic: Example epic

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Scope seed:** [\`00-ideas/seeds/doc-format-consistency.md\`](../../00-ideas/seeds/doc-format-consistency.md)

## Why
Reason.

## Definition of Done (epic)
- [ ] Done.
`;
  assert.deepEqual(checkEpicReadme(content), []);
});

test('checkEpicReadme: missing frontmatter block', () => {
  const offenses = checkEpicReadme('# Epic: No frontmatter\n\n> **Area:** 09 · **Risk:** Low · **Class:** Chore · **Scope seed:** [x](y)\n');
  assert.ok(offenses.some((o) => o.rule === 'frontmatter-missing'));
});

test('checkEpicReadme: invalid status value', () => {
  const content = '---\nstatus: done\nslug: x\n---\n\n> **Area:** 09 · **Risk:** Low · **Class:** Chore · **Scope seed:** [x](y)\n\n## Definition of Done (epic)\n';
  const offenses = checkEpicReadme(content);
  assert.ok(offenses.some((o) => o.rule === 'frontmatter-status-invalid'));
});

test('checkEpicReadme: missing Class field', () => {
  const content = '---\nstatus: shipped\nslug: x\n---\n\n> **Area:** 09 · **Risk:** Low · **Scope seed:** [x](y)\n\n## Definition of Done (epic)\n';
  const offenses = checkEpicReadme(content);
  assert.ok(offenses.some((o) => o.rule === 'header-missing-class'));
});

test('checkEpicReadme: invalid Class value (a free-text description, not the 4-value enum)', () => {
  const content = '---\nstatus: shipped\nslug: x\n---\n\n> **Area:** 09 · **Risk:** Low · **Class:** Remediation / hardening · **Scope seed:** [x](y)\n\n## Definition of Done (epic)\n';
  const offenses = checkEpicReadme(content);
  assert.ok(offenses.some((o) => o.rule === 'header-class-invalid'));
});

test('checkEpicReadme: Scope doc (legacy readyforscope/) flagged distinctly from a missing Scope seed', () => {
  const content = '---\nstatus: shipped\nslug: x\n---\n\n> **Area:** 09 · **Risk:** Low · **Class:** Chore · **Scope doc:** [x](../../00-ideas/2.%20readyforscope/x.md)\n\n## Definition of Done (epic)\n';
  const offenses = checkEpicReadme(content);
  assert.ok(offenses.some((o) => o.rule === 'header-scope-doc-legacy'));
  assert.ok(!offenses.some((o) => o.rule === 'header-missing-scope-seed'));
});

test('checkEpicReadme: legacy Macro-section header flagged', () => {
  const content = '---\nstatus: shipped\nslug: x\n---\n\n> **Macro-section:** [09](../README.md) · **BUILD-ORDER:** #1\n\n## Definition of Done (epic)\n';
  const offenses = checkEpicReadme(content);
  assert.ok(offenses.some((o) => o.rule === 'header-macro-section-legacy'));
});

test('checkEpicReadme: "## Epic Definition of Done" flagged as the legacy heading wording', () => {
  const content = '---\nstatus: shipped\nslug: x\n---\n\n> **Area:** 09 · **Risk:** Low · **Class:** Chore · **Scope seed:** [x](../../00-ideas/seeds/x.md)\n\n## Epic Definition of Done\n';
  const offenses = checkEpicReadme(content);
  assert.ok(offenses.some((o) => o.rule === 'dod-heading-legacy'));
});

// ── checkSprintDoc ───────────────────────────────────────────────────────────

test('checkSprintDoc: a canonical plain Status line has zero offenses', () => {
  assert.deepEqual(checkSprintDoc('# Sprint 1\n\n**Status:** ⬜ not started\n\n## Stories\n'), []);
});

test('checkSprintDoc: a blockquote Status line (with Epic backlink) is flagged', () => {
  const offenses = checkSprintDoc('# Sprint 1\n\n> Epic: [X](README.md) · **Risk: LOW**\n> **Status: ✅ SHIPPED**\n');
  assert.ok(offenses.some((o) => o.rule === 'sprint-status-blockquote'));
});

test('checkSprintDoc: Status combined with Risk on one line is flagged', () => {
  const offenses = checkSprintDoc('# Sprint 1\n\n**Epic:** [X](README.md) · **Risk: HIGH** · **Status: shipped**\n');
  assert.ok(offenses.some((o) => o.rule === 'sprint-status-combined'));
});

test('checkSprintDoc: missing Status line entirely is flagged', () => {
  const offenses = checkSprintDoc('# Sprint 1\n\n## Stories\n');
  assert.ok(offenses.some((o) => o.rule === 'sprint-status-missing'));
});

// ── checkRetrospective ───────────────────────────────────────────────────────

test('checkRetrospective: a fully canonical retro has zero offenses', () => {
  const content = `# Example — Retrospective

_Closed: 2026-07-16_

## What shipped
X.

## What went well
Y.

## What we learned
Z.

## Gaps / follow-ups
None.
`;
  assert.deepEqual(checkRetrospective(content), []);
});

test('checkRetrospective: a "_Closed: YYYY-MM-DD_" line with trailing content after the italic close is clean (real-world norm, not drift)', () => {
  const content = `# X — Retrospective

_Closed: 2026-06-23_ · **2 sprints** · Risk LOW throughout

## What shipped
## What went well
## What we learned
## Gaps / follow-ups
`;
  assert.deepEqual(checkRetrospective(content), []);
});

test('checkRetrospective: a "_Closed: YYYY-MM-DD ... _" line with the italic closed at end-of-line is clean', () => {
  const content = `# X — Retrospective

_Closed: 2026-06-09 · 3 sprints, all shipped to prod._

## What shipped
## What went well
## What we learned
## Gaps / follow-ups
`;
  assert.deepEqual(checkRetrospective(content), []);
});

test('checkRetrospective: bold "**Closed ...**" flagged as the legacy format', () => {
  const content = '# X — Retrospective\n\n**Closed 2026-06-07.**\n\n## What shipped\n## What went well\n## What we learned\n## Gaps / follow-ups\n';
  const offenses = checkRetrospective(content);
  assert.ok(offenses.some((o) => o.rule === 'retro-closed-bold'));
});

test('checkRetrospective: missing a canonical section is flagged per-section', () => {
  const content = '# X — Retrospective\n\n_Closed: 2026-07-16_\n\n## What shipped\n## What went well\n';
  const offenses = checkRetrospective(content);
  const missing = offenses.filter((o) => o.rule === 'retro-section-missing').map((o) => o.detail);
  assert.equal(missing.length, 2);
  assert.ok(missing.some((d) => d.includes('What we learned')));
  assert.ok(missing.some((d) => d.includes('Gaps / follow-ups')));
});

test('checkRetrospective: non-standard EXTRA sections are not flagged (advisory-optional, not required-absent)', () => {
  const content = `# X — Retrospective

_Closed: 2026-06-03_

## What shipped
## What went well
## What we learned
## Gaps / follow-ups
## Validated but with a caveat
## Engineering debt noted
`;
  assert.deepEqual(checkRetrospective(content), []);
});
