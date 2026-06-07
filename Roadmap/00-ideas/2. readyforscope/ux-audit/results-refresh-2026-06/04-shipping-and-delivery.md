# 04 · Shipping & Delivery — Refresh (2026-06)

**Depth: LIGHT** (feeds #3c; one item — coupon total — overlaps #3b). Pinned: frontend
`origin/main@ed447bd`, backend `origin/main@0980253`. Read-only via `git show`. No files modified.

## Reproduction status of v1 findings

| v1 finding | Status | Current anchor / note |
|---|---|---|
| 1. Buyer address capture not truly CP-first on mobile (name/phone before CP) | **STILL LIVE (P1)** | `CheckoutExperience.tsx` — receiver/contact still precede CP in the visible form. Feeds #3c CP-first. |
| 2. Shipping-quote failure → weak recovery ("coordina con el vendedor" with no selectable coordinated path) | **STILL LIVE (P1)** | unchanged. |
| 3. No explicit product-level timeout around Envía quotes ("Cotizando…" can hang) | **STILL LIVE (P2)** | `fulfillment-envia/envia-client.ts` still `Promise.allSettled` with no UI-level timeout. |
| 4. "Arranged-only" architecture drift — `onlyCoordinated = false` hardcoded | **STILL LIVE (P1)** | `backend …/checkout-options/route.ts:160` — `const onlyCoordinated = false`. Still ambiguous whether sellers may publish arranged-only. **Decision still owed.** |
| 5. Payment guardrails explain method type, not delivery causality | **STILL LIVE (P2)** | unchanged. |
| 6. Manual payment = commitment-before-instructions | **STILL LIVE (P1)** | same as 02-#4 (`CheckoutExperience.tsx:551`). |
| **7. Final CTA can conflict with summary total (coupon)** | **STILL LIVE (P0)** | **Same defect as 02-#5** — `CheckoutPayButton.tsx:73` ignores coupon. **This is a #3b item.** |
| 8. Seller delivery readiness discovered too late (publish defaults on) | **STILL LIVE (P1)** | unchanged; feeds #3c. |

## Net-new (post-audit surfaces)
- No new shipping/delivery surface shipped post-audit. Custom-domain/subdomain checkout reuses the
  same fulfillment + checkout-options path, so 04 findings apply unchanged across channels.

## Go-forward
- **Into #3b:** finding **#7 (coupon total)** only — already captured in 02. Everything else is **#3c**
  (CP-first capture, quote recovery/timeout, arranged-only policy decision, delivery-causality copy,
  delivery-aware order lists, seller publish gates).
- The **arranged-only policy decision** (finding #4) is a product call Daniel should make before #3c
  slices delivery work — flagged here so it isn't lost.
