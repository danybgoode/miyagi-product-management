---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: seller-portal-onboarding-three-doors
---

# Epic: Onboarding three-doors

> **Area:** 03-selling-and-shops · **Risk:** low · **Archetype:** Builder · **Scope seed:** [`00-ideas/seeds/seller-portal-onboarding-three-doors.md`](../../00-ideas/seeds/seller-portal-onboarding-three-doors.md)
>
> **P1·D** of the [`seller-portal-ux-audit`](../../00-ideas/seeds/seller-portal-ux-audit.md) umbrella (F4, F12).
> **Rails touched: R6 · R9 · R11 · R12 · R13 · R14.** **Depends on P0·A** (rails primitives) **+ P0·B**
> (`lib/setup-guide.ts` seam). Spec: `references/MiyagiAdminUXAudit/handoff/ONBOARDING-SPEC.md` (S1–S8).

## Why
A fresh merchant's first run should feel like a guided, agent-first path — not a developer tool. Today the
hero agent path is copy-a-prompt → leave → paste JSON into a textarea that's the first thing shown (**F4**),
and there are three inconsistent success endings (**F12**). This epic delivers: a welcome intake → three
ranked doors (agent door first, with a trust contract) → a drop-anything intake → a staging preview the
merchant approves before anything is created → one shared success ending → a cobros mini-wizard → a share
moment. All in the seller shell, es-MX, with payments named up front. The hard machinery (staging, apply,
report, the payments OAuth) already ships — this is new first-run UX + one convergence component over it.

## Medusa-first note
No new commerce primitive. Product creation reuses the **already-shipped** `SetupClient` staging → apply
path into Medusa (AGENTS rule 1 clean). The one new store — **`tenant_intake`** (what they sell / where they
sell today / chosen door) — is **non-commerce → Supabase, Rule 2 OK**. Clerk untouched (rule 4); the flow
starts post-signup. The agent door *is* the agent surface (rule 3) — the S3 prompt kit + existing seller MCP
tools already let an agent produce the intake JSON. All copy es-MX (rule 5).

## What already exists (reuse, don't rebuild)
- **`app/(shell)/sell/setup/SetupClient.tsx`** — the S4/S5 engine: `aggregateSetupReport`, `configBlocks`
  (`validated.config.blocks` filtered to `status==='applied'`), the validated-rows apply path, `SetupReport`,
  `LoopClose`. Restyle its staging table (S4) + re-express its report through `<SuccessCard>` (S5).
- **`lib/setup-spec.ts`** — the versioned setup-spec + clerk prompt kit (S3's one-tap "copy our prompt").
- **`app/(shell)/shop/manage/import/ImportClient.tsx`** + **`app/(shell)/sell/SellWizard.tsx`** — Door 2 / Door 3
  targets; their endings converge into the shared `<SuccessCard>` (F12).
- **`app/(shell)/shop/manage/settings/_sections/Pagos.tsx`** + **`/api/mp/connect`(+callback)** &
  **`/api/stripe/connect`** — the S7 cobros engine. `MANUAL_KEYS` in `lib/shop-settings/taxonomy.ts` already
  tags `pagos` as manual → the R12 mini-wizard target. The wizard **wraps** this, unchanged.
- **`components/ConnectAgentPanel.tsx`** — S8 agent loop-close.
- **`lib/setup-guide.ts`** (P0·B seam) — the S6 guide card; P1·D reads it + adds intake personalization.
- **P0·A primitives** — `<Card>`/`<Button>`/`<StatusBadge>`/`<Toast>`/`<Banner>` + the R6 before/during/after contract.
- **In-house flags** (`lib/flags.ts` `FlagKey` + `DEFAULT_FLAGS`, Supabase `platform_flags`, fail-open) — the
  recommended `onboarding.three_doors_enabled` dark-launch flag lives here (no Flagsmith).
## Scope — stories
| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | D.1 `tenant_intake` store + S1 intake · D.2 S2 three-doors · D.3 S3 drop-anything intake | low | ✅ PR [#221](https://github.com/danybgoode/miyagisanchezcommerce/pull/221), squash `ee90cef` |
| 2 | D.4 S4 staging preview (over SetupClient) · D.5 `<SuccessCard>` + F12 convergence · D.6 S6 personalization | low (D.4 low–med) | ✅ PR [#227](https://github.com/danybgoode/miyagisanchezcommerce/pull/227), squash `57b6831` |
| 3 | D.7 S7 cobros mini-wizard · D.8 S8 share + loop-close · D.9 metrics | low* | ✅ PR [#229](https://github.com/danybgoode/miyagisanchezcommerce/pull/229), squash `5e29f4e` |

\* **D.7 tripwire → HIGH → Daniel merges** if any story edits `lib/mercadopago-connect.ts` token
exchange/storage, `mpSettingsFromToken`, the callback's token logic, or `syncMedusaSellerProfile`. The
wizard is a presentational wrapper over the **unchanged** OAuth; the allowed callback redirect-target change
stays low. The real MP OAuth connect round-trip is a smoke **owed to Daniel** (S7). **Confirmed clean at
merge**: an independent review verified none of the four named functions were touched — the only OAuth-glue
change is a redirect-target cookie. Daniel merged PR #229 on green CI + review, 2026-07-11.

## Deploy order
Frontend-only epic (no `apps/backend` change). `tenant_intake` is an additive **Supabase** migration in the
frontend repo — additive, no backfill, and the code reads it null-safe (`?? []`), so no backend-first
ordering. Merge latest `main` before opening each PR (two repos / `main` moves — LEARNINGS). Preview per
branch; the S7 OAuth round-trip is prod/real-session only (owed to Daniel). **Build after P0·A + P0·B merge**
(primitives + `lib/setup-guide.ts`); fallback = render on `globals.css` v2 tokens + a local guide read and
swap in the seams once they land.

## Kill-switch (Stage 6b — recommended, evaluate at kickoff)
**Enablement flag `onboarding.three_doors_enabled`** — default `false`, in-house `lib/flags.ts`
(`FlagKey` + `DEFAULT_FLAGS`), backed by Supabase `platform_flags`, **fail-open** to the default. Seam = the
first-run entry that routes signup → S1/S2 (flag off ⇒ today's `/sell`/SetupClient entry, zero risk while
`tenant_intake` + the re-routes bake). Because `isEnabled()` fails open to `false` when the row is absent,
the row seed rides the normal PR/deploy — not a build-session write. Carve-out alternative: additive +
`git revert`-able, D.7 adds no new money-path seam.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated) — S1/S2/S3 all merged; the S7 MP OAuth
      round-trip + full first-run walkthrough are live-smoke gaps explicitly owed to Daniel (stated in
      `sprint-3.md`), to run post-deploy on prod.
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switch:** `onboarding.three_doors_enabled` exists in `lib/flags.ts` `DEFAULT_FLAGS` (default
      `false`) with a seeded `platform_flags` row (Sprint 1 migration
      `20260711140000_onboarding_three_doors_flag.sql`, `ON CONFLICT DO NOTHING` — live, verified, still OFF).
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`**
