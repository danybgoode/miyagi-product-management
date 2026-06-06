# Sprint 2 — Return to the domain after payment + channel attribution

Goal: a purchase started on a custom domain **returns** to the domain on completion, and the sale is tagged
`custom_domain` end-to-end. Touches the payment backend.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **🚧 CODE COMPLETE — 2 PRs open:
backend `medusa-bonsai-backend#3` (`7c9e32b`) + frontend `miyagisanchezcommerce#13` (`d88e613`).
Gate: tsc + build GREEN in both repos; frontend CI GREEN. HIGH risk → Daniel merges.
US-3 = data only (the visible badge moved to S3). Pending: Daniel's live smoke with a verified domain
(not testable on preview: Supabase stubbed + backend has no preview).**

Risk: **HIGH** — touches the live payment flow + backend deploy (Cloud Run us-east4, ~12 min). Daniel
merges. **Mandatory security review (open-redirect).**

> Chosen secure architecture: the backend ONLY stores `origin_domain`+`channel` in metadata (it doesn't
> build a redirect). The platform's success page redirects to the domain **only** if it's a **verified**
> domain (`isVerifiedCustomDomain`, anti-open-redirect guard) and only from the platform (`onChannel` check
> avoids a loop; `completeMedusaCart` is idempotent).

Main files (what was actually built):
- **Backend** `src/api/store/carts/[id]/start-checkout/route.ts` — accept + sanitize `origin_domain`; store
  `origin_domain` + `channel: 'custom_domain'` in the cart's metadata (→ order). **Stores only; doesn't
  build a redirect.** (PR `medusa-bonsai-backend#3`.)
- `app/checkout/page.tsx` — reads `origin`, keeps it through the sign-in redirect, passes it to
  `CheckoutExperience`.
- `app/checkout/CheckoutExperience.tsx` + `app/components/CheckoutPayButton.tsx` + `lib/cart.ts` — thread
  `originDomain` down to the `start-checkout` body.
- `lib/custom-domain.ts` — **new** `isVerifiedCustomDomain(domain)` (anti-open-redirect guard).
- `app/payment/success/page.tsx` — validates and redirects to the verified domain; white render on the domain.

---

## US-2 — Return to the domain after purchase ✅ · Risk: HIGH
**As** a buyer who started on a custom domain, **I want** to return to that domain after paying, **so that**
I don't end up confused on the platform.
- [x] The frontend passes `origin` (URL) → `CheckoutExperience` → `CheckoutPayButton` → `startCheckout` →
      backend, which stores it in the cart→order metadata. The sign-in redirect keeps `origin`.
- [x] The **platform** success page redirects to `https://<domain>/payment/success` when the order is
      `custom_domain` **and** the domain is **verified** (`isVerifiedCustomDomain` = anti-open-redirect
      guard). The `onChannel` check avoids a loop; `completeMedusaCart` is idempotent. (Safer architecture
      than planned: the backend does NOT build the redirect, it only stores data.)

**Acceptance:** buying from `myshop.mx` → after paying, landing on `myshop.mx/payment/success`.

---

## US-3 — Channel tagged end-to-end 🚧 (data ✅ · badge → S3) · Risk: HIGH
**As** a seller, **I want** to see where each sale came from, **so that** I can measure the custom-domain
channel.
- [x] `channel: custom_domain` + `origin_domain` stored in the cart→order metadata (backend).
- [ ] **(→ S3)** The sale appears as `custom_domain` in the seller's orders view — the visible badge needs
      the webhook/order-mirror plumbing in Supabase, which S3 already touches for emails.

**Acceptance (data):** a custom-domain order is tagged `custom_domain` in its metadata.

---

## Sprint smoke
- `tsc` + `build` + Playwright green. Spec: `start-checkout` **rejects** an `origin_domain` that isn't the
  seller's verified domain (open-redirect guard).
- Backend has no preview → prod smoke post-merge (route probe + curl).
- Daniel: the full flow on a real domain (buy → payment on the platform → return to the domain).
- **Security review** of the `origin`/`redirect_url` round-trip.
