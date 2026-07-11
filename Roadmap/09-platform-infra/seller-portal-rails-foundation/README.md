---
status: shipped   # Both sprints merged 2026-07-10. S1: PR #208 squash 3bb5fb7 (StatusBadge/Button/Card + Toast/Banner, 23 tests). S2: PR #211 squash 37182fa (adoption sweep across 25 files -- the 4 named + OfferInbox/OrderDetail + PrintEditionCard + the full settings _sections/_components tree, ~2x the named scope, confirmed with Daniel -- + 4 new CI-lint checks in lib/design-token-audit.ts, gated on the swept file set only). Deterministic gate green both sprints (tsc+build+Playwright, 1819 passed on S2). Cross-agent review skipped on PR #211 (agy: diff too large for its argv-only input; codex: over quota) -- merged on green CI with Daniel's go-ahead. Owed: Daniel's live visual smoke (light/dark/calm + undo path); a follow-up sweep for CatalogTable.tsx (STATUS_LABEL+td-block) + Envios.tsx, both scoped out this epic (in-flight PR #209/#210 territory at S2 branch time, both merged mid-sprint); the ~50 other seller-portal files never in this epic's scope still carry the same raw-palette/bg-white/literal-radii debt (visible via the lint's broad scan, not yet gated).
slug: seller-portal-rails-foundation
---

# Epic: Seller-portal rails foundation — one design language

> **Area:** 09-platform-infra · **Risk:** LOW · **Archetype:** Sweeper · **Scope seed:** [`00-ideas/seeds/seller-portal-ux-audit.md`](../../00-ideas/seeds/seller-portal-ux-audit.md)
>
> P0·A of the July-2026 seller-portal UX audit (`references/MiyagiAdminUXAudit/`). The mechanical
> foundation the rest of the audit program builds on. **Rails touched: R1–R7.**

## Why
The seller portal renders in three visual dialects at once — legacy `--color-*` vars, the new semantic
tokens, and raw Tailwind palette classes — so the same "shipped" status shows in five colors, primary
actions ship in four button shapes, and dark/calm modes break wherever a raw class leaked in. Feedback is
improvised per screen (four different toast implementations, no undo, inconsistent `aria-live`). This epic
makes the portal look and behave like **one product**: one status palette, one button hierarchy, one card,
one toast/banner — all on the Design System v2 tokens that already exist — and a CI lint that keeps it that
way. It unblocks every other audit workstream (setup guide, IA remainder, onboarding, depth pass), which
all consume these primitives.

## Medusa-first note
No commerce surface — this is the UI layer only (AGENTS rule 1 not engaged). No Medusa module, no Supabase
table, no new route. The "reuse before rebuild" here is the **Design System v2 token set already in
`app/globals.css`**: the fix is *adoption*, not invention.

## What already exists (reuse, don't rebuild)
- **Design System v2 tokens** (`app/globals.css`) — semantic `--success/--warning/--danger/--info/--accent`
  (+`-soft`), radii `--r-sm(8)/md(12)/lg(18)/pill`, `.btn/.btn-primary/.btn-secondary/.btn-ghost/.btn-agent`,
  `.skeleton`, `.toast-in`, provider colors (MP `#009EE3`, WhatsApp `#25D366`, Envía `#f6821f`). **Adopt.**
- **`lib/design-token-audit.ts`** — the existing raw-color CI guard; **extend it**, don't fork (the emoji
  guard already sits beside it — same pattern).
- **The R6 "during" reference already ships** — the optimistic toggle + revert in `ManageDashboard.tsx`.
  Copy that behaviour into the shared feedback primitive.
- **`components/feedback/`** — the only directory allowed to render toasts/banners (rail R6).
- **`e2e/seller-mode.spec.ts`** — extend for the button/status assertions (don't add a new harness).
- **Known token bug to fix:** `--color-subtle` is used in `OrdersInbox` but never defined in `globals.css`
  → replace with `--bg-sunk` or define it.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Shared look primitives: `<StatusBadge>` (5 semantic tokens + R1 order-lifecycle mapping), `<Button>` (one R2 hierarchy), `<Card>` (R3 radii-by-role); define/replace `--color-subtle` | low |
| 1 | 1.2 Shared feedback primitives: one `<Toast>` + one `<Banner>` in `components/feedback/` (R6 before/during/after contract, aria-live, optimistic→undo→revert); delete the 4 existing toast impls | low |
| 2 | 2.1 Adoption sweep: replace raw palette classes / `bg-white` / literal radii / 4 button shapes across OrdersInbox · ManageDashboard · SellWizard · SetupClient with the new primitives; kill indigo/purple status | low |
| 2 | 2.2 CI token-lint: extend `lib/design-token-audit.ts` (raw palette, `bg-white`, literal radii, toast imports outside `components/feedback/`); advisory → required once the sweep is green | low |

## Deploy order
Frontend-only; degrades gracefully (no data/behaviour change). **Sprint 1 before Sprint 2** — the adoption
sweep (2.1) can only replace call-sites with primitives that exist (1.1/1.2), and the lint (2.2) flips to
*required* only after 2.1 is green. Each story is an independently mergeable PR with a Vercel preview.

> **Coordination (shared surface — announce, per LEARNINGS):**
> - **F1 emoji is NOT here** — it folds into the scaffolded `emoji-to-iconoir-sweep` (R4). Both are Sweepers
>   on the same seller-shell files, so **sequence them, don't run parallel worktrees over the same
>   components.** Land this color/button/feedback pass and the icon sweep one at a time.
> - **`catalog-management` is in-flight** (S3–S4 pending) and touches `ManageDashboard`/table surfaces. Do
>   the 2.1 sweep when no `catalog-management` sprint is mid-merge, or scope its files out of pass 1.
> - Path-scoped commits only (`git add <your files>`), never `git add -A` — a shared worktree races the index.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated: Daniel's live visual smoke owed on both
      sprints — no money/auth path)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switch:** N/A — LOW risk, no runtime seam. Enforcement is the CI token-lint (build-time), not a
      runtime flag; a bad sweep is reverted with `git revert`. *(Carve-out recorded at grooming — Stage 6b.)*
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — run `node scripts/build-order.mjs`)
