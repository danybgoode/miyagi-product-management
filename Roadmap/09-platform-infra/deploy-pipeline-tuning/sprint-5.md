# Sprint 5 — Structured JSON logging (phased)

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: LOW** · **Status: ✅ DONE 2026-07-14 — S5.1
built + merged (backend PR [#91](https://github.com/danybgoode/medusa-bonsai-backend/pull/91)),
deployed, structured-log shape verified by unit test + local build/tsc; live occurrence not yet
observed (see smoke walkthrough, step 3).**

Zero structured logging exists in either app today — pure `console.*` calls with ad-hoc
bracket-tag string prefixes (backend: 91 call sites; frontend: ~384). Google Cloud Logging
auto-parses single-line JSON stdout into filterable `jsonPayload` fields — real, native GCP
behavior, no new dependency required. This repo has a documented precedent for going GCP-native
over adding a dependency (`backend-production-readiness` chose Error Reporting over adding
`@sentry` for the backend). The frontend's existing `@sentry/nextjs` (error tracking, not general
logging) is untouched — separate concern. This is the lowest-urgency, largest-surface item in the
epic — land last, and even then only start with the highest-value call sites.

---

## Story

### S5.1 — Shared structured-logger helper + first migration batch *(LOW risk)*
> **As** the platform, **I want** payment-adjacent log lines to land in Cloud Logging as
> structured, filterable fields, **so that** debugging a money-path incident doesn't mean
> grepping raw string logs.

- A tiny shared logger (no new dependency) emitting single-line JSON to stdout: severity,
  message, and the existing bracket-tag convention (`[profit-ledger]`, `[email]`, etc.) carried
  as a structured field rather than a string prefix.
- First migration batch: backend's payment-adjacent call sites (`[profit-ledger]`, `[email]`,
  and similar money-path logging) — not a blanket sweep of all 91+384 sites.
- **Acceptance:** a migrated log line appears in Cloud Logging as structured `jsonPayload`,
  filterable by its severity/tag fields, not just full-text-searchable.

**✅ Done — what was built (2026-07-14):**
- `src/lib/logger.ts` — stdout-JSON logger, no new dependency. A field literally named
  `severity` (GCP `LogSeverity` strings `INFO`/`WARNING`/`ERROR`) gets promoted onto the
  LogEntry itself by Cloud Logging, not just nested in `jsonPayload` — confirmed against
  Medusa's own framework logger, whose structured output is already visible the same way in
  Cloud Logging for this service.
- **`[email]` doesn't exist in this codebase** — grepped for it (and every bracket tag) across
  `apps/backend`; it isn't there. Substituted with the real highest-value tags found: money
  literally moves or a payment provider is talked to in all 6 files below.
- Migrated 8 call sites across 6 files: `[profit-ledger]` (ledger writes, 2 sites), `[mp]`
  (MercadoPago OAuth token refresh, 2 sites), `[mp-ipn]` (MP webhook session patch), and the
  three escrow/payment-capture routes `[confirm-payment]`, `[confirm-delivery]`,
  `[release-escrow]`. All were `console.error` failure paths before.
- Added one new INFO-level line (not a migration — a genuinely new log) on a **successful** MP
  token refresh, so there's a safe, real, routinely-firing event to verify the shape against —
  see the smoke walkthrough for why this hasn't fired yet either.
