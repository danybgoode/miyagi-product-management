# COPY-BRIEF — Seller-Acquisition Landing Pages (es-MX content overhaul)

**Sprint 1 deliverable · status: ✅ approved by Daniel 2026-06-25.** This is the locked source of truth for
Sprint 2. Every string below maps 1:1 to a key in `apps/miyagisanchez/locales/es.json → sellerAcquisition`
(except the two new blocks — `benchmark` and `aiChannel` — which add keys). All copy is **es-MX, fully
accented (á é í ó ú · ñ · ¿ ¡)**, written to a persona's job-to-be-done — **not** translated from English.

---

## 0. Voice & rules (apply to every string)
- **Tú**, never usted. Warm, direct, confident, Mexican. Short sentences. No corporate filler.
- **Always accents + ¿ ¡ + ñ.** Brand names stay as-is: Stripe, MercadoPago, SPEI, Shopify, Mercado
  Libre, Cal.com, WhatsApp, Claude, Gemini, ChatGPT.
- **Say "0% comisión de plataforma"** — never "sin costos" or "gratis total." The seller still pays
  their own payment-processor fee (Stripe/MercadoPago); we never take a cut of the sale.
- **No distrust framing.** Banished forever: *"No pedimos fe", "No nos creas"*. Replaced by the
  **invitation to self-verify**: *"Compruébalo tú mismo."*
- **No internal jargon to users.** Banished: *"vaporware", "conserva la atribución", "para medir qué
  mensaje convierte mejor".*
- **Proof over adjectives.** Every claim maps to a real capability.

---

## 1. The copy-paste prompt (the key CTA) — `shared.trustPrompt`

**Decision:** directive + **per-page URL** (the agent reads the most relevant page). One base prompt,
the URL swaps per page.

**Anchor (`/vende`) — `shared.trustPrompt`:**
> Hola, ¿puedes abrir https://miyagisanchez.com/vende, ver qué es y qué ofrece, y decirme si me
> conviene para mi negocio? Compara cuánto pagaría ahí contra Mercado Libre y Shopify, y dime qué
> podría vender y cómo empezar.

**Per-persona variants** (same text, swapped URL — set as each page's own `trustPrompt` override, or
build the URL from the route):
- creadores → `https://miyagisanchez.com/vende/creadores`
- negocios → `https://miyagisanchez.com/vende/negocios`
- servicios → `https://miyagisanchez.com/vende/servicios`
- mundial → `https://miyagisanchez.com/vende/mundial`

**Button labels (`shared.copyPrompt` / `shared.copiedPrompt`):**
- `copyPrompt`: **"Copiar prompt para mi IA"**
- `copiedPrompt`: **"¡Copiado! Pégalo en tu IA"**

> **Why this replaces `"que es miyagisanchez.com?"`:** the old string only asks "what is X" → the agent
> returns a generic definition. The directive prompt forces the three outcomes Daniel wants: a tailored
> "¿me conviene?" assessment, the ML/Shopify cost comparison, and a "qué vendo + cómo empiezo" answer.

---

## 2. Shared strings — `sellerAcquisition.shared`

### `faqTitle`
**"Dudas normales antes de vender"**

### `faqs`
1. **"¿De verdad es sin comisión?"** — "Sí. Miyagi cobra **0% de comisión de plataforma** por tus
   ventas. Solo pagas la comisión de tu procesador de pago (Stripe, MercadoPago), igual que en
   cualquier lado — y ese dinero llega directo a tu cuenta, no a una bolsa nuestra."
2. **"¿Entonces cómo ganan ustedes?"** — "Con anuncios en nuestra revista impresa y servicios premium
   opcionales. Nunca tomamos un porcentaje de tu venta."
3. **"¿Necesito saber de tecnología?"** — "No. Tu propia IA puede armar tu tienda a partir de tus
   fotos, tu Instagram o un archivo; tú solo revisas, publicas y vendes."
4. **"¿Cómo cobro?"** — "Directo a tu cuenta: tarjeta, MercadoPago, SPEI o efectivo, según lo que
   actives en tu tienda."
5. **"¿Y si no me convence?"** *(new — reinforces self-verify)* — "Pídele a tu propia IA que lea la
   página y compare la oferta con lo que pagas hoy. Si no te conviene, no la uses. Abrir tu tienda no
   cuesta ni te amarra a nada."

