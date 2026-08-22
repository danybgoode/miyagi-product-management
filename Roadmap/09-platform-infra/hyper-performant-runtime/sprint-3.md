# Hyper-performant runtime — Sprint 3: Client — the JavaScript diet

**Status:** ⬜ not started

> **Sprint goal:** a buyer page downloads materially less JavaScript, and the deterministic gate
> fails if that ever regresses. **Archetype: Sweeper** — acceptance is *less code, same behaviour, no
> regressions*, and every removal ships with a guard against its return.

**Baseline (live build `3G3h-WqNxT8DegPaaMSVJ`, 2026-08-20):** 4.3 MB of `static/chunks`; largest
chunk **309 KB containing Sentry** (with Session Replay), then **242 KB** carrying `xlsx` +
`mercadopago`, **235 KB** carrying `@supabase/supabase-js`, and three more ≥180 KB. **212 of 443**
components are `'use client'` — 48,815 lines. Story 1.3's probe supplies the before/after.

## Stories

### Story 3.1 — Sentry stops recording session replays
**As a** visitor, **I want** the page not to download and run a session recorder, **so that** I'm not
paying for telemetry aimed at an audience that doesn't exist yet.

**Context:** `sentry.client.config.ts` enables `replayIntegration()` with
`replaysSessionSampleRate: 0.1` / `replaysOnErrorSampleRate: 1.0`, initialised from
`instrumentation-client.ts` on **every** page — including the static homepage. Session Replay is the
heaviest part of the browser SDK. Per WAYS-OF-WORKING → *Operating posture* (2026-08-10), the platform
is pre-launch with one user: there are no sessions worth replaying, and the cost is paid by every
page load.

**Acceptance:**
- No Replay code in any client chunk (grep the built output, not the source).
- The 309 KB chunk shrinks by a measured amount, recorded in the PR body from Story 1.3's probe.
- **Error reporting still works** — throw a deliberate client-side error on prod and confirm it
  arrives in Sentry. The DSN wiring, `tracesSampleRate`, the three `sentry.*.config.ts` files and
  `withSentryConfig` in `next.config.ts` are all **untouched**. This story removes one integration,
  not the SDK.
- If replay is wanted back later, it returns **lazily and behind an explicit trigger** — never as a
  static import in the client entry.

**Risk:** low — observability configuration, no product surface, no money/auth path.

---

### Story 3.2 — Heavy vendor deps load where they're used, not everywhere
**As a** buyer browsing a shop, **I want** not to download a spreadsheet parser, **so that** the page
is about the shop.

**Context:** `xlsx` (bulk catalog import), `jszip`, `mercadopago` (checkout) and `@dnd-kit/core`
(seller catalog drag-ordering) are sitting in chunks that buyer pages pull. These belong to
`/shop/manage/import`, `/shop/manage/catalogo`, `/admin/*` and `/checkout` — not to `/mx`,
`/l/[id]` or `/s/[slug]`. The pattern is already in the codebase: `app/components/clerk-lazy/*`
wraps Clerk's UI components in `next/dynamic(..., { ssr: false })` for exactly this reason
(`hyper-performant-website` S2.2 — a **runtime** render conditional is not a build-time split, which
is why static imports kept shipping the bundle to everyone).

**Acceptance:**
- `xlsx`, `jszip`, `mercadopago` and `@dnd-kit` appear in **no chunk loaded by** `/mx`,
  `/l/[id]` or `/s/[slug]` — asserted against the built output, not the import graph by eye.
- The surfaces that need them still work: bulk import parses a real `.xlsx`; catalog drag-reorder
  still reorders; **checkout still completes a real test-mode payment**.
- A spec guards the separation so a future static import re-fattens nothing silently.

**Risk:** low **on the buyer side**, but the `mercadopago` move touches the **money path** —
its verification is a real test-mode checkout, owed to the product owner by name (step 5 below). If
the split turns out to require restructuring the checkout client, **stop and hand back** rather than
refactoring checkout inside a perf sprint.

---

### Story 3.3 — HTML does the work JavaScript was doing
**As a** buyer, **I want** expanding, dropdown and dialog interactions to be instant and
keyboard-friendly, **so that** the page responds before any script has to.

**Context:** the product owner's reference is [`chrisburnell.com/html-can-do-that`](https://chrisburnell.com/html-can-do-that/) —
`<details>`, `<dialog>`, the `popover` attribute, CSS anchor positioning, `hidden="until-found"`,
`<datalist>`, `<time>`, native form validation. Several buyer surfaces here hand-roll state that the
platform now gives for free, with better keyboard and screen-reader behaviour than a `useState`
toggle.

**The sweep list is fixed here and is not "all 212 client components".** In leverage order:

| Surface | Lines | Native replacement |
|---|---|---|
| `app/(shell)/l/[id]/CollapsibleDescription.tsx` | 61 | `<details>` / `hidden="until-found"` |
| `app/(shell)/l/[id]/ExcerptPanel.tsx` | 72 | `<details>` |
| `app/components/CuentaMenu.tsx` | 161 | `popover` + CSS anchor positioning |
| `app/components/AIAgentButton.tsx` | 216 | `popover` or `<dialog>` |

