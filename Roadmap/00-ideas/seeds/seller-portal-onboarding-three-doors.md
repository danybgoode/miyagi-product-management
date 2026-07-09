---
title: "Seller-portal onboarding three-doors (P1·D / F4, F12)"
slug: seller-portal-onboarding-three-doors
status: scaffolded
area: "03"
type: feature
priority: wave-1
risk: low
epic: "03-selling-and-shops/seller-portal-onboarding-three-doors"
build_order: null
updated: 2026-07-09
---

# Scope — Onboarding three-doors (P1·D of the seller-portal UX audit · F4, F12)

> **Status: ✅ SIGNED OFF (Peerlo, 2026-07-09) — SCAFFOLDED.** Gate passed. **Scaffolded + committed:**
> [`03-selling-and-shops/seller-portal-onboarding-three-doors/`](../../03-selling-and-shops/seller-portal-onboarding-three-doors/README.md)
> (README + sprint-1..3 + retro; kickoffs emitted). The epic README frontmatter `status:` is now the SSOT —
> this seed is funnel-only. Deep-groom of workstream **P1·D** from the
> [`seller-portal-ux-audit`](./seller-portal-ux-audit.md) umbrella. **Depends on P0·A + P0·B primitives.**
>
> Groomed 2026-07-09 off `references/MiyagiAdminUXAudit/handoff/` — AUDIT-FINDINGS **F4** (hero path feels
> like a developer tool) + **F12** (three different endings) + ONBOARDING-SPEC **S1–S8** + UX-RAILS
> **R6/R9/R11/R12/R13/R14**. Class: **Feature / Builder**. Area **03 · Selling-and-shops**.
> **Depends on P0·A** (rails primitives) **+ P0·B** (`lib/setup-guide.ts` seam — S6 reads it).

## The ask (mirrored back)
*You want a fresh merchant's first run to feel like a guided, agent-first path instead of a developer tool:
a welcome intake, three clearly-ranked doors (agent door first, with a trust contract), a drop-anything
intake that accepts files/photos/JSON/ML sync, a staging preview they approve before anything is created,
and one shared success ending — all in the seller shell, es-MX, with the payments step named up front rather
than sprung after the fact. Right?*

Today (**F4**) the "hero" agent path is: copy a prompt → leave to an external AI → come back with JSON →
paste it into a **textarea that is the first thing shown**. The staging table + report behind it are
excellent, but they're gated behind that paste hurdle, and on `/sell` the agent path is a small nudge card.
And (**F12**) there are **three different endings** — SellWizard step 3, SetupClient report, ImportClient
report — with three layouts, three next-step logics, three share affordances.

## Class & archetype
**Feature / Builder** (default, production-grade, full DoD). It's genuinely-new first-run UX + one shared
convergence component, built on shipped staging/report machinery.

## Stage-2.5 bucket — genuinely-new flow over mostly-existing machinery
Not a rebuild — the hard parts (staging, apply, report, the OAuth) already ship. Per finding:
- **Adoption / reuse (the spine)**: `SetupClient.tsx` **staging → apply → report** machinery
  (`aggregateSetupReport`, `configBlocks`, the apply path, `SetupReport`) is the S4/S5 engine — restyle and
  re-route, don't re-derive. The **cobros OAuth** (`/api/mp/connect` + `/api/stripe/connect`, mirrored) is
  the S7 engine — the wizard **wraps** it, unchanged. The **`lib/setup-guide.ts`** seam (P0·B) is the S6
  card — reused, not rebuilt. Doors 2 & 3 exit into the **existing** ImportClient / SellWizard.
- **Genuinely-new (real build)**: the **S1 intake → S2 three-doors** first-run + routing; the `tenant_intake`
  Supabase store; the **drop-anything intake (S3)** (CSV direct + a photos/captures → spec agent job); the
  one shared **`<SuccessCard>` (R9)** that F12's three endings converge on; the S7 **wizard shell** (R12)
  around Pagos; the S8 **share kit**; and the day-one metrics.