### `selfCheck` *(NEW shared block — replaces the per-page "No pedimos fe" `agentTitle`/`agentBody`)*
Used in the hero aside and the steps aside on every page.
- `selfCheck.title`: **"Compruébalo tú mismo"**
- `selfCheck.body`: **"No tienes que creernos. Pídele a tu asistente de IA que lea esta página,
  compare la oferta con lo que pagas hoy y te diga, en tus términos, si te conviene tu negocio."**

> Implementation note: today each page has its own `agentTitle`/`agentBody`. Either (a) repoint the
> renderer to `shared.selfCheck`, or (b) overwrite every page's `agentTitle`/`agentBody` with the
> strings above. (a) is cleaner and prevents future drift.

---

## 3. Anchor — `sellerAcquisition.anchor`

| Key | Final es-MX copy |
|---|---|
| `metadata.title` | Vende sin comisiones en México — Miyagi Sánchez |
| `metadata.description` | Abre tu tienda gratis en Miyagi Sánchez. Vende productos, servicios, experiencias o catálogos completos con 0% de comisión y cobro directo a tu cuenta. |
| `metadata.ogAlt` | Miyagi Sánchez: vende lo que sea en México con 0% de comisión. |
| `eyebrow` | Para vendedores en México |
| `heroTitle` | Vende lo que sea en México. 0% de comisión. |
| `heroLead` | Abre tu tienda en minutos: súbete al mercado o vende en tu propio dominio. Tu IA puede armarla por ti, y tu dinero llega directo a tu cuenta. |
| `trustLine` | Compruébalo tú mismo: pídele a Claude, Gemini o ChatGPT que evalúe miyagisanchez.com y te diga si te conviene. |
| `primaryCta` | Empieza gratis |
| `secondaryCta` | ¿Qué puedo vender? |
| `heroStats[0]` | **0%** · comisión de plataforma |
| `heroStats[1]` | **20 s** · para registrarte con Google |
| `heroStats[2]` | **4** · canales: link, subdominio, dominio o widget |
| `proofTitle` | Lo que ves es lo que ya puedes usar |
| `proofLead` | Publicar, cobrar directo, tener tu propia tienda y vender con ayuda de IA: todo está listo desde el primer día. |
| `proofPoints[0]` | **0% de comisión** — Te quedas con el 100% de tu venta. Tu dinero llega directo a Stripe, MercadoPago, SPEI o el método que acuerdes. |
| `proofPoints[1]` | **Lista en minutos** — Trae fotos, tu Instagram, texto o un archivo; tu IA lo convierte en una tienda lista para publicar. |
| `proofPoints[2]` | **Tu tienda, tu marca** — Usa un link gratis, un subdominio, tu propio dominio o un widget para tu sitio. |
| `proofPoints[3]` | **Hecha para la IA** — Claude, Gemini y ChatGPT pueden leer tu tienda, recomendarla y ayudarte a operarla. |
| `routerTitle` | ¿Qué tipo de vendedor eres? |
| `routerLead` | Elige el camino que más se parece a tu negocio y ve la propuesta hecha para ti. |
| `routerCards[0]` (creadores) | eyebrow: **Catálogos e Instagram** · title: **Soy creador o diseñador** · body: Piezas únicas, drops, diseño, moda, arte o productos que hoy vendes por DM. |
| `routerCards[1]` (mundial) | eyebrow: **Experiencias** · title: **Ofrezco experiencias o servicios** · body: Tours, rentas, comida, traslados, citas o servicios listos para el Mundial. |
| `routerCards[2]` (negocios) | eyebrow: **Negocio local** · title: **Tengo un negocio local** · body: Imprenta, taller, tienda física o inventario que quieres poner en línea. |
| `routerCards[3]` (servicios) | eyebrow: **Profesionales** · title: **Vendo servicios profesionales** · body: Consultas, sesiones, paquetes, mantenimiento o trabajo por cita. |
| `stepsTitle` | Cómo funciona |
| `steps[0]` | **Pregúntale a tu IA por nosotros** — O entra directo. La página está escrita para que un agente pueda evaluarla. |
| `steps[1]` | **Regístrate en segundos** — Entra con Google, crea tu tienda y elige cómo quieres que te encuentren. |
| `steps[2]` | **Sube tu catálogo** — Pega texto, importa un archivo o deja que tu agente lo organice por ti. |
| `agentTitle` → use `shared.selfCheck.title` | Compruébalo tú mismo |
| `agentBody` → use `shared.selfCheck.body` | No tienes que creernos. Pídele a tu asistente de IA que lea esta página, compare la oferta con lo que pagas hoy y te diga, en tus términos, si te conviene tu negocio. |
| `socialTitle` | Hecho para negocios reales, no para demos |
| `socialBody` | Miyagi ya maneja tiendas, productos, servicios, pagos directos, dominios, subdominios y widgets. La página solo te ordena el camino. |
| `socialStats[0]` | **0%** · comisión por venta |
| `socialStats[1]` | **MXN** · cobros pensados para México |
| `socialStats[2]` | **IA** · tu tienda, operable por agentes |
| `closingTitle` | Empieza gratis y déjalo si no te gusta. |
| `closingBody` | No hay contrato, no hay comisión escondida y no necesitas rehacer tu negocio. Sube tu primera oferta y pruébalo. |
| `closingCta` | Abrir mi tienda |
| `variants.b.heroTitle` | Abre tu tienda gratis en México. 0% de comisión. |
| `variants.b.primaryCta` | Crear tienda gratis |
| `variants.b.closingCta` | Empezar sin comisión |

