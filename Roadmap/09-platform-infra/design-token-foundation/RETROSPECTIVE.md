# Retrospective — Design-Token / Design-System Foundation (#4)

**Closed 2026-06-07.** Class: chore / foundation. Risk: low (presentation + docs). Frontend only
(`danybgoode/miyagisanchezcommerce`) — zero backend, zero DB. Shipped in **PR #37** (merge `cc317ef`);
S1 doc deliverable written at close-out.

## What shipped
- **Token contract (S1)** — [`token-contract.md`](token-contract.md): the canonical semantic-token
  reference (surfaces, text, accent, feedback, scoped, glass, shadows, motion, type, primitives) + the
  locked-vs-unlockable theme-override matrix. The style-by-intent substrate #6 consumes.
- **Tokenization hardening (S2)** — `657df40`: customer-facing components moved off raw hex onto
  semantic tokens (`CheckoutExperience`, `embed/s/[slug]`, `ChannelLayout`, `ConversationClient`,
  `ClaimForm`, `MakeOfferButton`, `CheckoutPayButton`, `CartDrawer`, `SearchBar`, + tail). New scoped
  tokens (`--embed-*`, `--claim-*`, `--surface-channel`) added so the thin contexts also re-skin.
  Email / print / OG / admin / sandbox **deliberately excluded** (documented).
- **Contrast + no-regression guard (S3)** — `0c0607f`: `e2e/design-token-foundation.spec.ts` enforces
  WCAG-AA over the token pairs and **fails CI on a newly-introduced raw color** in customer-facing
  dirs (allow-listing the excluded contexts). Coverage now accretes automatically.
- **Follow-up** — `4e1640a` swapped a notifications raw-hex to `--color-danger` (the guard working).

## What went well
- **Reconciliation paid off.** Treating #4 as *harden + document* an already-shipped token system
  (not a rebuild) kept it a small, low-risk epic — globals.css + the seasonal engine already carried
  the weight.
- **The guard is the durable win.** A pure-logic `api` spec that red-flags raw hex means the
  foundation can't silently erode — free, tireless coverage in the deterministic gate.
- **Scoped tokens over one-off hex.** Tokenizing the embed/claim/channel surfaces produced reusable
  scoped tokens rather than chasing literals — those contexts now theme for free.

## What we learned (promoted to LEARNINGS.md)
- **Code can ship ahead of its product-doc deliverable — check both at close-out.** S2/S3 merged in
  PR #37, but the **S1 Roadmap token-contract doc never got written**; it surfaced only at close-out.
  A "docs-only" sprint inside a mostly-code epic is the easy one to skip. **Close-out validates the
  doc deliverables shipped, not just the code.**
- **A raw-color lint/spec guard is the cheapest way to keep a tokenized surface tokenized** — extract
  the scan to a next-free `lib/`/spec seam so the `api` runner loads it; allow-list the legit
  hardcoded contexts (email/print/OG).

## Gaps / follow-ups
- **Owed to Daniel:** the before/after **screenshot diff** proving "zero visible change" on key pages
  (home, listing, checkout entry, embed). The sampled smoke + the AA/raw-color guard passed, so this
  is low-stakes confirmation, not a risk. The only open close-out item.
- **Out of scope (future epics, unchanged):** multi-theme palette library (default/bodega/azul wiring)
  + the designer submission portal. The contract is the foundation they'll build on.
- **Downstream:** #6 (seller-acquisition landing pages) Track B now styles from `token-contract.md`.
