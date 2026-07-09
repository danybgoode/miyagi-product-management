---
title: "Seller-portal setup guide on dashboard (P0·B / F3)"
slug: seller-portal-setup-guide
status: scaffolded
area: "03"
type: feature
priority: wave-1
risk: low
epic: "03-selling-and-shops/seller-portal-setup-guide"
build_order: null
updated: 2026-07-09
---

# Scope — Setup guide on dashboard (P0·B of the seller-portal UX audit · F3)

> **Status: ✅ SIGNED OFF (Daniel, 2026-07-09) — SCAFFOLDED.** Gate passed. **Scaffolded + committed:**
> [`03-selling-and-shops/seller-portal-setup-guide/`](../../03-selling-and-shops/seller-portal-setup-guide/README.md)
> (README + sprint-1 + retro; one sprint, all four stories LOW; kickoff emitted). The epic README frontmatter
> `status:` is now the SSOT — this seed is funnel-only. Deep-groom of workstream **P0·B** from the
> [`seller-portal-ux-audit`](./seller-portal-ux-audit.md) umbrella (P0·A scaffolded at
> [`09-platform-infra/seller-portal-rails-foundation`](../../09-platform-infra/seller-portal-rails-foundation/README.md)).
> Groomed 2026-07-08 off `references/MiyagiAdminUXAudit/handoff/` — AUDIT-FINDINGS **F3** + ONBOARDING-SPEC **S6**.
> Class: **Feature / Grower**. Area **03 · Selling-and-shops**.

## The ask (mirrored back)
*You want a fresh merchant to land on the dashboard and see a guided path — a persistent "Pon tu tienda en
marcha" card that reads the completion state we already compute, walks them through the 5 steps to a
sellable shop (payments named up front, not sprung after the fact), and disappears once they're done.
Right?*

Today (F3) onboarding is a **wall, not a path**: there's no setup guide after shop creation; the "N de 11"
completion counter is buried inside Configuración; payments is revealed as "sigue siendo un paso manual"
*after* agent setup succeeds; and the empty dashboard shows two competing CTAs with no recommendation.

## Class & archetype
**Feature / Grower.** Grower ⇒ acceptance ties to a **success signal** (guide step-completion events), not
just "the card renders." Reuse-first is even stronger here — the completion logic already exists.

## Stage-2.5 bucket — light-enhancement over one genuinely-new lib
- **Adoption / light**: the **value-based completion checks already compute** in `settings/page.tsx`
  (`completedSections()` over a `shopComputed` object). The dashboard already loads everything the card
  needs (seller, shop settings, product list). This is a *read* over existing state + a card, not new
  commerce plumbing.
- **Genuinely-new (small)**: extract the completion logic into a shared `lib/setup-guide.ts` seam, and the
  "Pon tu tienda en marcha" card itself.

## Outcome & signal
After P0·B ships: a merchant opening **Resumen** (`/shop/manage`) sees a persistent guide card with a
"n de 5" progress bar; one step open at a time; **payments is step 3, open by default when incomplete, with
a "~4 min" pill** and a "Configurar cobros" CTA. Completed steps collapse (strikethrough). The card is
dismissible ("Ocultar") with restore in Configuración. **Grower signal:** guide step-open / step-complete /
dismiss / restore events fire and are visible in metrics — so we can see whether the guide actually moves
merchants toward payable. Works *before* the onboarding three-doors (P1·D) exist — a good early win.

## Disambiguation resolved (Daniel, 2026-07-08)
1. **Steps 2 & 5 completion** — the 5 guide steps don't all map to the 12 settings sections. Resolution:
   - **Step 2 "Sube tu catálogo"** → done when the Resumen page's **already-loaded** product list is
     non-empty (`products.length > 0`) — no new fetch (the page fetches `/store/sellers/me/products`).
   - **Step 5 "Comparte tu tienda"** → done on the **first share action**; record a `share_done` flag in
     shop settings metadata (same PATCH path used for dismiss). Fully auto-complete, matches S6's
     "auto-complete from existing checks" intent.
   - Steps 1/3/4 map cleanly to the existing value-based checks: **perfil**→"Crea tu tienda",
     **pagos**→"Activa cómo cobrar", **envios**→"Revisa tus envíos".
2. **Kill-switch** — **carve-out, no flag** (like P0·A). Additive presentational card + non-commerce
   metadata flags; a bad render is `git revert`, not a runtime kill. (Full record in Risk tier below.)

