// roadmap-to-notion.test.mjs — the PURE tier: projection/overlay logic, no filesystem walk.
//
// roadmap-to-notion.mjs is the docs→Notion projection; it has no Playwright gate (it's a script, not
// app code), so this node:test IS the deterministic gate for its judgment calls:
//   • floorSprintStatus — an archived epic's sprints must read Archived (not Planned), and a Shipped
//     epic's stale Planned sprints read Shipped, while real in-flight signals pass through.
//   • lifecycleForPr — the live overlay label sent for a PR's state (the single source the
//     notion-pr-sync.yml workflow's `--lifecycle` mode and this test share, so bash + JS can't drift).
//   • the status-enum hard-fail + story-count floor (grooming-audit 2026-07-06 follow-up).
//
// ── Why this file was split (2026-08-03) ────────────────────────────────────────────────────────
// It used to also hold three assertions that spawn a real `--extract`, which parses every doc under
// Roadmap/ (~860 files). Those three dominated the local gate — they now live in the sibling
// `roadmap-to-notion.itest.mjs`, which runs in CI and on demand.
//
// The split is by COST PER TEST, not per file. Tiering a whole file by its slowest test would have
// exiled these 14 pure, millisecond-fast assertions to CI along with the 3 slow ones — losing fast
// local feedback on exactly the logic most likely to break. Cheap tests belong in the fast loop even
// when they live next to expensive ones.
//
// Run: node --test 'scripts/*.test.mjs'

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  floorSprintStatus, lifecycleForPr, normalizeBuildOrder, deriveEpicStatus,
  frontmatterStatusBucket, seedStatusLabel, floorSprintDone,
} from './roadmap-to-notion.mjs';

// The `--lifecycle` test below spawns the real CLI, but it stays in the FAST tier deliberately:
// `--lifecycle` only reads two env vars and prints a label — it never touches Roadmap/. Four node
// boots cost ~250ms, which is the price of pinning the exact contract `notion-pr-sync.yml` calls,
// so bash and JS cannot drift. Spawning a subprocess is not what makes a test slow here; walking
// 860 docs is.
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'roadmap-to-notion.mjs');

// --- S1.1: floorSprintStatus ---------------------------------------------------------------------
test('floorSprintStatus: an Archived epic floors EVERY sprint status to Archived', () => {
  for (const sp of ['Planned', 'In progress', 'In review', 'Shipped']) {
    assert.equal(floorSprintStatus('Archived', sp), 'Archived');
  }
});

test('floorSprintStatus: a Shipped epic floors ALL sprint statuses to Shipped', () => {
  // A shipped epic cannot have a non-shipped sprint — Planned/In progress/In review all → Shipped.
  // (Previously only Planned was floored, so In progress/In review leaked onto the board as stale rows.)
  for (const sp of ['Planned', 'In progress', 'In review', 'Shipped']) {
    assert.equal(floorSprintStatus('Shipped', sp), 'Shipped');
  }
});

test('floorSprintStatus: a NON-terminal epic keeps the real per-sprint signal', () => {
  assert.equal(floorSprintStatus('In progress', 'In progress'), 'In progress');
  assert.equal(floorSprintStatus('In progress', 'In review'), 'In review');
  assert.equal(floorSprintStatus('In progress', 'Planned'), 'Planned');
  assert.equal(floorSprintStatus('Scaffolded', 'Planned'), 'Planned');
});

// --- deriveEpicStatus: an `archived` epic short-circuits so the board never false-flags drift -----
test('deriveEpicStatus: an archived epic derives Archived regardless of its sprints', () => {
  // The bug this fixes: without the short-circuit, an archived epic with open-looking sprints derives
  // In progress/Shipped, so status (Archived) != status_derived → permanent false drift every regen.
  const openSprints = [{ status: 'In progress' }, { status: 'Planned' }];
  assert.equal(deriveEpicStatus(openSprints, false, 'archived'), 'Archived');
  assert.equal(deriveEpicStatus([{ status: 'Shipped' }], true, 'archived'), 'Archived'); // even retro-shipped
});

test('deriveEpicStatus: non-archived epics keep the prose/retro derivation', () => {
  assert.equal(deriveEpicStatus([{ status: 'Shipped' }, { status: 'Shipped' }], false, 'in-progress'), 'Shipped');
  assert.equal(deriveEpicStatus([{ status: 'In progress' }], false, undefined), 'In progress');
  assert.equal(deriveEpicStatus([{ status: 'Planned' }], false, 'scaffolded'), 'Scaffolded');
  assert.equal(deriveEpicStatus([], true, undefined), 'Shipped'); // retroShipped wins
});

// --- S1.2: build_order normalization + projection ------------------------------------------------
test('normalizeBuildOrder: numeric → Number, blank/absent → null, legacy non-numeric → passthrough', () => {
  assert.equal(normalizeBuildOrder('1'), 1);
  assert.equal(normalizeBuildOrder(2), 2);
  assert.equal(normalizeBuildOrder(''), null);
  assert.equal(normalizeBuildOrder(null), null);
  assert.equal(normalizeBuildOrder(undefined), null);
  assert.equal(normalizeBuildOrder('#3c'), '#3c'); // legacy seed build_order survives for seed rows
});

// --- S1.3: lifecycleForPr ------------------------------------------------------------------------
test('lifecycleForPr: a closed PR clears the overlay (merged or not)', () => {
  assert.deepEqual(lifecycleForPr({ action: 'closed', draft: false }), { clear: true });
  assert.deepEqual(lifecycleForPr({ action: 'closed', draft: true }), { clear: true });
});

