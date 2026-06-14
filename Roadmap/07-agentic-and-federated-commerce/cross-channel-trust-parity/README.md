---
status: shipped
slug: cross-channel-trust-parity
---

# Epic — Cross-channel Storefront Trust Parity

> **Macro-section:** [07 · Agentic & Federated Commerce](../README.md) · **BUILD-ORDER:** #3c · Epic D ·
> **Risk: LOW–MED — presentational, no money mutation, no new component** (consumes Epic C's
> `<TrustSignals>`); the one caution is the shared `ChannelLayout` blast radius (announce + PR).
> **Status: ✅ EPIC COMPLETE — single-sprint, shipped to prod 2026-06-09 (PR [#67](https://github.com/danybgoode/miyagisanchezcommerce/pull/67), squash `e78ae6a`).**
> Hard gate cleared first (C.4 on `main`, PR #65 `d35bc8c`). D.0 pure deriver + D.1 embed grid + D.2
> white-label shell/assurance strip; deterministic gate green in CI vs the preview. Groomed + signed off
> (Daniel, 2026-06-07); scaffolded under `07-agentic-and-federated-commerce/`. Scope doc:
> [`00-ideas/seeds/cross-channel-trust-parity.md`](../../00-ideas/seeds/cross-channel-trust-parity.md).
> Wave context: [`remaining-audit-polish.md`](../../00-ideas/seeds/remaining-audit-polish.md).
> Driven by the #3a refresh ([`results-refresh-2026-06/`](../../00-ideas/audits/results-refresh-2026-06/), 05 net-new + 01).

## Why
The same listing should feel as trustworthy on a seller's own domain, subdomain, or an embedded card as
it does on the marketplace. A fresh Medusa-first code read this groom **re-scoped the work much
smaller** than the wave doc implied: `ChannelLayout` is bare *as a component*, but the root layout
(`app/layout.tsx:359`) wraps the **same** trust-bearing pages inside it — so custom-domain, subdomain,
and the embedded PDP **already render their full trust signals**. Only **two** surfaces still lack
parity: (1) the **embed shop grid** (`app/embed/s/[slug]/page.tsx`), a bespoke thin grid that omits the
✓ Verificado badge + payment/returns/pickup pills the normal shop page shows; and (2) the **white-label
shell**, which gives a buyer no platform-backed *"compra protegida / pago seguro"* assurance — only the
seller's self-asserted pills. Daniel's calls: **slim Epic D to those two gaps**, and add a **subtle
platform-assurance strip**. And because his Epic-C groom made **Epic C own + extract the shared,
channel-aware `<TrustSignals>` component (C.4)**, Epic D builds **no new component** — it just **wires
C.4's component** into those two surfaces. **This re-orders the wave: build Epic C Sprint 2 first.**

## Context

| Question | Answer |
|---|---|
| **Who** | Buyers reaching a shop off-marketplace — custom domain, subdomain, or an embedded storefront on a third-party site |
| **Job** | See the same trust signals (verified, payment, returns, pickup, contact) + platform-backed assurance no matter which channel the listing renders through |
| **Outcome signal** | The embed shop grid shows the ✓ Verificado badge + trust pills · the white-label shell (custom domain + subdomain + embed) renders `<TrustSignals>` incl. a subtle *"Pago seguro · Compra protegida"* strip · no channel shows materially less trust than the marketplace |
| **In v1** | Wire C.4's channel-aware `<TrustSignals>` into the **embed shop grid** (D.1) and the **white-label shell `ChannelLayout`** + embed shell incl. the subtle platform-assurance facet (D.2) · anonymous browser smokes across the three host contexts |
| **Out** | **Building/extracting** `<TrustSignals>` or its trust selector (**Epic C / C.4**) · re-rendering the PDP capsules (white-label already renders the shared PDP) · new trust *data* / backend field · seller-configurable trust copy · escrow / Compra Protegida mechanics (`spike-compra-protegida.md`) — the strip is positioning, not the mechanism |
| **Risk tier** | LOW–MED — presentational, no money mutation, no new component; shared-`ChannelLayout` caution → announce + PR |
| **Dependency** | ⛔ **Blocked-by Epic C Sprint 2 (C.4)** — D consumes the `<TrustSignals>` component C.4 extracts |

## Medusa-first note
**No backend change, no new component, no new persisted data.** Epic D imports the channel-aware
`<TrustSignals>` component Epic C extracts in **C.4** (it takes a `channel` prop = `marketplace` |
`channel` | `embed` over a pure trust selector) and renders it in the two surfaces that still lack
parity. The trust *data* already rides `shop.metadata.settings` (returns window, pickup spots, payment
flags, `shop.verified`) — already consumed by C.4's selector and by the UCP shop object for agents (so
**no new agent capability**, AGENTS rule #3). New copy is es-MX (the storefront has no live dictionary —
copy-completeness gate per LEARNINGS). Clerk untouched.

## What already exists (reuse, don't rebuild)
- **`<TrustSignals>` (Epic C / C.4)** — the channel-aware component + pure trust selector. **Epic D's
  whole job is to render it; it builds none of it.** Hard dependency: C.4 must land first.
- **`app/s/[slug]/ChannelLayout.tsx`** — the **one** white-label shell for custom-domain + subdomain
  (wired in `app/layout.tsx:359`) and reused by embed (`app/embed/s/[slug]/page.tsx:61`). Rendering
  `<TrustSignals>` here covers custom-domain + subdomain at once. **SHARED SURFACE → announce + PR.**
- **`app/embed/s/[slug]/page.tsx`** — the bespoke embed shop grid that today omits the badge + pills;
  the D.1 wiring target. The normal shop page's badge + pill row
  (`app/s/[slug]/page.tsx:155-159,237-245`) is the parity reference.
- **`app/layout.tsx` channel plumbing** — `x-miyagi-channel` / `x-miyagi-embed` / `whiteLabel` are
  already resolved; render the component off the flags already in hand (prefer the `whiteLabel` flag so
  subdomains are covered — see the subdomain nuance in the scope doc).
- **The trust-data shape** — `shop.metadata.settings` (`returns_policy`, `shipping.local_pickup` /
  `pickup_spots`, `stripe` / `mp_enabled` / `bank_transfer.clabe`, `shop.verified`); no new field.

## Scope — stories by sprint

### Sprint 1 — Wire `<TrustSignals>` across the white-label channels *(all blocked-by C.4)*

| Story | What | Risk | QA |
|---|---|---|---|
| **D.1** | Render `<TrustSignals channel="embed">` on the **embed shop grid** so the ✓ Verificado badge + payment/returns/pickup signals reach the embed surface | **LOW** — presentational, embed surface, consumes C.4; reviewer may auto-merge on green CI | Anonymous browser smoke: `/embed/s/[slug]` shows the badge + signals |
| **D.2** | Render `<TrustSignals channel="channel">` inside **`ChannelLayout`** (custom domain + subdomain) + the embed shell, including the discreet es-MX *"Pago seguro · Compra protegida"* payment-protection facet (Daniel's "subtle assurance" call) | **LOW–MED** — touches shared `ChannelLayout` → **announce + PR**; no money/auth path | Anonymous browser smoke across `x-miyagi-channel=custom` (host-simulated) + embed; live cosmetic look on a real subdomain/custom domain **owed to Daniel** |

*(No component-extraction story — that's Epic C / C.4. No inventory story — done in the scope doc.)*

## Deploy order
Frontend-only, single repo (`apps/miyagisanchez`). **Do not start until Epic C Sprint 2 (C.4) is merged
to `main`** (D imports `<TrustSignals>`). Build D.1 → D.2; **announce the `ChannelLayout` change before
D.2** and open a PR (don't push straight to `main`). One branch `feat/cross-channel-trust-parity`.

## Definition of Done (epic)
- [x] D.1 + D.2 merged to `main` (PR #67 squash `e78ae6a`); deterministic gate green (tsc + build + Playwright `api`, in CI vs the preview).
- [x] One anonymous `*.browser.spec.ts` asserts `<TrustSignals>` renders on the embed grid + white-label shell — via the real `/embed/*` surface (middleware strips spoofed channel headers, so `custom`/`subdomain` can't be header-simulated on a preview).
- [x] `ChannelLayout` change was **announced** before merge; shipped via PR (not direct-to-`main`).
- [x] Sprint 1 has a fool-proof smoke walkthrough (real prod URLs + example slug); the live subdomain/custom-domain cosmetic look is flagged **owed to Daniel**.
- [x] Epic `README.md` ✅ + `sprint-1.md` ticked with commit refs; `RETROSPECTIVE.md` written.
- [x] Product poster (`Roadmap/README.md`) updated — 07 line reflects cross-channel trust parity; Recent-highlights entry added.
- [x] Team memory + `LEARNINGS.md` updated with any durable learning.
- [x] Branch deleted; PR merged.
