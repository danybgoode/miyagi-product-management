# Mercado Libre sync — Sprint 5: Resilience, observability & paid-SKU gating

**Status:** ✅ **MERGED + DEPLOYED (dark) 2026-07-01** (US-13 + US-14). CI green, codex cross-review clean
(should-fixes applied), squash-merged be #52 `2b81fa5` (Cloud Run) · fe #153 `20e100f` (Vercel). Dark behind
`ml.sync_enabled`; the paywall gate is inert until `ml.sync_paywall_enabled` is flipped. **US-15 deferred** to
a follow-up sprint (its own HIGH-risk migration PR). Scoped 2026-07-01 with Daniel: build US-13 + US-14 only;
US-14 depth = the read-side gate + promoter-SKU registration (the live Stripe money path is a deferred fast-follow).

| Story | Status | Commit |
|---|---|---|
| US-13 — Token-refresh recovery + re-auth surfaces + sync activity log | ✅ MERGED | be #52 `2b81fa5` · fe #153 `20e100f` |
| US-14 — Paid/promoter-SKU entitlement gate (gate + SKU registration) | ✅ MERGED | fe #153 `20e100f` |
| US-15 — Durable sync-state table (crash-safe, clobber-proof idempotency) | ⬜ DEFERRED | — (own follow-up PR) |
| api spec (`e2e/ml-resilience-gate.spec.ts`) | ✅ MERGED | fe #153 `20e100f` |

