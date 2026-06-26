# COPY-BRIEF — Seller landing launch polish (verbatim strings)

**Status: ✅ approved by Daniel 2026-06-26.** Source of truth for Sprint 1 (copy) and the copy that
Sprint 2 lays out. All keys under `apps/miyagisanchez/locales/es.json → sellerAcquisition` unless noted.
Voice rules from the v2 brief still apply (tú · full accents · "0% comisión de plataforma" · no
distrust · no internal jargon · brand names intact). Mirror new keys into `en.json` for type-parity.

---

## §A. Voice fixes

**"mercado" → "marketplace" (our word only):**
- `anchor.heroLead`: "Abre tu tienda en minutos: súbete al **marketplace** o vende en tu propio
  dominio. Tu IA puede armarla por ti, y tu dinero llega directo a tu cuenta."

**Bare "Miyagi" → `miyagisanchez.com` / "el marketplace":**
- `shared.faqs[0].body`: "Sí. **miyagisanchez.com** cobra 0% de comisión de plataforma por tus ventas.
  Solo pagas la comisión de tu procesador de pago (Stripe, MercadoPago), igual que en cualquier lado —
  y ese dinero llega directo a tu cuenta, no a una bolsa nuestra."
- `aiChannel.body`: "…Tu tienda en **miyagisanchez.com** habla ese idioma: está construida sobre
  UCP/MCP…" *(rest unchanged)*
- `aiChannel.steps[1].title`: "**miyagisanchez.com** lo expone para agentes."
- `creadores.proofLead`: "Usa tus canales de siempre para vender mejor: los DM para platicar, **el
  marketplace** para ordenar catálogo, cobro y links."
- `creadores.proofPoints[1].body`: "Deja de perder margen en cada venta. **miyagisanchez.com** no toma
  un porcentaje de tu pedido."
- `negocios.heroLead`: "…comparte tu tienda con link, QR, subdominio o dominio propio.
  **miyagisanchez.com** también puede llevarte a la edición impresa México-86."
- `negocios.proofLead`: "**El marketplace** se adapta a como ya trabajas: inventario, pagos directos,
  catálogo por QR y presencia impresa cuando te convenga."
- `servicios.heroLead`: "…paquetes por cita. **miyagisanchez.com** te da link, tienda, agenda y cobro
  directo sin quitarte un porcentaje."
- `mundial.proofPoints[1].body`: "**miyagisanchez.com** no cobra comisión de plataforma. Tu margen se
  queda contigo."
- *(`anchor.socialBody` and `negocios.socialBody` "Miyagi" instances disappear with the social-block
  replacement — see §F.)*

---

## §B. Hero strings

**New `shared.heroTrustLine`** (replaces the old hero `trustLine` band + the hero `agentTitle/agentBody`
aside — one line for all pages):
> **Compruébalo tú mismo: copia el prompt y pídele a Claude, Gemini o ChatGPT que evalúe
> miyagisanchez.com y te diga si te conviene.**

**Hero value list.** Anchor — new `anchor.heroValues` (replaces `anchor.heroStats`):
1. value **"0%"** · label **"comisión de plataforma"** · icon `iconoir-percentage`
2. value **"IA"** · label **"vende en Claude, Gemini y ChatGPT"** · icon `iconoir-sparks`
3. value **"Premium"** · label **"funciones premium incluidas: boletos, sorteos, agenda y más"** ·
   icon `iconoir-star`

> Persona pages keep their existing `heroStats` (IG/QR/Cal.com etc. — still relevant); they only adopt
> the new hero structure + PromptBlock + `heroTrustLine`, no eyebrow.

**Tightened persona `heroLead`s** (precision pass, §I):
- `anchor.heroLead`: (see §A — already tight)
- `creadores.heroLead`: "Trae tu catálogo de Instagram en minutos. Tu tienda, tu dominio, 0% de
  comisión y tu dinero directo a tu cuenta."
- `negocios.heroLead`: "Sube tu inventario en minutos, cobra directo y comparte tu tienda por link,
  QR, subdominio o dominio. **miyagisanchez.com** también te lleva a la revista impresa México-86."
- `servicios.heroLead`: "Publica consultas, clases, belleza, oficios o paquetes por cita.
  **miyagisanchez.com** te da link, tienda, agenda y cobro directo, sin quitarte un porcentaje."
- `mundial.heroLead`: "Publica tus tours, rincones de comida y rentas al instante, sin comisiones."
  *(2nd sentence removed — §G)*

---

## §C. Eyebrows — remove (set empty / stop rendering)
`anchor.eyebrow`, `creadores.eyebrow`, `negocios.eyebrow`, `servicios.eyebrow`, `mundial.eyebrow`,
`aiChannel.eyebrow`, and every `*.routerCards[].eyebrow`.

---

