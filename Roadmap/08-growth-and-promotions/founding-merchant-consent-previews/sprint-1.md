# Founding merchant consent-safe previews — Sprint 1: Private means private

**Status:** ✅ Merged — FE #292 (`afcfc22`) + hardening FE #293 (`2bb91a0`) / BE #108 (`3d7751b`); flag OFF, smoke owed to Daniel

## Stories

### Story 1.1 — Private promoter-created publication state

**As a** Founding Merchant Partner, **I want** a new promoter-created shop and its products to remain private,
**so that** I can prepare proof without announcing the merchant.

**Acceptance:** `promoter.private_preview_enabled` exists disabled in every environment; with it ON, shop setup
and three products succeed but no marketplace/search/public-shop/PDP/agent/embed/sitemap/own-domain/subdomain
read exposes them; OFF preserves the prior route; claimed self-serve publication behavior is unchanged.

**Risk:** high — DB/publication/shared-channel contract; Daniel merges.

### Story 1.2 — Opaque revocable preview access

**As a** Founding Merchant Partner, **I want** a private revocable link that renders the proposed real shop,
**so that** only the merchant can review it before approval.

**Acceptance:** token is cryptographically opaque, scoped to one preview and expires/revokes; random visitors
cannot enumerate it; preview renders the proposed shop/products without platform admin controls; token never
grants ownership or checkout; revocation returns 404; access is rate-limited and auditable without storing token
plaintext.

**Risk:** high — public token/auth boundary and new consent-state migration; Daniel merges.

## Sprint QA

- **api specs:** extend `e2e/promoter-close.spec.ts`; add `e2e/promoter-private-preview.spec.ts` covering flag
  states, token isolation/revocation and the anonymous channel matrix.
- **observed red:** run the cross-channel privacy assertion against today's force-published route and record the
  leak before implementation.
- **browser smoke owed:** yes to Daniel for the authenticated promoter create flow and private-link mobile render;
  anonymous public leak sweep is agent-owned through `live-smoke`.
- **deterministic gate:** frontend `tsc` + build + Playwright API green; backend build/unit gate if touched.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Sign in as the disposable promoter and open https://miyagisanchez.com/promotor/cerrar.
   → The first step offers private preview setup while the enablement flag is ON.
2. Create the disposable shop and three products, then copy the generated private preview link.
   → The products render through that link and the page clearly says they are not public yet.
3. In a private window, search Miyagi and open the public `/s/<disposable-shop>` route.
   → The shop/products do not appear publicly.
4. Repeat the committed channel-sweep smoke for marketplace, PDP, agent/API, embed, sitemap, subdomain and
   custom-domain paths.
   → Every channel refuses or omits the private shop/products.
5. Open each shop **sub-page** directly on the marketplace host: `/s/<slug>/acerca`, `/faq`, `/politicas`,
   `/claim`, a collection `/s/<slug>/c/<any>`, and `/convocatoria`.
   → Every one returns not-found; none renders the merchant's name (check the browser tab title too).
5b. If the shop has a subdomain or custom domain, repeat on it: `<domain>/acerca`, `/faq`, `/politicas`,
   `/c/<any>`, `/convocatoria`. **These are served by different files** — middleware rewrites only `/` and
   `/convocatoria`, so every other path renders the channel-native page, not the `/s/<slug>/…` one.
   → Every one returns not-found, and the white-label header never shows the merchant's name or logo.
6. Load the embed widget for the shop — the iframe at `/embed/s/<slug>` and the resolver
   `GET /api/embed/shop?key=<the shop's embed key>` (this one is CORS-open to any origin).
   → The iframe 404s and the resolver returns `{ valid: false }`.
7. Revoke the preview link and reopen it.
   → It returns the ordinary not-found experience and reveals no shop data.

8. **The claim path** — claim the disposable shop through its WhatsApp link, then reopen `/s/<slug>`.
   → The storefront is reachable again (a claimed shop is never hidden), and its products are still **not**
   public — they remain drafts until the merchant publishes them or Sprint 2's activation runs. This step
   exists because an earlier revision permanently 404'd the shop here, with no recovery.

**Owed before the flag flip (not agent-verifiable):**
- Confirm the guard **fails open**: with `merchant_previews` absent or Supabase unreachable, a normal public
  shop must still render. The guard is **not** flag-gated (that would make privacy fail-open), so it runs on
  every public shop render — which is why the migration must land **with the deploy**, not after it.
- Confirm an **already-public** promoter shop is untouched: add a listing to one that already has live
  listings and verify it stays visible and the listing publishes (the anchor is refused for that population,
  per locked decision #4).

If any step fails, note the step number + URL — that's the bug report.
