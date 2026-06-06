# Sprint 3 — Transactional emails with the tenant domain

Goal: when an order originates on the `custom_domain` channel, the buyer's emails carry the brand and the
"back to the shop" link of the **tenant's domain**, not `miyagisanchez.com`.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **🚧 CODE COMPLETE — PR `miyagisanchezcommerce#14`
(`570ff47`), CI GREEN (tsc + build + Playwright). HIGH risk → Daniel merges. Pending: Daniel's live smoke
(real email + badge on a custom-domain order).**

Risk: **HIGH** — email/money-adjacent. Daniel merges.

> Scope: the new **Stripe** flow + the order mirror. **MercadoPago parity** (its webhook has two flows + two
> complete helpers) = a noted **fast-follow**, so as not to destabilize that path here. The branding uses
> `isVerifiedCustomDomain` (same guard as S2); auth links stay on the platform. The "Own domain" badge was
> folded back in here (it came deferred from S2).

Main files (what was actually built):
- `lib/email.ts` — `html()`/`send()` accept an optional `brand` + `brandFor(storeDomain)`; the 3 buyer
  order-email functions (confirmed/coordinated/pickup) accept `storeDomain`. Default = `miyagisanchez.com`
  (unchanged).
- `app/api/webhooks/stripe/route.ts` — `completeMedusaCart` now returns the order metadata; resolves the
  **verified** domain (`isVerifiedCustomDomain`) and passes `storeDomain` + `listingUrl` to the domain;
  passes `channel` to the mirror. **(MercadoPago = fast-follow, not in this PR.)**
- `lib/order-mirror.ts` — new `channel` field in the mirror metadata.
- `app/shop/manage/orders/[id]/OrderDetail.tsx` — "Own domain" badge (US-3b).

---

## US-4 — Buyer emails branded to the domain ✅ · Risk: HIGH
**As** a buyer on a custom domain, **I want** the confirmation email to carry the shop's brand and link on
its domain, **so that** I keep trusting it.
- [x] The order webhooks resolve `channel`+`origin` → the seller's verified domain → pass `storeUrl` to the
      buyer email functions.
- [x] Brand header/footer + "back to the shop" use the tenant's domain.
- [x] Auth links (order status / account) **stay on the platform** (documented pragmatic split, while Clerk
      is platform-only).
- [x] Default (marketplace orders) unchanged.

**Acceptance:** a custom-domain order's email carries the brand + link to the tenant's domain; a marketplace
order stays the same.

---

## Sprint smoke
- `tsc` + `build` + Playwright green (CI). **Not testable on preview**: the webhook is signed by Stripe and
  Supabase is stubbed on previews (`isVerifiedCustomDomain` always false) → no new spec (same as S2); the
  verification is types/build + live smoke.
- Daniel: a real purchase from a verified domain → email inspection (wordmark/footer + product link =
  domain; order status = platform) + "Own domain" badge in the seller's view.

---

> On closing this sprint: epic COMPLETE → `RETROSPECTIVE.md`, update the poster `Roadmap/README.md`, team
> memory, delete the branch.