---

## 4. Benchmark table — NEW block `sellerAcquisition.anchor.benchmark` (anchor only)

> Verified **2026-06-25**. Ranges, not cherry-picks. Re-confirm before publish.

- `benchmark.title`: **"Compara antes de decidir"**
- `benchmark.lead`: **"Lo que pagas en otras plataformas, aquí te lo quedas. Compáralo tú mismo — o
  pídeselo a tu IA."**
- `benchmark.columns`: **Miyagi Sánchez** · **Mercado Libre** · **Shopify**

| Fila (`rows[]`) | Miyagi Sánchez | Mercado Libre | Shopify |
|---|---|---|---|
| **Comisión por venta** | **0%** | ~8–16% (hasta ~20.5% en Premium), según categoría | 0% propio, pero +2% si no usas Shopify Payments |
| **Cuota mensual** | **$0** | $0 (cobran por venta) | desde ~$19–$39 USD/mes + IVA |
| **Procesamiento de pago** | El de tu pasarela, directo a tu cuenta | Incluido en la comisión; te depositan después | ~3.5% + $3 MXN por transacción |
| **¿Dónde llega tu dinero?** | **Directo a tu cuenta** (Stripe, MercadoPago, SPEI, efectivo) | Retenido y liberado por Mercado Libre | Vía Shopify Payments o tu pasarela |
| **Tienda y dominio propios** | Sí: link, subdominio, dominio o widget | No: vives dentro de Mercado Libre | Sí, con tu plan |
| **Vender servicios, rentas y experiencias** | Sí, nativo | Limitado | Con apps de terceros |
| **Vender a través de agentes de IA** | Sí, nativo (UCP/MCP) | No | Apenas emergente |
| **Hecho para México** | SPEI, MercadoPago, efectivo + revista impresa | Sí | Pasarelas, no local-first |

- `benchmark.footnote`: **"Comparación con las tarifas públicas de Mercado Libre y Shopify México,
  verificadas el 25 de junio de 2026. Las tarifas cambian: pídele a tu IA que confirme los números
  antes de decidir."**

**Persona one-line cost hooks** (no table on persona pages — insert into each hero or proof as a single
line):
- creadores: *"Lo que Shopify te cobra cada mes, aquí es $0."*
- negocios: *"Sin comisión por venta, a diferencia de Mercado Libre."*
- servicios: *"Cobras el 100% de tu servicio: 0% de comisión."*
- mundial: *"0% de comisión: cada peso del Mundial se queda contigo."*

---

## 5. AI-channel section — NEW block `sellerAcquisition.aiChannel` (anchor section + reusable proof point)

- `aiChannel.eyebrow`: **"Un canal que otros no tienen"**
- `aiChannel.title`: **"Que la IA también venda por ti"**
- `aiChannel.body`: **"Cada vez más gente le pide a su asistente de IA que le busque y le compre cosas.
  Tu tienda en Miyagi habla ese idioma: está construida sobre UCP/MCP, el estándar abierto de comercio
  para agentes (respaldado por Google, Stripe, Shopify, Visa y más). Eso significa que Claude, Gemini,
  ChatGPT y otros agentes pueden encontrar tu catálogo, recomendarlo y comprar — un canal de venta que
  la mayoría de las plataformas todavía no tiene."**
