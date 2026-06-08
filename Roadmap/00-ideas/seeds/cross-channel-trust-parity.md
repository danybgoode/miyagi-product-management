---
title: "Cross-channel storefront trust parity (#3c Epic D)"
slug: cross-channel-trust-parity
status: scaffolded
area: "07"
type: feature
priority: wave-3
risk: low
epic: "07-agentic-and-federated-commerce/cross-channel-trust-parity"
build_order: "#3c-D"
updated: 2026-06-08
---

# Scope — Cross-channel storefront trust parity (#3c · Epic D)

> **Status: ✅ SIGNED OFF (Daniel, 2026-06-07).** Gate passed. Deep-groomed off the #3c wave scope
> ([`remaining-audit-polish.md`](remaining-audit-polish.md) → Epic D block) + the 05/01 refresh notes
> (`audits/results-refresh-2026-06/`), with a **fresh Medusa-first code read this groom** that
> materially reframed the work (see "What the code actually shows"). **Scaffolded:**
> `07-agentic-and-federated-commerce/cross-channel-trust-parity/` (README + sprint-1); kickoff prompt
> emitted; Epic D ticked on BUILD-ORDER.
>
> **⛔ Blocked-by Epic C Sprint 2 (C.4).** Daniel's Epic-C groom made **Epic C own + extract the shared
> channel-aware `<TrustSignals>` component** (C.4, `seeds/trust-messaging-polish.md`); Epic D
> **consumes** it (wires it into `ChannelLayout` + embed). This **re-orders the wave** — Epic D's
> trust-parity slice no longer runs parallel-ahead of C; **build Epic C Sprint 2 first.**
>
> **Class:** Feature (presentational / trust-UX). **Stage-2.5 bucket: light enhancement** — after the
> code read, this is *not* the multi-sprint "extract PDP capsules into the shell" epic the wave doc
> sketched; it's **one small sprint** that wires C.4's component into the two surfaces that still lack
> parity. No backend change; no money/auth/fulfillment mutation; no *new* component (C.4 owns it).

## The ask (mirrored back)
*You want the trust a buyer feels to be consistent no matter how they reach a shop — marketplace,
custom domain, subdomain, or an embedded storefront — so the same listing never silently looks less
trustworthy on a white-label channel. Right?*

## What the wave doc assumed — and what the code actually shows (the reframe)

The #3c wave doc (and the kickoff) framed Epic D as: *"`ChannelLayout` is a bare branded frame with
zero trust signals; the marketplace PDP has the trust capsules but the tenant/embed renders don't —
extract the capsules into one shared component and render them in `ChannelLayout`."*

A fresh read this groom shows that premise is **true of the shell component in isolation, but
misleading about what the buyer actually sees**, because `ChannelLayout` is applied by the **root
layout**, wrapping the *same* trust-bearing page components:

- **`ChannelLayout` is wired in `app/layout.tsx:359`** (not imported by the pages). When middleware
  tags a request `x-miyagi-channel=custom`, the root layout wraps **`children`** — i.e. whatever page
  rendered — inside `ChannelLayout`.
- **Custom domains** (`middleware.ts:41,91`): `/l/[id]` and every storefront path "serve natively,
  white-label." So the **shared PDP** (`app/l/[id]/page.tsx`) renders its **full trust capsules**
  (payment-method grid, returns pill + returns-policy block, pickup, processing pill, REPUVE, digital
  badge) on a custom domain. The PDP is explicitly channel-aware (`:77–86`) and gates **nothing** on
  channel. The shop home (`app/s/[slug]/page.tsx`) already renders the **✓ Verificado badge + a
  payment / pickup / returns / scheduling pill row** (`:155–159,237–245`) white-label.
- **Subdomains** (`shopname.miyagisanchez.com`): `isPlatformHost` (`middleware.ts:19`) is true **only**
  for the exact apex / `www` / `localhost` / `*.vercel.app`, so a subdomain falls through the *same*
  custom-domain branch → same `ChannelLayout` wrap → the same trust-bearing pages.