## Medusa-first reframe / What already exists (reuse, don't rebuild)
No commerce surface — UI layer + non-commerce settings metadata only (AGENTS rule 1 not engaged).
- **`app/(shell)/shop/manage/settings/page.tsx`** — `completedSections()` + the value-based `*_ok` checks
  (`stripe_ok || mp_enabled || clabe_ok` → pagos; `envios_ok`; `name && description` → perfil, etc.). The
  comment already states the intent: value-based "so a section lights up only when it holds real data."
  **Extract this into `lib/setup-guide.ts`; both the settings page and the card consume it.**
- **`app/(shell)/shop/manage/page.tsx`** (Resumen server component) — already loads the seller
  (`/store/sellers/me`), the Supabase shop mirror, and the product list (`/store/sellers/me/products`).
  **Product count for step 2 is already in hand — no new fetch.**
- **`ManageDashboard.tsx`** — the card host (Resumen client shell).
- **P0·A primitives** — `<Card>` / `<Button>` / `<StatusBadge>` from `seller-portal-rails-foundation`.
  Build the card on these (see sequencing risk).
- **`PATCH /api/sell/shop/route.ts`** — existing shop profile+settings update path; persist the
  `guide_dismissed` + `share_done` flags in `metadata.settings` (Supabase, **non-commerce → Rule 2 OK**).
- **CTA target** `/shop/manage/settings/pagos` (payments) — exists; the card only *links* to it (no money
  path touched).
- **No new Medusa module/table, no new API route, Clerk untouched (rules 1/2/4 clean).**
- **AGENTS rule 3 (agent surface):** the card is human-facing dashboard chrome; the underlying state
  (payments connected, catalog present) is already agent-visible via UCP — no new agent action owed.
- **AGENTS rule 5 (es-MX):** all copy es-MX ("Pon tu tienda en marcha", step labels, "~4 min"); not on the
  bilingual allow-list.

## Stories (skateboard → car)
- **B.1 — `lib/setup-guide.ts` seam + settings refactor.** Extract the value-based completion logic out of
  `settings/page.tsx` into a pure `lib/setup-guide.ts`; expose e.g. `getSetupSteps({ shop, productCount,
  shareDone })` → the ordered 5 steps (`id · label · done · cta · estimate`) with "one open at a time"
  resolution (first incomplete step is open; payments/step-3 open by default when incomplete). Point
  `settings/page.tsx` at the seam — **identical render, regression-guarded.** *This is the skateboard:
  ships safely, invisible, de-risks everything after.* **LOW.**
  *QA: pure-logic unit spec on the step computation (free coverage — each step's `done` predicate, ordering,
  one-open-at-a-time).*
- **B.2 — "Pon tu tienda en marcha" card on Resumen.** Persistent card in `ManageDashboard`, reading the
  seam: "n de 5" progress + bar; one step open at a time; completed collapse with strikethrough; **step 3
  payments** open-by-default-when-incomplete, "~4 min" pill, body "Conecta Mercado Pago, Stripe o SPEI. Sin
  esto tus compradores no pueden pagarte.", CTA "Configurar cobros" → `settings/pagos`. Built on P0·A
  `<Card>`/`<Button>`. *This is the visible win.* **LOW.**
  *QA: extend `e2e/seller-mode.spec.ts` — card renders on Resumen with n/5; payments step shows the pill.*
- **B.3 — Dismiss + restore + share-complete.** "Ocultar" ghost (and auto-collapse when all 5 done) that
  persists `guide_dismissed` via the existing `PATCH /api/sell/shop`; a restore toggle in Configuración;
  step 5 "Comparte" marks `share_done` on the first share action. **LOW.**
  *QA: e2e — dismiss hides the card; Configuración restore brings it back; share action ticks step 5.*
- **B.4 — Instrument guide step events (the Grower signal).** Wire the S6 metrics: `guide_view`,
  `guide_step_open`, `guide_step_complete` (per step id), `guide_dismiss`, `guide_restore`,
  `first_share_tap`. Acceptance ties to these firing, per Grower. **LOW.**

**Suggested sprinting:** one sprint (all four, LOW, small) as a fast early win; splittable B.1–B.2 /
B.3–B.4 if preferred at scaffold.

