---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: marketplace-static-shell
---

# Epic: Static marketplace shell — kill the per-request homepage function 🏗️

> **Area:** 09-platform-infra · **Risk:** med–high (S1 restructures the shared layout + middleware that all
> channels depend on) · **Origin:** the S1-deferred "static signed-out homepage" follow-up from
> [`neon-egress-and-db-isolation` sprint-1](../neon-egress-and-db-isolation/sprint-1.md), and the live finding
> (postgres-migration grooming, 2026-06-22) that the **~30 s idle homepage load is a Vercel function
> cold-start**, not the backend (now warm on Cloud SQL).

## Why
The marketplace homepage loads slowly (~30 s) after an idle period because it renders as a **per-request Vercel
function** that cold-starts on low traffic. Two things force that dynamic render:
1. **Personalization** — `app/page.tsx` calls `currentUser()` and loads four signed-in-only modules from
   Supabase (favorite heart-states, a "retoma" recent-favorites rail, offer alerts, a seller snapshot).
2. **The shared shell** — `app/layout.tsx` calls `await headers()` to detect **channel** (custom-domain /
   subdomain / embed / seller-mode → white-label chrome). This makes the *whole app* dynamic, homepage included.

**Decision (Daniel, 2026-06-22): Option C, phased.** Split routing so the **marketplace tree renders from a
header-free, static-able layout** (CDN asset, instant, **zero Vercel functions** for the homepage), while the
**white-label/channel tree keeps its dynamic layout**. Personalization returns in Phase 2 as **client islands**
(Clerk's *client* SDK — an external lib, no function) fetching from a **Cloud Run** endpoint. This honors the
stated preference: no Vercel functions for the homepage, compute on GCP / external libs where personalization is
needed, and it's fine for the homepage to be un-personalized in the interim (Phase 1 ships first and stands alone).

> **Not in scope:** this fixes the *homepage* cold-start; other genuinely-dynamic pages (PDP personalization,
> seller portal) keep their current rendering. URLs are unchanged throughout (route groups + internal rewrites
> are URL-transparent — SEO/canonical/robots/sitemap stay byte-identical).

## Medusa-first / five rules
No commerce-model change. Medusa still owns commerce (#1); Supabase still owns the personalization data (#2) —
Phase 2's Cloud Run endpoint *reads* Supabase with a validated Clerk JWT, it doesn't relocate ownership; Clerk
stays the auth layer (#4 — Phase 2 reuses the backend's `auth-clerk` JWT validation); es-MX copy unchanged (#5);
UCP/MCP untouched (#3).

## What already exists (reuse, don't rebuild)
- **The split targets:** `app/layout.tsx` (the `headers()` channel branch at ~L100; `whiteLabel` / `sellerMode`
  / `showBuyerChrome` logic), `middleware.ts` (already resolves the channel + sets `x-miyagi-*` headers — Phase 1
  changes it from *tag-with-header* to *rewrite-into-the-channel-subtree*), `app/s/[slug]/ChannelLayout.tsx`
  (the white-label shell to host in the channel tree).
- **Already static-able content:** the curated reads (`getFeaturedListing` / `getCuratedListings` /
  `getCategoryCounts` / `getNeighborhoodPulseItems`) are **identical for all visitors and already cached** via
  `lib/cache-policy.ts` (the neon-egress S1 SSOT) — they just need to stop being trapped behind a dynamic shell.
- **Already a client component:** `app/components/FavoriteButton.tsx` self-manages heart state (`initialFavorited`
  + optimistic toggle) — so heart-states survive de-personalization with client-side hydration.
- **Personalization seams (Phase 2):** `lib/home-favorites.ts`, `lib/home-offer-alert.ts` (`deriveOfferAlerts`),
  `lib/home-curation.ts` — pure derivers the client islands + the GCP endpoint reuse; the current `app/page.tsx`
  signed-in block is the reference query set.
- **Phase-2 auth:** the backend's `apps/backend/src/modules/auth-clerk/` already validates Clerk JWTs — the Cloud
  Run personalization endpoint reuses it.
- **Guardrails for the S1 refactor:** the channel test suite — `own-shop-seo.spec.ts`, the embed specs,
  `ChannelLayout`/white-label specs, `nav-entry-points.spec.ts` — must stay green through the split (they assert
  the white-label/embed/seller-mode behavior the rewrite must preserve).

## Scope — stories
| Sprint | Phase | Story | Risk |
|---|---|---|---|
| 1 | 1 | ✅ **SHIPPED** (#101 `a1e6ea4`) Route-group split — static `(site)` vs dynamic `(shell)`; Option A (middleware unchanged — channels already rewrite `/`→`/s/[slug]` into `(shell)`) | **high** |
| 2 | 1 | ✅ **SHIPPED** (#102 `1c67cb6`) Static homepage — dropped `currentUser()` + the 4 signed-in modules; client `AuthShow` replaces Clerk server `<Show>` in chrome (the real blocker); `/` now `○` static. **Phase 1 done.** | med |
| 3 | 2 | Personalization endpoint on Cloud Run (Clerk-JWT-gated read of favorites/offers/seller-snapshot) | med–high |
| 4 | 2 | Re-add personalization as client islands hitting the Cloud Run endpoint (progressive enhancement) | med |

**Phase 1 (S1+S2)** delivers the instant, function-free homepage and stands alone. **Phase 2 (S3+S4)** restores
the signed-in "welcome back" personalization from GCP — build only if it proves worth it.

## Deploy order / topology
- **S1** frontend (Vercel; shared layout + middleware — **announce; high blast radius**). Per-branch preview +
  the full channel suite are the gate. Daniel merges (shared infra touching the channel routing).
- **S2** frontend (Vercel). Verify the build emits the homepage as **static/prerendered** (no function). Daniel
  reviews the live instant load.
- **S3** backend (Cloud Run us-east4, ~12 min, no preview). New authed read endpoint; Daniel merges.
- **S4** frontend (Vercel). Independent once S3 is live; degrade gracefully if the endpoint is slow/unreachable.

## Open decisions (settle in the relevant sprint's plan mode)
- **S1 mechanism:** middleware **rewrite** of channel/embed/custom-domain/subdomain requests into a dedicated
  white-label subtree (URL-transparent) vs an alternative that keeps one tree — confirm the rewrite approach
  resolves the `/` route collision (same URL, two layouts) cleanly.
- **S3 endpoint home:** a Medusa custom route on `medusa-web` (add a Supabase read client there) **vs** a small
  standalone Cloud Run service. The personalization data is Supabase (frontend's domain per rule #2) — the
  endpoint *reads* it from GCP with a Clerk JWT; decide which keeps the data-domain boundary cleanest.

## Definition of Done (epic)
- [ ] Homepage served as a **static CDN asset** — build output shows it prerendered; a cold load is instant (no ~30 s)
- [ ] **Channels unbroken** — custom-domain / subdomain / embed / seller-mode white-label all still correct (suite green)
- [ ] URLs/SEO byte-identical (canonical/robots/sitemap unchanged)
- [ ] Phase 2 (if built): personalization renders from the **Cloud Run** endpoint via client islands; degrades gracefully
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough; the live homepage-speed + channel eyeballs flagged owed-to-Daniel
- [ ] `RETROSPECTIVE.md`; product poster updated; team memory + `MEMORY.md`; durable learnings → `LEARNINGS.md`
      (the big one: the app shell was dynamic for *channel routing*, not just auth — static-first needs a route split)
- [ ] Feature branch(es) deleted; this README's frontmatter `status: shipped`

## Session kickoffs
Run each in a **fresh session** (one per sprint). Each enters plan mode, confirms stories with Daniel, then builds.
S1 especially — it touches the shared layout + middleware; treat it as high-blast-radius and lean on the channel suite.

**Sprint 1 — Route-group split:**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory. Then
> read Roadmap/09-platform-infra/marketplace-static-shell/README.md and .../sprint-1.md. You're building Sprint 1
> (HIGH — restructures app/layout.tsx + middleware.ts, which every channel depends on; Daniel merges). Enter plan
> mode and design the split with me before any code: a marketplace `(site)` tree with a **header-free, static-able
> layout**, and a `(channel)` (white-label) tree with the dynamic layout that reads channel headers; middleware
> rewrites custom-domain / subdomain / embed / seller-mode requests into the channel tree (URL-transparent — no URL
> changes). Preserve every white-label/embed/seller-mode behavior; the channel suite (own-shop-seo, embed,
> ChannelLayout, nav-entry-points) is the gate and must stay green. Announce the shared-layout change. Branch off
> latest main in apps/miyagisanchez. No homepage personalization change yet (that's S2). Add/extend specs proving
> the marketplace layout no longer reads headers() while channels still render white-label. Write the smoke
> walkthrough into sprint-1.md before done.

**Sprint 2 — Static homepage:**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory. Then
> read Roadmap/09-platform-infra/marketplace-static-shell/README.md and .../sprint-2.md (and sprint-1.md for the
> split). You're building Sprint 2 (MED — homepage only, on the now-static-able `(site)` shell). Enter plan mode,
> confirm with me. Branch off latest main. Make the homepage a static CDN asset: remove `currentUser()` and the
> four signed-in modules (retoma rail, offer alerts, seller snapshot, server-seeded heart-states) from the
> marketplace homepage — it becomes the curated shell for everyone; heart-states hydrate client-side via the
> existing FavoriteButton. Confirm the production build emits the homepage as **static/prerendered** (no function)
> and a cold load is instant. Keep the cache-policy SSOT windows. Personalization is intentionally dropped here and
> returns in Phase 2 (S3/S4). Add a spec asserting the homepage renders the curated content anonymously. Write the
> smoke walkthrough into sprint-2.md before done.

**Sprint 3 — Personalization endpoint on Cloud Run:**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory. Then
> read Roadmap/09-platform-infra/marketplace-static-shell/README.md and .../sprint-3.md. You're building Sprint 3
> (MED–HIGH — new authed read endpoint on GCP; Daniel merges; backend deploys post-merge to Cloud Run us-east4).
> Enter plan mode and settle the endpoint-home decision with me (Medusa custom route vs standalone Cloud Run
> service) before code. Branch off latest main in the repo you choose. Build a Clerk-JWT-gated **read** endpoint
> that returns a user's home personalization (recent favorites, buyer+seller offer alerts, seller snapshot),
> reusing the pure derivers (lib/home-favorites, lib/home-offer-alert) and the backend's auth-clerk JWT validation;
> it reads Supabase from GCP (keep the data-domain boundary clean). Read-only, no money mutation. Add a unit/API
> spec for the auth gate + the shape. Write the smoke walkthrough into sprint-3.md before done.

**Sprint 4 — Personalization client islands:**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory. Then
> read Roadmap/09-platform-infra/marketplace-static-shell/README.md and .../sprint-4.md (and sprint-3.md for the
> endpoint). You're building Sprint 4 (MED — frontend client islands on the static homepage). Enter plan mode,
> confirm with me. Branch off latest main in apps/miyagisanchez. Re-add the retoma rail, offer alerts, and seller
> snapshot as **client islands** that get a Clerk JWT client-side (useAuth) → call the S3 Cloud Run endpoint →
> render, as progressive enhancement layered onto the static shell (degrade gracefully — empty/hidden if the
> endpoint is slow/unreachable; the static page never blocks on them). Reuse the existing module markup from the
> old app/page.tsx signed-in block. Add a browser spec for the island hydration. Write the smoke walkthrough into
> sprint-4.md before done. This completes the epic — run the epic Definition of Done.