- **Embedded PDP**: a card in the embed grid opens `/l/<id>?channel=embed` in a **new top-level tab**
  on the marketplace origin → the full marketplace PDP, trust capsules and all.

**Conclusion:** custom-domain, subdomain, and the embedded PDP **already have trust parity**. The
wave doc's core move — "extract the PDP capsules and render them in `ChannelLayout`" — is **largely
redundant** (those capsules already render inside `ChannelLayout`, via the pages).

### Trust-signal inventory (the D.1 "audit" finding, done here)

| Surface | Verified badge | Payment pills | Returns | Pickup | Contact | How it renders |
|---|---|---|---|---|---|---|
| Marketplace PDP `/l/[id]` | — (PDP has no badge; shop-level) | ✓ grid | ✓ pill + policy | ✓ | ✓ | shared page |
| Custom-domain / subdomain PDP | — | ✓ | ✓ | ✓ | ✓ | **same file**, wrapped in `ChannelLayout` |
| Embedded PDP (new tab) | — | ✓ | ✓ | ✓ | ✓ | marketplace PDP |
| Marketplace shop home `/s/[slug]` | ✓ Verificado | ✓ pills | ✓ pill | ✓ pill | ✓ | shared page |
| Custom-domain / subdomain shop home | ✓ | ✓ | ✓ | ✓ | ✓ | **same file**, wrapped |
| **Embed shop grid `/embed/s/[slug]`** | **✗ missing** | **✗ missing** | **✗ missing** | **✗ missing** | **✗ missing** | **bespoke thin grid** |
| **`ChannelLayout` / embed shell** (all white-label) | **— no platform assurance** | — | — | — | — | logo · name · footer link only |

**The two genuinely real gaps:**
1. **The embed shop grid** (`app/embed/s/[slug]/page.tsx`) is a bespoke minimal card grid that
   **omits** the ✓ Verificado badge + trust-pill row the normal shop page shows. (Real, small.)
2. **Shell-level platform assurance** — on a buyer's-eye-view, a white-label storefront shows only the
   seller's *self-asserted* pills, with no platform-backed "compra protegida / pago seguro" assurance
   in the shell (only a tiny "Tienda impulsada por Miyagi Sánchez" footer link). This is the actual
   *trust-parity* question, and it tensions with white-label's purpose (hiding Miyagi on the seller's
   own domain).

## Daniel's decisions this groom (2026-06-07)
1. **Slim Epic D to the real gaps.** Drop the redundant "extract PDP capsules → `ChannelLayout`" work
   (white-label already renders those). Epic D = the embed-grid parity fix + a shell trust strip.
   **One small sprint, not a multi-sprint epic.**
2. **Add a subtle platform-backed trust strip** to the white-label shell (custom domain + subdomain +
   embed), e.g. *"Pago seguro · Compra protegida por Miyagi Sánchez"* — **discreet, neutral, minimal
   branding**, accepting a slight dilution of white-label so off-marketplace buyers get platform-backed
   assurance.

## Medusa-first reuse (what already exists — reuse, don't rebuild)
- **No new component — Epic D CONSUMES Epic C's `<TrustSignals>` (C.4).** Daniel's Epic-C groom made
  **Epic C Sprint 2 (C.4)** extract the inline trust signals into one reusable, **channel-aware**
  `<TrustSignals>` component that takes a `channel` prop (`marketplace` | `channel` | `embed`) over a
  pure trust selector. Epic C explicitly defers *"wiring `<TrustSignals>` into `ChannelLayout`/embed —
  that's Epic D."* So Epic D builds **zero** new component or derivation — it imports C.4's component
  and renders it in the two surfaces that still lack parity. **This is a hard dependency: build C.4
  (Epic C Sprint 2) first.**
- **No backend change.** Trust data already rides `shop.metadata.settings` (`returns_policy.window`,
  `shipping.local_pickup` / `pickup_spots`, `stripe` / `mp_enabled` / `bank_transfer.clabe`,
  `shop.verified`) — already consumed by the selector C.4 extracts.
