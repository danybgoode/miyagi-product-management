# 04 · Shipping & Delivery

**For buyers and sellers.** Getting the item from seller to buyer — by carrier, hand-off, or pickup.

Built around Mexican shipping realities: postal-code-first addresses, local carriers, and the common "let's just arrange it" or "pick it up" cases.

## Current features
- ✅ **Live shipping quotes & labels** via Envía (Estafeta active)
- ✅ **Mexico-tuned address capture** — CP-first, alcaldía/colonia, street + number
- ✅ **"Entrega acordada"** (arranged delivery) option
- ✅ **Pickup** option
- ✅ **Delivery-aware rules** — arranged-only listings steer checkout to manual payment (server-enforced,
  not just UI copy); sellers need a manual payment method to publish arranged-only listings. Service and
  rental listings enforce this unconditionally, live; a plain product opting into `delivery_mode=arranged`
  is built + agent-visible but stays behind a kill-switch pending a live money smoke — see
  [Arranged-only delivery](arranged-only-delivery/)
- ✅ **Delivery emails** tailored to coordinated vs pickup orders, for both sides

## Backlog / ideas
- 📋 More carriers (seller activates in the Envía dashboard)
- 📋 In-app tracking timeline

> Epics and sprint/story breakdowns are added here as work in this domain is planned.
