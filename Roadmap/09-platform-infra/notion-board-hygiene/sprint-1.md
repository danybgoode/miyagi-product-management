# Sprint 1 — Projection & overlay fixes (repo)

**Epic:** [Notion roadmap board hygiene](README.md) · **Risk:** all LOW · **Repo:** monorepo-root (`scripts/`, `.github/`, `Roadmap/`)
**Goal:** the projection stops misreporting archived sprints, carries a real `build_order`, and the live
overlay distinguishes In progress (draft) from In review (ready).

## Stories

### S1.1 — Archived-epic sprint floor fix · LOW
**As** Daniel, **I want** an archived epic's sprints to read Archived, **so that** the Sprints board doesn't
show an archived epic full of "Planned" sprints.
- In `scripts/roadmap-to-notion.mjs`, where the sprint status is floored (currently
  `status === 'Shipped' && sp.status === 'Planned' ? 'Shipped' : sp.status`), also map an **Archived** epic's
  sprints to **Archived** (an archived epic → all its sprint rows Archived).
- **Acceptance:** `node scripts/roadmap-to-notion.mjs --extract` shows `neon-egress-and-db-isolation` sprints
  as `Archived`, not `Planned`. **QA:** `node:test`/`--extract` assertion (no network).

### S1.2 — `build_order` SSOT + projection + populate · LOW
**As** Daniel, **I want** a real build-order number per epic, **so that** the Notion build-order views sort
meaningfully.
- Read epic README frontmatter **`build_order:`** (fallback `seed.build_order`); emit it on **epic and sprint**
  rows (sprints inherit their epic's order). Populate the sequence for active/near-term epics (the ordering is
  Daniel's priority call — open question 2 for depth).
- **Acceptance:** `--extract` rows carry the numeric `build_order`; populated epics sort correctly. **QA:**
  assertion + a doc pass assigning the order.

### S1.3 — "In progress" lifecycle overlay · LOW
**As** Daniel, **I want** a draft PR to show In progress and a ready PR In review, **so that** the board
reflects live work.
- `roadmap-to-notion.mjs --pr` accepts the lifecycle label (not hardcoded "In review"); `notion-pr-sync.yml`
  sends **"In progress"** for **draft** PRs (and on `opened`/`synchronize` while draft), **"In review"** on
  **`ready_for_review`**, and **clears** on `closed`. Announce the shared-workflow edit in the PR.
- **Acceptance:** opening a draft PR sets `Lifecycle="In progress"`; marking it ready flips to "In review";
  merge clears it. **QA:** `--dry` preview + a real draft-PR smoke (owed to Daniel).

## Sprint QA
- Deterministic gate: pure `node:test`/`--extract` assertions for S1.1 (archived floor) + S1.3 (lifecycle
  mapping logic). No app/commerce/money path. The live overlay end-to-end is a real-PR smoke **owed to Daniel**.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: monorepo-root repo at the branch/merge state. Steps 1–4 are local + deterministic (the agent ran
them). Steps 5–7 exercise the **live overlay** end-to-end and are **owed to Daniel** — they need the
Notion `Lifecycle` (Select, incl. an "In progress" option) + `PR link` (URL) properties, which S2 adds;
until then `notion-pr-sync.yml` PATCHes an unknown property and errors by design.

1. **Tests** — `node --test 'scripts/**/*.test.mjs'`
   → green: `floorSprintStatus`, `lifecycleForPr`, `normalizeBuildOrder`, and the two `--extract` integration cases pass.
2. **Archived floor (S1.1)** — `node scripts/roadmap-to-notion.mjs --extract | grep -A2 neon-egress`
   → every `neon-egress-and-db-isolation--sN` **sprint** row shows `"status": "Archived"` (not `"Planned"`).
3. **build_order (S1.2)** — `node scripts/roadmap-to-notion.mjs --extract | grep -B1 -A1 '"slug": "admin-consolidation"'`
   → the `admin-consolidation` epic row carries `"build_order": 1`; `notion-board-hygiene` carries `2`; their sprint rows inherit the same number.
4. **Lifecycle label (S1.3)** — run, in turn:
   `PR_ACTION=opened PR_DRAFT=true node scripts/roadmap-to-notion.mjs --lifecycle` → `In progress`;
   `PR_DRAFT=false` (same line) → `In review`; `PR_ACTION=closed …` → `clear`.
5. **(Owed to Daniel)** Open a **draft** PR touching `Roadmap/<NN>/<some-epic>/…`.
   → that epic's Notion row gets `Lifecycle="In progress"` + a PR link.
6. **(Owed to Daniel)** Mark the PR **ready for review**.
   → `Lifecycle` flips to `"In review"`.
7. **(Owed to Daniel)** Merge (or close) the PR.
   → the overlay clears; the push-to-main `--sync` re-derives `Status` from the merged docs.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [x] S1.1 — ✅ built `246a0fa` (archived-epic sprint floor → Archived; `floorSprintStatus` + node:test)
- [x] S1.2 — ✅ built `246a0fa` (`build_order` from epic README frontmatter; admin=1, notion=2; epic+sprint rows)
- [x] S1.3 — ✅ built `246a0fa` (script: `lifecycleForPr` + `--lifecycle`) · `bb1e7bf` (shared `notion-pr-sync.yml` wiring) — live overlay smoke (steps 5–7) owed to Daniel