## Disambiguation resolved (for Peerlo to confirm at the gate)
1. **Cobros-wizard risk tier (the umbrella's open question)** — **RESOLVED: presentational → LOW**, with a
   named tripwire. See *Risk tier* below. The wizard wraps the existing, unchanged MP/Stripe OAuth in a
   wizard shell (breadcrumb · step dots · R6-before info box · resume banner on return). The token exchange,
   token storage (`marketplace_shops.metadata.settings.mercadopago`), and Medusa seller sync are **not
   touched**. **Tripwire → HIGH → Daniel merges:** if any story ends up editing token exchange/storage
   (`lib/mercadopago-connect.ts`, `mpSettingsFromToken`), the callback's token logic, or
   `syncMedusaSellerProfile`, that story escalates to HIGH. The one allowed route touch — pointing the
   OAuth **callback's post-return redirect** back at the wizard step (with the resume banner) instead of the
   bare `settings/pagos` page — is a redirect-string change, not a money mutation → stays LOW.
2. **S2-alt (single conversational box) A/B** — **out of v1.** Ship the three-doors (S2) first; the
   conversational-box variant (S2-alt) is a fast-follow behind the same downstream S4, instrumented via
   `door_share`. Named in Out-of-scope so it isn't half-built now.
3. **Photos/captures intake** — S3 accepts them, but the **image → spec conversion runs as an agent job**
   (async, "te avisamos aquí y por correo"), reusing the S5 background-safe progress card. **CSV/JSON are
   synchronous** (today's path); photos/screenshots queue. v1 may ship **CSV+JSON+ML sync synchronous** and
   land the photo-job as the last story if the agent-job seam needs its own spike — decide at scaffold.
4. **Kill-switch** — **recommended: an enablement flag `onboarding.three_doors_enabled`** added to the
   **in-house** flag system (`lib/flags.ts` `FlagKey` + `DEFAULT_FLAGS`, backed by the Supabase
   `platform_flags` table, fail-open), default `false` so the new first-run merges **dark** and is activated
   deliberately after the `tenant_intake` store + staging re-routes are verified. This is a *recommendation
   for Peerlo to evaluate at the gate*, not auto-injected. (Full record in Risk tier below.)

## Medusa-first reframe / What already exists (reuse, don't rebuild)
Confirmed by reading the code on `main`:
- **`app/(shell)/sell/setup/SetupClient.tsx`** (547 lines) — the **S4/S5 engine**. Has
  `aggregateSetupReport({ shop, config, catalogChunks })`, `configBlocks` (= `validated.config.blocks`
  filtered to `status==='applied'`), the validated-rows apply path, `SetupReport`, and `LoopClose`. S4 =
  restyle its staging table to the spec's card layout (per-row Listo/Corregir + reasons — the importer's
  reference R11 pattern); S5 = its report, re-expressed through the new `<SuccessCard>`.
- **`lib/setup-spec.ts`** — the published, versioned setup-spec + the clerk prompt kit (S3's "copy our
  prompt" row is this, one-tap). Reuse; don't fork.
- **`app/(shell)/shop/manage/import/ImportClient.tsx`** — Door 2 target; restyle its ending to land on S6.
- **`app/(shell)/sell/SellWizard.tsx`** — Door 3 target; its step-3 success converges into `<SuccessCard>` (F12).
- **`app/(shell)/shop/manage/settings/_sections/Pagos.tsx`** + **`/api/mp/connect`(+callback)** &
  **`/api/stripe/connect`** — the **S7 engine**. `MANUAL_KEYS`/`lib/shop-settings/taxonomy.ts` already tags
  `pagos` (and citas/agentes/canal) as manual → the R12 mini-wizard target set. Wizard = shell over this.
- **`components/ConnectAgentPanel.tsx`** — S8's agent loop-close ("¿sigues tú o sigue tu agente?").
- **`lib/setup-guide.ts`** (**P0·B**, in flight) — the S6 guide card seam. P1·D **reads** it and adds the
  **intake-based personalization** (step order/skips from `tenant_intake`) that P0·B deliberately deferred.
- **P0·A primitives** — `<Card>`/`<Button>`/`<StatusBadge>`/`<Toast>`/`<Banner>` + the R6 before/during/after
  contract. Build all new surfaces on these.
- **New store: `tenant_intake` in Supabase** — **non-commerce → AGENTS Rule 2 OK** (an additive intake-capture
  table: what they sell, where they sell today, chosen door; personalizes S2/S6). No Medusa module, no
  commerce data. *(Confirmed: no `tenant_intake` anywhere in the frontend yet — genuinely-new.)*
- **AGENTS rules check:** Rule 1 (commerce = Medusa) — product creation reuses the **already-shipped**
  SetupClient apply path into Medusa; no new commerce plumbing. Rule 2 — `tenant_intake` is non-commerce
  (OK). Rule 3 (agent surface) — the agent door *is* the agent surface; S3's prompt kit + the existing
  seller MCP tools already let an agent produce the intake JSON; no new agent action owed by the UI shell.
  Rule 4 (Clerk) — untouched; the flow starts post-Clerk-signup. Rule 5 (es-MX) — all copy es-MX per the
  spec; not on the bilingual allow-list.

## Stories (skateboard → car)
> QA per WAYS-OF-WORKING: one api spec per testable story; prefer pure-logic specs on extracted `lib/` seams
> (free coverage); name any browser smoke owed to Daniel.

- **D.1 — `tenant_intake` store + S1 Bienvenida intake.** Supabase `tenant_intake` table (Rule 2) + the S1
  welcome screen in the seller shell: H1 "Hola, {nombre}…", Q1 ¿Qué vendes? / Q2 ¿Dónde vendes hoy? chips
  (both optional, multi), "Continuar" + ghost "Prefiero explorar por mi cuenta" (→ S6 at step 1). Answers →
  `tenant_intake`. **LOW.** *QA: pure-logic spec on the intake→personalization mapping (door order, S2
  subtitle, guide steps); api spec on the write.*
- **D.2 — S2 Tres puertas (agent first).** The three-doors screen reading `tenant_intake`: Door 1 recommended
  (agent tokens, 2px border, trust contract "Nada se publica sin tu visto bueno"), Door 2 → ImportClient,
  Door 3 → SellWizard; personalized subtitle; footer "puedes cambiar de camino… nada se pierde". Built on
  P0·A `<Card>`/`<Button>`. **LOW.** *QA: e2e — doors render in personalized order; each routes correctly.*
- **D.3 — S3 drop-anything intake.** Dashed dropzone (CSV/photos/JSON/screenshots) + "Traer de Mercado Libre"
  row (if connected) + the prompt-kit copy row (`lib/setup-spec.ts`) + paste-JSON as the **advanced**
  affordance inside the dropzone. CSV/JSON synchronous; **photos/captures → agent job** (background-safe).
  Footer "Nada se crea todavía — primero te mostramos el borrador completo." **LOW** (intake UI; the
  photo→spec agent job may want its own spike — see Open risks). *QA: e2e — each intake type reaches S4
  staging; api spec on the CSV→spec path.*
- **D.4 — S4 Revisa y aprueba (staging preview, THE screen) over SetupClient.** Restyle the existing
  `stageProducts`/`configBlocks` staging into the spec's card layout: Tu tienda card (inline Editar),
  Catálogo card (chip "N listos · M por corregir", per-row Listo/Corregir + reason + inline fix), config
  chips (✓ Diseño · ✓ Envíos · neutral "Cobros — después, ~4 min"), CTA "Crear mi tienda con N productos" +
  partial-success footnote. **Reuses the apply path unchanged.** **LOW–MED** (reuses the shipped
  commerce-write apply into Medusa — an already-in-prod path, not a money/fulfillment path). *QA: pure-logic
  spec on the intake-file→spec conversion; e2e — Corregir rows show reason + allow inline fix; approve →
  apply.*
- **D.5 — S5 `<SuccessCard>` (R9) + F12 convergence.** One shared `<SuccessCard>` (what happened → see it
  live ↗ → ≤2 next actions, guide-aware → share, WhatsApp first) + the S5 during-progress card
  (background-safe "puedes salir — te avisamos"). **Retrofit SellWizard step 3, SetupClient report, and
  ImportClient report** onto it (F12). **LOW.** *QA: browser spec — the card renders identically from all
  three entry points; api spec on the counts.*
- **D.6 — S6 personalization over `lib/setup-guide.ts` (P0·B seam).** Read `tenant_intake` to personalize
  step order/skips on the P0·B guide card (the deferred P0·B piece). Land the doors' success screens on S6
  advancing the guide. **LOW.** *QA: pure-logic spec on personalized-step resolution.*
- **D.7 — S7 Cobros mini-wizard (R12) over the existing OAuth.** Wrap `settings/pagos` in a wizard shell:
  breadcrumb Configuración / Cobros, step dots 1-2-3, Step 1 "Elige cómo te pagan" (MP recommended + R6-before
  info box "Te llevaremos a Mercado Pago… regresas aquí solito"), Step 2 provider connect (**existing** OAuth
  out-and-back; on return, resume banner "Mercado Pago conectado ✓"), Step 3 ¡Listo! two exits. **LOW —
  presentational wrapper; see the tripwire.** *QA: e2e — wizard shell + step dots + resume banner render;
  **the OAuth connect itself is owed to Daniel (money-adjacent auth), by name.***
- **D.8 — S8 Comparte + agent loop-close.** Share card (logo/nombre/N productos/slug pill), WhatsApp-first CTA
  (provider green, R1 brand exception) + Copiar enlace + IG-story image; ConnectAgentPanel loop-close. **LOW.**
  *QA: e2e — share affordances render; WhatsApp deep-link built correctly.*
- **D.9 — Metrics, day one.** Wire `door_share`, `time_to_first_product`, `time_to_payable`, guide step
  events, `S4 approve rate` + edits-per-approval, `S7 OAuth return rate`, `first share tap`. **LOW.**

**Suggested sprinting (at scaffold):** S1 = D.1–D.3 (intake + doors + drop-anything); S2 = D.4–D.6 (staging +
SuccessCard + S6 personalization); S3 = D.7–D.9 (cobros wizard + share + metrics). Behind
`onboarding.three_doors_enabled` (dark) throughout if Peerlo takes the flag recommendation.

## Risk tier & kill-switch (Stage 6b)
**Risk: LOW–MED overall, no HIGH unless the cobros tripwire trips.** No story touches
checkout/fulfillment/auth/Medusa-migrations/money **as built**:
- The **cobros wizard (D.7) is presentational** — it wraps the unchanged MP/Stripe OAuth. **Resolved LOW.**
  **Tripwire → HIGH → Daniel merges:** any edit to `lib/mercadopago-connect.ts` token exchange/storage,
  `mpSettingsFromToken`, the callback's token logic, or `syncMedusaSellerProfile`. The allowed callback
  *redirect-target* change stays LOW. The OAuth **connect round-trip itself is owed to Daniel** as the
  money-adjacent smoke (an automated browser smoke can't fully cover a real MP authorize).
- **Product creation (D.4)** reuses the **already-shipped** SetupClient apply into Medusa — not a new commerce
  primitive, not a money/fulfillment path → **LOW–MED**.
- **`tenant_intake` (D.1)** is an additive **non-commerce Supabase** table (Rule 2) — additive, no backfill,
  fail-safe absent → **LOW** (same posture as prior Supabase additions).

**Kill-switch: recommended enablement flag `onboarding.three_doors_enabled`** — polarity **enablement**,
default **`false`**; **mechanism** = the **in-house** flag system — add the key to `lib/flags.ts`
(`FlagKey` union + `DEFAULT_FLAGS: { 'onboarding.three_doors_enabled': false }`), read via `isEnabled()`,
backed by the Supabase `platform_flags` table and **fail-open** to the default (Flagsmith was decommissioned
— see LEARNINGS `feature-flags-inhouse`). Because `isEnabled()` fails open to the `false` default when the
`platform_flags` row is absent, the row seed rides the normal PR/deploy, not a build-session write (LEARNINGS:
Supabase `.env.local` = the shared prod project). **Seam** = the first-run entry that routes signup → S1/S2
(so with the flag off, signup keeps today's SetupClient/`/sell` entry — zero risk while `tenant_intake` + the
staging re-routes bake). This is a *dark-launch enablement* flag (merge dark, activate deliberately),
**recommended, not auto-injected** — Peerlo decides at the gate. Carve-out alternative if he prefers no flag:
the flow is additive and revertible with `git revert`, and D.7 introduces no new money-path runtime seam (the
existing connect flow already governs payout enablement).

## QA / smoke (WAYS-OF-WORKING)
- **Specs:** pure-logic specs on the free-coverage seams — intake→personalization (D.1/D.6), intake-file→spec
  conversion (D.3/D.4); `e2e/seller-mode.spec.ts` extended for door routing (R13 nav/shell parity), the S4
  approve-before-apply flow, the `<SuccessCard>` rendering identically from all three endings (F12), and the
  cobros wizard shell. A **browser** spec for the SuccessCard convergence (rendered UI an API call can't see).
- **Smoke owed to Daniel (by name — money/auth path):** the **S7 cobros OAuth connect round-trip** (real MP
  authorize → return → resume banner → payable), and the end-to-end first-run on a disposable shop (intake →
  agent door → drop a CSV → approve staging → SuccessCard → connect cobros → share). Everything else the agent
  smokes via api/browser specs.

## Scope
**In v1 (P1·D):** `tenant_intake` store; S1 intake; S2 three-doors (agent-first, trust contract); S3
drop-anything intake (CSV/JSON/ML sync synchronous; photos/captures via agent job); S4 staging preview over
the existing SetupClient `stageProducts`/`configBlocks` apply; S5 shared `<SuccessCard>` + F12 convergence of
SellWizard/SetupClient/ImportClient endings; S6 intake-personalization over the P0·B `lib/setup-guide.ts`
seam; S7 cobros mini-wizard (R12) wrapping the **existing** OAuth; S8 share kit + agent loop-close; day-one
metrics; es-MX copy throughout; the recommended `onboarding.three_doors_enabled` dark-launch flag (if taken).
**Out of v1:** **S2-alt** conversational-box A/B variant (fast-follow, same downstream S4); any **change to
the OAuth token exchange/storage/sync** (that's a separate HIGH money-path review, not this epic); the
**money-first dashboard stats-row** (rides P1·C, per P0·B's boundary); the **P1·C IA remainder** (seller shell
over `/sell`, mobile bar, Canal split — that epic owns `isSellerModePath`, which S1/S2 *consume*); any new
Medusa module or Supabase table beyond `tenant_intake`; re-scoping the reference hi-fi screens as signed-off
spec (the handoff MD is the contract, the screens are inspiration).

## Acceptance criteria (Daniel-runnable)
- A fresh merchant (post-signup) lands on **S1 Bienvenida in the seller shell**, answers two optional chip
  questions, and reaches **S2 three-doors with the agent door first** and a visible trust line ("Nada se
  publica sin tu visto bueno") — not an empty paste box.
- **Door 1 (agent)** leads to a **drop-anything intake** (files/photos/JSON/ML), and paste-JSON is present
  only as the **advanced** affordance — not the first thing shown.
- **S4 shows a staging preview before anything is created**: per-row Listo/Corregir with reasons and inline
  fix, a "N listos · M por corregir" chip, cobros parked as a known "~4 min" step; approving creates the shop
  with partial success handled as a plan, not an apology.
- **All three success endings** (wizard, setup, import) render as **one `<SuccessCard>`**: what happened →
  see it live → ≤2 next actions (guide-aware) → share (WhatsApp first).
- **S7 cobros runs as a mini-wizard** with a time estimate up front, an announced external redirect, and a
  resume banner on return — over the **existing, unchanged** payments OAuth.
- The whole flow is **es-MX** and renders in the **seller shell** (no buyer chrome / no 404s — R13); day-one
  metrics fire (door_share, time_to_payable, S4 approve rate, S7 OAuth return, first share).
- *(If the flag is taken)* With `onboarding.three_doors_enabled` **off**, signup keeps today's entry
  unchanged; flipping it **on** activates the three-doors first-run.

## Open risks / research
- **Depends on P0·A + P0·B landing first.** S-surfaces build on P0·A primitives and S6 reads P0·B's
  `lib/setup-guide.ts`. Build P1·D **after** both merge, or (fallback) render on `globals.css` v2 tokens +
  a local guide read and swap in the seams once they land. Decide at kickoff. *(P0·A + P0·B are scaffolded;
  confirm merged before P1·D S2 starts.)*
- **Photo/capture → spec agent job may need its own spike.** CSV/JSON/ML are synchronous today; an
  image→spec conversion job is a new async seam. If it's not a thin reuse of an existing job queue, split it
  to the last story or a small spike so it doesn't block the synchronous path shipping. Verify the seam by
  reading the current setup-spec/agent-job code before committing D.3's photo branch.
- **Shared-surface + P1·C overlap.** S1/S2 render in the seller shell via `isSellerModePath` — **owned by
  P1·C** (F6, folds into `catalog-management`). Don't re-extend it here; consume it. Coordinate ordering with
  the in-flight `catalog-management` nav work; path-scoped commits; announce (LEARNINGS blast-radius rule).
- **`main` moves under you / two repos.** `tenant_intake` (Supabase, frontend-repo migration) is additive and
  fail-safe absent, so no backend-first ordering needed; still merge latest `main` before opening the PR.
- **No external-fact research needed** — internal UX against current `main`; benchmark refs (Shopify
  checklist, Stripe rails, Tiendanube onboarding) already captured in the audit's `research/context-notes.md`.

## Definition of Ready check
- [x] As-a/I-want/so-that clear per story; acceptance is Daniel-runnable.
- [x] Class named (Feature / Builder); Stage-2.5 bucket = genuinely-new flow over mostly-existing machinery,
      named per finding.
- [x] v1 in/out boundary written (S2-alt → fast-follow; OAuth token logic → separate HIGH review; stats-row →
      P1·C; `isSellerModePath` → consumed from P1·C, not re-owned).
- [x] **Risk tier resolved** — cobros wizard is presentational **LOW** with a named token-logic tripwire →
      HIGH; product-creation reuses the shipped apply (LOW–MED); `tenant_intake` additive non-commerce (LOW).
- [x] Medusa-first / reuse list produced (SetupClient staging/`configBlocks`/`aggregateSetupReport` · the
      MP/Stripe OAuth · `lib/setup-spec.ts` · ImportClient/SellWizard endings · P0·B `lib/setup-guide.ts` ·
      P0·A primitives · ConnectAgentPanel); AGENTS rules 1–5 checked; `tenant_intake` = Rule 2 OK.
- [x] Each story risk-tiered; QA stage named per story (pure-logic seams = free coverage + e2e/browser);
      smoke owner = Daniel for the S7 OAuth + full first-run.
- [x] **Kill-switch decision recorded** (Stage 6b) — recommended dark-launch enablement flag
      `onboarding.three_doors_enabled` (default false; in-house `lib/flags.ts` + `platform_flags`, fail-open)
      OR carve-out; Peerlo evaluates at the gate.
- [ ] **Peerlo approves this scope doc** ← the gate. On approval: run
      `node skills/groom/scaffold-epic.mjs --slug seller-portal-onboarding-three-doors --area 03
      --macro 03-selling-and-shops --title "Onboarding three-doors" --risk low --sprints "…"`, fill the
      stories/reuse/QA, set the seed `epic:` + `status: scaffolded`, commit path-scoped, emit the per-sprint
      Claude Code kickoffs.
