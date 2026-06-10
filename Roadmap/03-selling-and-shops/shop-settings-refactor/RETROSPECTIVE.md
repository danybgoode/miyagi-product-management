# Shop Settings refactor — Retrospective

_Built out 2026-06-10 (4 sprints). S1–S3 merged to `main`; S4 = PR #74, CI-green, pending merge._

## What shipped
The seller settings surface was **one 4,076-line `'use client'` monolith**
(`ShopSettings.tsx`: ~3,530 lines in a single function, 127 `useState` hooks, ~17
sections gated on one `activeSection`). Adding a field to one section meant editing
the whole file, and a careless edit could break a sibling section. The epic broke it
into **one component per section** behind the route + save seam that already existed —
strictly behavior-preserving, no user-facing change, zero backend/DB/Medusa change.

- **S1 — foundation seam + first extraction** (PR #68 `12d9548`): pure next-free
  `lib/shop-settings/` (types deriving from the existing persisted shape, the canonical
  `taxonomy.ts`, moved helpers), a `useSettingsSave()` hook over the unchanged
  `PATCH /api/sell/shop` seam, and Devoluciones extracted behind a per-section
  dynamic-import registry with the monolith kept as a coexisting fallback.
- **S2 — the 7 non-money sections** (PR #69 `928ed15`): perfil · diseño · negociación ·
  envíos · citas · pedidos · notificaciones, each its own code-split component; shared
  primitives promoted to `_components/`.
- **S3 — money/domain/agent sections** (PR #71 squash `973f69d`, HIGH): pagos (Stripe ·
  MercadoPago · SPEI · Compra Protegida) · canal · agentes, with the **secret-strip
  invariant** asserted by a pure spec (`shop-settings-secret-strip.spec.ts`).
- **S4 — decommission + finalize** (PR #74 `2e7d293`, LOW): with all 11 slugs extracted
  and `isValidSection()` gating the route, the `<ShopSettingsPanel>` fallback was already
  unreachable. Relocated its type defs into the `types.ts` seam, dropped the
  dynamic-import + `EXTRACTED` set + fallback branch, **deleted the 4,076-line file**,
  collapsed the dual taxonomy (removed `sectionIds`/`sectionIdsFor()` — the old
  `SLUG_TO_SECTION_IDS`), and added an **anti-monolith guard** (`monolith-guard.ts` +
  `shop-settings-no-monolith.spec.ts`): CI fails if any settings component exceeds
  1,200 lines (largest now is `Canal.tsx` ~1,063) or if `ShopSettings.tsx` reappears.

## What went well
- **The route + save seam already existed**, so each extraction was a self-contained,
  independently shippable slice that left the persisted `metadata.settings` tree and the
  MCP/agent config path untouched. Per-sprint preview + CI carried the verification.
- **One canonical taxonomy** (`lib/shop-settings/taxonomy.ts`) killed the three-way
  slug→section drift up front (S1); by S4 there was a single, spec-guarded vocabulary.
- **Pure, next-free `lib/` seams** gave free `api`-gate coverage at every step — types,
  taxonomy, helpers, secret-strip, and now the monolith guard, all unit-tested with no
  network/auth.
- **The fallback strategy de-risked the whole epic**: the monolith coexisted as a safety
  net until S4 proved (via the `EXTRACTED` set covering all 11 slugs + the route gate)
  that it was dead before deleting it.

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md (one-liner + why + date). -->
- **Delete a monolith by first relocating its types into the seam that already fronts
  it.** The only non-trivial coupling left at decommission was that `lib/shop-settings/
  types.ts` *re-exported* the monolith's type defs; moving the definitions down into the
  seam (which every extracted section already imported) made the deletion a no-op for
  consumers. Grep for who imports the doomed file's *types*, not just its default export.
- **An anti-monolith guard generalizes the raw-color guard.** A pure file/line scan in
  `lib/` + an `api` spec (real-tree assertion + in-memory negative fixtures) is the
  cheapest way to stop a refactored surface eroding back — same shape as the
  design-token raw-hex guard. Set the cap above the current largest file with headroom.
- **A coexisting fallback makes a big deletion safe**: keep the old path as a fallback
  while extracting, and prove it unreachable (route gate + an exhaustive registry set)
  before removing it, instead of a risky big-bang swap.

## Gaps / follow-ups
- **Owed to Daniel (authed):** a final browser pass over all 13 section URLs after the
  deletion — money sections especially — plus one non-money + one money-section save
  confirming identical persistence. Walkthrough in `sprint-4.md`. (Per-sprint authed
  money smokes from S1/S3 also remain Daniel's.)
- **Merge:** S4/PR #74 is CI-green + CLEAN; builder ≠ reviewer, so merge is owed to a
  fresh reviewer (LOW-risk → may auto-merge) or Daniel.
- **No new debt introduced.** `Canal.tsx` (~1,063 lines) is the largest section and sits
  comfortably under the 1,200-line guard; if it grows, the guard will flag it and it can
  be split further — but that's optional, not owed.