**Acceptance:**
- Each converted surface behaves identically or better, including keyboard and screen-reader access
  (`Esc` closes, focus is trapped and restored in a `<dialog>`, `<details>` is findable by in-page
  search).
- Each conversion has a spec **observed red** via a deliberate mutation.
- **No design regression:** the existing design tokens are reused and the
  `design-token-foundation` contrast/raw-hex guard stays green.
- **CSS anchor positioning is progressive enhancement only** — it must sit on top of a working
  fallback position, never be the sole positioning mechanism. Its cross-browser support is still
  uneven, and this is the one place the reference guide runs ahead of what ships safely today.
- Net client-side lines removed is stated in the PR body (Sweeper acceptance).

**Explicitly out:** `app/(shell)/l/[id]/Gallery.tsx` (452 L) — the PDP lightbox has its own open seed
(`00-ideas/seeds/pdp-lightbox-close-button-occluded.md`) and a shipped epic behind it; converting it
to `<dialog>` here would collide. **Coordinate, don't collide.** Also out: `MakeOfferButton.tsx`
(510 L) — offers are a money-adjacent negotiation surface, not a disclosure widget.

**Risk:** low — buyer-facing UI, no money/auth path, behaviour-preserving by construction.

---

### Story 3.4 — The diet is enforced, not remembered
**As a** future builder, **I want** the gate to fail when a route gets fat again, **so that** this
sprint isn't repeated in six months.

**Context:** `e2e/perf-budget.spec.ts` already guards *external* render-blocking assets — deliberately
scoped that way because the first version of its budget measured same-origin bundles with
`body().length` and got it wrong. Its own header comment records why. This story adds the same-origin
per-route budget the original attempt couldn't land, done correctly.

**Acceptance:**
- The gate fails when a route's client-JS **transfer** size (compressed, over the wire) exceeds its
  budget. *(LEARNINGS, 2026-07-18: a perf/transfer budget guard must measure what it polices —
  Playwright's `body()` returns decompressed bytes.)*
- Budgets are set from Story 1.3's post-diet measurement and each is committed **with the number that
  set it**, so a future reader knows whether a failure is a regression or a stale budget.
- Covers at minimum `/mx`, `/l/[id]` and `/s/[slug]`.
- **It allows the negation** — a route legitimately under budget passes, and the guard is verified
  against the **built artifact**, not asserted to "self-resolve at deploy". *(That exact claim was
  refuted in this codebase's own review on 2026-07-18.)*
- Observed red via a deliberate mutation (add a fat import, watch it fail).

**Risk:** low — test-only.

## Sprint QA
- **api spec(s):** 3.1 → a built-output assertion that no Replay code ships. 3.2 → a chunk-composition
  spec per buyer route. 3.3 → one spec per converted surface (house convention: one concern per spec
  file, not one giant spec). 3.4 → extends `e2e/perf-budget.spec.ts`.
- **browser smoke owed:** yes, to the product owner — the signed-in homepage (step 1), the converted
  surfaces (steps 2–3), and **a real test-mode checkout (step 5), which is the money path and is owed
  by name**; an automated browser smoke cannot fully cover it.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **Coordination:** check for in-flight PRs on `app/components/*` before starting — S3.3 touches
  shared buyer components.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Sign in, then open https://miyagisanchez.com/mx and watch the area where your "retoma" and seller
   modules appear.
   → They are there as the page settles. No skeleton shimmer that resolves a beat later.
2. Open https://miyagisanchez.com/mx/l/prod_01M0JCJC0FKNEFYK81HSVD72GW and expand the full product
   description.
   → It opens instantly. Press `Ctrl/⌘+F` and search for a word that is inside the collapsed text →
   the browser finds it and opens the section for you.
3. Click your account menu in the header, then press `Esc`.
   → It opens under the button and `Esc` closes it. Tab into it with the keyboard → focus moves
   through the items in order.
4. Open https://miyagisanchez.com/shop/manage/import and import a real `.xlsx` catalog file.
   → It parses and imports exactly as before. (This proves the spreadsheet parser still loads where
   it is actually needed.)
5. **(money path — owed to the product owner by name)** Add an item to the cart from
   https://miyagisanchez.com/mx/s/piezas-unicas, check out as a guest, and pay with a Stripe test
   card `4242 4242 4242 4242`. Then repeat with a Mercado Pago test credential.
   → Both complete. The order confirmation arrives and the seller's order screen shows the order.
6. Ask the builder for the before/after `perf-probe` table.
   → Client-JS transfer on `/mx`, `/l/[id]` and `/s/[slug]` is materially lower than the 2026-08-20
   baseline, and each route now has a committed budget.

If any step fails, note the step number + what you saw — that's the bug report. **Step 5 is the money
path: if either payment provider fails, stop the merge.**
