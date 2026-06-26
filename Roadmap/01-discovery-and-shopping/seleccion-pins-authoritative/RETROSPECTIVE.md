# Retrospective — Selección: make admin pins authoritative

**Shipped:** 2026-06-25 · **2 sprints** · macro-section 01 · Discovery & Shopping.
**Class:** follow-up bug fix + light enhancement on [`homepage-seleccion-curation`](../homepage-seleccion-curation/).

## What it was

The admin `/admin/seleccion` screen promised hand-curated pins were authoritative on the homepage
Selección — *"el de menor orden es el Destacado."* Two gaps in the read/curation path broke that promise:

1. A pin overrode the 14-day freshness cutoff but **not** the price gate, so every "Sin precio" pin
   (events / agenda / art) was silently dropped — the Destacado jumped to the first priced pin.
2. The homepage built the whole Selección from the freshest **24** listings, but the admin pinned from
   the freshest **50** — so a pin older than the 24-newest window couldn't render at all (observed
   2026-06-25: 5 priced pins, Destacado correct, **grid empty** because pins 2–5 sat outside the pool).

## What shipped

- **S1 (frontend, LOW)** — PR [#124](https://github.com/danybgoode/miyagisanchezcommerce/pull/124) `740f967`.
  - **S1.1** `isQualifying` exempts a pin from the price gate (keeps the active + ≥1-image guard) — a
    pin is authoritative over price.
  - **S1.2** the grid grows to **every** remaining qualifying pin (`curatedGridSize`), floored at
    `GRID_SIZE=4`, capped at `GRID_CAP=11` (Destacado + grid ≤ 12).
- **S2 (backend then frontend)** — pins render **regardless of freshness**.
  - **S2.1 (backend, MED)** — PR [medusa-bonsai-backend#40](https://github.com/danybgoode/medusa-bonsai-backend/pull/40)
    `aaab981`. Pure `isFeaturedPin` predicate + an additive `?featured=true` read-filter on `/store/listings`.
    Deployed live to Cloud Run `medusa-web-00112-2tc`.
  - **S2.2 (frontend, LOW)** — PR [#126](https://github.com/danybgoode/miyagisanchezcommerce/pull/126)
    `8c4b6a7`. `getCuratedPool` fetches freshest-24 **and** `?featured=true&limit=50` in parallel and
    **unions** them (pure `unionById`), so an old pin reaches the page; degrades gracefully.

All curation logic stayed in the one next-free `lib/home-curation.ts` seam — 37-test pure `api` spec, free
coverage. The whole epic stayed off any money/checkout/auth/DB path; `/` stayed `○` static throughout.

## What went well

- **The pure-seam discipline paid off again.** S1 + S2.2 were a handful of lines in `home-curation.ts`
  plus spec rows; no rendering or fetch path changed. The "extract the seam, test the seam" pattern from
  the parent epic made this follow-up almost entirely pure-logic.
- **Medusa-first read filter was a one-liner.** S2.1 mirrored the existing brand/transmission metadata
  filters exactly (`if (q.featured === 'true') …filter(isFeaturedPin)`) — additive, absent-param-unchanged,
  no write/schema change. Extracting `isFeaturedPin` (vs inlining) bought a DB-free unit spec for free.
- **Graceful degradation made the cross-repo deploy lag a non-event.** The frontend union falls back to
  freshest-24 if the backend filter is absent/slow, so backend-first → deploy → verify → frontend-merge ran
  with zero risk window.

## What bit us (and the durable lesson)

- **Cross-agent review earned its keep on both PRs — once a decline, once a real fix.** On the **backend**
  PR codex raised a "blocking" item (the filter runs after pagination → old pins missed); it was a misread —
  the route fetches *all* products (`take:2000`) at Step 1, filters at Step 4, paginates at Step 6, so no pin
  is paginated off. **Declined with written rationale.** On the **frontend** PR codex caught a genuine
  should-fix: `fetchListings` degraded only on `!res.ok`, so a network **throw** (the exact deploy-lag case)
  or malformed JSON would reject `Promise.all` and break the static build despite the "never throws" comment.
  **Applied** (`4bb484e`): wrap each fetch in try/catch. Lesson holds — *run the advisory review on a green PR,
  apply the real should-fixes, decline the noise with a reason in-thread.*
- **The "main moves under you" CI red reconfirmed — diagnose, don't debug your own diff.** #126's "Playwright
  vs preview" went red on the **sibling** `seller-acquisition-seo.spec.ts`: PR #125's `/vende` persona
  metadata (`af690ad`) landed on `main` after this branch's preview was built, so CI ran the merged test set
  against a preview lacking that implementation. A re-run wouldn't fix it — `git merge origin/main` + push
  (rebuilding the preview) did. The tell-tale (a failing spec for a feature you never touched) and the fix
  are already in LEARNINGS; this is another live confirmation.

## Owed to Daniel (operational)

- The authenticated `GET /store/listings?featured=true` curl (needs the prod publishable key) and the admin
  pin/reorder → homepage smoke (5 steps in `sprint-2.md`; needs an admin session + a real *old* pinned product).

## Durable learnings promoted to `Roadmap/LEARNINGS.md`

- Union an explicit metadata-filtered fetch into a freshest-N pool (with per-fetch graceful degrade) to make
  hand-curation authoritative without un-static-ing an ISR page — and the read-filter mirrors the existing
  in-memory metadata-filter convention (fetch-all → filter → paginate), so "filter after pagination" is a
  reviewer misread to decline, not a bug.
