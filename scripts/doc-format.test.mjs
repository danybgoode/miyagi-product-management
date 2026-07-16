// doc-format.test.mjs — pure-logic coverage for doc-format.mjs's per-doc-type checkers.
// No file-tree walking / execFileSync here (that's exercised live via `node scripts/doc-format.mjs`
// itself, per Sprint 1's smoke walkthrough) — these are the offense-detection rules in isolation,
// fed literal doc content, mirroring lib/design-token-audit.ts's negative-fixture test shape.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkEpicReadme,
  checkSprintDoc,
  checkRetrospective,
  fixDodHeading,
  fixSprintStatusLine,
  fixRetroClosedLine,
  applyMechanicalFixes,
} from './doc-format.mjs';

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

// ── mechanical --fix rewrites ─────────────────────────────────────────────────

test('fixDodHeading: legacy "## Epic Definition of Done" is renamed to canonical', () => {
  const content = '# Epic: X\n\n## Epic Definition of Done\n- [ ] Done.\n';
  const fixed = fixDodHeading(content);
  assert.ok(fixed.includes('## Definition of Done (epic)'));
  assert.ok(!fixed.includes('## Epic Definition of Done'));
});

test('fixDodHeading: mismatched wording "## Definition of Done" is renamed to canonical', () => {
  const content = '# Epic: X\n\n## Definition of Done\n- [ ] Done.\n';
  const fixed = fixDodHeading(content);
  assert.ok(fixed.includes('## Definition of Done (epic)'));
});

test('fixDodHeading: content already canonical is left untouched', () => {
  const content = '# Epic: X\n\n## Definition of Done (epic)\n- [ ] Done.\n';
  assert.equal(fixDodHeading(content), content);
});

test('fixSprintStatusLine: blockquote Status (with Epic backlink on a preceding line) collapses to a plain Status line', () => {
  const content = '# Sprint 1\n\n> Epic: [X](README.md) · **Risk: LOW**\n> **Status: ✅ SHIPPED**\n\n## Stories\n';
  const fixed = fixSprintStatusLine(content);
  assert.ok(fixed.includes('**Status:** ✅ SHIPPED'));
  assert.ok(!fixed.includes('> Epic:'));
  assert.ok(!fixed.includes('>'));
});

test('fixSprintStatusLine: Status combined with Risk/Epic on one line collapses to Status alone', () => {
  const content = '# Sprint 1\n\n**Epic:** [X](README.md) · **Risk: HIGH** · **Status: shipped**\n';
  const fixed = fixSprintStatusLine(content);
  assert.ok(fixed.includes('**Status:** shipped'));
  assert.ok(!fixed.includes('**Epic:**'));
  assert.ok(!fixed.includes('**Risk:'));
});

test('fixSprintStatusLine: already-canonical plain Status line is left untouched', () => {
  const content = '# Sprint 1\n\n**Status:** ⬜ not started\n\n## Stories\n';
  assert.equal(fixSprintStatusLine(content), content);
});

test('fixSprintStatusLine: a bold Status span that wraps onto the NEXT physical line is left untouched (real bug found sweeping deploy-pipeline-tuning — collapsing just line 1 left a dangling ** on line 2)', () => {
  const content = '# Sprint 4\n\n**Epic:** [X](README.md) · **Risk: LOW** · **Status: ✅ DONE 2026-07-13 — S4.1\nbuilt, S4.2 explicitly skipped (data doesn\'t support it).**\n\nBody.\n';
  assert.equal(fixSprintStatusLine(content), content);
});

test('fixSprintStatusLine: a blockquote Status block with substantial multi-line prose (PR links, owed-to notes) is left untouched, not silently discarded (real bug found sweeping feature-flags-inhouse/sprint-1.md)', () => {
  const content = `# Sprint 1

**Epic:** [X](README.md) · **Goal:** something.

> **Status: ✅ MERGED + DEPLOYED 2026-07-01 (Daniel-authorized merge on green, HIGH).**
> S1.1 \`6463a46\` + applied to shared Supabase · S1.2 \`67ee051\` · S1.3 \`d8c2e22\`.
> Merged: **FE [#150](https://github.com/x/y/pull/150)** (S1.1 + S1.2) → main \`b0582b0\`
>
> **Owed to Daniel (money/auth path):** the live flip smoke below.
`;
  assert.equal(fixSprintStatusLine(content), content);
});

test('fixSprintStatusLine: a short blockquote block with a non-Epic/Risk continuation line (e.g. "Surfaces: ...") is left untouched — a short line is not proof it is disposable (real bug found sweeping promoter-funnel-v2/sprint-5.md, where the Surfaces line was silently discarded)', () => {
  const content = "# Sprint 5\n\n> Epic: [X](README.md) · Risk: MED (no new money paths) · Status: ✅ merged 2026-07-03, PR [#168](https://github.com/x/y/pull/168)\n> Surfaces: `/promotor/cerrar`, merchant panel, email.\n\nBody.\n";
  assert.equal(fixSprintStatusLine(content), content);
});

