---
title: "Spike — BYO Envía accounts (per-seller shipping credentials)"
slug: spike-envia-byo
status: scaffolded
area: "04"
type: spike
priority: tbd
risk: high
updated: 2026-07-08
epic: "04-shipping-and-delivery/shipping-provider-expansion"
---

# Spike — BYO Envía accounts (sellers fund + connect their own Envía)

> **Class:** Spike (time-boxed investigation → a **written decision**, no code, no slicing until the decision lands).
> **Status:** ✅ **Decision landed + Daniel-approved 2026-07-08** (HYBRID; see DECISION below). Folded into
> [`shipping-provider-expansion`](../../04-shipping-and-delivery/shipping-provider-expansion/README.md)
> as its Sprint 1 (2026-07-05). Routed out of the 2026-06-25 Envía kill-switch groom (see
> [`envia-flagsmith-killswitch.md`](../2.%20readyforscope/envia-flagsmith-killswitch.md) appendix). **Build the
> kill-switch epic first** ([`04-shipping-and-delivery/envia-killswitch`](../../04-shipping-and-delivery/envia-killswitch/README.md)) — BYO reuses its gating + fallback.

## Why / the ask
**As** the platform owner, **I want** a decision on whether sellers should **bring + fund their own Envía
account** (paste their own API token) instead of shipping on a single platform-funded Envía account, **so
that** the shipping-funding burden can move to sellers — and I know the funding-model trade-off before building.

## Feasibility — already validated (2026-06-25)
**Yes, feasible.** Each Envía user signs up (`accounts.envia.com/signup`) and generates their **own Bearer API
token** (Developer → API Keys, per-environment); Envía publishes a **"Marketplace Multi-Seller Shipping"** use
case. BYO = each seller funds their own account + pastes their token; the platform stores it (encrypted,
per-seller) and routes that seller's quotes/labels through their token.
Sources: <https://docs.envia.com/docs/authentication> · <https://docs.envia.com/docs/marketplace-multi-seller>.

## The decision the spike must land
1. **Funding model (the core product call):** BYO (sellers fund their own) **vs** keep a funded platform
   account with a markup **vs** hybrid (platform default + optional BYO).
2. **Credential model + storage:** where the per-seller Envía token lives (Supabase non-commerce vs Medusa
   seller metadata) and how it's encrypted at rest; rotation/revocation.
3. **Client refactor shape:** `envia-client.ts` reads a single `ENVIA_API_KEY` today → thread a per-seller key
   from the listing's owning seller through quote + label paths.
4. **Onboarding/validation UX:** settings field to enter + **test-validate** the token; error states; what
   happens for sellers who haven't connected (→ arranged delivery / manual carrier — already wired by the
   kill-switch epic).
5. **Composition with the kill-switch:** the platform `shipping.envia_enabled` flag stays the **master off**;
   BYO is per-seller on top.
