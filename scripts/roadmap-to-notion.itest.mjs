// roadmap-to-notion.itest.mjs — the INTEGRATION tier: assertions against a real `--extract`.
//
// `--extract` spawns roadmap-to-notion.mjs against the LIVE docs and parses every file under
// Roadmap/ (~860 of them). That walk is the most expensive primitive in this repo's tooling, which
// is why these three assertions are quarantined here, behind the `.itest.mjs` suffix:
//
//   • the local hooks glob `*.test.mjs` and therefore skip this file entirely;
//   • `guards.yml` runs `node --test 'scripts/*.itest.mjs'` as its own step.
//
// Measured 2026-08-03: the 37 pure test files in scripts/ finish in ~650ms COMBINED, while a single
// --extract took longer than all of them by more than an order of magnitude. Five such walks were
// buried in the test suite, and the suite ran on every commit — a commit touching Roadmap/ and
// scripts/ took 119.7 seconds.
//
// The pure projection logic these files used to share lives in the sibling `roadmap-to-notion.test.mjs`
// (14 tests, milliseconds) and still runs on every push.
//
// Run on demand: node --test 'scripts/*.itest.mjs'

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'roadmap-to-notion.mjs');


// The corpus walk, run ONCE for this whole file. All three tests below assert against the same
// immutable projection; each used to spawn its own --extract, so this file alone paid for three
// full walks to produce three identical results.
//
// Safe because --extract is a pure read-only projection of files on disk that nothing here mutates.
// The assertions are unchanged — they still check real, freshly-extracted live data.
let _rowsJson = null;
function extractOnce() {
  if (_rowsJson === null) {
    _rowsJson = execFileSync('node', [SCRIPT, '--extract'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  }
  return _rowsJson;
}

// --- S1.1: live --extract integration (neon-egress is the canonical archived-epic test case) -----
test('--extract: archived epic neon-egress-and-db-isolation projects all its sprints as Archived', () => {
  const out = extractOnce();
  const rows = JSON.parse(out);
  const sprints = rows.filter((r) => r.grain === 'Sprint' && r.slug.startsWith('neon-egress-and-db-isolation--'));
  assert.ok(sprints.length > 0, 'expected neon-egress to have projected sprint rows');
  for (const s of sprints) assert.equal(s.status, 'Archived', `${s.slug} should be Archived`);
  // The epic row itself must NOT drift: status (Archived) === status_derived (Archived).
  const epic = rows.find((r) => r.grain === 'Epic' && r.slug === 'neon-egress-and-db-isolation');
  assert.ok(epic, 'expected the neon-egress epic row');
  assert.equal(epic.status, 'Archived');
  assert.equal(epic.status_derived, 'Archived', 'archived epic must not false-flag drift');
});

test('--extract: active epics carry the numeric build_order from README frontmatter, sprints inherit it', () => {
  const out = extractOnce();
  const rows = JSON.parse(out);
  const adminEpic = rows.find((r) => r.grain === 'Epic' && r.slug === 'admin-consolidation');
  const hygieneEpic = rows.find((r) => r.grain === 'Epic' && r.slug === 'notion-board-hygiene');
  assert.equal(adminEpic?.build_order, 1);
  assert.equal(hygieneEpic?.build_order, 2);
  const adminSprints = rows.filter((r) => r.grain === 'Sprint' && r.slug.startsWith('admin-consolidation--'));
  assert.ok(adminSprints.length > 0);
  for (const s of adminSprints) assert.equal(s.build_order, 1, `${s.slug} should inherit its epic's build_order`);
});

test('--extract: fully-shipped epics report FULL story completion (the audit §6 undercount)', () => {
  const out = extractOnce();
  const rows = JSON.parse(out);
  // Both undercount patterns: mercadolibre-sync's sprints declare "✅ MERGED" on their own Status line
  // (was 0/15); promoter-funnel-v2's use a mid-line blockquote form the Status regex never matches, so
  // the floor comes from the frontmatter-`shipped` epic (was 7/19).
  for (const slug of ['mercadolibre-sync', 'promoter-funnel-v2']) {
    const epic = rows.find((r) => r.grain === 'Epic' && r.slug === slug);
    assert.ok(epic, `expected epic row for ${slug}`);
    assert.match(epic.sprint_progress, /^(\d+)\/\1 stories$/, `${slug} should read N/N, got "${epic.sprint_progress}"`);
    for (const s of rows.filter((r) => r.grain === 'Sprint' && r.slug.startsWith(`${slug}--`))) {
      assert.ok(s.sprint_progress === '—' || /^(\d+)\/\1 stories$/.test(s.sprint_progress),
        `${s.slug} should read N/N or —, got "${s.sprint_progress}"`);
    }
  }
  // An in-flight epic must NOT be inflated/miscategorized by the same fix that corrects the two
  // undercounts above (status silently floored to Shipped). Picked DYNAMICALLY from whichever epic
  // is currently in-progress in the real live Roadmap — not a hardcoded slug. The original fixture
  // here was `ml-orders-native`, which genuinely shipped 2026-07-08; the hardcoded assertion then
  // silently asserted a false invariant against reality until CI caught the drift (deploy-pipeline-
  // tuning epic, 2026-07-12). Any epic currently mid-build works as the negative-control example, so
  // this self-heals as epics ship over time instead of needing a slug swap each time one does.
  const inflight = rows.find((r) => r.grain === 'Epic' && r.status === 'In progress');
  assert.ok(inflight, 'expected at least one in-progress epic in the live Roadmap to use as the negative-control example');
  assert.equal(inflight.status, 'In progress');
});

// --- the grooming fields actually reach the board -----------------------------------------------
// A seed's `epic:` pointer is the ONLY key joining its grooming fields (priority, risk, type) onto the
// epic's board row, and the join is a Map miss defaulting to `{}` — so a malformed pointer publishes a
// confident blank rather than an error. That is what `epic: us-marketplace` (missing its
// `07-agentic-and-federated-commerce/` prefix) did to that epic and all 7 of its sprint rows,
// invisibly, until the 2026-08-24 grooming audit queried the live Notion board.
//
// This sweeps the POPULATION — every seed that both points at an epic and grooms a priority/risk — and
// not one hand-picked epic. The first draft asserted against "the top build_order epic", which is
// `market-architecture-foundation` at build_order 0: a HEALTHY row. It stayed green with the real
// defect reintroduced AND the guard disarmed, because it never looked at the broken epic at all. A
// spec must baseline on the state it is not testing.
test('--extract: every groomed seed pointing at an epic lands its Priority/Risk on that epic row', () => {
  const rows = JSON.parse(extractOnce());
  const epicByKey = new Map(
    rows.filter((r) => r.grain === 'Epic')
      .map((r) => [r.doc_link.replace(/^Roadmap\//, '').replace(/\/README\.md$/, ''), r]));

  const seedsDir = join(dirname(SCRIPT), '..', 'Roadmap', '00-ideas', 'seeds');
  const groomed = [];
  const unresolved = [];
  for (const f of readdirSync(seedsDir).filter((x) => x.endsWith('.md'))) {
    const fm = readFileSync(join(seedsDir, f), 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (!fm) continue;
    const field = (k) => {
      const line = fm[1].split('\n').find((l) => l.startsWith(`${k}:`));
      if (!line) return null;
      const v = line.slice(k.length + 1).split('#')[0].trim().replace(/^["']|["']$/g, '');
      return !v || v === 'null' ? null : v;
    };
    const epic = field('epic');
    // THREE states, not two. `epic: null` is the un-scaffolded funnel and is asserted nowhere (the
    // allowed negation). A pointer that RESOLVES must land its groomed fields. A pointer that does
    // NOT resolve is the defect itself — so it is collected, never filtered away. Treating
    // "unresolvable" as "not applicable" is what let the first two drafts of this test stay green
    // with the real defect reintroduced: the filter excluded exactly the row under test.
    if (!epic) continue;
    if (!epicByKey.has(epic)) { unresolved.push(`${f} → epic: "${epic}"`); continue; }
    if (field('priority') && field('risk')) groomed.push({ file: f, epic, row: epicByKey.get(epic) });
  }

  assert.deepEqual(unresolved, [],
    'these seeds name an epic that does not exist under Roadmap/<NN-macro>/<slug>/ — their grooming '
    + 'fields reach NEITHER an epic row nor a seed row, and the board shows a confident blank');

  assert.ok(groomed.length > 10, `only ${groomed.length} groomed seed→epic pairs found; the sweep would pass near-vacuously`);

  const blank = groomed.filter((g) => !g.row.priority || !g.row.risk);
  assert.deepEqual(blank.map((g) => `${g.file} → ${g.epic}`), [],
    'these seeds groom a priority/risk that never reached their epic board row — the seed→epic join is broken for them');
});
