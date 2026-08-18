---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: operator-program-copy
---

# Epic: Operator program — one offering, two markets, new voice ✅ shipped 2026-08-17

> **Area:** 08 · Growth & Promotions · **Risk:** MED (public acquisition surface + one CHECK-constraint migration; no money path) · **Class:** Feature · **Scope seed:** none — raised by Daniel directly, 2026-08-17.

## Why
Two pages sold the same idea to two markets and agreed on nothing.

`/vende/promotor` describes a real, working program: a field promoter walks into a Mexican business,
opens their shop on miyagisanchez.com, charges for premium add-ons in person and hands the shop over
by a WhatsApp claim link. `/us/operators` described a **90-day "founding proof"** in which an applicant
nominated three merchant shops they already managed and waited for a founder review — a different
program, for a different person, that we are not running.

Its copy was also the clearest case of accumulated AI slop on the platform. The hero's companion panel
was headed *"What is true today"* and spent its words listing what the United States does **not** have.
A whole section existed to say what the program **is not**. The success state read *"Received for
review — not accepted yet."* Several agents had passed over it and each had added another disclaimer.

Daniel's call: keep the markets separate, make the **offering** the same, and rewrite both voices from
scratch — leaning on the reader's existing Shopify heuristic rather than explaining ourselves.

## Context
| | |
|---|---|
| **Class** | Content + surface rebuild |
| **Stage-2.5 bucket** | Reuse — the brand shell, the application rail and the funnel instrumentation all already existed |
| **Flag** | None added. `/us/operators` keeps its existing `partners.recruiting_v3_enabled` gate, unchanged |
| **Epic risk** | **MED** — public acquisition copy + a CHECK-constraint migration on a live table |
| **Deploy order** | Migration first (**applied + verified live 2026-08-17**), then the storefront merge |
| **Smoke owner** | Daniel — authed walk-through of the new page and one real application submission |

## Decisions taken (Daniel, 2026-08-17)
1. **Keep `/us/operators` and `/vende/promotor` as separate pages.** Same program, two markets, two languages, two economics.
2. **No dollar figures for our own SKUs.** US pricing does not exist in code — `domain-pricing.ts`, `subdomain-pricing.ts` and `ml-sync-pricing.ts` are MXN-only, there is no printed edition and no Mercado Libre. The page sells the program and states that rates are set on approval. Inventing a USD price to fill the table was refused.
3. **The US application becomes the five fields the Promotor one already asks.** The three-shop evidence ledger goes.
4. **`monta` is retired** as the word for setting up a shop, everywhere — not only on the promoter page.

## What already existed (reused, not rebuilt)
- `SellerAcquisitionPage` (`app/(shell)/vende/_components/`) — the brand landing shell: hero, AI prompt block, proof grid, comparison table, steps, FAQ, apply teaser, closing CTA. Copy-agnostic; a page supplies a config.
- `/api/promoter/apply` + the `founding_operator` program track, its approval RPC, its activation invitation and the `/partner` workspace — all kept.
- `lib/recruiting-events.ts` — the funnel vocabulary. Preserved exactly, including the `track_selected` event on the cross-market link.
- The `partnersRecruiting` copy namespace, its bilingual allow-list entry and its `/admin/contenido` route map — key *shapes* changed, the namespace and its five sections did not.

## Scope — stories
| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | S1.1 Generalize the benchmark table to N positional columns | low | ✅ merged (storefront PR #386) |
| 1 | S1.2 Rebuild `/us/operators` on `SellerAcquisitionPage` | med | ✅ merged (PR #386) |
| 1 | S1.3 Lightweight operator application + `operator_details` v2 + its migration | med | ✅ merged (PR #386) |
| 1 | S1.4 Rewrite `partnersRecruiting` in both locales | low | ✅ merged (PR #386) |
| 1 | S1.5 Rewrite `sellerAcquisition.promotor`; retire `monta` platform-wide + guard | low | ✅ merged (PR #386) |

## Definition of Done (epic)
- `tsc --noEmit` clean; `npm run build` exit 0; **4101 api specs pass, 0 fail**.
- Every new guard **observed red** through a deliberate mutation. Two guards were rewritten because
  of it — see the retrospective; both had been passing for the wrong reason.
- Both pages rendered and read locally in both locales.

## Owed
- Daniel's authed walk-through of `/us/operators` + one real application submission end to end.
- `partners.recruiting_v3_enabled` still has no Golden definition (it falls through to the compile
  default and 404s locally; production serves 200). Inherited, not introduced here.
- `/partner` reads the raw dictionary rather than the override layer — the same gap this epic closed
  on `/us/operators`. Flagged, deliberately not widened into scope.
