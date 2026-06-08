**Selling & Shops Audit**
Read-only UX architecture audit completed. I did not modify files.

**High-Level Read**
The seller experience has a solid foundation: shop creation is decoupled from listing creation, existing sellers skip the shop step, coupons are reachable from the dashboard, and polymorphic listing support exists. The biggest UX risk is not onboarding. It is state clarity around money and fulfillment, especially manual payments.

**Critical Findings**
- **P0: Manual-payment orders are not foolproof enough.** `pending_payment`, `paid`, and `processing` are all treated as action-needed orders in the inbox, and a pending manual-payment order can read like it is “Listo para enviar” in [OrdersInbox.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/orders/OrdersInbox.tsx:80). On the detail screen, the shipping section appears before the “Confirmar pago recibido” section in [OrderDetail.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/orders/[id]/OrderDetail.tsx:789). This creates a real risk that a seller ships before verifying SPEI/cash/DiMo funds.

- **P0: The backend state model reinforces the UX risk.** Payment confirmation is explicitly separate in [confirm-payment route](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/sellers/me/orders/[id]/confirm-payment/route.ts:67), but seller shipping/status updates do not clearly gate against unpaid manual orders in [orders/[id]/route.ts](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/sellers/me/orders/[id]/route.ts:84) or [ship route](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/sellers/me/orders/[id]/ship/route.ts:84). From a UX architecture standpoint, “awaiting funds” must be a blocking state, not just a warning card.

- **P1: The decoupled onboarding works, but the abandoned-shop empty state is under-guided.** Shop creation is intentionally persisted before listing creation in [sell/shop route](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/api/sell/shop/route.ts:23), and the dashboard empty state does point to “Publicar primer anuncio” in [ManageDashboard.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/ManageDashboard.tsx:428). But the seller lands in a full dashboard with stats, many nav links, and print-edition promotion before a clear “finish your first listing” setup path.

- **P1: The listing builder adapts, but it still feels like one dense generic form.** Type selection, digital upload, subscription tiers, category attributes, stock, REPUVE, and price logic all live in one long step in [SellWizard.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/sell/SellWizard.tsx:726). The form supports many seller intents, but rentals and services lack deeper operational fields, subscriptions split plan/content management across different surfaces, and editing has weaker parity, including no photo replacement path in [EditForm.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/sell/edit/[id]/EditForm.tsx:130).

- **P1: Promotions are usable but campaign-light.** The coupon page supports create/list/activate/delete and usage counts in [PromotionsClient.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/promotions/PromotionsClient.tsx:131). However, sellers get raw code management rather than campaign guidance: no post-create share action, no “where this applies” reassurance, no revenue or conversion context, and no templates for common merchant goals.

- **P2: Referrals are structurally separated from seller retention.** The referral UI lives under account, not the shop console, in [account page](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/account/page.tsx:10) and [ReferralsClient.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/account/referrals/ReferralsClient.tsx:52). Since rewards are platform-owned print-ad credits, per [referrals.ts](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/lib/referrals.ts:4), sellers need stronger context to understand this is growth credit, not shop discount inventory.

**Prioritized UX Recommendations**
1. Make manual payments a hard, visible state machine: “Awaiting payment” before “Prepare shipment,” with shipping/delivery actions unavailable until payment is confirmed.
2. Add a first-run seller checklist after shop-only onboarding: publish first listing, configure payments, configure delivery, preview public shop.
3. Refactor listing creation into a type-first flow with tailored subflows for product, service, rental, digital, and subscription.
4. Recenter the dashboard around “Action required” and “Next best step” instead of flat link navigation.
5. Upgrade coupons from code CRUD to a promotions hub: templates, share/copy actions, scope preview, usage plus sales impact.
6. Bring referrals into a seller growth/retention hub or cross-link it clearly from the shop dashboard.
7. Normalize seller source-of-truth states so Medusa/Supabase mirror gaps never redirect a real seller back into onboarding.