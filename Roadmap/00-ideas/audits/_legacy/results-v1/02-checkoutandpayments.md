**Current Flow Map**
Frontend checkout lives mainly in [CheckoutExperience.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/checkout/CheckoutExperience.tsx:99), [CheckoutPayButton.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/CheckoutPayButton.tsx:69), and [lib/cart.ts](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/lib/cart.ts:140). It fetches Medusa checkout options, preselects delivery/payment defaults, collects delivery details, then starts checkout.

Backend payment availability is centralized in [payment-methods.ts](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/_utils/payment-methods.ts:1) and exposed through [checkout-options/route.ts](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/sellers/[slug]/checkout-options/route.ts:162). Stripe/MercadoPago are instant/protected rails; SPEI, DiMo, and cash collapse into one manual “Pago directo” method.

Manual checkout creates an order immediately with `payment_received: false` and a snapshot of seller payment instructions in [start-checkout/route.ts](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/carts/[id]/start-checkout/route.ts:341). The buyer then lands on [OrderTrackingClient.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/account/orders/[id]/OrderTrackingClient.tsx:371), and the seller confirms receipt from [OrderDetail.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/orders/[id]/OrderDetail.tsx:801).

**High-Friction UX Findings**
1. The manual-payment lifecycle is not durable enough. Buyer “Ya hice el pago” only sets local button state and sends Telegram via [report-payment/route.ts](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/api/orders/[id]/report-payment/route.ts:21); it does not persist `buyer_reported_paid`. On reload, both buyer and seller lose that middle state.

2. Seller next action is ambiguous. The inbox marks `pending_payment` as urgent, but the footer says “Listo para enviar” unless status is `paid` [OrdersInbox.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/orders/OrdersInbox.tsx:144). That tells sellers to ship before payment is confirmed.

3. Seller detail allows shipping before manual payment confirmation. The shipping block renders before the manual confirmation block and is not gated by payment state [OrderDetail.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/orders/[id]/OrderDetail.tsx:789). This is a major error-prevention issue.

4. Manual payment creates a trust cliff. Checkout says “Verás las instrucciones de pago al confirmar tu pedido” [CheckoutExperience.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/checkout/CheckoutExperience.tsx:536). Structurally, the buyer commits before seeing CLABE/DiMo/cash details.

5. Discounted totals can conflict. Checkout summary applies coupon discount, but the payment CTA calculates `amountCents + shipping` and ignores coupon discount [CheckoutPayButton.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/CheckoutPayButton.tsx:66). That is a trust hit at the highest-intent moment.

6. Online success is too certain during async lag. `/payment/success` tries to complete the cart, but if completion returns null, it still renders a success UI without an order-specific recovery path [payment/success/page.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/payment/success/page.tsx:88).

7. Deterministic input is partially good but incomplete. CP lookup and colonia selection are strong, but pickup scheduling is only an external link, not a selected/reserved slot. This conflicts with the desired “ready to approve or edit” flow.

**Prioritized Action Plan**
1. Clean or isolate the dirty worktrees, then create `feature/checkout-ux-audit` from `main` in both repos before edits.

2. Define a shared structural status model for manual payments:
`pending_payment -> buyer_reported_paid -> payment_confirmed -> processing`.
Use it to drive both buyer and seller surfaces.

3. Make “who acts next?” explicit everywhere:
buyer: “Paga ahora” / “Avisaste, vendedor verifica” / “Pago confirmado”.
seller: “Esperando pago” / “Verifica pago reportado” / “Prepara entrega”.

4. Gate seller shipping/fulfillment actions until manual payment is confirmed.

5. Move manual payment preview into checkout before order placement: show available SPEI/DiMo/cash options, preselect the recommended method, and let the buyer edit rather than start from blank choice.

6. Add deterministic pickup scheduling structure: preselect first available pickup spot, expose structured time windows where configured, and avoid open-ended “coordina por mensaje” unless no structured schedule exists.

7. Align summary and CTA totals from one computed source, including coupons, bundle discounts, and shipping.

8. Add async payment recovery states for Stripe/MercadoPago success: “Estamos confirmando tu pedido,” retry/check status, and a stable path to `/account/orders` once the order exists.

9. Mobile pass: convert checkout into a clear vertical task sequence with a sticky final review/action area and disabled-state explanations.