6. **Agent surface (AGENTS #3):** how UCP/MCP quote + ship behave per-seller under BYO.
7. **Go/no-go + a thin first slice** (NOT built in the spike).

## DECISION — spike executed 2026-07-08 (awaiting Daniel sign-off)

> Researched by Claude per `shipping-provider-expansion/sprint-1.md` Story 1.1. Web facts verified
> 2026-07-08 (sources at the bottom); codebase facts verified against the working tree the same day.

### Aggregator comparison (feeds §1)

| | Per-seller accounts (self-serve?) | MXN pricing model | MX coverage | API shape | Webhooks / tracking | BYO fit |
|---|---|---|---|---|---|---|
| **Envía** | ✅ Free signup («Regístrate gratis»); each account self-mints per-environment Bearer tokens (Developer → API Keys) | Prepaid saldo, pay-per-label at discounted rates; no monthly fee mentioned (first-party: the platform's own account works exactly this way) | Claims 100+ carrier options; in practice our account has Estafeta active (DHL/FedEx/UPS/Redpack activatable in dashboard) | REST JSON, Bearer auth, separate sandbox + prod keys; **already fully integrated** (client, fulfillment provider, HMAC webhook rail, CP-first Geocodes address UX) | ✅ Webhooks live in prod today (`/store/envia/tracking-update`) | **Best** — zero new integration; only credential threading |
| **Skydropx** | ❌ **API key requires contacting support** (`hola@skydropx.com`); Pro account → Connections → API → support. Legacy self-serve API **deprecated: "loses support starting January 2025 — migration to Skydropx PRO required"** | Pay-per-label (July promo: 1–5 kg $50 MXN); Pro pricing not public | 100+ paqueterías claimed | REST (`POST /api/v1/quotations` → pick `rate_id` → `POST /api/v1/shipments`); `Authorization: Token token=KEY`; demo env at `api-demo.skydropx.com` (also support-requested) | ✅ Radar API webhooks for status changes | **Dead end for BYO** — a support-gated key per seller doesn't scale self-serve; platform-account alternative only |
| **Pakke** | ✅ Per-account API Key, self-serve ("Generate" button in portal profile; indefinite validity); temp tokens via `/Users/login` | Pay-per-label at negotiated rates; specifics not public | Major MX carriers (Estafeta, Paquetexpress, FedEx, etc.) | REST at `https://seller.pakke.mx/api/v1/`; docs public (`docs.pakke.com`, JS app — not fully crawlable this spike) | ⚠️ Advertises "rastreo inteligente + notificaciones"; webhook docs not verifiable this spike (JS-gated) | **Best BYO alternative** if Envía ever fails us |
| **Mienvío** | ~ Self-serve exists (account + wallet/saldo recharge; live Shopify app) but repositioned as an enterprise **"Control Tower de Multipaquetería para LATAM"**; UPS partnership | Wallet (saldo) recharge, pay-per-guía | Multi-carrier MX/LATAM | REST, `Authorization: Bearer KEY`; reference at `api.mienvio.mx/reference` (behind app; not fully crawlable) | Advertises tracking + automation; webhook specifics unverified | Plausible but weaker: enterprise pivot + opaque docs = a second integration for no stated advantage |
| **EnvíoClick** | ✅ Per-account API Key, self-serve (Mi cuenta → API Key / Desarrolladores) | Not public; negotiated rates, plus "use our negotiations and/or **your own carrier rates**" | 30+ carrier agreements | REST at `api.envioclickpro.com` (v1); docs portal `apidoc.envioclickpro.com` JS-gated (not crawlable this spike) | Tracking via platform (`trackco.envioclick.com`); webhook specifics unverified | Viable alternative; docs opacity is the main knock |

**Cross-cutting fact:** Envía's own published multi-seller guidance
([marketplace-multi-seller](https://docs.envia.com/docs/marketplace-multi-seller)) recommends **one
marketplace account** — "Use a single Envia account for your marketplace. Charge sellers via your platform
settlement process" — i.e. the vendor's blessed pattern is *platform-funded + settlement*, not per-seller
tokens. BYO stays technically clean regardless (tokens are per-account, the API is identical), but this
confirms that platform+markup would drag in a **settlement/billing build** we don't have.

### 1. Funding model — **HYBRID** (recommendation)

Three tiers, two of which already exist or are already scoped:

1. **Admin comp-grant = the platform-funded tier** (Sprint 2, ships regardless of this decision):
   curated, hand-picked tenants ride the platform Envía account while the global flag stays OFF.
   Platform cash exposure stays bounded by curation + instant revoke.
2. **BYO Envía token = the self-serve, scalable tier**: seller signs up at Envía (free), funds their own
   saldo, pastes their token. Platform never touches shipping money; balance/funding support burden moves
   to the seller↔Envía relationship (we surface honest es-MX errors, §4).
3. **Arranged-delivery / manual fallback** for everyone else — today's behavior, unchanged.

**Rejected — platform+markup for all sellers:** requires per-label seller billing/settlement (prepaid
seller wallets or invoicing, disputes, reconciliation) — a brand-new HIGH-risk money path that even
Envía's own docs assume you already have; plus unbounded platform cash-flow fronting every label for a
long tail of small P2P sellers. The comp-grant already gives us the controlled version of this tier.
**Rejected — BYO-only:** signup+funding+token friction would strand most small sellers on arranged
delivery forever and throws away the comp-grant's curation value.

Trade-off summary: hybrid costs the most *code seams* (credential storage + resolution order) but the
least *money risk* and the least *new infrastructure* (no billing build), and every S2/S3 story remains
useful under it.

### 2. Credential model + storage

- **Backend Medusa, commerce-owned (AGENTS #1) — a dedicated model mirroring `ml-connection`, NOT seller
  `metadata`.** Seller metadata serializes into admin/store API surfaces (fine for the `envia_grant`
  boolean; wrong for a credential, even encrypted). Shape: `envia_connection` on the seller module —
  `token_enc`, `status` (connected/disconnected/invalid), `connected_at`, `last_validated_at`.
- **Encryption at rest:** reuse the ML-sync precedent verbatim — AES-256-GCM `encryptToken`/`decryptToken`
  (`apps/backend/src/modules/mercadolibre/_utils.ts`; hoist to a shared backend lib at build time).
  Forged/tampered ciphertext fails the GCM auth tag → `''` → treated as disconnected (**fail-closed to
  the arranged-delivery fallback**, never to the platform key).
- **Rotation:** seller pastes a new token → validate → overwrite. **Revocation:** clear `token_enc` +
  status `disconnected` — instant, same property as the grant. Platform-side kill: the BYO flag (§5)
  stops all BYO calls without touching stored tokens.
- Not Supabase (commerce data), not env vars (per-seller), not FE-readable ever.

### 3. Client-refactor shape

- Today `envia-client.ts` resolves one global key at call time (`apiKey()` reads `ENVIA_API_KEY`,
  `envia-client.ts:21`, into the Bearer header at `:31`). Refactor: every exported call accepts an
  optional `token?: string`; the header builder uses `token ?? platformKey()`. Pure, unit-testable,
  backward-compatible.
- **One shared pure resolution seam** (extends the existing `envia-killswitch.ts` gate — same
  unit-tested-pure-function discipline): seller has connected+valid BYO token AND BYO flag ON → **seller
  token**; else platform key iff (`shipping.envia_enabled` ON `||` `metadata.envia_grant`) → **platform
  token**; else → **no Envía** (arranged/manual fallback).
- Thread through **every** seam: backend quote `POST /store/envia/rates`; backend ship route;
  `modules/fulfillment-envia/`; and the FE legacy `app/api/orders/[id]/ship` (the L737/S1.4 bypass
  precedent — trace all importers again). **Forcing consequence:** the FE legacy route *cannot* do BYO
  without seller tokens leaving the backend — so the BYO build retires/proxies that route to the backend.
  That's a feature: per-seller credential resolution ends up living in exactly one service.

### 4. Onboarding / validation UX

- `Envios.tsx` gains «Conecta tu cuenta de Envía»: paste token → backend **validate-then-save** (one cheap
  authenticated Envía Queries call; invalid → es-MX error, nothing persisted). After save the token is
  **write-only**: show `••••` + connected state + last-validated date, never echo it back.
- States: not connected (CTA + link to `accounts.envia.com/signup`) · connected ✓ · invalid/revoked
  (re-paste prompt, fallback active meanwhile).
- Label-time failures from the *seller's* account (401, insufficient saldo) surface as es-MX copy that
  names the seller's own Envía account as the fix, and the order remains shippable via the manual-carrier
  path. Unconnected sellers ⇒ exactly today's arranged/manual fallback — no new dead ends.

### 5. Composition with the kill-switch

- `shipping.envia_enabled` stays the **master for the platform-funded path only** (unchanged, OFF today);
  the S2 grant widens it per-seller (`platformOn || sellerGranted`).
- **BYO gets its own flag: `shipping.envia_byo_enabled`** — enablement polarity, default OFF, created
  disabled. Rationale: the desired end state is BYO **on** while platform funding stays **off**, so BYO
  cannot sit under the master; and it needs an independent kill that doesn't revoke stored tokens.
- The full truth table lives in the one pure seam (§3) with unit specs.

### 6. Agent surface (AGENTS #3)

- **Zero agent-specific build.** Quote, checkout-options, and ship stay backend-SSOT; the backend resolves
  the owning seller and picks the credential server-side, so UCP/MCP inherit BYO exactly like web — an
  agent sees identical rate/option shapes whichever tier funds the label.
- **Explicit non-goal:** no MCP tool ever accepts a raw Envía token (a pasted token would transit chat
  logs and third-party model providers). Connecting is a dashboard action; at most a later deep-link from
  the agent sheet («conecta tu Envía» URL).

### 7. Go / no-go + thin first slice

- **GO — hybrid**, but **sequenced**: Sprints 2–3 (comp-grant, Correos) ship first and don't block on
  this; slice the BYO build when a real demand signal lands (a granted tenant's volume makes platform
  funding material, or a seller asks to ship on their own account). Nothing in S2/S3 is throwaway under
  hybrid.
- **Thin first slice (NOT built here):** backend-only, dark —
  (a) `envia_connection` model + AES-256-GCM storage + validate-and-save route;
  (b) pure resolution-seam extension + unit specs;
  (c) thread the **quote** path only, behind `shipping.envia_byo_enabled` OFF.
  Slice 2: label seams + FE-legacy-route retirement + settings UI. Slice 3: agent-parity api specs +
  es-MX error copy.
- **No-go recorded:** switching aggregator (no observed advantage justifies rebuilding a validated
  integration — client, provider module, webhook rail, CP-first Geocodes UX; Pakke is the named fallback
  if Envía ever fails us) · platform+markup billing build (see §1).

### Sources (accessed 2026-07-08)

- Envía auth (per-account Bearer tokens, sandbox/prod split): <https://docs.envia.com/docs/authentication>
- Envía multi-seller guidance (single-platform-account + settlement): <https://docs.envia.com/docs/marketplace-multi-seller>
- Envía free signup, 100+ carriers: <https://envia.com/es-MX> (+ first-party: our prod account's prepaid pay-per-label operation)
- Skydropx API reference (support-gated keys; legacy API support ends Jan 2025 → Pro): <https://docs.skydropx.com/> · Pro key process: <https://help.skydropx.com/articulos-cda/obtener-api-key> · endpoints/promo: <https://app.skydropx.com/es-MX/api-docs>, <https://www.skydropx.com/>
- Pakke API (self-serve per-account key, base URI): <https://docs.pakke.com/> · <https://help.pakke.com/hc/es/articles/4413960558875-Integraci%C3%B3n>
- Mienvío (Control-Tower positioning, Bearer API, wallet): <https://www.mienvio.mx/> · <https://intercom.help/mienviomx/es/articles/10353950-guia-completa-para-integrar-la-api-de-mienvio-con-tu-e-commerce> · Shopify app: <https://apps.shopify.com/mienvio-mx>
- EnvíoClick (self-serve API key, 30+ carriers, own-rates option): <https://www.envioclick.com/mx/api-para-envios> · <https://blog.envioclick.com/conecta-envioclick-a-tu-ecommerce-via-api/> · docs portal (JS-gated): <https://apidoc.envioclickpro.com/>
- Honesty note: Pakke/EnvíoClick webhook docs and Mienvío's full API reference are JS-/app-gated and were
  **not** independently verifiable this spike; marked ⚠️ above rather than assumed.

**Daniel sign-off:** ☑ **APPROVED 2026-07-08** (in-session). The HYBRID funding model + stay-on-Envía
decision is authorized; BYO build remains sequenced behind S2/S3 + a real demand signal.

## In / out (spike)
**In:** funding-model recommendation · credential/storage/encryption decision · client-refactor + onboarding
shape · composition with the flag · agent surface · go/no-go + thin slice.
**Out:** building it · multi-currency/markup billing mechanics beyond the funding-model call.

## Risk
Spike itself low-risk (research/decide). **When built: HIGH** — per-seller credentials on the money path →
Daniel-merge. How it closes: the written decision lands in this file (sections above filled) + Daniel signs off.
