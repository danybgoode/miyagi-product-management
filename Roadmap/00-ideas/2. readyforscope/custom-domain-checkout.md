# Idea / épico futuro — Checkout en el dominio propio ("Own-Domain Checkout")

> **PROMOVIDO A ÉPICO (2026-06-05).** Alcance aprobado (salto pragmático a la plataforma). Docs
> activos en `Roadmap/07-agentic-and-federated-commerce/custom-domain-checkout/`. El build es un visto
> bueno aparte (riesgo ALTO). Este doc queda como referencia de origen.

**Macro-sección:** 07 · Comercio agéntico y federado
**Origen:** spin-off del épico [own-shop-experience](../../07-agentic-and-federated-commerce/own-shop-experience/)
(cerrado en S1+S2 el 2026-06-05; este alcance era su Sprint 3, descopado por requerir backend + decisiones de auth).

## Por qué (el hueco real)

Tras el épico own-shop-experience, la **navegación** en un dominio propio (`mitienda.mx`) es 100%
marca blanca: portada, páginas de producto, carrito. **Pero el comprador no puede comprar.** Al tocar
"comprar" → `/checkout` (pasa de largo en el dominio) → requiere sesión → redirige a `/sign-in` **en el
dominio propio** → Clerk es **sólo del dominio de plataforma** (los dominios satélite se difirieron), así
que el inicio de sesión no funciona ahí. El checkout desde un dominio propio está, en la práctica, roto.

La decisión de alcance del épico anterior fue **"checkout pragmático"**: en el momento de
sesión/pago, llevar al comprador al flujo seguro de la **plataforma** (etiquetado por canal) y
**regresarlo** al dominio. Esa decisión se tomó, pero el "salto" nunca se construyó.

## Alcance (cuando se priorice)

1. **El salto pragmático de checkout (lo crítico).** Desde un dominio propio, el botón de compra lleva
   al comprador a `miyagisanchez.com` para auth + pago, conservando: la tienda/dominio de origen y el
   producto. Tras el éxito, **regresa** al dominio propio.
2. **Propagación de canal/origen por el flujo NUEVO de Medusa (backend).** Hoy el metadata de la sesión
   de Stripe del flujo principal (`handleMedusaCheckoutComplete`) **no** lleva `channel`; sólo lo hacen
   las rutas legadas (`app/api/stripe/checkout`, `app/api/mp/checkout`). Hay que setear `channel` +
   dominio de origen en el `start-checkout` del backend (Cloud Run) y en el `success_url`.
3. **US-7 — Regreso de checkout al dominio.** La página de éxito y los enlaces post-compra resuelven en
   el host del inquilino; el canal queda etiquetado `custom_domain` de punta a punta.
4. **US-8 — Emails con el dominio del inquilino (AC 2.3).** Cuando un pedido nace en canal
   `custom_domain`, el header/footer de marca y los enlaces "volver a la tienda" usan el dominio del
   inquilino (en `lib/email.ts`, hoy `SITE = 'https://miyagisanchez.com'` fijo). Nota: los enlaces
   con auth (estado del pedido / cuenta) siguen en la plataforma mientras Clerk sea sólo de plataforma.

## Alternativa más ambiciosa (decisión de Daniel)

- **Dominios satélite de Clerk** → auth + cuenta + checkout 100% nativos en `mitienda.mx`
  (AC 2.1/2.2 completos). Costo: registro/SSL/config por dominio + cambios de auth de ALTO riesgo.
  El épico anterior lo difirió a propósito.

## Riesgo

**ALTO** — toca pago en vivo (webhooks + start-checkout backend), auth, y emails transaccionales.
Mergea Daniel. Despliegue de backend = Cloud Build regional us-east4 (~12 min).

## Referencias
- Retrospectiva del épico origen y gotchas: `own-shop-experience/RETROSPECTIVE.md`.
- Detección de canal existente: `lib/channel.ts` (`detectChannel`, ya distingue `custom_domain`).
- Lookup de dominio vivo: `lib/custom-domain.ts` (`getActiveCustomDomain`, ya existe).
