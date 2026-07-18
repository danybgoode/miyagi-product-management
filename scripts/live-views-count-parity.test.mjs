// live-views-count-parity.test.mjs — reporthub-as-notion Sprint 2, Story 2.1's QA line: "count-parity
// assert vs build-order.mjs output." This is a real integration test (spawns the actual
// roadmap-to-notion.mjs --extract against this repo's live Roadmap/ docs, and reads the checked-in
// Roadmap/00-ideas/BUILD-ORDER.md) — not a mock. The hub's live roadmap view (scripts/lib/
// pmo-report-hub-data.mjs's summarizeRoadmapRows, published by scripts/publish-live-views.mjs) and the
// in-repo board (scripts/build-order.mjs) both derive from the SAME extractor output and now the SAME
// scripts/lib/roadmap-status-buckets.mjs bucket/funnel definitions — this test is the belt-and-suspenders
// check that they still agree end-to-end, not just "import the same constant" in principle.
//
// NOTE: if Roadmap/00-ideas/BUILD-ORDER.md is stale (see `node scripts/build-order.mjs --check`), this
// test's cross-check against the checked-in file is only as fresh as that file — the same staleness
// `--check` already guards in CI/pre-commit. This test's OWN assertions (summarizeRoadmapRows vs a
// freshly-extracted independent recount) do not depend on BUILD-ORDER.md's freshness.

import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { summarizeRoadmapRows } from './lib/pmo-report-hub-data.mjs';
import { EPIC_STATUS_ORDER, isFunnelSeed } from './lib/roadmap-status-buckets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EXTRACTOR = join(__dirname, 'roadmap-to-notion.mjs');
const BUILD_ORDER = join(ROOT, 'Roadmap', '00-ideas', 'BUILD-ORDER.md');

function extractLiveRows() {
  const json = execFileSync('node', [EXTRACTOR, '--extract'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(json);
}

test('summarizeRoadmapRows epic-bucket counts match an independent recount from the SAME live extraction', () => {
  const rows = extractLiveRows();
  const stats = summarizeRoadmapRows(rows);
  const epics = rows.filter((r) => r.grain === 'Epic');

  const independent = {
    activeEpics: epics.filter((e) => e.status === EPIC_STATUS_ORDER[0]).length,
    scaffoldedEpics: epics.filter((e) => e.status === EPIC_STATUS_ORDER[1]).length,
    shippedEpics: epics.filter((e) => e.status === EPIC_STATUS_ORDER[2]).length,
    funnelSeeds: rows.filter(isFunnelSeed).length,
  };

  assert.equal(stats.activeEpics, independent.activeEpics);
  assert.equal(stats.scaffoldedEpics, independent.scaffoldedEpics);
  assert.equal(stats.shippedEpics, independent.shippedEpics);
  assert.equal(stats.funnelSeeds, independent.funnelSeeds);
});

// Cross-checks against the checked-in board itself (the artifact stakeholders actually read today).
// Skips gracefully (does not fail the suite) if BUILD-ORDER.md is currently stale — that staleness is
// `build-order.mjs --check`'s job to catch, not this test's; this test only guards against the TWO
// generators disagreeing when both are working from the same live data.
test('summarizeRoadmapRows counts match the checked-in BUILD-ORDER.md headers (when it is fresh)', (t) => {
  if (!existsSync(BUILD_ORDER)) {
    t.skip('BUILD-ORDER.md not present in this checkout');
    return;
  }
  const checkResult = (() => {
    try {
      execFileSync('node', [join(__dirname, 'build-order.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
      return true;
    } catch {
      return false;
    }
  })();
  if (!checkResult) {
    t.skip('BUILD-ORDER.md is stale in this checkout — run `node scripts/build-order.mjs` first (unrelated to this Sprint\'s changes if the drift predates them)');
    return;
  }

  const board = readFileSync(BUILD_ORDER, 'utf8');
  const rows = extractLiveRows();
  const stats = summarizeRoadmapRows(rows);

  const buildingNow = board.match(/## 🏗️ Building now \((\d+)\)/);
  const readyToBuild = board.match(/## 📋 Ready to build \(scaffolded, not started\) \((\d+)\)/);
  const shipped = board.match(/## ✅ Shipped \((\d+)\)/);
  const funnel = board.match(/## ⬜ Funnel — seeds not yet scaffolded \((\d+)\)/);

  assert.ok(buildingNow, 'BUILD-ORDER.md must have a "Building now" header with a count');
  assert.equal(stats.activeEpics, Number(buildingNow[1]));
  assert.equal(stats.scaffoldedEpics, Number(readyToBuild[1]));
  assert.equal(stats.shippedEpics, Number(shipped[1]));
  assert.equal(stats.funnelSeeds, Number(funnel[1]));
});
