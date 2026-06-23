# Neon egress reduction — Sprint 4: Site-wide Clarity loader + UTM

> ⚠️ **SUPERSEDED 2026-06-22 by [`site-wide-analytics-gtm`](../site-wide-analytics-gtm/) (shipped, PR #106).**
> This never built. Its end — Clarity recording site-wide + the stale `print-qr` comment fix — was delivered
> there via a **single GTM container** (Clarity as a tag inside GTM) instead of a separate Clarity snippet.
> Kept for history only.

**Status:** ⬜ Not started (superseded). Frontend (Vercel preview per PR). Risk: low. **Orthogonal to Neon egress** —
this is frontend visitor/bot visibility, not an egress lever; ship independently, after the egress sprints.

## Why
The spike found Clarity is **not actually installed** — there is no base loader anywhere; the only reference
is `/vende`'s `SellerAcquisitionVariantTag` firing `window.clarity?.('set',…)` **no-ops**, and the Clarity
dashboard shows **1 session / 1 page-view in 30 days**. `lib/print-qr.ts`'s comment claiming analytics is
"wired site-wide" is false. This sprint actually installs Clarity so the existing custom-tag + UTM tagging
finally attribute, giving visitor/bot visibility (useful diagnostic context for traffic-driven reads, though
it will **not** reduce egress).

## Stories

### Story 4.1 — Install the Clarity base loader site-wide (channel-gated)
**As** Daniel, **I want** Microsoft Clarity loading on the public site, **so that** we get session/heatmap
visibility and the existing `clarity('set',…)` tags + UTM params actually record.
**Acceptance:**
- The Clarity base loader is added **once** in `app/layout.tsx` (Next `<Script afterInteractive>`), project id
  from env (no hardcoded id).
- It is **gated off** white-label / embed / custom-domain / checkout / dashboard surfaces by reusing the
  **existing layout channel detection** (the seasonal-theme pattern) — Clarity does not load in the white-label
  shell or on money/auth surfaces.
- After deploy, the Clarity dashboard records real sessions/page-views (no longer ~1/30 days); the `/vende`
  custom tags (`seller_acquisition_*`) now appear; UTM-tagged print-QR scans attribute.
**Risk:** low (additive frontend script; no commerce/auth change; new strings: none user-visible).

### Story 4.2 — Correct the stale analytics comment
**As** a future reader, **I want** `lib/print-qr.ts` to stop claiming analytics is "already wired site-wide"
when (until 4.1) it wasn't, **so that** docs track code.
**Acceptance:**
- The `lib/print-qr.ts` comment is corrected to reflect reality (post-4.1: Clarity is now loaded site-wide).
**Risk:** low (comment only).

## Sprint QA
- **api spec(s):** one asserting the Clarity loader **is present** in the public root HTML and **absent** on a
  channel-gated surface (embed/white-label) — an anonymous SSR HTML assertion (no browser needed), like the
  nav-entry-points spec pattern.
- **browser smoke owed:** **Daniel** — confirm the Clarity dashboard starts recording real sessions after deploy
  (needs live traffic + the Clarity console).
- **deterministic gate:** `tsc` + `next build` + Playwright `api` green; the design-token / raw-color guards stay green.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. View-source on https://miyagisanchez.com.
   → the Clarity loader script is present.
2. View-source on an embed surface https://miyagisanchez.com/embed/s/<test-shop>.
   → the Clarity loader is **absent** (channel-gated off).
3. Open https://miyagisanchez.com/vende and interact.
   → no console errors; `window.clarity` is defined (the `set` tags now land).
4. **(Owed to Daniel)** Next day, open the Clarity dashboard.
   → real sessions/page-views recorded (no longer ~1/30 days); `seller_acquisition_*` custom tags visible.

If any step fails, note the step number + what you saw — that's the bug report.
