---
status: shipped
slug: envia-killswitch
---

# Envía — platform Flagsmith kill-switch

**Domain: [04 · Shipping & Delivery](../README.md).** Reuses the shipped Flagsmith flag layer from
[09 · feature-flags-killswitches](../../09-platform-infra/feature-flags-killswitches/README.md).

**Status: ✅ shipped (merged 2026-06-26) — Daniel's live smoke + `RETROSPECTIVE.md` still owed.** Both PRs merged (squash):
backend `medusa-bonsai-backend` **#41** `d2b7c1a` (S1.1, S1.2) · frontend `miyagisanchezcommerce` **#131**
`87baff9` (S1.3, S1.4). Cross-agent reviewed (codex, no blocking). Flag `shipping.envia_enabled` created in
Flagsmith **Production OFF** (feature 219454).
Scope doc:
[`00-ideas/2. readyforscope/envia-flagsmith-killswitch.md`](../../00-ideas/2.%20readyforscope/envia-flagsmith-killswitch.md).
Approved by Daniel 2026-06-25.

## Why
**As** the platform admin, **I want** to disable/enable the Envía shipping integration from the Flagsmith
dashboard with **no deploy**, **so that** while the platform Envía account is **unfunded** checkout cleanly
falls back to arranged delivery / manual carrier instead of surfacing carrier errors — and I can flip it back
on the instant the account is funded.

## Context
| | |
|---|---|
| **Class** | Light enhancement (extend the existing flag layer — not a new feature) |
| **Stage-2.5 bucket** | Light enhancement — `lib/flags.ts` exists in both apps; `shipping.envia_enabled` is already named in the Flagsmith spike taxonomy |
| **Flag** | `shipping.envia_enabled`, **enablement polarity, default OFF** (Flagsmith outage ⇒ Envía off ⇒ arranged-delivery fallback) |
| **Epic risk** | **HIGH** — touches the checkout/shipping money path → **Daniel-merge** |
| **Deploy order** | Backend-first: **S1.1 → S1.2 → S1.3** |
| **Smoke owner** | **Daniel** (live checkout/ship money path) |

## Medusa-first note
The gate sits on the **existing** Medusa Envía routes/provider — no new commerce data, no new tables, no
Supabase (the flag is environment-level in Flagsmith). The **backend** gate is the real enforcement, so
UCP/MCP checkout + agent ship calls inherit the kill automatically; the FE banner (S1.3) is cosmetic. Clerk
untouched. New copy es-MX. Flag reads are fail-open, so the ~12-min Cloud Run window is safe.

## What already exists (reuse, don't rebuild) — verified 2026-06-25
| Capability | Where | Reuse for |
|---|---|---|
| Flag layer (FE + BE), fail-open, local eval | `apps/miyagisanchez/lib/flags.ts`, `apps/backend/src/lib/flags.ts` | Add `FlagKey` + default; `isEnabled('shipping.envia_enabled')` |
| Enablement default-OFF precedent | `domain.paywall_enabled` in `lib/flags.ts` | Copy polarity + fail-open semantics |
| Pure, unit-tested kill-switch *application* | `lib/checkout-killswitch.ts` (`applyPaymentKillSwitches`) | Mirror as a pure `enviaKillGate` seam for free coverage |
| Quote seam (already degrades gracefully) | backend `POST /store/envia/rates` (returns *"coordina la entrega directamente…"* on failure) | Short-circuit **before** the Envía call when off |
| FE quote proxy (thin) | `app/api/checkout/shipping-rates/route.ts` | No change — proxies the gated backend route |
| Label seam + manual-carrier fallback | backend ship route + `apps/backend/src/modules/fulfillment-envia/` + existing manual-carrier path & "can't ship before payment" 422 gate | Block Envía label path when off; steer to manual carrier (built) |
| Per-seller Envía toggle | `settings.shipping.envia_enabled` (`Envios.tsx`) | Platform flag **overrides** it (global off wins) |
| Seller settings UI | `app/(shell)/shop/manage/settings/_sections/Envios.tsx` | Add a platform-off banner |

> **LEARNINGS gotcha (`LEARNINGS.md` ~L737):** a past plan named `lib/envia.ts quoteShipments` as the seam
> but the real awaited path was the proxy fetch → the fix was a no-op. **S1.1 must trace every importer of the
> Envía client first** and gate the seam the buyer/seller actually awaits.

## Scope — stories
| # | Story | Surface | Risk |
|---|---|---|---|
| S1.1 | Add `shipping.envia_enabled` flag (default OFF) + gate the **quote** seam → arranged-delivery fallback | BE | **HIGH** |
| S1.2 | Gate **label generation / shipping** → manual-carrier fallback (422 on Envía label path) | BE | **HIGH** |
| S1.3 | Seller-settings **platform-off banner** (server-evaluated) | FE | LOW |
| S1.4 | Close the **FE bypass**: gate `app/api/orders/[id]/ship` (legacy ship POST → 422, re-quote GET → empty) | FE | **HIGH** |

> **S1.4 was added during the build.** Tracing every Envía importer (the L737 gotcha this epic warned about)
> found `app/api/orders/[id]/ship` calls `lib/envia.ts` directly for legacy orders + re-quotes — a live bypass
> of the backend gate. Closing it honors the DoD's "agents/stale pages can't bypass." Confirmed in scope with Daniel.

Full story detail + acceptance + QA in [`sprint-1.md`](sprint-1.md).

## Out of scope
BYO Envía accounts (its own spike — `00-ideas/seeds/spike-envia-byo.md`) · migrating the per-seller toggle
into Flagsmith · new carriers / tracking-timeline / rate-logic · per-shop Flagsmith targeting.

## Epic Definition of Done
- [ ] S1.1–S1.3 merged (Daniel-merge), deterministic gate green (tsc + build + Playwright api) per PR.
- [ ] `shipping.envia_enabled` exists in **both** `lib/flags.ts` with default OFF + inline polarity doc.
- [ ] Backend enforces the kill on **both** quote and label seams (agents/stale pages can't bypass).
- [ ] **Production Flagsmith** has the flag created; documented that ON = live Envía, OFF = arranged/manual.
- [ ] Daniel's live money/ship smoke passed (flag OFF → fallback; flag ON → rates + labels work).
- [ ] es-MX copy-complete (banner + 422 message); no orphan strings.
- [ ] `Roadmap/README.md` poster updated (04 domain); `RETROSPECTIVE.md` written; durable learnings promoted to `LEARNINGS.md`.
