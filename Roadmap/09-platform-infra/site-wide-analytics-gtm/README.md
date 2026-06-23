---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: site-wide-analytics-gtm
---

# Epic — Site-wide analytics: GTM container (GA4 + Clarity)

> ✅ **SHIPPED 2026-06-22 — 1 sprint, all LOW, frontend-only.** PR [#106](https://github.com/danybgoode/miyagisanchezcommerce/pull/106)
> (S1.1 `3f59de2` · S1.2 `fb3242b` · S1.3 `e547fe9` + `8b3df66`). The single GTM container `GTM-MWHVLJ3M` loads
> across platform surfaces, client-gated so the static `(site)` shell stays `○`. `NEXT_PUBLIC_GTM_ID` is set in
> Vercel (prod + preview + dev). **Owed to Daniel (operational, no code):** activate Clarity via its 1-click GTM
> wizard (it showed only 1 session/30d — created but never loading); optionally add GA4 (needs a GA4 property);
> then the firing smoke. See [`RETROSPECTIVE.md`](RETROSPECTIVE.md).

**Macro-section:** 09 · Platform & Infra
**Class:** Chore — frontend analytics instrumentation. No buyer/seller/agent capability change.
**Scope doc:** [`Roadmap/00-ideas/2. readyforscope/site-wide-analytics-gtm.md`](../../00-ideas/2.%20readyforscope/site-wide-analytics-gtm.md) — APPROVED 2026-06-22.
**Supersedes:** the orphaned, never-built **Sprint 4 of the archived `neon-egress-and-db-isolation` epic**
("Site-wide Clarity loader + UTM") — its Clarity-loader + stale-comment scope is folded in here.

## Why

GA4 and Microsoft Clarity should run across the site, but neither is installed: Clarity has **no base loader**
(the `/vende` `window.clarity('set',…)` tags no-op; dashboard ~1 session/30 days) and there's **no GA/GTM**
at all. `lib/print-qr.ts` even carries a stale comment claiming analytics is wired. This epic loads a
**single GTM container** site-wide (GA4 + Clarity configured as tags inside GTM, managed without redeploys),
gated to platform surfaces and kept **static-safe** so it doesn't undo the just-shipped static-shell work.

## Context

| | |
|---|---|
| **What it is** | One client-side GTM container loader + a pure eligibility gate + an api/unit spec |
| **Repos touched** | `apps/miyagisanchez` only. No backend, no DB, no Medusa/Supabase, no commerce surface |
| **Loader id** | `NEXT_PUBLIC_GTM_ID` (env; no hardcoded id). GA4 + Clarity are tags **inside GTM**, not code |
| **Constraint** | Gating is **client-side** (hostname + path) so the static `(site)` subtree keeps no `headers()` |

## Decisions (Daniel, 2026-06-22)

1. **One GTM container** — GA4 + the Microsoft Clarity tag configured inside GTM (no separate Clarity snippet).
2. **Consent out of v1** — ship analytics now; cookie-consent banner + LFPDPPP review is a separate epic
   (optionally set GTM Consent Mode defaults here).
3. **Load on all platform surfaces incl. the seller dashboard** — public marketplace, checkout, `/shop/manage`,
   account; **excludes** seller white-label domains/subdomains + the embed widget (open question 1, confirm).

## Medusa-first note

N/A — zero commerce surface. Rules 1–3 (Medusa / Supabase / UCP-MCP) untouched; rule 4 (Clerk) untouched;
rule 5 (bilingual) N/A — no user-visible copy (the loader is invisible; only an env-driven id). Consent UI
(which would need bilingual copy) is out of v1.

## What already exists (reuse, don't rebuild)

- **`neon-egress-and-db-isolation/sprint-4.md`** — the approved Clarity-loader design + api-spec shape +
  stale-comment fix; this epic's backbone, updated for single-GTM + the static-shell constraint.
- **`app/layout.tsx`** (root html/body) — where the client `<SiteAnalytics>` loader mounts, covering `(site)`
  + `(shell)` without forcing dynamic render.
- **`app/components/PlatformThemeScript.tsx`** — the client script-injection idiom to adapt.
- **`app/(shell)/vende/_components/SellerAcquisitionVariantTag.tsx`** — the null-safe `window.clarity('set',…)`
  tags that start attributing once GTM loads Clarity; no change needed.
- **`app/(shell)/layout.tsx`** — the server channel semantics (`x-miyagi-channel`, `x-miyagi-embed`) to mirror
  **client-side** in the pure gate (hostname → white-label; `/embed` → embed).
- **`e2e/nav-entry-points.spec.ts`** + LEARNINGS — the "pure `lib/` seam + api spec; real firing owed to Daniel" pattern.

## Scope — stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **[S1](sprint-1.md)** | S1.1 Pure gating lib (`lib/analytics-gating.ts`) + unit spec | low |
| **[S1](sprint-1.md)** | S1.2 `<SiteAnalytics>` GTM single-container loader in `app/layout.tsx` (client-gated, static-safe) | low |
| **[S1](sprint-1.md)** | S1.3 api spec (loader marker present / gate excludes embed+white-label) + fix `print-qr.ts` stale comment | low |

## Deploy order

Frontend-only, single repo. Branch `chore/site-wide-analytics-gtm` off latest `main`. Stories are
sequential (loader uses the gate; spec covers both). **Operational, owed to Daniel post-merge:**
create/confirm the GTM container, add the GA4 + Clarity tags inside GTM, set `NEXT_PUBLIC_GTM_ID` in Vercel,
then verify GA4 realtime + the Clarity dashboard record and `/vende` tags land.

## Definition of Done (epic)

- [x] A single GTM container loads on the public marketplace + `/shop/manage` (+ checkout/account); it does
      **not** load on `/embed/*` or a seller white-label host. _(client-gated via `lib/analytics-gating.ts`; env `NEXT_PUBLIC_GTM_ID=GTM-MWHVLJ3M` set in Vercel)_
- [x] `lib/analytics-gating.ts` is a pure, unit-tested gate; `lib/print-qr.ts`'s stale analytics comment is corrected.
- [x] api/unit spec green; `tsc` + `next build` + Playwright `api` + the raw-color/design-token guards stay green.
- [x] The `sprint-1.md` smoke walkthrough is written; the **real GTM/GA/Clarity firing** smoke is stated as owed to Daniel.
- [x] This `README.md` marked ✅ (`status: shipped`); `RETROSPECTIVE.md` written; durable learnings promoted to `Roadmap/LEARNINGS.md`.
- [x] Poster: add an analytics/observability line; ran `node scripts/build-order.mjs`; staged `BUILD-ORDER.md`.
- [x] (Optional) one-line "superseded by site-wide-analytics-gtm" pointer added to neon-egress S4.