test('lifecycleForPr: a draft PR → In progress', () => {
  assert.deepEqual(lifecycleForPr({ action: 'opened', draft: true }), { status: 'In progress' });
  assert.deepEqual(lifecycleForPr({ action: 'synchronize', draft: true }), { status: 'In progress' });
  assert.deepEqual(lifecycleForPr({ action: 'converted_to_draft', draft: true }), { status: 'In progress' });
});

test('lifecycleForPr: a ready (non-draft) PR → In review', () => {
  assert.deepEqual(lifecycleForPr({ action: 'ready_for_review', draft: false }), { status: 'In review' });
  assert.deepEqual(lifecycleForPr({ action: 'opened', draft: false }), { status: 'In review' });
  assert.deepEqual(lifecycleForPr({ action: 'synchronize', draft: false }), { status: 'In review' });
});

// --- S1.3: the --lifecycle CLI mode mirrors lifecycleForPr (what the workflow actually calls) -----
test('--lifecycle: reads PR_ACTION + PR_DRAFT env and prints the label the workflow sends', () => {
  const run = (env) => execFileSync('node', [SCRIPT, '--lifecycle'], { encoding: 'utf8', env: { ...process.env, ...env } }).trim();
  assert.equal(run({ PR_ACTION: 'opened', PR_DRAFT: 'true' }), 'In progress');
  assert.equal(run({ PR_ACTION: 'ready_for_review', PR_DRAFT: 'false' }), 'In review');
  assert.equal(run({ PR_ACTION: 'opened', PR_DRAFT: 'false' }), 'In review');
  assert.equal(run({ PR_ACTION: 'closed', PR_DRAFT: 'false' }), 'clear');
});

// --- Status-enum hard-fail + story-count floor (grooming-audit 2026-07-06 follow-up) --------------
// The blind spot being closed: an epic README with a PRESENT but out-of-enum `status:` used to fall
// back to the sprint/retro derivation, making status === status_derived by construction — so the
// board's advisory drift check could never fire on exactly the class of error it exists to catch
// (mercadolibre-sync sat at `status: ready` while fully shipped, invisible to the check).

test('frontmatterStatusBucket: canonical values map to their buckets; absent → null (fallback allowed)', () => {
  assert.equal(frontmatterStatusBucket({ status: 'shipped' }), 'Shipped');
  assert.equal(frontmatterStatusBucket({ status: 'in-progress' }), 'In progress');
  assert.equal(frontmatterStatusBucket({ status: 'scaffolded' }), 'Scaffolded');
  assert.equal(frontmatterStatusBucket({ status: 'queued' }), 'Scaffolded');
  assert.equal(frontmatterStatusBucket({ status: 'archived' }), 'Archived');
  assert.equal(frontmatterStatusBucket({}), null);                 // no frontmatter status at all
  assert.equal(frontmatterStatusBucket({ status: null }), null);   // parsed-empty value
});

test('frontmatterStatusBucket: a present-but-unrecognized value THROWS naming the doc and the value', () => {
  // 'ready', 'Done', 'complete' are the exact invalid spellings the 2026-07-06 audit found in the wild;
  // the enum is case-sensitive by design ('Shipped' is not 'shipped').
  for (const bad of ['ready', 'Done', 'complete', 'Shipped']) {
    assert.throws(
      () => frontmatterStatusBucket({ status: bad }, 'Roadmap/03-selling-and-shops/x/README.md'),
      new RegExp(`Roadmap/03-selling-and-shops/x/README\\.md.*unrecognized epic frontmatter status "${bad}"`),
    );
  }
});

test('seedStatusLabel: the 7 documented seed values map; absent → Raw; invalid THROWS with the file name', () => {
  assert.equal(seedStatusLabel('raw'), 'Raw');
  assert.equal(seedStatusLabel('ready'), 'Ready');       // 'ready' IS valid for seeds (unlike epics)
  assert.equal(seedStatusLabel('queued'), 'Queued');
  assert.equal(seedStatusLabel('scaffolded'), 'Scaffolded');
  assert.equal(seedStatusLabel('in-progress'), 'In progress');
  assert.equal(seedStatusLabel('shipped'), 'Shipped');
  assert.equal(seedStatusLabel('archived'), 'Archived');
  assert.equal(seedStatusLabel(null), 'Raw');
  assert.equal(seedStatusLabel(undefined), 'Raw');
  // 'seed' is the invalid value the audit found live (spike-envia-byo).
  assert.throws(() => seedStatusLabel('seed', 'Roadmap/00-ideas/seeds/x.md'),
    /seeds\/x\.md.*unrecognized seed frontmatter status "seed"/);
});

test('floorSprintDone: a Shipped sprint counts ALL its stories done; other statuses keep raw ticks', () => {
  assert.equal(floorSprintDone('Shipped', 5, 0), 5);   // Status-line-only completion (e.g. ml-sync sprints)
  assert.equal(floorSprintDone('Shipped', 5, 3), 5);
  assert.equal(floorSprintDone('Shipped', 0, 0), 0);   // no detectable stories → nothing to floor
  assert.equal(floorSprintDone('In review', 4, 0), 0); // built-not-merged stays honest
  assert.equal(floorSprintDone('In progress', 4, 2), 2);
  assert.equal(floorSprintDone('Planned', 4, 0), 0);
  assert.equal(floorSprintDone('Archived', 4, 1), 1);  // archived stories were dropped, not done
});
