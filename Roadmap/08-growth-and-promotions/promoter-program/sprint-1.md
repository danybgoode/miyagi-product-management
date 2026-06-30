# Promoter Program — Sprint 1: Promoter spine (code + discount + attribution)

**Status:** 🏗️ BUILT — gate green (tsc + build + pure Playwright); draft PR open, awaiting
CI-vs-preview + Daniel's browser discount-preview smoke. Behind `promoter.enabled` (off).

| Story | Status | Commit |
|---|---|---|
| US-1 — Promoter code + shareable link | ✅ | `2e282b3` |
| US-2 — Code unlocks seller discount at SKU checkout (preview) | ✅ | `a9e0097` |
| US-3 — Enrollment + sale attribution to promoter | ✅ | `c884c17` |
| api spec (`e2e/promoter-program.spec.ts`) | ✅ | `cf898a0` |

**Scope calls (Daniel-approved):** discount is **preview-only / frontend-first** (no Medusa
coupon mint or Stripe attach in S1 — that's the real charge in S2); the discount amount is a
**single admin-set value** in a `marketplace_promoter_settings` singleton.

**What shipped (reuse of the referral spine, distinct `PRM-` namespace):**
- `supabase/migrations/20260629120000_promoter.sql` — `marketplace_promoters` /
  `marketplace_promoter_attributions` (partial-unique idempotency guard) / `_settings` singleton.
  **Hand-run in the Supabase SQL editor before flipping the flag on** (lib degrades until then).
- `lib/promoter.ts` — pure code-gen + discount math + resolution + es-MX copy, plus the Supabase
  data functions (next-free, unit-tested). `lib/flags.ts` — `promoter.enabled` (enablement, default off).
- Admin console `/admin/promoter` (Clerk-gated) — provision promoters, set the discount, view a
  per-promoter attribution ledger. `app/api/admin/promoter[/attributions]`.
- `app/api/promoter/validate-code` (discount preview) + `app/api/promoter/attribute` (enrollment) —
  both flag-gated (404 when off). `middleware.ts` captures `?promo=PRM-…` into a 30-day cookie.
- Seller-facing preview in the custom-domain `Canal` settings section (flag-gated, no charge).

> Goal: a promoter code enrolls a seller and applies a discount on a paid SKU — a **working thin loop**,
> end-to-end, before any new payment cadence or commission ledger exists. Behind `promoter.enabled` (off).

## Stories

### US-1 — Promoter code + shareable link
**As a** promoter, **I want** a unique code + shareable link, **so that** every shop I enroll attributes
to me. Reuse the referral-code mint (`lib/referrals.ts`) in a **promoter namespace** (distinct prefix/
table so promoter codes never collide with buyer referral codes). Promoters are **admin-provisioned** in
v1 (no self-serve signup). Code resolves to a promoter id.
**Acceptance:** an admin creates a promoter; the promoter has a stable code + link; resolving the code
returns the promoter. Unknown code → not-found, no crash.
**Risk:** low

### US-2 — Code unlocks seller discount at SKU checkout
**As an** enrolling seller, **I want** the promoter's code to apply a discount on the paid SKU at
checkout, **so that** the in-person pitch ("get this discount through me") is real. Reuse the platform-
coupon validation (`app/api/checkout/validate-coupon` + `mintPlatformCoupon`), scoped so a promoter code
maps to a discount on the paid SKUs (custom domain / printed ad). The discount amount is admin-set.
**Acceptance:** with the flag on, entering a valid promoter code at SKU checkout shows the discount
before pay; an expired/invalid code returns a clear message; the code is recorded against the order.
**Risk:** med (touches checkout discount path)

### US-3 — Enrollment + sale attribution to promoter
**As** admin, **I want** each enrollment + sale recorded against the promoter (who, which shop, which
SKU, amount), **so that** Sprint 3 can compute commission. Supabase attribution table keyed to the
Medusa order + seller (rule #2 — Medusa has no promoter concept). Capture: promoter id, seller id, SKU,
gross amount, cadence (once known), timestamp.
**Acceptance:** completing US-2 writes an attribution row; admin can list a promoter's attributed
enrollments + sales. Re-running checkout doesn't double-write.
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/promoter-program.spec.ts` (api project) — promoter code mint + lookup (US-1);
  `validate-coupon` returns the discount for a valid promoter code and rejects expired/unknown (US-2);
  attribution row written exactly once per paid+attributed order, fields correct (US-3).
- **browser smoke owed:** **yes, to Daniel** — enter a promoter code at a real SKU checkout and confirm
  the discount renders (no money moves yet at this step if using a $0/comp path; otherwise see S2).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge)

**Pre-req (one-time, owed to Daniel):** (a) run `supabase/migrations/20260629120000_promoter.sql`
in the Supabase SQL editor; (b) flip **`promoter.enabled` → ON** in Flagsmith. Until both are done
the seller-facing field stays hidden (fail-open off) and the admin lists are empty.

1. As an **admin**, open `/admin/promoter` → under "Nuevo promotor" type a name (e.g. "María — zona
   centro") and click **Crear promotor**.
   → A new row appears with a `PRM-XXXXXX` code, its share link, and a "Copiar liga" button.
2. On the same page, under "Descuento del promotor", set type **Monto fijo (MXN)** + amount **100**,
   check **Descuento de promotor activo**, click **Guardar descuento**.
   → "Descuento guardado." appears.
3. Copy the promoter's share link and open it in a private window (it is
   `https://miyagisanchez.com/vende?promo=PRM-XXXXXX`).
   → The page loads normally; the `promo` code is silently captured in a cookie (no visible change).
4. As a **test seller**, go to **Configuración → Canal propio** (the custom-domain section). In
   "¿Te atendió un promotor?" enter the `PRM-XXXXXX` code and click **Aplicar**.
   → **Before** the "Activar dominio propio" pay button you see:
     *"Descuento de promotor: −$100 · Pagarías $399"*.
   → Entering a wrong code shows *"Código de promotor no válido."* instead.  *(← the browser smoke)*
5. (attribution) Back in `/admin/promoter`, click **Atribuciones** on that promoter.
   → One row appears: `custom_domain` · the test shop id · status **enrolled**. Re-doing step 4 with
     the same shop does **not** add a second row (idempotent).

If any step fails, note the step number + what you saw — that's the bug report.
**Money/auth note (owed to Daniel):** step 4 only **previews** a discount in S1 — no money moves and
nothing is billed. The actual charge with the discount applied + the one-time cadence is **Sprint 2**,
so the live money-path smoke is owed there. Steps 1–2 + 4–5 need a real Clerk admin / seller session,
which an automated headless smoke can't hold.
