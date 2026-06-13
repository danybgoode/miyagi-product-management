# Homepage Polish — Dirección B — Retrospective

_Closed: 2026-06-12/13_

The homepage was category chips + a Vecindario banner + a recency dump. Dirección B replaced it with a
purposeful, two-state module stack — a clean catalog that orients, merchandises, and converts — and migrated
the whole buyer surface off emoji onto one Iconoir icon language. Four sprints, LOW risk overall, frontend-only.

## What shipped
- **S1 · Icon language migration** (PR #84 `14fd880`) — `CATEGORIES` emoji → Iconoir + renderers; ✓ → `iconoir-badge-check`; buyer-surface emoji swept.
- **S2 · Signed-out merchandising core** (PR #85 `6774203`) — curated "Selección" (`getFeaturedListing`/`getCuratedListings` over one cached pool; pinned-then-fresh, 14-day cold-start cutoff, <48h badge) + featured card + price-loudest hierarchy; "Categorías con vida" (`getCategoryCounts`, ≥1 active listing only). Curation logic in the next-free `lib/home-curation.ts` seam + `e2e/home-curation.spec.ts`.
- **S3 · Chrome & community** (PR #86 `b472cfb`) — value-prop ribbon (signed-out) → `/acerca`; header "Vende" pill + in-search agent affordance; terminal CTA + mobile footer; Vecindario **live strip** (real approved pulse items, banner = empty fallback).
- **S4 · Signed-in modules** (PR #87 squash `009204b`) — "Retoma donde te quedaste" rail (newest 3 favorites, first content module, no price-drop badge — deferred); pending-offer alert (≤2 actionable, buyer + seller, nothing when none — logic in next-free `lib/home-offer-alert.ts` + pure spec); seller snapshot (`Tu tienda esta semana` · visitas · ofertas nuevas) when the user has a shop, else a minimal recruit card. **S4.4 `price_cents_at_save` was already live** — re-scoped to verify-and-document, no migration.

## What went well
- **The pure-seam-per-sprint discipline held the whole epic at LOW risk.** Each sprint's real logic lived in a next-free `lib/` module (`home-curation.ts`, `home-offer-alert.ts`) with a pure-logic `api` spec, so the deterministic gate carried the rules and the page stayed thin glue. No commerce/money/auth path was touched.
- **Reading the data model first re-scoped S4 smaller.** S4.4 was framed as a HIGH-risk migration Daniel would merge; a five-minute check of the table + the favorites route (and a live-DB query) showed the column, the write, and populated rows already existed. The "HIGH story / Daniel-merge gate" evaporated and the sprint shipped frontend-only.
- **Reuse over rebuild paid off every sprint** — the rail reuses the account-favorites join; the offer alert reuses `formatOfferAmount`; shop resolution reuses the Supabase-mirror lookup (no Clerk JWT); the snapshot reuses cached `getShopListings`.
- **Cross-agent review earned its keep** — codex found a genuine (if rare) React key-collision on a same-offer buyer+seller alert; one-line perspective-qualified key fixed it before merge.

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md (2026-06-13). -->
- **A "HIGH-risk migration" story can already be shipped — verify the live schema + write path before scoping it.** Sharpens the existing read-the-model-first rule with a live-DB-check corollary.
- **A signed-in homepage stack ships safely as independent, null-safe (`?? []`) modules** layered onto the existing signed-out page — each guarded by `if (user)`, so a deploy-lag or empty read just hides one block.

## Gaps / follow-ups
- **Authed signed-in browser smokes owed to Daniel** (stated in PR #87): (1) rail is the first content module for a buyer with ≥1 favorite; (2) the offer alert appears only with a real pending offer; (3) the seller snapshot shows for a shop account. Coverable by the `MS_TEST_*` authed browser smoke once fixtures exist.
- **Deferred (by design):** the rendered `↓ Bajó $X` price-drop badge on the rail (the column now accrues data, so this is a cheap future follow-up); recently-viewed `localStorage` rail; `mascotas` icon stays provisional (`fish`).
- **Snapshot "visitas" is cumulative**, not a true 7-day window (the "esta semana" copy is approximate) — views live as a running counter on Medusa product metadata, no time series.
