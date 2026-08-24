# Hyper-performant runtime — Sprint 3: Client — the JavaScript diet

**Status:** 🟩 shipped — frontend PR [#418](https://github.com/danybgoode/miyagisanchezcommerce/pull/418),
squash `03108bd`; production Cloud Run `miyagi-web-00135-czg` (100% traffic, `minScale: 1`)

> **Sprint goal:** a buyer page downloads materially less JavaScript, and the deterministic gate
> fails if that ever regresses. **Archetype: Sweeper** — acceptance is *less code, same behaviour, no
> regressions*, and every removal ships with a guard against its return.

**Architecture-lock baseline (frontend `origin/main` `0eb9985`, 2026-08-22):** 4.3 MB of
`.next/static/chunks`; largest chunk **315,519 bytes containing Sentry Replay** and loaded by `/mx`.
The route manifests for `/mx`, `/mx/l/[id]` and `/mx/s/[slug]` contain none of `xlsx`, `jszip`,
`mercadopago` or `@dnd-kit`; the earlier aggregate-chunk attribution mistook build output for a
route dependency. Story 1.3 supplies the wire baseline and Story 3.4 guards the actual route graph.

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
- The locked 315,519-byte Replay-containing chunk shrinks by a measured amount, recorded in the PR
  body from Story 1.3's probe.
- **Error reporting still works** — throw a deliberate client-side error on prod and confirm it
  arrives in Sentry. In `sentry.client.config.ts`, remove only `replayIntegration` and its two replay
  sample rates; its shipped DSN/error/tracing rules remain the single imported contract. The server
  and edge Sentry configs and `withSentryConfig` in `next.config.ts` are **untouched**. This story
  removes one integration, not the SDK.
- If replay is wanted back later, it returns **lazily and behind an explicit trigger** — never as a
  static import in the client entry.

**Risk:** low — observability configuration, no product surface, no money/auth path.

---

### Story 3.2 — The existing vendor boundary becomes enforceable
**As a** buyer browsing a shop, **I want** not to download a spreadsheet parser, **so that** the page
is about the shop.

**Architecture-lock correction (D14):** built Turbopack client-reference manifests prove the named
packages already do **not** ship to buyer routes. `xlsx`, `jszip` and `mercadopago` are server-only;
`@dnd-kit` appears only on `/admin/seleccion`. Moving them would manufacture checkout/payment risk
without changing a buyer byte. The story is now the missing regression guard.

**Acceptance:**
- A spec resolves the built client-reference manifests for `/mx`, `/mx/l/[id]` and `/mx/s/[slug]`
  and fails if any of `xlsx`, `jszip`, `mercadopago` or `@dnd-kit` enters their chunk graph.
- The guard fails loudly when the build artifact or a route manifest is missing; unavailable is not
  reported as an empty, passing dependency set.
- No named vendor import, checkout file, payment file, admin implementation or import implementation
  changes. The current boundary is the accepted behavior.

**Risk:** low — test-only. If the guard suggests a real buyer-route vendor leak after all, stop and
hand back; do not expand into checkout or payment restructuring.

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
| `app/components/AIAgentButton.tsx` | 216 | native `<dialog>` for modality; client context/copy logic stays |

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
- `AIAgentButton` remains a client component: HTML replaces modal mechanics, not its agent-context,
  clipboard or handoff behavior.

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
- The gate resolves the built route-to-chunk graph and fails when the Brotli-compressed bytes of its
  unique client JS exceed budget. *(LEARNINGS, 2026-07-18: a perf/transfer budget guard must measure
  what it polices — Playwright's `body()` returns decompressed bytes.)*
- Budgets are set from Story 1.3's post-diet measurement and each is committed **with the number that
  set it**, so a future reader knows whether a failure is a regression or a stale budget.
- Covers at minimum `/mx`, `/l/[id]` and `/s/[slug]`.
- **It allows the negation** — a route legitimately under budget passes, and the guard is verified
  against the **built artifact**, not asserted to "self-resolve at deploy". *(That exact claim was
  refuted in this codebase's own review on 2026-07-18.)*
- Observed red via a deliberate mutation (add a fat import, watch it fail).

**Risk:** low — test-only.

## Sprint QA
- **api spec(s):** 3.1 → a built-output assertion that no Replay code ships. 3.2 → a manifest-composition
  spec per buyer route. 3.3 → one spec per converted surface (house convention: one concern per spec
  file, not one giant spec). 3.4 → extends `e2e/perf-budget.spec.ts`.
- **browser smoke owed:** yes, to Daniel — the signed-in homepage (step 1) and native interactions
  (steps 2–4). No payment smoke is owed: D14 proves no money-path code moves.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **Coordination:** check for in-flight PRs on `app/components/*` before starting — S3.3 touches
  shared buyer components.

## Sprint 3 — Smoke walkthrough (executed in order)
Env: production · https://miyagisanchez.com · 2026-08-24 · frontend `03108bd` /
Cloud Run `miyagi-web-00135-czg`

1. Open https://miyagisanchez.com/mx in real Chromium.
   → HTTP 200; marketplace chrome rendered. Four legacy protocol-relative Shopify image candidates
   returned 400 from the intentionally R2/Supabase-only proxy, exactly as Sprint 1 already recorded in
   D18; they are a pre-existing catalog-content limitation, not a Sprint 3 regression.
2. Open https://miyagisanchez.com/mx/l/prod_01KZJJPXY8XFV90WDFN43RTBBM and activate its description
   summary.
   → HTTP 200; the production DOM contained one closed native `<details>`, and clicking its `summary`
   changed `open` from `false` to `true` without a client-state transition.
3. Read the S3 built-artifact gate from the merged PR.
   → It rejects Replay in client output, resolves the three buyer route manifests, and enforces Brotli
   ceilings of 90,861 B (`/mx`), 101,601 B (PDP) and 83,565 B (shop). The deliberate Replay/vendor/fat
   import/native-behaviour mutations were each observed red before merge.
4. Measure the deployed public fixtures with
   `node scripts/perf-probe.mjs --revision 03108bd2a538dee4508d313496274e30468d10df --json`.
   → All four locked fixtures were present. Client-JS transfer was 358,055 B (`/mx`), 370,806 B (PDP),
   and 349,863 B (shop); see `s3-production-final-2026-08-24.json`. The Sprint 1 baseline has old,
   now-ineligible PDP/shop identities, so it is retained as historical evidence rather than presented
   as a like-for-like S3 latency claim.
5. **Owed to Daniel (signed-in/auth state):** sign in and open https://miyagisanchez.com/mx, then open
   Cuenta and press `Esc`.
   → Expected: the native popover opens below its trigger, `Esc` closes it, and keyboard focus proceeds
   through account actions in order.
6. **Owed to Daniel (signed-in/auth state):** open the AI handoff control, press `Esc`, reopen it, copy
   the prompt and continue to the agent.
   → Expected: native dialog focus traps/restores correctly and context, copy and handoff remain intact.
7. **Owed to Daniel (Sentry dashboard access):** cause the approved deliberate client-error check and
   inspect the production Sentry project.
   → Expected: the error arrives while no Session Replay is created; DSN, tracing and server/edge
   reporting remain the shipped configuration.

If any step fails, note the step number + what you saw — that's the bug report. Checkout and payment
verification are deliberately absent because D14 proves this locked diff did not move a money path.
