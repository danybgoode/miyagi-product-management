# Mercado Libre sync — Sprint 1: Connect + linkage foundation (the spine)

**Status:** 🟦 READY — not started. Backend-first. No money mutation.

| Story | Status | Commit |
|---|---|---|
| US-1 — Connect/disconnect ML (OAuth) as a Medusa module | ⬜ | |
| US-2 — Product ↔ ML-item linkage model | ⬜ | |
| US-3 — Connection status + health in `/shop/manage` | ⬜ | |
| api spec (`e2e/ml-connect.spec.ts`) | ⬜ | |

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

1. As a test seller, go to `/shop/manage/...` → "Conectar Mercado Libre" and complete the ML consent.
   → You're returned connected; the status shows your ML nickname + "conectado".
2. Inspect the stored connection (admin/db).
   → Tokens are **encrypted**, keyed to the Medusa seller id; an expiry is set.
3. Force the token near-expiry and trigger any ML call.
   → The token **auto-refreshes**; the status "last refresh" updates; nothing is logged in cleartext.
4. Link a test Medusa product to a dummy ML item id (internal action), then look it up both ways.
   → Both lookups resolve; a second link to the same pair is **rejected**.
5. Click "Desconectar".
   → The connection clears; status shows "no conectado".

If any step fails, note the step number + what you saw — that's the bug report.
**Auth path:** step 1 (real ML consent) is owed to Daniel.