- `aiChannel.steps` (cómo funciona, 3 pasos):
  1. **"Publicas tu catálogo normal."** — Igual que cualquier tienda.
  2. **"Miyagi lo expone para agentes."** — Tu catálogo queda en el formato abierto que los agentes
     entienden, sin que hagas nada extra.
  3. **"Un agente lo descubre y compra."** — Una IA puede encontrar, recomendar y comprar tus
     productos a nombre de su usuario.
- `aiChannel.note` *(anti-vaporware guardrail, keep verbatim spirit)*: **"Esto no es promesa a futuro:
  la tienda ya es legible y operable por agentes hoy. ¿No nos crees? Pídele a tu IA que lo intente."**

> **Truthfulness guardrail (do not violate):** frame as *agent-readable & buyable via the open
> standard*. Do **not** print a named "compra en ChatGPT" button/claim unless that specific integration
> is verified live at publish.

---

## 6. Creator — `sellerAcquisition.creadores`

| Key | Final es-MX copy |
|---|---|
| `metadata.title` | Vende tu catálogo creativo sin comisiones — Miyagi Sánchez |
| `metadata.description` | Trae tu catálogo de Instagram a una tienda propia. 0% de comisión, dominio o subdominio, widget y cobro directo. |
| `metadata.ogAlt` | Miyagi Sánchez para creadores: catálogo propio, 0% de comisión y cobro directo. |
| `eyebrow` | Creadores y diseñadores |
| `heroTitle` | Deja de pagar comisiones de Shopify y de perder ventas en los DM. |
| `heroLead` | Trae tu catálogo de Instagram en minutos. Tu propia tienda, tu dominio, 0% de comisión — y tu dinero directo a tu cuenta. |
| `trustLine` | Compruébalo tú mismo: pídele a tu IA que evalúe miyagisanchez.com/vende/creadores y te diga si te conviene. |
| `primaryCta` | Trae tu tienda |
| `secondaryCta` | Ver página general |
| `heroStats[0]` | **0%** · comisión por venta |
| `heroStats[1]` | **IG** · catálogo por fotos, texto o archivo |
| `heroStats[2]` | **Tu marca** · subdominio, dominio o widget |
| `proofTitle` | No tienes que elegir entre Instagram y una tienda de verdad |
| `proofLead` | Usa tus canales de siempre para vender mejor: los DM para platicar, Miyagi para ordenar catálogo, cobro y links. |
| `proofPoints[0]` | **Trae tu catálogo** — Pega productos, fotos y textos de Instagram, o sube un archivo; tu agente lo ordena en publicaciones. |
| `proofPoints[1]` | **0% de comisión** — Deja de perder margen en cada venta. Miyagi no toma un porcentaje de tu pedido. *(hook: "Lo que Shopify te cobra cada mes, aquí es $0.")* |
| `proofPoints[2]` | **Tu propia vitrina** — Link gratis, subdominio, dominio propio y widget para tu web o tu bio. |
| `proofPoints[3]` | **Cobra directo** — Activa tarjeta, MercadoPago, SPEI o efectivo. Tu dinero no pasa por una bolsa de la plataforma. |
| `stepsTitle` | Del feed a una tienda que opera sola |
| `steps[0]` | **Pásale tu catálogo a tu IA** — Fotos, IG, textos o un archivo. No tienes que redactar todo desde cero. |
| `steps[1]` | **Regístrate y sube el archivo** — Entra con Google, crea tu tienda y publica tu primer grupo de piezas. |
| `steps[2]` | **Comparte tu tienda** — Usa el link, subdominio, dominio o widget; tu agente puede mantenerlo al día. |
| `agentTitle` → `shared.selfCheck.title` | Compruébalo tú mismo |
| `agentBody` → `shared.selfCheck.body` | (shared self-check body) |
| `socialTitle` | Para vender sin perseguir cada DM |
| `socialBody` | Conservas tu audiencia y sumas una tienda que responde con links, catálogo y métodos de pago claros. |
| `socialStats[0]` | **DM** · para platicar, no para perseguir pagos |
| `socialStats[1]` | **Links** · para cada producto o tienda |
| `socialStats[2]` | **Widget** · para vender desde tu propia web |
| `closingTitle` | Tu catálogo ya existe. Ponlo a vender. |
| `closingBody` | Empieza con lo que tienes: fotos, texto, IG o un archivo. Lo ajustas después. |
| `closingCta` | Traer mi catálogo |
| `variants.b.heroTitle` | Tu catálogo de Instagram merece una tienda propia. |
| `variants.b.primaryCta` | Migrar mi catálogo |
| `variants.b.closingCta` | Migrar mi catálogo |

