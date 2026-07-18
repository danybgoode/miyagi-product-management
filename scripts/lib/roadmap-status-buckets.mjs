// roadmap-status-buckets.mjs — the SSOT for epic-status buckets and the seed-funnel definition, shared
// by scripts/build-order.mjs (Roadmap/00-ideas/BUILD-ORDER.md — the canonical in-repo board) and
// scripts/lib/pmo-report-hub-data.mjs (the hub's live roadmap/sprint views — reporthub-as-notion Sprint
// 2, Story 2.1). A single export means the two views CANNOT independently drift on WHICH statuses count
// as "the funnel" or "building now" — sprint-2.md's acceptance criterion ("views match BUILD-ORDER.md
// counts exactly, same SSOT, no second derivation") is enforced by construction, not by a regression
// test alone (though scripts/live-views-count-parity.test.mjs still cross-checks the live extractor's
// output against the checked-in BUILD-ORDER.md as a belt-and-suspenders end-to-end guard).
//
// Extracted from build-order.mjs, which used to define EPIC_BUCKETS/SEED_FUNNEL locally — this fixed a
// real bug found while building Story 2.1: pmo-report-hub-data.mjs's `summarizeRoadmapRows` counted
// EVERY grain:'Seed' row as a funnel member (including ones that had since shipped/scaffolded/archived),
// while build-order.mjs's board correctly counted only Raw/Ready/Queued seeds — the hub's "Ideas en
// funnel" stat and idea-funnel view were both silently overcounting before this fix.

export const EPIC_STATUS_ORDER = ['In progress', 'Scaffolded', 'Shipped'];

// Seeds not yet scaffolded = the funnel. A seed can also carry Shipped/Scaffolded/Archived (it
// graduated into a real epic, or was retired) — those are NOT funnel members even though they're still
// grain: 'Seed' rows in the projection.
export const SEED_FUNNEL_STATUSES = new Set(['Raw', 'Ready', 'Queued']);

export function isFunnelSeed(row) {
  return row?.grain === 'Seed' && SEED_FUNNEL_STATUSES.has(row.status);
}