> **Owed post-deploy (dark-safe, run before enabling sync):**
> 1. **BE migration — REQUIRED for the activity log.** `medusa db:migrate` against **prod Cloud SQL** creates
>    `ml_sync_event` (the Cloud Run deploy is image-only — no auto-migrate; in-VPC private IP ⇒ run via the
>    connector-attached Cloud Run Job, per LEARNINGS). Until then `recordSyncEvent` is a best-effort no-op
>    (try/catch swallows the missing-table error) — nothing breaks, but the log stays empty.
> 2. **FE Supabase seed — OPTIONAL (behavior-preserving).** `20260701210000_ml_sync_paywall_flag.sql` seeds
>    `ml.sync_paywall_enabled=false`. The flag already fail-opens `false`, and `/admin/flags` upserts the row
>    on first toggle, so this is cosmetic (makes the flag show in the admin table before it's ever flipped).

> Goal: the integration recovers from real-world failures and the seller can see what it's doing; and ML
> sync can be turned into a paid/promoter SKU when you want to monetize it.

## What shipped (US-13 + US-14)
**US-13 — resilience + observability (be `e6a1c88` · fe `e9c4567`):**
- **Re-auth recovery.** `getAccessTokenForSeller` now catches a failed refresh (revoked/expired refresh
  token), persists `needs_reauth` on the connection metadata, records a `token_refresh` activity event, and
  throws a tagged **`ML_REAUTH_REQUIRED`** — instead of the pre-S5 uncaught `Error` that surfaced as a generic
  502 while the status page still read "Conectado". `deriveConnectionHealth` gains a `needs_reauth` state
  (outranks the time-derived states) mirrored in `lib/ml-health.ts`; the status page shows a **"Reconecta tu
  cuenta de Mercado Libre"** prompt; the internal routes map the code to a distinct 409; the FE publish/import
  bridges surface a typed `reauth_required` reason. Cleared on a successful refresh / reconnect.
- **Per-seller sync activity log.** New append-only `ml_sync_event` model + migration in the **backend ML
  module** (co-located with the sync core; the backend-origin events — stock pushes, applied sales,
  reconciles, token-refresh failures — can't live in a Supabase-only log). Best-effort `recordSyncEvent`
  (a failed log write never breaks a sync), pure `summarizeSyncEvent` validates the kind + **redacts any
  token** from the message. Recorded at every seam (publish/close/stock_push/sale_applied/reconcile/
  token_refresh) + an FE `import` event. New `GET/POST /internal/ml/events` route → `lib/ml-events.ts` bridge →
  a recent-activity panel on the status page.

**US-14 — paid/promoter-SKU entitlement gate (fe `e9c4567`):**
- **Entitlement seam.** `lib/ml-sync-entitlement(.ts/-server.ts)` — a faithful clone of the subdomain seam on
  the `ml_sync_grant` key, gated on a new **`ml.sync_paywall_enabled`** flag (in-house `platform_flags`, NOT
  Flagsmith). **Fail-safe:** the flag defaults OFF ⇒ every connected seller stays entitled (an already-enabled
  tester is never trapped behind the paywall). No recurring ML-sync subscription this sprint (deferred).
- **Gated enable surface.** S4 shipped the per-seller enable backend-only; S5 adds the seller-facing route
  `POST/GET /api/sell/ml/sync-settings` (order **flag → auth → entitlement**; enabling is blocked with a 403
  upsell when not entitled; disabling is never gated) + a sync-enable toggle / upsell island on the status page.
- **Promoter SKU.** Registered `ml_sync` in `PROMOTER_SKUS` + `DEFAULT_COMMISSION_RATES` + the admin SKU label
  (SKU-generic ledger picks it up with no other change). A **comp-grant** entitles testers via the existing
  admin grant surface. **Deferred fast-follow:** the live Stripe plan-seed / checkout / webhook grant-write.

## Stories

### US-13 — Token-refresh recovery + re-auth surfaces + activity log
**As a** seller, **I want** to be told when my ML connection needs attention and to see what synced,
**so that** I trust and can debug the integration. Harden token-refresh failure handling (a revoked/expired
refresh token prompts re-auth in `/shop/manage` rather than silently failing); add a per-seller **sync
activity log** (imports, publishes, stock pushes, webhook adjustments, reconciliations, errors). es-MX.
**Acceptance:** a revoked ML token surfaces a clear re-connect prompt (no silent breakage); the activity
log lists recent sync events with outcomes; errors are legible, not stack traces.
**Risk:** med

### US-14 — Paid/promoter-SKU entitlement gate (wiring)
**As** Daniel, **I want** ML sync to be gateable as a paid/promoter SKU, **so that** it can be monetized.
Wire an entitlement check (reuse the subscription/entitlement + promoter-SKU patterns) so sync features are
available only to entitled sellers; fail-safe (gate off ⇒ today's behavior for already-enabled testers).
Register ML sync as a promoter SKU so a promoter code + commission apply (promoter-program).
**Acceptance:** a non-entitled seller can't enable ML sync (sees the upsell); an entitled seller can; a
promoter code applies to the ML-sync SKU; flipping the gate off doesn't break enabled testers.
**Risk:** med

### US-15 — Durable sync-state table (crash-safe, clobber-proof idempotency)
**As the** system, **I want** the ML sale-application idempotency + mirror state to live in a real table, not
the linkage JSON metadata, **so that** the two bounded concurrency residuals S4 documented can't ever
double-decrement or drop state. Add a `product_ml_sync` (or extend a table) with a **`unique(link_id,
ml_order_id)`** constraint written **in the same transaction as the inventory decrement** (insert-first
idempotency), and move `last_pushed_available` / `orders_synced_at` / applied-orders off the JSON blob so
inbound and outbound writes stop clobbering each other. Requires a **migration** (deliberately out of S4).
**Acceptance:** a simulated crash between decrement and marker does NOT double-apply on retry; concurrent
inbound+outbound never lose an applied-order or the push baseline; the S4 unit invariants still hold.
**Risk:** high (inventory idempotency; migration). Daniel merges.
> Context: S4 shipped the oversell-safe core on JSON metadata (no migration) with two *safe-direction*
> residuals (crash → under-count; metadata clobber → under-count/harmless), reconcile-healed. This makes them
> impossible rather than merely bounded. Approved with Daniel 2026-07-01 (S4 close).

## Sprint QA — what ran
- **api spec `e2e/ml-resilience-gate.spec.ts` (api):** the `needs_reauth` health mirror (US-13), the
  activity-log presentation (label/tone/date-format), the ML-sync entitlement precedence + **SKU-key
  isolation** (a subdomain/domain grant never entitles ML sync) + **fail-safe** (paywall OFF ⇒ entitled), the
  `ml_sync` promoter-SKU registration, and the `sync-settings` route auth shape (auth-before-flag). Pure
  helpers 17/17 green locally; the 2 anonymous-route assertions validate on the **branch Vercel preview** (they
  return 404 vs prod pre-deploy because the route is new — CI-vs-preview is the real signal, per LEARNINGS).
- **Backend unit spec `__tests__/ml-resilience.unit.spec.ts`:** the `needs_reauth` health state + the
  `summarizeSyncEvent` validator/redactor. Ran with the module's other 4 specs — **51/51 green**.
- **Deterministic gate (green before the draft PRs):** BE `medusa build` + `tsc --noEmit` + `test:unit`; FE
  `tsc --noEmit` + `npm run build` + Playwright `api` pure specs.
- **Owed to Daniel (browser/auth, can't be headless-smoked):** revoke an ML **sandbox** token → confirm the
  re-connect prompt; confirm a non-entitled seller sees the upsell and a comp-granted seller can enable.

## Sprint 5 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch **Vercel preview** URL while pre-merge) · ML
**sandbox**. Prereq: `ml.sync_enabled` ON in `/admin/flags` (the whole sync surface is dark otherwise).

1. As a connected seller, open **`/shop/manage/mercadolibre`**.
   → The connection card shows "Conectado"; if sync is enabled at the platform level you also see the
     **"Sincronización de inventario"** section and (once events exist) an **"Actividad reciente"** panel.
2. From the Mercado Libre side, **revoke** this shop's app authorization, then trigger any ML action
   (e.g. reload the import page, or attempt a publish).
   → `/shop/manage/mercadolibre` shows a red **"Reconecta tu cuenta de Mercado Libre"** prompt (health =
     `needs_reauth`) — **not** a silent "Conectado" with a hidden 502. **[owed to Daniel — needs a real
     sandbox token]**
3. Click **Reconectar**, complete OAuth, then reopen the activity log.
   → The `needs_reauth` prompt clears; the **Actividad reciente** panel lists recent events with es-MX labels
     + outcome dots (a prior failure is legible, never a stack trace, never a token).
4. As a **non-entitled** seller (paywall ON via `ml.sync_paywall_enabled`, no grant), try to **Activar
   sincronización**.
   → You see the **paid/promoter upsell** card (link to `/vende/promotor`); the toggle stays off; the route
     returns 403 `ML_SYNC_NOT_ENTITLED`. **[owed to Daniel — needs an authed seller session]**
5. Comp-grant that seller the ML-sync SKU from the **admin grant surface** (writes
   `marketplace_shops.metadata.ml_sync_grant`), then retry **Activar sincronización**.
   → Sync enables (the toggle flips to "Activada"). **[owed to Daniel — needs admin + authed seller]**
6. Flip **`ml.sync_paywall_enabled` OFF** in `/admin/flags`.
   → An already-enabled tester keeps working (fail-safe); no breakage.

If any step fails, note the step number + what you saw — that's the bug report.
**Owed to Daniel (browser/auth):** steps 2, 4, 5 (revoke-token re-auth + entitlement) — an automated api gate
can't hold a real sandbox token or an authed seller session. **Deferred (not in this sprint):** the live
Stripe checkout that *buys* the ML-sync SKU + attributes commission (a promoter-paid purchase) is a fast-follow
— step 5's comp-grant is the tester-entitlement path that stands in for it until then.