---

## 7. Local business — `sellerAcquisition.negocios`

| Key | Final es-MX copy |
|---|---|
| `metadata.title` | Lleva tu negocio local a internet — Miyagi Sánchez |
| `metadata.description` | Abre una tienda para tu negocio local sin comisiones. Migra tu catálogo, vende con QR y conéctate con la revista México-86. |
| `metadata.ogAlt` | Miyagi Sánchez para negocios locales: tienda en línea, QR y revista México-86. |
| `eyebrow` | Negocios locales |
| `heroTitle` | Tu negocio de la esquina, ahora también en línea — y en la revista. |
| `heroLead` | Sube tu inventario en minutos, cobra directo y comparte tu tienda con link, QR, subdominio o dominio propio. Miyagi también puede llevarte a la edición impresa México-86. |
| `trustLine` | Compruébalo tú mismo: pídele a tu IA que evalúe miyagisanchez.com/vende/negocios y te diga si le conviene a tu negocio. |
| `primaryCta` | Poner mi negocio en línea |
| `secondaryCta` | Ver página general |
| `heroStats[0]` | **0%** · comisión por venta |
| `heroStats[1]` | **QR** · para vitrina, caja o volante |
| `heroStats[2]` | **Print** · puente a la revista México-86 |
| `proofTitle` | No tienes que cambiar tu negocio para vender en línea |
| `proofLead` | Miyagi se adapta a como ya trabajas: inventario, pagos directos, catálogo por QR y presencia impresa cuando te convenga. |
| `proofPoints[0]` | **Migración express** — Trae fotos, lista de precios, texto o un archivo. Tu agente lo convierte en catálogo listo para publicar. |
| `proofPoints[1]` | **0% de comisión** — No pierdes margen en cada pedido. Cobras directo con los métodos que actives. *(hook: "Sin comisión por venta, a diferencia de Mercado Libre.")* |
| `proofPoints[2]` | **QR para tu mostrador** — Pon tu tienda en la caja, el volante, el aparador o el recibo y manda a tus clientes al catálogo actualizado. |
| `proofPoints[3]` | **Sal en México-86** — La edición impresa abre un puente que Shopify e Instagram no tienen: un anuncio físico con QR a tu tienda. |
| `stepsTitle` | De local físico a tienda en línea |
| `steps[0]` | **Trae tu catálogo actual** — Fotos, lista de precios, Excel, WhatsApp o texto. No empiezas desde cero. |
| `steps[1]` | **Publica tu primera vitrina** — Elige productos, precios, formas de pago y cómo quieres que te contacten. |
| `steps[2]` | **Comparte QR y link** — Úsalo en el mostrador, las bolsas, el volante, redes o la revista. Cada persona llega a tu tienda. |
| `agentTitle` → `shared.selfCheck.title` | Compruébalo tú mismo |
| `agentBody` → `shared.selfCheck.body` | (shared self-check body) |
| `socialTitle` | Para negocios que ya venden, no para empezar de cero |
| `socialBody` | Si ya tienes clientes, inventario y forma de cobrar, Miyagi suma una vitrina en línea y un puente impreso sin comerse tu margen. |
| `socialStats[0]` | **QR** · en línea desde el mostrador |
| `socialStats[1]` | **MXN** · cobros pensados para México |
| `socialStats[2]` | **Print** · revista y tienda conectadas |
| `closingTitle` | Tu local ya tiene historia. Dale también una URL. |
| `closingBody` | Empieza con tu catálogo actual y prueba una tienda sin comisiones. Si funciona, la conviertes en tu canal permanente. |
| `closingCta` | Abrir tienda local |
| `variants.b.heroTitle` | Pon tu local en internet sin perder margen. |
| `variants.b.primaryCta` | Crear tienda con QR |
| `variants.b.closingCta` | Crear tienda local |

