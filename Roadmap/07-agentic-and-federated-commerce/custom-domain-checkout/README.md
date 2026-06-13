# Epic — Checkout on the custom domain (custom-domain-checkout)

**Macro-section:** 07 · Agentic & federated commerce
**Spin-off of:** [own-shop-experience](../own-shop-experience/) (closed at S1+S2 — white-label *browsing* is
already in prod; this was its descoped Sprint 3).
**Original idea:** `Roadmap/00-ideas/seeds/custom-domain-checkout.md`

## Why

`own-shop-experience` made **browsing** a seller's shop on their custom domain 100% white-label — but **the
buyer can't buy there.** Tapping "buy" on `myshop.mx` goes to a relative `/checkout` → `/sign-in`, and Clerk
is **platform-domain-only** (satellite domains were deferred), so sign-in/payment breaks on the custom
domain. The shop looks real but **isn't transactional** — the highest-value gap the previous epic left.

## Architecture decision (Daniel, 2026-06-05): pragmatic hop to the platform

The buyer **hops** to `miyagisanchez.com` for the secure session + payment step (the product travels in the
URL) and **returns** to the custom domain on completion. Reuses the existing checkout as-is; no per-domain
auth infrastructure. Accepted trade-off: the platform domain is visible **only during payment**. (Clerk
satellite domains — 100% native checkout — remain a possible future improvement.)

## Sprints

| Sprint | Delivery | Risk | Status |
|---|---|---|---|
| [1](./sprint-1.md) | The checkout "hop": buying from a custom domain becomes **functional** | MEDIUM (frontend only) | ✅ MERGED — PR #12 (`dfcb723`) |
| [2](./sprint-2.md) | Return to the domain after payment + channel attribution | HIGH (payment backend + Cloud Run) | ✅ MERGED — FE #13 + BE #3 |
| [3](./sprint-3.md) | Emails with the tenant domain + channel badge on orders | HIGH (email/money) | ✅ MERGED — PR #14 (`a99b4bd`) |

## Status

✅ **EPIC COMPLETE — 2026-06-05.** S1 (#12 `dfcb723`) + S2 (FE #13 + BE #3) + S3 (#14 `a99b4bd`)
**in prod**. Buying from a custom domain works end-to-end (subject to Daniel's live smoke with a verified
domain). **Fast-follow in progress:** MercadoPago email parity (`feat/custom-domain-checkout-mp`).

## Reuse (don't rebuild)
- `lib/channel.ts` `detectChannel` — already distinguishes `custom_domain`.
- `lib/custom-domain.ts` `getActiveCustomDomain(slug)` — verified-only reverse lookup (good for the
  **anti-open-redirect guard**: never build a redirect/`success_url` from arbitrary input).
- The `mi_channel` cookie, the existing checkout, `lib/email.ts`.

## Cross-cutting risks
- **Open-redirect = the key security risk.** The `origin`/`redirect_url` that round-trips through the
  platform must be validated against the set of **verified** domains before use in any redirect or
  `success_url`. Requires a security review in the build.
- **The cart doesn't cross origins** (localStorage per origin) → the hop serializes the purchase via URL
  params (listingId/offerId), not the cart. **Bundles deferred.**
- **The backend has no per-branch preview** → S2/S3 are confirmed post-merge against prod + Daniel's smoke
  on a real domain. **There is NO custom_domain in the system today** (panuchas.com was cleaned up) → to
  test the real flow, Daniel verifies a test domain (or we seed a verified `marketplace_shops` row pointed
  at a domain that resolves to the app).

## Definition of Done (epic)
- [x] All 3 sprints' stories merged to `main` (smoke gaps declared → Daniel live).
- [x] Each `sprint-N.md` with stories ✅ + commit refs.
- [x] `RETROSPECTIVE.md` written.
- [x] Product poster updated (`Roadmap/README.md`).
- [x] Team memory updated.
- [x] Branches deleted after the merges.
- Fast-follow open (outside the epic DoD): MercadoPago email parity.

## Notes
- Frontend in `apps/miyagisanchez`; backend in `apps/backend` (S2). The backend deploys via **regional
  Cloud Build us-east4** (~12 min); the frontend via Vercel on merge to `main`.
- Strings in **es-MX**. Work in an **isolated worktree**.
- Each sprint is independently shippable: S1 already fixes "can't buy" (returns to the platform success
  page); S2 returns to the domain; S3 brands the emails.