## §D. "Cómo funciona" aside — `shared.selfCheck`
- `shared.selfCheck.title`: **"Compruébalo tú mismo"**
- `shared.selfCheck.body`: **"Copia el prompt y pégalo en tu IA para que evalúe la oferta por ti."**
- (Sprint 2 renders the `PromptBlock` directly under this; the old "No tienes que creernos…" body is gone.)

---

## §E. AI-channel — trim
- **Remove `aiChannel.note`** entirely.
- `aiChannel.eyebrow`: removed (§C).
- `aiChannel.title`: **"Que la IA también venda por ti"** *(unchanged)*
- `aiChannel.body`: "Cada vez más gente le pide a su asistente de IA que le busque y le compre cosas.
  Tu tienda en miyagisanchez.com habla ese idioma: está construida sobre UCP/MCP, el estándar abierto
  de comercio para agentes (respaldado por Google, Stripe, Shopify, Visa y más). Claude, Gemini,
  ChatGPT y otros agentes pueden encontrar tu catálogo, recomendarlo y comprar — un canal que la
  mayoría de las plataformas todavía no tiene."
- `aiChannel.steps` unchanged except step 2 title (§A): "Publicas tu catálogo normal." ·
  "miyagisanchez.com lo expone para agentes." · "Un agente lo descubre y compra."

---

## §F. Anchor social block → premium-features grid
**Remove** `anchor.socialTitle` + `anchor.socialBody` + `anchor.socialStats`. **Add**
`anchor.premiumFeatures`:
- `title`: **"Todo esto ya viene incluido"**
- `lead`: **"Funciones que en otras plataformas pagas aparte — aquí son parte del marketplace."**
- `items[]` (icon · label · sub):
  1. `iconoir-ticket` · **Boletos y eventos** · "Vende admisiones y maneja tu evento."
  2. `iconoir-gift` · **Sorteos** · "Campañas de sorteo para crecer tu audiencia."
  3. `iconoir-calendar` · **Agenda y citas** · "Reserva con Cal.com para servicios y experiencias."
  4. `iconoir-refresh` · **Suscripciones y contenido** · "Cobra recurrente y vende contenido propio."
  5. `iconoir-pricetag` · **Cupones y promociones** · "Descuentos y códigos para tus campañas."
  6. `iconoir-globe` · **Tu dominio, subdominio o widget** · "Tu marca en cualquier canal."

---

## §G. `/vende/mundial`
- `heroLead`: **"Publica tus tours, rincones de comida y rentas al instante, sin comisiones."** *(drop
  "Entra antes de que la demanda llegue a CDMX, Guadalajara y Monterrey.")*
- `proofLead`: **"Vende en el marketplace: publicación, cobro, agenda y agentes, listos para usar."**
- `closingTitle`: **"Súbete a la ola del Mundial."** *(`closingBody` unchanged.)*

---

## §H. Benchmark worked example — `anchor.benchmark.example`
- `title`: **"Ejemplo: vendes un producto de $1,000 MXN"**
- `lead`: **"Cuánto te llega, según dónde vendas."**
- `rows`:
  | Plataforma | Comisión de plataforma | Mensualidad | Te llega (aprox.) |
  |---|---|---|---|
  | **miyagisanchez.com** | $0 | $0 | **~$1,000**¹ |
  | **Mercado Libre** | ~$130 (≈13%)² | $0 | **~$870** |
  | **Shopify** | $0 por venta³ | ~$390–790/mes⁴ | **~$1,000 − tu mensualidad**¹ |
- `punchline`: **"En una venta de $1,000 te quedas con ~$130 más que en Mercado Libre — y sin pagar
  mensualidad como en Shopify."**
- `footnotes`:
  1. Menos la comisión de tu procesador de pago (Stripe, MercadoPago ≈3.5% + $3), **igual en cualquier
     plataforma** y directo a tu cuenta.
  2. Comisión Clásica promedio; varía por categoría (≈8–16%). Productos de bajo precio pagan un cargo
     fijo extra.
  3. Con Shopify Payments; +2% si usas otra pasarela.
  4. Plan Basic ≈$19–39 USD/mes + IVA — lo pagues o no, con o sin ventas.
- Reuse the existing benchmark **"Verificado: 25 de junio de 2026"** stamp + "pídele a tu IA que
  confirme los números." **Re-verify ML band + Shopify base at publish.**

---

## §I. Precision pass (apply, keep meaning)
Trim hedge words; one idea per line; prefer icon + short label over a sentence. Touch the longer proof
bodies and social copy. Don't alter brand names, the prompt, or the benchmark numbers. Keep the feel:
*"pon a tu IA a configurarte en el marketplace, sin fricción."*

## Approval
- [x] Daniel approved (2026-06-26) → Sprint 1 implements §A–I verbatim; Sprint 2 lays out the hero/sections.