---

## 8. Services pro — `sellerAcquisition.servicios`

| Key | Final es-MX copy |
|---|---|
| `metadata.title` | Vende servicios profesionales sin comisiones — Miyagi Sánchez |
| `metadata.description` | Publica servicios, agenda citas con Cal.com y cobra directo. Sin comisiones de plataforma para profesionales en México. |
| `metadata.ogAlt` | Miyagi Sánchez para servicios profesionales: agenda, cobra y vende sin comisiones. |
| `eyebrow` | Servicios profesionales |
| `heroTitle` | Cobra y agenda sin complicaciones. 0% de comisión. |
| `heroLead` | Publica consultas, clases, belleza, oficios, reparaciones o paquetes por cita. Miyagi te da link, tienda, agenda y cobro directo sin quitarte un porcentaje. |
| `trustLine` | Compruébalo tú mismo: pídele a tu IA que evalúe miyagisanchez.com/vende/servicios y te diga si sirve para tu oficio. |
| `primaryCta` | Publicar mi servicio |
| `secondaryCta` | Ver página general |
| `heroStats[0]` | **0%** · comisión por reserva |
| `heroStats[1]` | **Cal.com** · agenda cuando aplica |
| `heroStats[2]` | **MXN** · cobra directo a tu cuenta |
| `proofTitle` | Servicios con agenda, cobro y página propia |
| `proofLead` | Tu trabajo puede vivir como un servicio: descripción clara, precio o cotización, horarios y formas de pago. |
| `proofPoints[0]` | **Tipo servicio** — El registro acepta servicios y rentas, no solo productos físicos. Publica sesiones, paquetes o visitas. |
| `proofPoints[1]` | **Agenda conectada** — Usa Cal.com para citas con horario, cupo o disponibilidad; tu cliente sabe cuándo puede reservarte. |
| `proofPoints[2]` | **0% de comisión** — No pagas un porcentaje por cada consulta o trabajo. Tu margen se queda contigo. *(hook: "Cobras el 100% de tu servicio.")* |
| `proofPoints[3]` | **Cobra directo** — Activa tarjeta, MercadoPago, SPEI, efectivo o acuerdo directo, según cómo trabajes. |
| `stepsTitle` | De oficio o consulta a servicio que se vende |
| `steps[0]` | **Describe lo que haces** — Servicio, zona, duración, precio o rango. Tu agente puede ayudarte a redactarlo claro. |
| `steps[1]` | **Define agenda y cobro** — Conecta Cal.com si necesitas horarios y elige cómo quieres recibir pagos. |
| `steps[2]` | **Comparte tu link** — Mándalo por WhatsApp, redes, QR o tu web. Cada visita llega a tu página. |
| `agentTitle` → `shared.selfCheck.title` | Compruébalo tú mismo |
| `agentBody` → `shared.selfCheck.body` | (shared self-check body) |
| `socialTitle` | Para profesionales que venden tiempo, oficio y confianza |
| `socialBody` | Haz que tu cliente vea qué ofreces, cuánto cuesta o cómo se cotiza, cuándo estás disponible y cómo pagarte. |
| `socialStats[0]` | **Agenda** · citas y disponibilidad |
| `socialStats[1]` | **Link** · servicio listo para compartir |
| `socialStats[2]` | **0%** · sin comisión por venta |
| `closingTitle` | Tu servicio ya se vende por mensajes. Dale una página. |
| `closingBody` | Publica una primera oferta, prueba el flujo y ajusta la agenda conforme lleguen clientes. |
| `closingCta` | Crear servicio |
| `variants.b.heroTitle` | Convierte tu servicio en una página que agenda y cobra. |
| `variants.b.primaryCta` | Vender mi servicio |
| `variants.b.closingCta` | Vender mi servicio |

---

## 9. World Cup — `sellerAcquisition.mundial` (LIGHT-TOUCH: accents + de-distrust only)

> Window closes **Jul 19, 2026**. Do **not** deep-rewrite. Fix accents/ñ/¿¡ and remove distrust; keep
> the structure. Flagged for retire/repurpose post-tournament (spawned work).