- **The two surfaces to wire:** the **embed shop grid** (`app/embed/s/[slug]/page.tsx`, the bespoke thin
  grid missing the badge + pills) and the **white-label shell** `ChannelLayout`
  (`app/s/[slug]/ChannelLayout.tsx`) — the **one** shell for custom-domain + subdomain (via
  `app/layout.tsx:359`) and reused by embed (`:61`). Rendering inside `ChannelLayout` covers
  custom-domain + subdomain in one place. **It is SHARED SURFACE** — touching it can break every
  white-label render and any sibling PR → **announce + PR** (LEARNINGS: *"announce cross-cutting changes"*).
- **The platform-assurance strip = a `channel`-variant of `<TrustSignals>`, not a new widget.** C.4's
  component already surfaces *payment-protection* among its signals; the subtle *"Pago seguro · Compra
  protegida"* shell strip is that facet rendered in the `channel`/`embed` variant — configure C.4's
  component, don't build a parallel strip (fall back to a thin inline strip only if the component can't
  express it).
- **Agent surface (AGENTS rule #3):** N/A — purely presentational; the trust *data* is already in the
  UCP catalog/shop objects for agents. No new agent capability.

## Slice outline (skateboard → car) — one sprint, all blocked-by C.4

- **D.1 — Embed shop-grid parity (wire `<TrustSignals channel="embed">`).** Render C.4's component on
  the embed shop grid so the ✓ Verificado badge + payment / returns / pickup signals reach the embed
  surface, at parity with the marketplace/white-label shop page. *(**LOW** — presentational, embed
  surface, consumes C.4; reviewer may auto-merge on green CI.) **Blocked-by C.4.***
- **D.2 — White-label shell trust + subtle platform-assurance strip (wire `<TrustSignals
  channel="channel">`).** Render C.4's component — including the discreet es-MX *"Pago seguro · Compra
  protegida"* payment-protection facet (Daniel's "subtle assurance" call) — inside `ChannelLayout`
  (covers custom domain + subdomain) and the embed shell. *(**LOW–MED** — **touches shared
  `ChannelLayout`** → **announce + PR**; presentational, no money/auth path. Reviewer may auto-merge on
  green CI after the announce, or Daniel eyeballs given blast radius.) **Blocked-by C.4.***

*(No separate "inventory" build story — the inventory is done above and lands in the epic README. No
component-extraction story — that's C.4.)*

## In / Out of scope (Epic D v1)
**In:** wiring C.4's channel-aware `<TrustSignals>` into the embed shop grid (badge +
payment/pickup/returns/scheduling) and into the white-label shell `ChannelLayout` (custom domain +
subdomain) + embed shell, including the subtle es-MX *"Pago seguro · Compra protegida"* payment-protection
facet; anonymous browser smokes across the three host contexts; es-MX copy (copy-completeness gate, per
LEARNINGS — the storefront has no live dictionary).
**Out:** building/extracting the `<TrustSignals>` component or its trust selector — **that's Epic C
(C.4)**; re-rendering the **PDP** trust capsules into the shell (redundant — white-label already
renders the shared PDP); any new trust *data* or backend field; seller-configurable trust copy; escrow
/ Compra Protegida mechanics (its own spike, `spike-compra-protegida.md`) — the strip *references*
protection as positioning, it does not build it.

## Risk
**LOW–MED overall** (presentational; no commerce mutation; no *new* component). The one caution is the
shared `ChannelLayout` blast radius (D.2) → announce + prefer a PR. Neither story is high-risk by the
WAYS-OF-WORKING definition (no payments / checkout / fulfillment / auth / DB / money). Reviewer may
auto-merge each on green CI; for D.2 the announce precedes the merge and Daniel may choose to merge it
himself given it touches every white-label render.

## QA / smoke
- **The pure-logic coverage lives in C.4** (the trust selector spec) — Epic D adds none; D is wiring.
- **Anonymous browser smoke** (no auth needed): the embed shop grid (`/embed/s/[slug]`) renders the
  verified badge + trust signals; `<TrustSignals>` renders in the white-label shell. For the
  custom-domain / subdomain context, assert via a **host-/channel-header-simulated** request
  (`x-miyagi-channel=custom`) — anonymous, no login. *(One new `*.browser.spec.ts`; replaces a browser
  smoke otherwise owed.)*
- **Owed to Daniel:** a real-eyes look at a live subdomain (`<shop>.miyagisanchez.com`) + a real
  custom domain confirming the strip reads well and doesn't clash with seller branding (cosmetic, not
  a money path).