## Risk tier & kill-switch (Stage 6b)
**Risk: LOW** — additive, presentational dashboard card + non-commerce settings-metadata flags. No commerce
mutation, no money/auth/migration/fulfillment path (the payments CTA only *links* to the existing
`settings/pagos` OAuth — P0·B doesn't touch it).
**Kill-switch: carve-out — no runtime seam.** Nothing to gate: a bad render is reverted with `git revert`,
not a flag; the dismiss/share state is fail-safe (absent flag = show the guide). Matches P0·A's carve-out.

## QA / smoke (WAYS-OF-WORKING)
- **Specs:** pure-logic unit spec on `lib/setup-guide.ts` (the free-coverage seam — the main gate);
  `e2e/seller-mode.spec.ts` extended for card render / progress / payments pill / dismiss+restore / share tick.
- **Smoke owed to Daniel (visual + flow):** on a shop that isn't fully configured — open `/shop/manage`,
  see the card with "n de 5" and **payments (step 3) open with the ~4 min pill**; connect payments → step 3
  checks off with strikethrough and step 4 opens; click "Ocultar" → card gone; go to Configuración → restore
  → card back. (The payments connect itself is the existing pagos OAuth — not part of this epic, called out
  so it's clear the guide only links to it.)

## Scope
**In v1 (P0·B):** `lib/setup-guide.ts` seam (+ settings refactor, no regression); the "Pon tu tienda en
marcha" card on Resumen with the 5 steps, one-open-at-a-time, payments=step 3 with ~4 min estimate; dismiss
+ restore-in-Configuración; step 5 share-complete; guide-step metrics; es-MX copy; unit spec + e2e coverage.
**Out of v1:** the money-first **stats-row reorder** on the dashboard header (S6 mentions it, but it
overlaps P1·C "money-first dashboard header stats" — **rides P1·C**, not double-owned here); **intake-based
personalization** of step order/skips (S6's "personalized" reads `tenant_intake`, which is built in **P1·D**
onboarding — P0·B ships the **default static 5-step order**, and P1·D later reads the same seam to
personalize); the onboarding three-doors / SuccessCard / cobros wizard (P1·D); any Medusa module or Supabase
table (dismiss/share flags reuse existing settings metadata); changes to the pagos OAuth itself.

## Acceptance criteria (Daniel-runnable)
- A not-fully-configured shop shows a persistent "Pon tu tienda en marcha" card on `/shop/manage` with an
  accurate "n de 5" progress bar reflecting real completion (not a static counter).
- **Payments is a named step 3**, open by default when incomplete, with a "~4 min" estimate and a working
  "Configurar cobros" CTA — payments is surfaced *up front*, not sprung after setup.
- Steps auto-complete from real state: profile (perfil), catalog (product count > 0), payments, shipping
  (envios), share (first share action) — and completed steps collapse with strikethrough, one open at a time.
- The card can be hidden ("Ocultar") and restored from Configuración; the state persists across reloads.
- The settings page's "N de … secciones configuradas" counter is unchanged after the seam extraction (no
  regression).
- Guide step events fire (view / open / complete / dismiss / restore) and are visible in metrics.

## Open risks / research
- **Sequencing on P0·A.** The card is built on P0·A's `<Card>`/`<Button>`/`<StatusBadge>`. P0·A is
  scaffolded but not yet merged — **build P0·B after P0·A lands**, or (fallback) render the card directly on
  the `globals.css` Design System v2 tokens and swap to the primitives once P0·A merges. Decide at kickoff.
- **Shared-surface touch (small).** B.1 edits `settings/page.tsx` and B.2 edits `ManageDashboard.tsx` —
  both are also touched by P0·A's adoption sweep and by in-flight `catalog-management`. Path-scoped commits;
  coordinate ordering so the seam extraction and the color/button sweep don't collide on the same files.
- **"Personalized" is deferred, by design.** S6 says the steps are personalized from intake; that store
  doesn't exist until P1·D. P0·B ships the default order and leaves a clean seam for P1·D — stated in Out-of-scope
  so it isn't over-built now.
- **No external-fact research needed** — internal UX against current `main`; benchmark refs already captured
  in the audit's `research/context-notes.md`.

## Definition of Ready check
- [x] As-a/I-want/so-that clear; acceptance is Daniel-runnable.
- [x] Class named (Feature / Grower); Stage-2.5 bucket = light-enhancement over one small genuinely-new lib.
- [x] v1 in/out boundary written (stats-row → P1·C; personalization → P1·D; explicit).
- [x] Disambiguation resolved (steps 2 & 5 completion; kill-switch carve-out).
- [x] Medusa-first / reuse list produced (`settings/page.tsx` completion · Resumen product list · PATCH
      settings metadata · P0·A primitives · pagos CTA); AGENTS rules 1–5 checked.
- [x] Each story risk-tiered LOW; QA stage named (pure-logic unit spec = free coverage + e2e); smoke owner
      = Daniel (visual + flow).
- [x] LOW → kill-switch carve-out recorded (no runtime seam; git-revert, fail-safe metadata).
- [x] **Daniel approved this scope doc (2026-07-09)** ← the gate. Scaffolded (area 03, one sprint), committed
      path-scoped, kickoff emitted.
