# 05 · Trust, Offers & Messaging — Refresh (2026-06)

**Depth: DEEP** (drives #5 + #3c; touches #3b at the refund/report boundary). Pinned:
frontend `origin/main@ed447bd`, backend `origin/main@0980253`. Read-only via `git show`. No files modified.

## Reproduction status of v1 findings

| v1 area | Status | Current anchor / note |
|---|---|---|
| 1. Chat-to-commerce handoff — action bar, not a durable in-chat transaction card; `purchase_complete` not emitted as a conversation event | **STILL LIVE (P1)** | Architecture unchanged; the chat is still not the shared ledger. This is the **#3c "in-chat transaction ledger"** item. |
| 2. Haggling state machine — turn owner/deadline implied by button availability; "48h" vs "<24h" copy mismatch; open-amount counters | **STILL LIVE (P1)** | `MakeOfferButton.tsx` copy mismatch persists; offer state model (`lib/offers.ts`) intact. Feeds #3c. |
| 3. Trust-signal proximity — strong on PDP, thin at chat header / negotiation entry; buyer eligibility discovered after submission | **STILL LIVE (P1)** | unchanged. **New per-channel dimension** — see net-new below. |
| 4. **Assisted manual refund lifecycle — UI overstates ("Reembolso emitido") while SPEI/cash transfer is off-platform** | **STILL LIVE (P0/P1)** | `OrderDetail.tsx:659` toast "Reembolso emitido…"; `:1079` "Reembolso emitido al comprador"; `:1155` even admits "deberás devolver el dinero por transferencia. Esto solo registra el reembolso." The language/reality gap remains. |
| 5. Order visibility & cross-domain sync — buyer "I paid" only notifies, never becomes a shared event; no mutual activity timeline | **STILL LIVE (P1)** | `report-payment/route.ts:23` (Telegram-only) — same root cause as 02-#1. A durable `buyer_reported_paid` (the #3b fix) is the **first event** of the shared timeline #5 wants. |

**Net: all still-live.** The 05 picture is structurally as v1 described — fragmentation, not absence.

## Net-new findings (post-audit surfaces)
- **Per-channel trust divergence is now real (P1, new).** With subdomains
  (`shopname.miyagisanchez.com`), custom domains, short-links (`mschz.org`), and embed, the same
  listing/PDP renders across ≥4 hosts. Trust signals (seller verification, payment-protection,
  return window) were audited on the **marketplace** render; they may present differently — or be
  absent — on a white-label tenant render or an embedded card. The refresh flags this as a
  *per-channel* trust-proximity question rather than assuming the marketplace render is universal.
  *(Feeds #6 landing + #3c trust polish, not #3b.)*
- **Custom-domain checkout confirmation is brand-correct** (buyer returns to the verified tenant
  domain; confirmation email branded). This *helps* trust; no new negative finding.

## #3b boundary note
05 touches #3b at exactly two seams, both already captured in 02/03:
1. **`buyer_reported_paid` as a shared event** — the durable state #3b adds is also the seed of #5's
   shared timeline. Build the state durably now (#3b) so #5 can project it later without rework.
2. **Refund-language honesty** — the "Reembolso emitido" overstatement (finding 4) is a trust defect
   on the *money path*. **Decision needed (see re-scope delta):** fold the refund-language fix into
   #3b, or keep it in #3c. Recommendation: **in-scope-adjacent for #3b** as a copy-only sub-item
   (cheap, same money-path mental model), full assisted-refund state machine → #3c.

## Priority recommendations (refreshed)
1. Persist `buyer_reported_paid` as the **first shared event** (#3b) → the base of the #5 timeline.
2. Make manual-refund language match reality: "Reembolso registrado / Transferencia pendiente" until confirmed. *(copy-only; candidate #3b sub-item.)*
3. *(#5):* shared buyer/seller transaction timeline mirrored into chat; manual-payment lifecycle events as canonical triggers.
4. *(#3c):* explicit offer turn-owner + deadline; trust capsules at negotiation entry (per-channel aware); assisted multi-step refund state machine.