## Open risks / questions
- **⛔ Wave re-order — Epic D is blocked-by Epic C Sprint 2 (C.4).** Daniel's Epic-C groom made C own +
  extract the shared `<TrustSignals>`; Epic D consumes it, so D's trust-parity slice **no longer runs
  parallel-ahead of C** — **C Sprint 2 (C.4) must land before D's wiring story.** Recorded in the
  BUILD-ORDER Epic C line and Epic C's own scope doc (`trust-messaging-polish.md`). If D is somehow
  picked up first, it cannot proceed (no component to import) — it strictly waits on C.4.
- **(Adjacent, not a D dependency.)** Epic C's in-chat ledger renders *refund* rows from Epic B's
  `lib/refund-state.ts`; that seam is **null-safe and ships regardless** of B — it is an Epic C ↔ Epic
  B matter and does **not** gate Epic D.
- **Shared `ChannelLayout` (D.2)** — announce before touching; prefer a PR even though low-risk; a
  sibling white-label PR could collide. (LEARNINGS.)
- **White-label dilution** — the strip is *deliberately* a small concession to white-label purity
  (Daniel's call). Keep it discreet/neutral; if it reads as platform chrome, dial it back. The custom
  domain still canonicalizes + brands to the seller; the strip is assurance, not platform navigation.
- **Subdomain routing nuance (verify at build, not a blocker):** the `middleware.ts:30` comment says
  the custom-domain branch is "*not* `*.miyagisanchez.com`", but `isPlatformHost` doesn't exclude
  subdomains — so subdomains currently flow through that branch (matching the shipped white-label
  behaviour). Confirm a subdomain actually carries `x-miyagi-channel=custom` so the component renders
  there too; if subdomain provisioning routes differently, render wherever `whiteLabel` is true in the
  root layout (one place) rather than gating on `isChannel` alone.
- **No external-fact research needed** — entirely internal UX/state, verified against current code
  this pass (`app/layout.tsx`, `middleware.ts`, `app/l/[id]/page.tsx`, `app/s/[slug]/page.tsx`,
  `app/embed/s/[slug]/page.tsx`, `app/s/[slug]/ChannelLayout.tsx`).

## Definition of Ready check
- [x] As-a / I-want / so-that clear; acceptance checks Daniel-runnable (badge + signals on embed; `<TrustSignals>` + strip on white-label shells).
- [x] Class named (Feature / trust-UX); **Stage-2.5 bucket = light enhancement** (reframed from "epic" by the code read).
- [x] v1 in/out boundary written; Daniel's 2 decisions captured (slim to real gaps · subtle trust strip) + the C.4 re-order.
- [x] Medusa-first reuse list produced (no backend change; **no new component — consumes C.4's `<TrustSignals>`**; shared `ChannelLayout`).
- [x] Each story risk-tiered (D.1 LOW · D.2 LOW–MED, announce); QA stage named (anonymous browser smoke; pure-logic coverage lives in C.4); live cosmetic look owed to Daniel.
- [x] Dependency named: **blocked-by Epic C Sprint 2 (C.4)**.
- [x] **Daniel approved this scope doc (2026-06-07)** ← gate passed. Scaffolded `07-agentic-and-federated-commerce/cross-channel-trust-parity/` (README + sprint-1); kickoff prompt emitted; Epic D ticked on BUILD-ORDER.
