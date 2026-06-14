---
title: "Vercel function-invocation & Fluid-CPU cost reduction"
slug: vercel-function-cost-reduction
status: ready
area: "09"
type: chore
priority: wave-1
risk: low
epic: null
build_order: null
updated: 2026-06-14
---

# Scope — Vercel function-invocation & Fluid-CPU cost reduction

## Outcome & signal
The team's Vercel free tier is **over on Fluid Active CPU (7h10m / 4h)** and at **822K / 1M Function
Invocations** for the May 14–Jun 13 period. After this ships, the steady-state function invocations +
Fluid Active CPU on the `miyagisanchez` project drop materially, back under the free caps with headroom.
**Signal:** in Vercel → Observability → Functions, the three current top consumers
(`/api/cron/sweepstakes-draw`, `/_not-found`, `/api/conversations/unread`) fall sharply over a comparable
window, and the team Usage page shows Fluid Active CPU back under 4h / period.

Evidence (2026-06-14, 12h window, `miyagisanchez` = ~98% of team invocations; other 5 projects negligible):
`/_not-found` 1.1K inv + **highest Active CPU (1m)** + 4.6% errors · `sweepstakes-draw` 747 (~1/min) ·
`conversations/unread` 698 (60s poll) · `reconcile-checkouts` 101 · public pages tiny (`/l/[id]` 137).

## Stage-2.5 bucket
**light-enhancement** — all targets are existing, self-inflicted waste (cron cadence, an unguarded 404
path, a client poll). No new product surface; reuse-and-tune, plus one free dashboard toggle.

## Scope
**In v1:**
- **S1 — Backend cron cadence** *(fast-tracked, [backend PR #28](https://github.com/danybgoode/medusa-bonsai-backend/pull/28))*:
  `sweepstakes-draw` `* * * * *` → `*/15`; `reconcile-checkouts` `*/15` → `*/30`.
- **S2 — `/_not-found` cost** (the #1 CPU + invocation sink): enable Vercel **Bot Protection** (Firewall,
  currently *Inactive*); in the dynamic routes that 404 (`/l/[id]`, `/s/[slug]`), **short-circuit
  `notFound()` for obviously-invalid ids/slugs BEFORE the Medusa fetch** (the upstream fetch is the CPU
  cost), and serve the 404 with a cache header so repeat scanner hits don't re-invoke.
- **S3 — `conversations/unread` poll**: gate the 60s `setInterval` on `document.visibilityState === 'visible'`
  (pause hidden/backgrounded tabs) and lengthen to 120–180s, in both `MobileTabBar.tsx` and
  `DesktopUnreadBadge.tsx`. In-conversation delivery stays realtime; this is only the global unread badge.

**Out of v1:**
- Making public pages (`/`, `/l/[id]`) statically cacheable by moving `currentUser()` client-side — bigger
  rendering refactor, low current cost (those pages are small in the data), revisit only if needed.
- CI Playwright-against-preview invocation cost — it inflated the heavy dev month but is dev-only, not prod
  billing pressure now that branches/previews are cleaned; note as a follow-up, don't build here.
- Upgrading to Vercel Pro (a spend decision for Daniel, not an engineering slice).

## What already exists (reuse, don't rebuild)
- `apps/backend/src/jobs/{sweepstakes-draw,reconcile-checkouts}.ts` — the schedules (S1).
- `app/not-found.tsx` (static), `app/l/[id]/page.tsx` + `app/s/[slug]/page.tsx` (`getListing`/`getShop`
  → `notFound()`), and the existing cache-header idiom (`robots.txt`/`llms.txt` already set `s-maxage`) (S2).
- `app/components/MobileTabBar.tsx` + `app/components/DesktopUnreadBadge.tsx` (the polls) and
  `app/g/[slug]/SweepstakesEntryClient.tsx`'s visibility pattern to mirror (S3).
- Vercel **Firewall → Bot Management** toggle (S2, dashboard — no code).

## Kill-switch / runtime gate
**risk:low — no runtime flag.** All changes are cadence/caching/visibility tuning with no new money path
(S1 only shifts draw *timing* ≤15 min, idempotent). Reversible by revert; no migration, no flag.

## Acceptance criteria
- **S1:** Cloud Run logs show `sweepstakes-draw` firing every 15 min (not every minute) and
  `reconcile-checkouts` every 30; a test sweepstakes past its end still draws within 15 min; Observability
  shows the two cron routes' invocations drop accordingly.
- **S2:** Bot Protection shows **Active** in Firewall; a request to a non-existent listing/shop URL returns
  404 **without** a Medusa fetch (verify via logs/timing) and carries a cache header; `/_not-found`
  invocations + Active CPU fall over a comparable window.
- **S3:** With the messages/app tab backgrounded, no `/api/conversations/unread` requests fire (verify in
  network/Observability); foreground polling is ≤ 1 per 2–3 min; unread badge still updates on return.
- **Overall:** team Usage → Fluid Active CPU back under 4h / period; Function Invocations trending well under
  1M with headroom.

## Open risks / research
- **Bot Protection false-positives:** verify it doesn't challenge the *agent/UCP* surfaces (the marketplace
  is intentionally agent-accessible — `/api/ucp/*`, `/llms.txt`) or the backend's own Cloud Run cron
  fetches. Vercel's managed Bot Protection targets known bad bots and should spare these, but confirm on the
  Firewall traffic view after enabling, and allow-list if needed. (The denied IPs seen 2026-06-14 were GCP
  ranges — confirm none are the backend's egress before tightening further.)
- **404 short-circuit correctness:** only short-circuit on *clearly* invalid id/slug shape — a valid-but-
  deleted listing must still 404 cleanly (it already does via `notFound()`), just cache it.
- S1 already in flight as backend PR #28 (merge = the first slice's deploy).
