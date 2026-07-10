---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: mschz-full-coverage
---

# Epic: mschz.org full coverage — short links for every shareable surface

> **Area:** 07-agentic-and-federated-commerce · **Risk:** high · **Scope seed:** [`00-ideas/seeds/mschz-full-coverage.md`](../../00-ideas/seeds/mschz-full-coverage.md)

## Why
A merchant (or promoter) sharing anything on Miyagi should be able to use one short branded domain
for all of it. Today `mschz.org` covers only the flat namespace (shop slug, product short-slug/code);
sweepstakes QRs, event RSVPs, launchpad voting pages, and shop subpages still need the long domain.
This epic extends the existing redirector so `mschz.org/<prefix>/…` covers every public shareable
surface — decided (Daniel, 2026-07-09) as a **known-prefix passthrough**: `/g /e /v /s /l` 301 to the
identical path on `miyagisanchez.com`; session-bound/private surfaces deliberately excluded.

## Medusa-first note
No commerce data touched. The passthrough is a pure routing addition in the storefront middleware;
the only "model" change is three words added to the reserved-slug lists (frontend + backend mirror)
as defense-in-depth — no migration, no new table, no new primitive (Stage-2.5 bucket: **light
enhancement**).

## What already exists (reuse, don't rebuild)
- `middleware.ts` short-link branch (`isShortLinkHost`, `firstSegment`, flat resolver, branded 404,
  never-500 catch; ~lines 158–202) — passthrough is a ~15-line addition *before* the flat lookup.
- `lib/shortlink.ts` pure helpers + `e2e/shortlink.spec.ts` pure-logic specs — the prefix matcher
  extracts here for free coverage. `lib/shortlink-server.ts` — namespace-taken check.
- Reserved words: `lib/slug.ts` `RESERVED_SLUGS` + backend mirror
  (`apps/backend/src/api/store/sellers/me/route.ts`) — both have `s`/`l`/`mschz`; add `g`/`e`/`v`
  to both (backend = separate repo, second small PR).
- All five prefix route families verified live: `g/[slug]`, `e/[slug]`, `v/[slug]`,
  `s/[slug]`(+subpages incl. `/c/[collection]`), `l/[id]`.
- Share-link surfaces: `lib/sweepstakes.ts:71` + `SweepstakesManager.tsx:206`; `lib/events.ts:24` +
  `EventsManager.tsx:225`; launchpad `campaigns/[id]/qr/route.ts:26` + `CampaignsManager.tsx:224`.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Prefix passthrough + reserved words + share-UI surfacing | high |

## Deploy order
Frontend PR (middleware passthrough + frontend reserved list + share UI + specs) and backend PR
(reserved-list sync) are independent — either order is safe; the backend list is defense-in-depth
only (format rules already block single-char slugs). Backend has no preview → post-merge API smoke.

## Kill-switch decision (Stage 6b, recorded at grooming)
**Carve-out, Daniel-confirmed 2026-07-09** — pure additive 301 allowlist with fail-through to
today's behavior, no money/auth path; `git revert` suffices. (Original "Edge runtime" rationale was
stale — middleware now runs Node and could read `lib/flags.ts` — carve-out re-confirmed on the
remaining grounds.)

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** carve-out recorded above — nothing to verify beyond the revert path.
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
