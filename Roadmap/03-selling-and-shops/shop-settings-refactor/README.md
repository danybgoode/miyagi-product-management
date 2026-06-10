# Epic: Shop Settings refactor

> **Area:** 03-selling-and-shops · **Risk:** LOW overall (S3 is HIGH — Daniel merges) · **Type:** chore (behavior-preserving)
> **Scope seed:** [`00-ideas/seeds/shop-settings-refactor.md`](../../00-ideas/seeds/shop-settings-refactor.md) · **Signed off:** Daniel, 2026-06-08

## Why
The seller settings surface is one **4,218-line client component** (`ShopSettings.tsx`, ~3,530 lines in a
single function with **127 `useState` hooks** and ~17 sections rendered on one `activeSection`). Adding a
field to one section forces an agent (or human) through the whole file, and a careless edit can break a
sibling section — which is exactly why feature velocity on this surface has dropped. This epic breaks the
monolith into isolated, per-section components behind the route + save seam that already exist, so each
section becomes independently maintainable. **No user-facing change** — strictly behavior-preserving.

## Medusa-first note
No commerce data moves. Persistence already flows through a single seam — `PATCH /api/sell/shop` →
`marketplace_shops.metadata.settings` (Supabase, per AGENTS rule #2; commerce bits like `mp_enabled`
stay on their existing endpoints). This is a pure **frontend component-structure** refactor: no
migration, no Medusa/Supabase change, no Clerk change. The MCP/agent config path writes the same tree
through the same seam — keeping the seam preserves it (verify before S3).

## What already exists (reuse, don't rebuild)
- `app/shop/manage/settings/[section]/page.tsx` — server fetch + `initial` prop shape + secret-strip
  (`safeMetadata`). The mount point; add a per-section dynamic import for code-splitting.
- `PATCH /api/sell/shop` → `metadata.settings` tree — the single save seam. **Untouched.**
- `app/shop/manage/settings/page.tsx` — index grid already defines the **canonical** section keys +
  completion logic. Align the internal nav to these keys (kills the dual taxonomy).
- Already-extracted UI primitives: `EmbedSnippetSection`, `PickupSpotManager`, `ToggleSwitch`, `Toast`,
  `SectionTitle`, `SoonBadge`, `CopyPromptButton` — promote to `settings/_components/`, reuse verbatim.
- Pure helpers in the monolith: `parseLocation`, `detectSchedulingService`, `generateHex32`, `PRESETS`
  → move to next-free `lib/shop-settings/` for free pure-logic spec coverage.
- `lib/apply-shop-settings.ts` + `lib/settings-import.ts` — already encode the settings-tree shape;
  derive the shared TYPES from these, don't invent a parallel shape.
- Playwright two-layer harness + `MS_TEST_*` authed-smoke pattern; the raw-color guard pattern
  (`design-token-foundation`) → mirror for the anti-monolith guard spec.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Foundation seam + first extraction (`lib/shop-settings/` types+taxonomy+helpers · `useSettingsSave()` · extract Devoluciones behind a dynamic-import registry w/ monolith fallback) | LOW |
| 2 | Extract the 9 low-risk sections (perfil · apariencia/diseño · tipo · ofertas/negociación · comunicación · envíos · citas · pedidos · notificaciones) | LOW |
| 3 | Extract money/domain/agent sections (Stripe · MercadoPago · SPEI · Compra Protegida · Canal propio · Agentes/webhook) — secret-strip invariant asserted | **HIGH** |
| 4 | Decommission monolith · finalize unified taxonomy · anti-monolith guard spec | LOW (shared routing — announce) |

## Deploy order
Frontend-only; no backend dependency, so no backend-first ordering needed. Each extraction ships
independently behind the existing `[section]` route — the monolith **coexists as a fallback** for
not-yet-extracted sections until Sprint 4 removes it. **S4 touches shared routing + deletes a large
file → announce + merge latest `main` first** (per `LEARNINGS.md` shared-surface rule). Each frontend
branch gets a Vercel preview; HIGH-risk S3 is merged by Daniel.

## Status — ✅ EPIC COMPLETE (2026-06-10) — all 4 sprints shipped to prod
S1 #68 `12d9548` · S2 #69 `928ed15` · S3 #71 squash `973f69d` · **S4 #74 squash `19f2831`**
(fresh-reviewer APPROVE, auto-merged on green CI). The 4,076-line `ShopSettings.tsx` monolith is
**deleted**, the taxonomy is one canonical map, and an anti-monolith guard spec is in the `api` gate.
Behavior-preserving — no user-facing change. **Owed Daniel:** authed browser smoke over all section
URLs + one money-section (`pagos`) save (local dev can't reach Medusa → human is the live signal).

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (authed money-section smoke owed to Daniel)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated (Recent highlights)
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Feature branch deleted; seed frontmatter `status: shipped`
