---
title: "Seller-portal UX audit — apply the July-2026 refresh"
slug: seller-portal-ux-audit
status: queued
area: "03"
type: epic
priority: wave-1
risk: low
epic: null
build_order: null
updated: 2026-07-08
---

# Scope — Seller-portal UX audit (apply the July-2026 refresh)

> **Status: ✅ SIGNED OFF (Daniel, 2026-07-08) — P0·A + P0·B SCAFFOLDED.** Gate passed. **Scaffolded + committed:**
> [`09-platform-infra/seller-portal-rails-foundation/`](../../09-platform-infra/seller-portal-rails-foundation/README.md)
> (P0·A; README + sprint-1..2 + retro; kickoffs emitted) and
> [`03-selling-and-shops/seller-portal-setup-guide/`](../../03-selling-and-shops/seller-portal-setup-guide/README.md)
> (P0·B; README + sprint-1 + retro; commit `ad6102e`; kickoff emitted). `epic: null` stays — this is a
> multi-epic umbrella; each scaffolded epic README is the SSOT for its part.
>
> **Remaining groom sequence (one fresh session each — Daniel, 2026-07-09):** **P1·D onboarding three-doors**
> (next; fresh deep-groom) → **P1·C IA remainder** (folds into `catalog-management`; groom *after* its S3
> merges to avoid nav collision — that epic is HIGH, S3 PRs open, S4 hard-gated on `profit-analyzer` US-4) →
> **P2·E depth pass** (last; reuses catalog-management S3 staging + soft-delete precedent). F1 emoji dialect
> already scoped in the scaffolded `emoji-to-iconoir-sweep` (no fresh groom). **Build path:** P0·A → P0·B
> (needs A's primitives) → D/C/E follow their grooms. **Risk-tiers to confirm at each groom:** P1·D
> cobros-wizard OAuth (LOW vs HIGH money-path); P2·E order-bulk staged-apply (MED vs HIGH fulfillment gating).
>
> Groomed 2026-07-08 off `references/MiyagiAdminUXAudit/` (built via Claude design). Class: **umbrella /
> wave** — one audit, five workstreams, sliced like the shipped `remaining-audit-polish.md` (#3c) precedent.
>
> **Daniel's groom decisions (2026-07-08):**
> 1. **Shape = program of 5 epics** (the audit's own P0·A / P0·B / P1·C / P1·D / P2·E split), each sized
>    at Definition-of-Ready, independently shippable.
> 2. **Scaffold P0·A (Rails foundation) now**; deep-groom B / C / D / E individually as they reach the queue
>    (own fresh session each — cheap + context-clean).
> 3. **Fold overlap into the in-flight epics** — the IA remainder (F5/F6/F7) rides `catalog-management`;
>    F1's emoji dialect folds into the already-scaffolded `emoji-to-iconoir-sweep`. New epics own only the
>    genuinely-new gaps.
> 4. **P0·A is next-up** — mechanical, low-risk, and every other workstream depends on its shared primitives.

## The ask (mirrored back)
*You want the July-2026 seller-portal UX/UI audit turned into shippable, sliced work — one design language,
a real onboarding path, sane IA, and a depth pass — grounded in what already exists rather than a rebuild.
Right?*

The audit covers the merchant portal (`/shop/manage`, `/sell`, `/sell/setup`, onboarding) and ships as
12 findings (F1–F12), 15 enforceable rails (R1–R15) + 5 principles, a Nav/IA spec, and an Onboarding spec.
Its north star: *never hand the merchant a blank form or a silent wait — show a prepared state they can
approve or edit, say what will happen before it happens, confirm what happened after, with a way out.*

## Outcome & signal
After this program ships: (1) the seller portal renders **one** design language (one status palette, one
button hierarchy, one toast, one icon set) — verifiable by a green CI token-lint and Daniel's eyeball on
the dashboard + a settings page; (2) a new merchant lands on a **guided path**, not a wall — a persistent
setup guide + a three-doors first-run with agent-first, approve-before-apply intake; (3) nav never 404s and
every action is reachable on mobile; (4) the depth rails (skeletons, undo, staged bulk, honest copy, 44px
targets) hold. Each epic carries its own Daniel-runnable acceptance + smoke walkthrough.

## Stage-2.5 bucket — mostly *adoption / light-enhancement*, some *genuinely-new*
This is **not** a rebuild. Per finding:

- **Already covered / in-flight** (fold in, don't rebuild): the **IA restructure is largely shipped** —
  `catalog-management` S1.1/S1.2 (merged 2026-07-08) already built the 4-group rail
  (Operar/Catálogo/Crecer/Configuración) and the real `/shop/manage/catalogo` route, killing the
  `#anuncios` anchor. So **most of NAV-IA-SPEC's change list is done** — F5/F6/F7 shrink to the *remaining*
  gaps. **F1's emoji dialect** overlaps the scaffolded `emoji-to-iconoir-sweep` (0/2) — folds in.
- **Adoption, not invention**: Design System v2 tokens already exist (`globals.css`) — F1 is adopting them
  in a shared `<StatusBadge>/<Button>/<Card>`, not designing new ones. The **staged approve-before-apply**
  pattern already ships (the catalog importer = the R11 reference). **Value-based settings completion**
  already computes (`settings/page.tsx`) — the setup guide is a light read over it.
- **Genuinely-new (real build)**: the onboarding three-doors flow + drop-anything intake + `<SuccessCard>`
  convergence; the `lib/setup-guide.ts` guide card; the shared feedback primitives + CI token-lint.

## The shape: 5 workstreams (fold 2 into in-flight epics)

| # | Workstream | Findings | Class / Archetype | Area | Risk | Disposition |
|---|---|---|---|---|---|---|
| **P0·A** | **Rails foundation** — shared primitives + token-lint | F1, F2 | Chore / Sweeper | 09 | LOW | **Scaffold now** |
| **P0·B** | **Setup guide on dashboard** | F3 | Feature / Grower | 03 | LOW | Deep-groom next |
| **P1·C** | **IA restructure remainder** | F5, F6, F7 | Feature / Sweeper | 03 | LOW–MED | **Fold into `catalog-management`** (fast-follow) |
| **P1·D** | **Onboarding three-doors** | F4, F12 | Feature / Builder | 03 | MED (confirm) | Deep-groom |
| **P2·E** | **Depth pass** | F8–F11 | Feature | 03 | MED (confirm) | Deep-groom last |
| — | **Emoji dialect** | F1 (icons) | Chore / Sweeper | 09 | LOW | **Fold into `emoji-to-iconoir-sweep`** |

**Sequence (Daniel-approved):** P0·A (next-up) → P0·B → P1·C (rides `catalog-management`) ∥ P1·D → P2·E.

---

## P0·A — Rails foundation *(the epic that scaffolds on approval)*

**Job:** *As a merchant, I want the portal to look and behave like one product — one status color system,
one button, one toast — so that nothing feels improvised or broken.* Mechanical, unblocks every other
workstream (they all consume these primitives). Area **09 · Platform-infra** (sits beside
`design-token-foundation` + `emoji-to-iconoir-sweep`). **Rails touched: R1–R7.**

### What already exists (reuse, don't rebuild — Medusa-first = frontend-first here)
- **Design System v2 tokens** (`app/globals.css`): semantic `--success/--warning/--danger/--info/--accent`
  (+`-soft`), radii scale (`--r-sm/md/lg/pill`), `.btn/.btn-primary/.btn-secondary/.btn-ghost`, `.skeleton`,
  `.toast-in`, provider colors (MP/WhatsApp/Envía). **Adopt these — do not invent.**
- **`lib/design-token-audit.ts`** — the existing raw-color CI guard; extend it, don't fork.
- **The R6 "during" reference already ships** — the optimistic toggle + revert in `ManageDashboard.tsx`.
  Copy that pattern into the shared primitive.
- **`components/feedback/`** is the only place toasts/banners may live (rail R6).
- Undefined token to fix: **`--color-subtle`** (used in `OrdersInbox`, never defined) → `--bg-sunk` or define.

### Stories (skateboard → car)
- **A.1 — Shared look primitives.** `<StatusBadge>` (maps every chip to the 5 semantic tokens + the R1
  order-lifecycle mapping: paid→success "Nuevo" · processing/shipped/in_transit→info · delivered→success ·
  completed→neutral · refunded/canceled→danger · ML→promo), `<Button>` (one R2 hierarchy — kill the 4
  hand-rolled shapes), `<Card>` (R3 radii by role). Define/replace `--color-subtle`. **LOW.**
- **A.2 — Shared feedback primitives.** One `<Toast>` (token colors, icon, action slot, aria-live) + one
  `<Banner>` in `components/feedback/`; implement the R6 before/during/after contract incl. the
  optimistic-apply→toast+undo→revert path; **delete the 4 existing toast implementations** (ManageDashboard
  bespoke, settings `Toast.tsx`, OrdersInbox gray box, wizard inline banners). **LOW.**
- **A.3 — Adoption sweep.** Replace raw Tailwind palette classes (green-100/indigo/purple/amber-50),
  hard-coded `bg-white`→`--bg-elevated`, literal radii, and the 4 button shapes across `OrdersInbox.tsx` ·
  `ManageDashboard.tsx` · `SellWizard.tsx` · `SetupClient.tsx` with the new primitives. Kill indigo/purple
  status colors. **LOW — but announce: touches many seller-portal files; coordinate with any in-flight
  `catalog-management` sprint to avoid merge noise.**
- **A.4 — CI token-lint.** Extend `lib/design-token-audit.ts` to scan components for raw palette classes,
  `bg-white`, literal radii, and toast imports outside `components/feedback/`; advisory → required once the
  sweep is green. **LOW.**

> **Coordination:** F1's *emoji* dialect (R4) is **not** in P0·A — per Daniel it folds into the scaffolded
> `emoji-to-iconoir-sweep`. Sequence the two so the icon sweep and the color/button sweep don't fight over
> the same files (both are Sweepers on the seller shell). Timing note from that epic: run the sweep *after*
> in-flight `catalog-management`/OSPP sprints merge, or scope their files out of pass 1.

### Risk tier & kill-switch (Stage 6b)
**Risk: LOW** — visual/presentational only; no commerce mutation, no money/auth/migration path.
**Kill-switch: carve-out — no runtime seam.** The change is component-level rendering; enforcement is a CI
lint (build-time), not a runtime flag. Nothing to gate; a bad sweep is reverted by `git revert`, not a flag.

### QA / smoke (WAYS-OF-WORKING)
- **Specs:** extend `e2e/seller-mode.spec.ts` — ≤1 `.btn-primary` per route (R2); status chips resolve to
  semantic tokens (R1). Pure-logic spec on the `<StatusBadge>` order-status→token mapping (free coverage).
- **CI:** the A.4 token-lint is the durable enforcement.
- **Smoke owed to Daniel (visual):** eyeball the dashboard + one settings page + the orders inbox in light,
  dark, and calm modes — the raw-class bugs are exactly the ones that broke dark mode.

---

## The other four workstreams (sized at Definition-of-Ready; deep-groom each individually)

### P0·B — Setup guide on dashboard (F3) · area 03 · LOW · Grower
`lib/setup-guide.ts` reads the existing value-based `completedSections` checks; persistent
"Pon tu tienda en marcha" card on Resumen with 5 personalized steps, one open at a time, payments = step 3
with a "~4 min" estimate; dismissible with restore in Configuración (ONBOARDING-SPEC S6). **Reuse:**
`settings/page.tsx` completion logic, `ManageDashboard`. Works *before* the onboarding doors exist — good
early win. Depends on P0·A primitives.

### P1·C — IA restructure remainder (F5, F6, F7) · **folds into `catalog-management`** · LOW–MED · Sweeper
The 4-group rail + Anuncios route already shipped (catalog-management S1.1/S1.2). Remaining gaps: flag-safe
nav parity (Ganancias entry 404s when `ops.profit_enabled` off — R13); **seller shell over `/sell` +
`/sell/setup`** for shop owners (extend `isSellerModePath`; signed-out keeps buyer chrome — F6); mobile bar
= Publicar FAB + grouped "Más" sheet + badge relay (F5); split the 62KB `Canal.tsx` (Canales page vs
support card); one import door + mobile restore (F7); money-first dashboard header stats. **Reuse:**
`lib/seller-nav.ts` SSOT, the catalog-management nav work. Ride it as a fast-follow per NAV-IA-SPEC.

### P1·D — Onboarding three-doors (F4, F12) · area 03 · MED (confirm at deep-groom) · Builder
Per ONBOARDING-SPEC S1–S8: welcome intake → three doors (agent door first, trust contract) → drop-anything
intake → **staging preview (R11)** → creation + `<SuccessCard>` → setup guide → cobros mini-wizard (R12) →
share. **Reuse:** `SetupClient.tsx` staging/report machinery, `stageProducts`/`configBlocks`; the cobros
wizard wraps the **existing** Pagos OAuth (no new money path); F12's three endings converge on one shared
`<SuccessCard>` (R9). New store: `tenant_intake` in **Supabase** (non-commerce — Rule 2 OK). Metrics wired
day one (door_share, time_to_payable, S4 approve rate…). Depends on P0·A + P0·B.
**Confirm at deep-groom:** whether the cobros-wizard OAuth reshaping is truly presentational (LOW) or trips
a money-path review (HIGH → Daniel merges).

### P2·E — Depth pass (F8–F11) · area 03 · MED (confirm) · Feature
`loading.tsx` + content-shaped skeletons per manage route (R5); **soft-delete + 10s "Deshacer"** (R7 —
precedent: `seller-unclaimed-bug-sweep`); **staged preview for order bulk** (R11 — extends
catalog-management S3's diff-preview-apply to `OrdersInbox` bulk status); copy sweep (R10 — remove guilt
framing + invented stats "4×/70%/3×/23%", es-MX R15 fix "Estado / State"); 44px targets + row bottom sheets
(R14). **Reuse:** `.skeleton` (exists, unused), catalog-management S3 staging, soft-delete precedent.
**Confirm at deep-groom:** the order-bulk staged-apply touches order status (mutation) — likely MED, may
be HIGH if it changes fulfillment gating.

---

## Scope
**In v1 (this program):** the 5 workstreams above, sliced per epic; the shared rails primitives + CI
token-lint (P0·A, scaffolded now); the setup guide, IA remainder, onboarding three-doors, and depth pass
(sized at DoR, deep-groomed individually); es-MX copy completeness throughout (AGENTS rule 5); one api/spec
per testable story + a smoke walkthrough per epic.
**Out of v1:** the *emoji* icon sweep (folds into `emoji-to-iconoir-sweep`, not re-scoped here); any Medusa
backend/module or Supabase table beyond the `tenant_intake` intake store; net-new commerce features the
audit doesn't call for; re-auditing the buyer surface (covered by the shipped #3a/#3c audit line); the
audit's reference end-state HTML/hi-fi screens as signed-off scope (they're inspiration, not spec — the
handoff MD is the contract).

## Acceptance criteria (program-level; each epic carries its own Daniel-runnable checks)
- Portal renders one design language: CI token-lint green; no raw palette classes / `bg-white` / literal
  radii / stray toast impls; ≤1 primary button per route; dark + calm modes intact.
- A fresh merchant sees a setup guide on Resumen and a guided first-run (not a blank paste box); payments is
  a named step with a time estimate, not a post-hoc surprise.
- No nav entry 404s; every dashboard action exists on mobile; `/sell` renders in the seller shell for owners.
- Destructive actions offer undo; bulk actions preview before apply; copy is factual, es-MX, no invented
  stats; row tap targets ≥44px.

## Open risks / research
- **Shared-surface blast radius.** P0·A A.3 + P1·C touch `layout.tsx`-adjacent seller chrome and many
  portal files; LEARNINGS is explicit — announce, prefer a PR, and don't collide with in-flight
  `catalog-management`/OSPP sprints. Path-scoped commits only (never `git add -A`).
- **Two Sweepers on the same files.** P0·A (color/button) and `emoji-to-iconoir-sweep` (icons) both rewrite
  the seller shell — sequence them, don't run in parallel worktrees over the same components.
- **Risk tiers to confirm at deep-groom.** P1·D cobros-wizard OAuth and P2·E order-bulk staged-apply each
  *could* cross into HIGH (money/fulfillment) — resolve at each epic's own groom, don't assume LOW now.
- **No external-fact research needed** — this is internal UX against current `main`; the benchmark
  references (Shopify Sidekick/checklist, Stripe rails, Tiendanube onboarding) are already captured in the
  audit's `research/context-notes.md`.

## Definition of Ready check
- [x] As-a/I-want/so-that clear per workstream; acceptance is Daniel-runnable.
- [x] Class named (umbrella → 1 chore/sweeper + 3 features + 1 folded-in); Stage-2.5 bucket = mostly
      adoption/in-flight, some genuinely-new — named per finding.
- [x] v1 in/out boundary written; Daniel's 4 groom decisions captured (shape · scaffold granularity ·
      fold overlap · P0·A next-up).
- [x] Medusa-first / reuse list produced (tokens · `design-token-audit.ts` · `seller-nav.ts` ·
      `SetupClient` staging · `settings/page.tsx` completion · catalog-management nav + S3 staging ·
      soft-delete precedent).
- [x] Each workstream risk-tiered; QA stage named; P0·A smoke owner = Daniel (visual).
- [x] P0·A is LOW → kill-switch carve-out recorded (no runtime seam; CI lint, not a flag).
- [ ] **Daniel approves this scope doc** ← the gate. On approval: scaffold P0·A (epic + sprints), commit
      path-scoped, emit its per-sprint Claude Code kickoffs; leave B/C/D/E to their own groom sessions.
