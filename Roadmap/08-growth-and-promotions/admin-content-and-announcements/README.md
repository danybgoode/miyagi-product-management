---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: admin-content-and-announcements
---

# Epic: Admin content & announcements — runtime marketing copy + platform banners

> **Area:** 08 · Growth & Promotions · **Risk:** LOW (copy + non-commerce UI; no money path)
> **Scope doc:** [`00-ideas/2. readyforscope/admin-content-and-announcements.md`](../../00-ideas/2.%20readyforscope/admin-content-and-announcements.md) (approved 2026-07-05)

## Why
Today every marketing word is a deploy: landing copy is compile-time dictionary keys, and homepage/
`/acerca` copy is largely hardcoded (no keys at all). The platform admin can't launch a promotion,
announce a feature, or run a flash sale without an engineering cycle. This epic makes marketing copy
**runtime-editable** (per-key admin form + CSV/XLSX/JSON bulk round-trip with diff preview), keys the
uncovered surfaces, and adds one **announcement primitive**: a slim dismissable strip for sellers atop
the seller shell, and an understated, dismissable card in the homepage flow for buyers — scheduled,
one active per audience, no deploy.

**CMS eval: resolved in-house** (recorded in the scope doc). Key-value overrides + one banner over
code-owned layouts is the weakest case for an external CMS; the flags epic already proved the exact
Supabase fail-open read pattern. Revisit trigger: structural page-building ever entering scope.

## Context
| | |
|---|---|
| **Class** | Feature |
| **Stage-2.5 bucket** | Genuinely new (runtime content layer), heavy reuse of admin shell + Supabase editorial patterns |
| **Flag** | **`content.overrides_enabled`** — kill-switch polarity, **default ON, created enabled**; OFF ⇒ pure compile-time copy + no banners |
| **Epic risk** | **LOW** — reviewer may auto-merge on green CI + clean review (no payments/checkout/auth) |
| **Deploy order** | S1.1 → S1.2 → S1.3 → Sprint 2 → Sprint 3 (S3 depends only on S3.1's table; can swap ahead of S2 if a campaign is urgent) |
| **Smoke owner** | Admin click-throughs owed to **Daniel** (no money path); static-route assertion in CI |

## Medusa-first note
No commerce data anywhere → **Supabase is the correct store** (AGENTS rule #2 — editorial/marketing
content is exactly its lane): `platform_copy_overrides` + `platform_announcements`. Medusa untouched.
Clerk untouched (existing admin auth gates the editor). UCP/MCP unaffected (presentational only).
es-MX default; `en` fields only on the bilingual allow-list namespaces (AGENTS rule #5). The one hard
technical constraint: **`/` stays static (`○`)** — overrides are read within ISR windows + on-demand
revalidate on save, never a per-request dynamic API (see the static-shell LEARNINGS).

## What already exists (reuse, don't rebuild) — verified 2026-07-05
- Compile-time dictionary + types: `locales/{es,en}.json` (697 leaf keys pre-Sprint-2) + `lib/dictionary.ts` — the key universe + fallback values. **Sprint 2 added `home.*` (homepage) and `acerca.*` (bilingual, `/acerca` + the MCP/UCP-manifest/llms.txt/`/agent` agent-facing fan-out via `lib/about-content-overrides.ts`)** — both now flow through the merge seam.
- Keyed marketing pages: `sellerAcquisition` namespace → `app/(shell)/vende/*` via `page-config.ts` — override-ready once the merge seam exists (verified es-only-by-design, complete, in Sprint 2's audit).
- Supabase editorial store + fail-open read + in-process cache: the `platform_flags` pattern (`lib/flags.ts`, feature-flags-inhouse).
- Admin shell + auth: `app/(shell)/admin` (`AdminShell.tsx`; seleccion/flags/tenants precedents) → new `/admin/contenido` section.
- Static-shell + ISR discipline: `lib/cache-policy.ts` SSOT + LEARNINGS (route-group split; time-bucket rotation).
- Bilingual allow-list rule (AGENTS #5): editor exposes `en` only on allow-listed namespaces.
- Dismissable-UI idioms + localStorage persistence (PWA sheets, seasonal-theme toggle).
- Seller shell top bar: `app/(shell)/shop/manage` layout — the seller strip mounts here (dynamic tree).
- Bulk-import UX shape (upload → staging/diff → apply): bulk-import-migration epic.

## Scope — stories
| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | S1.1 Override store + pure fail-open merge seam (`applyCopyOverrides`), flag-gated, cached | low | ✅ merged (PR #197) |
| 1 | S1.2 `/admin/contenido` per-key editor (default shown, restore-per-key, allow-list-aware, save → revalidate) | low | ✅ merged (PR #197) |
| 1 | S1.3 Bulk export/import — CSV/XLSX + JSON, scoped, diff preview, unknown keys skipped | low | ✅ merged (PR #197) |
| 2 | S2.1 Coverage audit + keying map (homepage, `/vende` family, `/acerca`) — doc-first, Daniel-confirmed | low | ✅ done 2026-07-08 |
| 2 | S2.2 Key homepage editorial strings (`home.*`) + `/acerca` without un-static-ing `/` | low | ✅ merged 2026-07-08 (PR #198, `0fd667d`) |
| 3 | S3.1 Announcement CRUD (audience, copy+CTA, schedule, one-active-per-audience) | low | not started |
| 3 | S3.2 Seller slim dismissable strip atop the seller shell | low | not started |
| 3 | S3.3 Buyer understated dismissable homepage card (static `/` preserved) | low | not started |

## Deploy order
Frontend-only epic (plus Supabase DDL — additive editorial tables). Sprints independently shippable in
order S1 → S2 → S3; S3 may swap ahead of S2 if a campaign is urgent (S3 needs only S3.1's table).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated (08 domain — new capability line)
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** `content.overrides_enabled` exists (kill-switch polarity, default ON, created enabled); OFF ⇒ compile-time copy + no banners, cleanly
- [ ] `/` still `○` static in the build route table (CI-asserted)
- [ ] es-MX copy-complete; `en` only via the allow-list; orphaned overrides flagged in the editor
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
