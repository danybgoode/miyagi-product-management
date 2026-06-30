# Mercado Libre sync — Sprint 1: Connect + linkage foundation (the spine)

**Status:** 🟢 BUILT — backend + frontend green, draft PRs open (backend-first). No money mutation.
Live ML-sandbox OAuth smoke owed to Daniel.

| Story | Status | Commit |
|---|---|---|
| US-1 — Connect/disconnect ML (OAuth) as a Medusa module | ✅ | be `a74bbd3` · fe `1338bb0` |
| US-2 — Product ↔ ML-item linkage model | ✅ | be `a74bbd3` |
| US-3 — Connection status + health in `/shop/manage` | ✅ | fe `65fd88d` |
| api spec (`e2e/ml-connect.spec.ts`) | ✅ | fe `1338bb0` |

> **Architecture note (confirmed with Daniel):** OAuth tokens live **encrypted (AES-256-GCM)
> in the Medusa module's Postgres**, keyed to the Medusa seller — not Supabase (the epic README's
> Medusa-first note was updated to match). The connect surface ships **dark** behind the
> `ml.connect_enabled` Flagsmith enablement flag (default `false`), so S1 merges invisible.
> **Risk tier: HIGH** (new DB migration + third-party auth credentials) → Daniel merges.

> Goal: a seller can connect their ML account, and the system has the **linkage primitive** every later
> sync depends on — before any import, publish, or stock movement exists. Reference: despacho's OAuth.

## Stories

### US-1 — Connect/disconnect ML (OAuth) as a Medusa module
**As a** seller, **I want** to connect (and disconnect) my Mercado Libre account, **so that** Miyagi can
act on my ML catalog. Stand up `apps/backend/src/modules/mercadolibre/` owning the connection. Port the
despacho OAuth dance (`getMlAuthUrl` → `exchangeCode` → store → `refreshMlToken` on 5-min expiry,
`getMlUser`). **Encrypt** tokens; store **keyed to the Medusa seller** (not just Clerk — the reference's
gap). Disconnect revokes/clears the connection.
**Acceptance:** a seller completes the ML OAuth round-trip and the connection is stored encrypted against
their Medusa seller; an expiring token auto-refreshes; disconnect clears it; no token is ever logged.
**Risk:** med (third-party auth; no money)

### US-2 — Product ↔ ML-item linkage model
**As the** system, **I want** a durable mapping between a Medusa product (and variant) and its ML item id,
**so that** import, publish, and stock sync all share one join. Add the linkage in the ML module
(Medusa-owned), with lookup both ways (Medusa→ML, ML→Medusa) and a unique constraint preventing duplicate
links.
**Acceptance:** linking a product to an ML item id persists; lookups resolve both directions; a duplicate
link is rejected; unlink removes it.
**Risk:** low (additive data)

### US-3 — Connection status + health in `/shop/manage`
**As a** seller, **I want** to see whether my ML account is connected and healthy, **so that** I trust the
integration. A status surface in the seller portal (connected nickname, token health, last refresh,
re-connect action). es-MX (rule #5).
**Acceptance:** the portal shows connected/disconnected + health; a stale/expired connection shows a
re-connect prompt; copy is es-MX complete.
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/ml-connect.spec.ts` (api) — OAuth callback stores an encrypted connection keyed to
  the seller (mocked ML); refresh path swaps tokens; disconnect clears (US-1); linkage link/lookup-both-
  ways/duplicate-reject/unlink (US-2); status endpoint reflects health (US-3).
- **browser smoke owed:** to Daniel — a real ML **sandbox** OAuth connect from `/shop/manage`, confirming
  the status surface. (Third-party auth — automated smoke can't complete a real ML consent screen.)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge) · ML **sandbox** app
**Prerequisite (owed to Daniel):** provision the ML env (backend Secret Manager `ML_APP_SECRET`
+ `ML_TOKEN_ENCRYPTION_KEY`, plus `ML_APP_ID`/`ML_REDIRECT_URI` on backend & Vercel), then flip the
`ml.connect_enabled` flag **ON** in Flagsmith. Until the flag is on, `/shop/manage/mercadolibre`
returns 404 by design (dark-ship).

1. As a test seller (flag ON), open **`/shop/manage/mercadolibre`** (or Configuración → the "Mercado
   Libre" card) → "Conectar Mercado Libre" and complete the ML consent.
   → You're returned to the status page; it shows your ML **nickname** + "Conectado".
2. Inspect the stored connection (Medusa admin / DB `ml_connection`).
   → `access_token_enc`/`refresh_token_enc` are **encrypted** (unreadable), the row is keyed to your
   Medusa **seller_id**, and `expires_at` is set.
3. Force the token near-expiry (set `expires_at` within 5 min) and trigger a refresh
   (`getAccessTokenForSeller`, used by any later ML call).
   → The token **auto-refreshes**; `last_refreshed_at`/`expires_at` advance; nothing logged in cleartext.
4. Link a test Medusa product to a dummy ML item id via the internal route
   (`POST /internal/ml/links`), then look it up both ways (`?product_id=` and `?ml_item_id=`).
   → Both lookups resolve; a second `POST` of the **same** (product, ml_item) pair returns **409**.
5. Click "Desconectar" on the status page.
   → The connection clears (status → "No conectado"); the encrypted token fields are wiped.

If any step fails, note the step number + what you saw — that's the bug report.
**Owed to Daniel:** steps 1–3 (real ML consent + a live token round-trip — a third-party consent
screen can't be automated). The api gate covers the health/linkage logic + anonymous route shape.
