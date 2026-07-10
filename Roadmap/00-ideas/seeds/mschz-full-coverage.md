---
title: "mschz.org full coverage — short links for every shareable surface"
slug: mschz-full-coverage
status: ready
area: "07"
type: chore
priority: wave-1
risk: high
epic: null
build_order: null
updated: 2026-07-09
---

# mschz.org full coverage — short links for every shareable surface

**As a** merchant (or promoter) sharing anything on Miyagi, **I want** any shareable `miyagisanchez.com`
URL to have a working `mschz.org` equivalent, **so that** one short branded domain covers the shop, its
listings, its sweepstakes, its events, and any future public surface a merchant can enable.

## Stage-2.5 bucket: light enhancement
The short-link middleware branch already exists and resolves the flat namespace (shop slug → 90-day
alias → product `short_slug` → `short_code`). This ask extends that branch — no new domain, cert, or
minting plumbing.

## Decision (Daniel, 2026-07-09): known-prefix passthrough
`mschz.org/<prefix>/…` 301s to the identical path on `miyagisanchez.com` for an explicit allowlist of
public shareable prefixes. **Deliberately no coverage** for session-bound or private surfaces
(checkout, account, `/shop/manage`, `/admin`, API routes) — nothing shareable lives there, and covering
them would only invite confusing half-working links.

### Allowlist (v1)
| Prefix | Surface | Why it's shareable |
|---|---|---|
| `/g/…` | Sweepstakes public entry | QR + social is the whole point |
| `/e/…` | Event RSVP page | Same |
| `/v/…` | Launchpad voting campaign | Same |
| `/s/…` | Shop + all its public subpages (`/c/[collection]`, `/convocatoria`, content pages) | The canonical shop URL family |
| `/l/…` | Canonical listing URL | Complements the flat product code |

Everything else that is multi-segment → branded 404 (same as unknown flat segments today).
Flat single-segment resolution keeps working unchanged — it stays first in the resolver order.

## What already exists (reuse, don't rebuild)
- `middleware.ts` short-link branch (`isShortLinkHost`, `firstSegment`, flat resolver, branded 404,
  never-500 catch) — the passthrough is a ~15-line addition *before* the flat lookup.
- `lib/shortlink.ts` / `lib/shortlink-server.ts` — namespace-taken check; note `g`, `e`, `v`, `s`, `l`
  must be added to reserved words so no shop/product can ever claim them as a flat segment.
- Sweepstakes QR generation (`/g/[slug]`) — once the passthrough lands, campaign QRs can mint
  `mschz.org/g/…` instead of the long domain (copy-length win on print materials).

## Scope boundary
**In:** prefix passthrough; reserved-word guard; the sweepstakes/event share UI showing the mschz form
where it already shows a share link; case-insensitivity; e2e specs.
**Out:** per-campaign short codes (revisit only if analytics show long slugs hurting scans); any new
minting UI; coverage of non-listed prefixes.

## Slicing (single story, one sprint — fold into a hygiene sprint if preferred)
1. **Prefix passthrough + reserved words + share-UI surfacing.** Risk: **HIGH** (touches shared
   `middleware.ts` → announce the change; Daniel merges). QA: unit spec on the pure prefix matcher
   (extract to `lib/shortlink.ts`), e2e spec asserting 301 targets for each prefix + 404 fallback +
   flat namespace unchanged.

## Kill-switch decision (risk: high)
**Carve-out** — the seam is `middleware.ts` (Edge), where the Flagsmith-successor reader doesn't run;
the change is a pure additive 301 map with a fail-through to today's behavior. A bad deploy reverts
with `git revert`; no runtime flag warranted for a redirect table.

## Smoke walkthrough owner: Daniel (production URLs: one `/g/`, one `/e/`, one `/s/<shop>/c/<collection>`, one flat shop + product, one garbage path).