| Key | Final es-MX copy |
|---|---|
| `metadata.title` | Vende experiencias del Mundial — Miyagi Sánchez |
| `metadata.description` | Publica tours, rincones de comida y rentas para el Mundial 2026 en México. Sin comisiones y directo a tu cuenta. |
| `metadata.ogAlt` | Miyagi Sánchez Mundial 2026: vende experiencias en México sin comisiones. |
| `eyebrow` | Mundial 2026 · México |
| `heroTitle` | Captura al público global del Mundial. |
| `heroLead` | Publica tus tours, rincones de comida y rentas al instante, sin comisiones. Entra antes de que la demanda llegue a CDMX, Guadalajara y Monterrey. |
| `trustLine` | Compruébalo tú mismo: pídele a tu IA que evalúe miyagisanchez.com/vende/mundial por ti. |
| `primaryCta` | Empieza a vender |
| `secondaryCta` | Ver guía para agentes |
| `heroStats[0]` | **0%** · comisión de plataforma |
| `heroStats[1]` | **3** · ciudades sede en México |
| `heroStats[2]` | **Minutos** · para publicar tu primer anuncio |
| `demandTitle` | Lo que los visitantes ya están buscando |
| `demandItems` | "Tours de barrio y experiencias locales" · "Comida imperdible cerca del estadio" · "Rentas, traslados y servicios por día" |
| `proofTitle` | Hecho para vender servicios y rentas, no solo productos |
| `proofLead` | Reutilizamos la infraestructura actual de Miyagi: publicación, cobro, agenda y agentes. |
| `proofPoints[0]` | **Servicios y rentas** — El registro ya permite anuncios de servicio y renta, con ubicación, precio o precio a consultar. |
| `proofPoints[1]` | **0% de comisión** — Miyagi no cobra comisión de plataforma. Tu margen se queda contigo. *(hook: "Cada peso del Mundial se queda contigo.")* |
| `proofPoints[2]` | **Cobra a tu cuenta** — Activa Stripe, MercadoPago o coordina pagos directos según cómo opera tu tienda. |
| `proofPoints[3]` | **Agenda cuando aplique** — Conecta Cal.com desde tu tienda para experiencias con horario, cupo o cita previa. |
| `stepsTitle` | Publica antes del silbatazo |
| `steps[0]` | **Crea tu tienda** — Nombre, ubicación y datos básicos para que el visitante sepa quién lo atiende. |
| `steps[1]` | **Sube tu experiencia** — Describe el tour, la renta o el servicio con precio, zona, fotos y condiciones. |
| `steps[2]` | **Comparte y mide** — Usa tu link en redes, QR, anuncios o mensajes. |
| `agentTitle` → `shared.selfCheck.title` | Compruébalo tú mismo |
| `agentBody` → `shared.selfCheck.body` | (shared self-check body) |
| `closingTitle` | El Mundial no espera. Tu anuncio tampoco. |
| `closingBody` | Si vendes experiencias, comida, traslados, tours, hospedaje temporal o servicios locales, empieza con un anuncio de servicio y ajusta después. |
| `closingCta` | Publicar mi servicio |
| `variants.b.heroTitle` | Que el Mundial encuentre tu experiencia local. |
| `variants.b.primaryCta` | Publicar experiencia |
| `variants.b.closingCta` | Publicar experiencia |

---

## 10. Implementation map for Sprint 2 (so this is paste-not-author)
1. Replace every value above in `apps/miyagisanchez/locales/es.json → sellerAcquisition`.
2. Add the new shared block `shared.selfCheck` and repoint the renderer's `agentTitle`/`agentBody`
   slots to it (or overwrite each page's keys with the shared strings).
3. Add `shared.copyPrompt` / `copiedPrompt` new labels; set `trustPrompt` to the directive prompt and
   give each persona page a per-URL override.
4. New blocks for Sprint 3 (don't render yet in S2 if splitting): `anchor.benchmark` and `aiChannel`.
5. Grep gate (S2 QA): zero matches for `No pedimos fe`, `No nos creas`, `vaporware`, and common
   un-accented offenders (`comision`, `publicacion`, `Que tipo`, `Mexico`, `pagina`) inside the
   `sellerAcquisition` block.

## Approval
- [x] Daniel approved this brief (2026-06-25) → Sprint 2 implements verbatim.