test('fixSprintStatusLine: a short blockquote block that IS purely Epic/Risk backlink noise still collapses cleanly', () => {
  const content = '# Sprint 0\n\n> Epic: [X](README.md) · Risk: **HIGH** (entitlement) — **Daniel merges**\n> Status: ✅ closed 2026-07-02 — **not reproducible**\n\nBody.\n';
  const fixed = fixSprintStatusLine(content);
  assert.ok(fixed.includes('**Status:** ✅ closed 2026-07-02 — **not reproducible**'));
  assert.ok(!fixed.includes('Epic:'));
});

test('fixSprintStatusLine: Status leading with Risk trailing on the same line is left untouched — extracting "everything after Status:" would silently fold the Risk field into the kept value instead of dropping it (real bug found sweeping homepage-polish-b/sprint-1.md)', () => {
  const content = '# Sprint 1\n\n**Status:** ✅ COMPLETE — merged to `main` 2026-06-12, PR [#84](https://x/pull/84) squash `14fd880` · **Risk:** LOW *(touched shared `lib/types.ts` + renderers — announced in the PR per LEARNINGS)*\n';
  assert.equal(fixSprintStatusLine(content), content);
});

test('fixSprintStatusLine: "**Status:** value" (label bold closes right at the colon) preserves a trailing single "*" italic-close in the value, not stripping it as if it were the label wrapper', () => {
  const content = '# Sprint 1\n\n**Epic:** [X](README.md) · **Status:** shipped *(low risk)*\n';
  const fixed = fixSprintStatusLine(content);
  assert.ok(fixed.includes('**Status:** shipped *(low risk)*'));
  assert.ok(!fixed.includes('**Epic:**'));
});

test('fixSprintStatusLine: a single-line combined Status whose bold span closes mid-sentence (not at value end) is left untouched, not left with a dangling ** (real bug found sweeping feature-flags-inhouse/sprint-3.md)', () => {
  const content = '### S3.1 — Something\n> **Status: ✅ MERGED+DEPLOYED 2026-07-01.** FE [x](y) squash `d9eddd1`. **Owed to Daniel:** the live smoke.\n';
  const fixed = fixSprintStatusLine(content);
  assert.equal(fixed, content);
});

test('fixRetroClosedLine: bold "**Closed 2026-06-07.**" converts to italic, preserving trailing content', () => {
  const content = '# X — Retrospective\n\n**Closed 2026-06-07.**\n\n## What shipped\n';
  const fixed = fixRetroClosedLine(content);
  assert.ok(fixed.includes('_Closed: 2026-06-07.'));
  assert.ok(fixed.split('\n').find((l) => l.startsWith('_Closed:')).endsWith('_'));
  assert.ok(!fixed.includes('**Closed'));
});

test('fixRetroClosedLine: already-italic content is left untouched (nothing bold to fix)', () => {
  const content = '# X — Retrospective\n\n_Closed: 2026-07-16_\n\n## What shipped\n';
  assert.equal(fixRetroClosedLine(content), content);
});

test('fixRetroClosedLine: a "**Closed <date>.**" line that is really the FIRST line of a soft-wrapped multi-line paragraph is left untouched — rewriting just line 1 would strand the continuation lines as an orphaned fragment (real bug found sweeping delivery-money-polish/RETROSPECTIVE.md)', () => {
  const content = '# X — Retrospective\n\n**Closed 2026-06-09.** Three sprints, all shipped to prod. HIGH-risk (refunds / payments / fulfillment /\norder state) — Daniel merged every PR.\n\n## What shipped\n';
  assert.equal(fixRetroClosedLine(content), content);
});

test('applyMechanicalFixes: a sprint doc with a fixable Status line reports the fixed rule and clean output', () => {
  const content = '# Sprint 1\n\n**Epic:** [X](README.md) · **Risk: HIGH** · **Status: shipped**\n';
  const { content: fixed, fixedRules } = applyMechanicalFixes(content, 'sprint');
  assert.ok(fixedRules.includes('sprint-status-blockquote/sprint-status-combined'));
  assert.deepEqual(checkSprintDoc(fixed), []);
});

test('applyMechanicalFixes: a retrospective with a fixable Closed line and all sections present ends up fully clean', () => {
  const content = '# X — Retrospective\n\n**Closed 2026-06-07.**\n\n## What shipped\n## What went well\n## What we learned\n## Gaps / follow-ups\n';
  const { content: fixed, fixedRules } = applyMechanicalFixes(content, 'retrospective');
  assert.ok(fixedRules.includes('retro-closed-bold'));
  assert.deepEqual(checkRetrospective(fixed), []);
});
