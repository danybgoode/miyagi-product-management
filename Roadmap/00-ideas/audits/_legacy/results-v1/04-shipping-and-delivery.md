**Shipping & Delivery UX Audit**

Read-only audit completed. I did not create branches, modify files, or write specs.

**Executive Read**

The platform has a strong foundation: CP lookup exists, Envía quoting is centralized, manual payment is consolidated, seller settings expose pickup/live shipping, and post-purchase emails distinguish carrier, pickup, coordinated, and manual-payment flows.

The main UX risk is not absence of features. It is state mismatch: several flows say “CP-first,” “arranged delivery,” or “delivery-aware payment rules,” but the live product experience only partially expresses those concepts at the moment users need them.

**Critical Findings**

1. Buyer address capture is not truly CP-first on mobile.  
The CP lookup itself is good: digits are normalized, `inputMode="numeric"` is used, and Estado/Municipio/Colonia are derived after lookup in [CheckoutExperience.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/checkout/CheckoutExperience.tsx:234). But the visible form asks for receiver name and phone before CP in [CheckoutExperience.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/checkout/CheckoutExperience.tsx:382). For Mexico, that increases avoidable cognitive load because the user starts with personal/contact data before the system has reduced the address task.

2. Shipping quote failure gives explanation but weak recovery.  
Checkout shows loading skeletons and quote errors, which is good. But when Envía fails, the copy says the buyer can coordinate with the seller in [CheckoutExperience.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/checkout/CheckoutExperience.tsx:457), while checkout may not actually expose a coordinated delivery choice. This creates a UX dead-end disguised as a fallback.

3. No explicit timeout resilience around Envía quote calls.  
Backend carrier requests use `Promise.allSettled`, so partial carrier failure is handled well in [envia-client.ts](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/modules/fulfillment-envia/envia-client.ts:144). But there is no product-level timeout around Envía fetches before the UI waits in “Cotizando...”. On mobile networks, this can become a trust-eroding indefinite wait.

4. “Arranged-only” architecture has drifted.  
The roadmap says arranged delivery is supported, but checkout-options currently sets `onlyCoordinated = false` and explicitly removes the coordinate-after-purchase fallback for products in [checkout-options/route.ts](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/sellers/[slug]/checkout-options/route.ts:155). Older coordinated delivery states and emails still exist. The result is conceptual ambiguity: are sellers allowed to publish arranged-only, or must every physical product have pickup/shipping?

5. Payment guardrails explain method type, not delivery causality.  
Manual payment is labeled “Acuerdo directo,” and protected rails are labeled “Protegido por Miyagi” in [CheckoutExperience.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/checkout/CheckoutExperience.tsx:521). That helps, but the buyer is not clearly told “this payment method is available/unavailable because you chose pickup/shipping/arranged delivery.” The rule is system-driven, but the explanation is payment-driven.

6. Manual payment creates a commitment-before-instructions moment.  
Checkout says the buyer will see payment instructions after confirming in [CheckoutExperience.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/checkout/CheckoutExperience.tsx:541). That is high friction: buyers commit to an order before seeing CLABE/DiMo/cash details. This is especially sensitive when delivery and payment are coupled.

7. Final CTA can conflict with summary total.  
The payment button calculates `amountCents + shipping` in [CheckoutPayButton.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/CheckoutPayButton.tsx:66), while checkout summary includes coupon discount. Even if backend charges correctly, a mismatched final visible total is a severe trust issue.

8. Seller onboarding discovers delivery readiness too late.  
The seller listing wizard says “Tu anuncio se publicará de inmediato” in [SellWizard.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/sell/SellWizard.tsx:1130), and product creation defaults to published in [seller-product-create.ts](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/_utils/seller-product-create.ts:138). Delivery/payment viability is much clearer in settings, but the listing creation path does not proactively require or explain it before publish.

**Strengths**

Seller settings have a much better CP-first model for origin address: CP is the entry point, numeric keyboard is used, and Estado/Ciudad/Colonia follow in [ShopSettings.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/settings/ShopSettings.tsx:2017). Buyer order detail also has differentiated timelines for pickup, arranged, digital/service, and carrier shipping in [OrderTrackingClient.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/account/orders/[id]/OrderTrackingClient.tsx:52). That is the right information architecture.

**Prioritized UX Recommendations**

1. Make buyer shipping address truly CP-first: CP, Estado/Municipio/Colonia, then street/number, then receiver/contact.

2. Add disabled-state reasons at the pay CTA: “Selecciona colonia,” “Elige tarifa,” “No pudimos cotizar envío,” or “Este método requiere pago directo.”

3. Decide the product policy for arranged-only delivery and make it consistent across roadmap, checkout options, seller publish gates, order status, and emails.

4. Preview manual payment details before order confirmation. Buyers should see at least masked/structured SPEI/DiMo/cash availability before committing.

5. Add resilient quote recovery: retry, change CP, choose pickup if available, or contact seller. Do not promise “coordina” unless that path is actually selectable.

6. Add an explicit quote timeout state for mobile networks: “Está tardando más de lo normal” with recovery choices.

7. Align summary and final CTA totals from one source of truth, including discounts and shipping.

8. Move seller delivery/payment readiness into listing creation: before publish, show “Tu tienda acepta: pickup / live shipping / SPEI / MP / Stripe” and block or route to setup before the success state.

9. Make order lists delivery-aware, not just order-detail pages. Pickup/coordinated orders should not be framed with generic package/shipping progress language.

Bottom line: the system has the right primitives. The next UX architecture pass should focus on making state causality visible: why this address step appears, why this payment method is available, why this delivery path needs manual coordination, and who acts next.