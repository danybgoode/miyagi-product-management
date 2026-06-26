# Seller-Acquisition Landing Pages — Content + es-MX + Mobile Overhaul (v2) — Retrospective

_Shipped: 2026-06-25 → 2026-06-26 · 4 sprints · frontend-only, LOW risk throughout._

## What shipped
A content-led re-polish of the shipped seller funnel (`seller-acquisition-landing-pages`, #6). The first
epic built the *structure*; this one put real, intentional **es-MX content** inside it, fixed the weak
"ask your agent" CTA, added a truthful **price benchmark** + an **AI-channel** value prop, and did a full
**mobile-responsive sweep**. Zero Medusa, zero commerce, zero backend — all copy in one `locales/es.json`
block (`sellerAcquisition`) rendered through the shared section system, plus inline-style mobile fixes.

- **S1 — Copy & content brief** (no code): the per-persona es-MX copy deck + final directive prompt +
  benchmark copy + AI-channel copy, locked in `COPY-BRIEF.md` (approved 2026-06-25).
- **S2 — Copy + es-MX implementation** — landed all approved strings; killed the distrust framing ("No
  pedimos fe") and internal jargon; correct accents/ñ/¿¡ everywhere incl. the bespoke `mundial`; directive
  copy-paste prompt in the CTA — PR #125 squash `af690ad`.
- **S3 — Benchmark + AI-channel** — anchor-only Miyagi vs Mercado Libre vs Shopify table (0%-*platform*-
  commission framing, sourced + "Verificado: 25 de junio de 2026") + a UCP/MCP-truthful AI-channel
  section, both config-driven (`benchmark`/`aiChannel` undefined on persona builders) — PR #127 squash
  `8119527`.
- **S4 — Mobile-responsive sweep** — no horizontal overflow at 360/390/414px across all five `/vende*`
  pages — PR #129 squash `1e95f4e`.

Live surface: `app/(shell)/vende/` (`_components/SellerAcquisitionSections.tsx` shared renderer +
`page-config.ts`, the bespoke `mundial/page.tsx`, persona pages, `opengraph-image.tsx`), driven by
`locales/{es,en}.json → sellerAcquisition`.

## What went well
- **Reuse over rebuild held all the way down.** Every sprint edited an existing seam — copy in one JSON
  block, two new sections wired through `page-config.ts` + the shared renderer, and S4's overflow fixes as
  inline styles on the two hero surfaces. No new component, no new data model, no shared-layout touch.
- **The kill-the-jargon copy gate is enforced, not aspirational.** S2's `seller-acquisition-copy.spec.ts`
  fails CI on any re-introduced distrust framing or un-accented offender, so the content quality can't
  silently erode.
- **S4 found the real offender by measuring, then proved the fix both ways.** The new browser spec caught
  exactly one prod failure (`/vende/servicios` @360px overflowed 31px — the fixed-48px `<h1>` on
  "complicaciones.") and 15/15 green on the fixed build — so the spec is demonstrably meaningful, not a
  tautology that passes because nothing was broken.
- **Close-out happened in the same session the last sprint merged** — directly applying #6's own hard-won
  lesson (below). No doc drift left behind this time.

## What we learned
- **A fixed heading size is a mobile overflow bug waiting to happen in any language with long words.** The
  hero `<h1>` shipped at a fixed `var(--t-4xl)` (48px); a single long es-MX word ("complicaciones.")
  exceeded a 360px line. The durable fix is `clamp(min, vw, max)` + `overflow-wrap: break-word`, not a media
  query — it scales continuously and needs no breakpoint bookkeeping.
- **Horizontal overflow is a browser-project fact, not an api-gate fact.** `scrollWidth − clientWidth` only
  exists in a real layout, so the honest artifact is a `*.browser.spec.ts` (opt-in, nightly), and the
  real-device pass (font scaling, keyboard viewport, safe-area) still genuinely can't be headless — owed to
  Daniel by name. Same "name the gap, don't fake it" discipline as the authed money-path smoke.
- **`repeat(N, 1fr)` is a latent grid-blowout** because `1fr` = `minmax(auto, 1fr)` and `auto` is
  max-content — a wide/unbreakable child pushes the track past the container. `minWidth: 0` on the grid
  child (+ break-word on the content) is the robust guard; the safe `minmax(min(100%, Npx), 1fr)` idiom the
  rest of the renderer already used is the other half of the same rule.
- **Build off `origin/main`, not the local checkout, on a multi-sprint epic.** The local app tree was stale
  at `740f967` (S1 of a *different* epic) while S3 had merged to `8119527`; cutting the S4 worktree off
  `origin/main` is what put the benchmark/AI-channel sections in scope for the sweep. A squash-merged
  sprint branch is a dead end — start each sprint fresh off `origin/main`.

## Gaps / follow-ups
- **Real-device mobile pass owed to Daniel** — the numbered walkthrough is in `sprint-4.md`. The headless
  viewport sweep (browser spec) covers structural overflow; font scaling / keyboard / safe-area do not.
- **Live conversion read** (Clarity funnel `/vende/* → /sell → publish`, and whether the new benchmark /
  AI-channel sections move it) is operational, owed to Daniel — the pages are instrumented (GTM/Clarity +
  UTM), but no post-launch review is recorded here.
- **Spawned, out of this epic** (per the README): retire/repurpose `/vende/mundial` after the World Cup
  (Jul 19); an agent-readable why-sell/about surface fed by this epic's copy.
- **Benchmark figures carry a date stamp; re-verify at the next publish** — competitor fees drift, and the
  "Verificado: 25 de junio de 2026" stamp is the honesty contract.