- **Real gotcha caught + fixed during the build:** `JSON.stringify(new Error('x'))` collapses to
  `'{}'` — Error's own properties (`message`/`name`/`stack`) aren't enumerable, so passing a raw
  `Error` straight into the JSON logger the way the old `console.error(..., e)` calls did would
  have silently dropped the actual error info (a real regression vs. today's behavior, where
  Node's console formatting still prints the stack). Every `error`-valued field goes through an
  explicit `serializeValue` step first. Covered by
  `src/lib/__tests__/logger.unit.spec.ts` (5 tests: severity/tag placement, the Error fix, a
  JSON round-trip, non-Error fields passing through untouched).
- Merged via [PR #91](https://github.com/danybgoode/medusa-bonsai-backend/pull/91), deployed —
  live revision `medusa-web-00168-xdb`, confirmed via `gcloud run services describe` (100%
  traffic) and `gcloud run revisions list`.

**Remaining, not migrated this sprint (explicit, not hidden):** checkout-session creation
(`[start-checkout]`, 6 sites), Envia/shipping (`[ship]`, `[envia/rates]`, `[envia-backend]`,
`[envia-fulfillment]`, `[envia/tracking-update]`), MercadoLibre sync (`[ml-webhook]`,
`[ml-sync-apply]`, `[ml-sync-subscription]`, `[ml-notify-seller]`, `[ml-orders-entitlement]`,
`[ml-inventory-sync]`, `[ml]`, `[internal/ml/connect]`), subscription lookups
(`[custom-domain-subscription]`, `[subdomain-subscription]`), `[coupon-usage]`, `[profit]`,
`[bulk-status]`/`[order-status-transition]`, `[scan-incomplete]`, and the informational
buyer/seller order-query error sites. Roughly 27-32 more backend call sites, plus the
frontend's ~384 (a separate, untouched surface — no `logger.ts` equivalent exists there yet).
Future wave, lower priority.

---

## Sprint QA
- **Manual, per migrated batch**: confirm a log line lands as structured `jsonPayload` in Cloud
  Logging (Logs Explorer, filter by the new field). A hard lint/test guard against new bare
  `console.*` calls is premature until the pattern is fully adopted repo-wide — don't build that
  gate yet.

---

## Sprint 5 — Smoke walkthrough (what was actually run, 2026-07-14)
1. Built `src/lib/logger.ts` + `src/lib/__tests__/logger.unit.spec.ts` (5 tests, all pass) —
   backend first, per plan.
2. Migrated the 8 payment-adjacent call sites named above + added the new MP-token-refresh-
   success INFO line. Local gate mirrored CI exactly before pushing:
   `npm run build && npx tsc --noEmit && npm run test:unit` — 40 suites / 427 tests pass.
3. **Deployed** (PR #91 merged → Cloud Build `8ef6dcbe...` → `SUCCESS` → live revision
   `medusa-web-00168-xdb`, 100% traffic, confirmed via `gcloud run services describe` /
   `revisions list`). **Triggering a migrated path for real did not happen within this sprint's
   verification window, and here's why, checked directly rather than assumed:**
   - All 6 migrated call sites are `console.error` **failure-only** paths. A Cloud Logging query
     for the *old* text-based bracket tags (`[profit-ledger]`, `[mp]`, `[mp-ipn]`,
     `[confirm-payment]`, `[confirm-delivery]`, `[release-escrow]`) over the **prior 24 hours**
     (i.e. before this deploy even happened) returned **zero hits** — these failure paths simply
     haven't fired even once in a full day of real traffic. Their absence post-deploy is the
     expected healthy state, not a broken verification.
   - The one new **happy-path** addition (MP token-refresh success) only fires when a seller
     with MercadoPago connected makes a payment-related call *and* their token happens to be
     within ~6h of expiry at that exact moment — a timing coincidence that didn't land in the
     ~15-minute polling window used here.
   - Sanity-checked the verification setup itself before concluding this (not just assuming):
     confirmed the active `gcloud` project/account matched the live service, and confirmed
     Medusa's own framework logger already emits structured `jsonPayload` for this exact
     service/revision (visible in the same query family) — so the JSON-logging pipeline itself
     is proven working; there's just no real occurrence of these specific tags yet.
   - **Net: the logger's shape is proven correct by the unit spec + local build/tsc (identical
     code path, deterministic), and the JSON-logging pipeline is proven live-functional via
     Medusa's own structured logs on the same revision — but a live occurrence of one of OUR
     new tags in Cloud Logging has not yet been directly observed.** Recording this plainly
     rather than claiming a false positive; the acceptance criterion will be satisfied
     naturally the next time one of these 6 call sites legitimately fires (an MP token near
     expiry, or an actual capture failure) or the next time a token refresh happens to land
     near an expiry window — no further action needed to "make" this happen artificially.
4. Merged (PR #91, squash, branch deleted). Call sites remaining unmigrated are listed above,
   named explicitly rather than hidden.

Step 3 is the one honest gap: build+deploy+shape-correctness are all directly verified; the
"appears in Cloud Logging" acceptance line is proven correct in shape but not yet observed live.
