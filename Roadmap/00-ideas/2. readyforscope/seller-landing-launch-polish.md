---
title: "Seller landing — launch polish (hero redesign + marketplace voice + benchmark example)"
slug: seller-landing-launch-polish
status: awaiting-approval
area: "08"
type: feature
risk: low
relates_to: "08-growth-and-promotions/seller-acquisition-landing-content-overhaul"
updated: 2026-06-26
---

# Seller landing — launch polish (hero redesign + marketplace voice + benchmark example)

**Status: awaiting Daniel approval — no code yet.** Pre-launch polish on the **shipped** v2 overhaul
(`seller-acquisition-landing-content-overhaul`, shipped 2026-06-26). Class: **Feature (content + small
design)** on a shipped surface. Risk **low** (marketing pages; no commerce/auth/money). Work contained
to `locales/es.json` + `app/(shell)/vende/**`.

## Mirror-back
> You're about to launch and want to tighten the recruitment pages: (1) say **"marketplace,"** not
> "mercado," and use the **full brand `miyagisanchez.com`**, never bare "Miyagi"; (2) **redesign the
> hero around the copy-paste prompt** — make the prompt *visible* in the familiar block-with-copy-icon
> format, collapse the duplicated "Compruébalo tú mismo" text into one line, and rebuild the right
> panel (drop "20s con Google" → add **"vende en Claude, Gemini y ChatGPT"** and **premium features**);
> (3) **remove all eyebrows**; (4) in "Cómo funciona," replace the distrust aside with the same
> invite-and-prompt block; (5) cut the leftover distrust/jargon lines (the AI-channel "no es promesa a
> futuro…" note and the "Hecho para negocios reales…" social block) and replace the latter with
> **premium features / use cases**; (6) **tighten everything** — less fluff, more precise, more
> whitespace, lean on icons — so it reads like *"pon a tu IA a configurarte en el marketplace,
> seamless"*; and (7) specific `/vende/mundial` fixes + a **worked take-home example** under the
> benchmark. Right?

## Decisions (Daniel, 2026-06-26)
1. **Hero layout = right-side panel** (mobile-first; stacks on phones). Left: title + one-liner + CTAs.
   Right panel: the visible prompt block (focal) + the value list.
2. **Positioning = weave "marketplace" in naturally, no rigid slogan.** Lead with the "pon a tu IA a
   configurar tu tienda en el marketplace" idea; don't commit to a fixed tagline.

## Stage 2.5 — light enhancement
All copy lives in `locales/es.json → sellerAcquisition`; the hero/sections render from
`_components/SellerAcquisitionSections.tsx` (+ bespoke `mundial/page.tsx`). This is copy edits + a hero
restructure + two small new blocks (premium-features grid, benchmark worked-example) — **no new routes,
data model, or backend.** The responsive patterns from v2 Sprint 4 (clamp headings, `minWidth:0`,
safe grid idioms) are reused for the new pieces.

---

## A. Global voice fixes (every `/vende*` page)

### "mercado" → "marketplace" (our own word only)
Only **one** user-facing instance of our own word exists (brand names *Mercado Libre / MercadoPago* and
the JSON benchmark key `mercadoLibre` stay untouched):
- `anchor.heroLead`: "…**súbete al mercado** o vende en tu propio dominio…" → "…**súbete al
  marketplace** o vende en tu propio dominio…"
- Use "marketplace" naturally elsewhere where "Miyagi"/generic noun is replaced (see below).

### Bare "Miyagi" → `miyagisanchez.com` (brand) or "el marketplace" (common noun)
Rule: **subject/brand → `miyagisanchez.com`**; where it reads better as a common noun → **"el
marketplace."** The ~12 live instances:

| Location | Today | Fix |
|---|---|---|
| `shared.faqs[0].body` | "Sí. **Miyagi** cobra 0%…" | "Sí. **miyagisanchez.com** cobra 0%…" |
| `aiChannel.body` | "Tu tienda en **Miyagi** habla ese idioma…" | "Tu tienda en **miyagisanchez.com** habla ese idioma…" |
| `aiChannel.steps[1].title` | "**Miyagi** lo expone para agentes." | "**miyagisanchez.com** lo expone para agentes." |
| `creadores.proofLead` | "…**Miyagi** para ordenar catálogo…" | "…**el marketplace** para ordenar catálogo…" |
| `creadores.proofPoints[1].body` | "**Miyagi** no toma un porcentaje…" | "**miyagisanchez.com** no toma un porcentaje…" |
| `negocios.heroLead` | "**Miyagi** también puede llevarte a la edición impresa…" | "**miyagisanchez.com** también puede llevarte…" |
| `negocios.proofLead` | "**Miyagi** se adapta a como ya trabajas…" | "**El marketplace** se adapta a como ya trabajas…" |
| `negocios.socialBody` | (social block being replaced — see §F) | n/a |
| `servicios.heroLead` | "**Miyagi** te da link, tienda, agenda…" | "**miyagisanchez.com** te da link, tienda, agenda…" |
| `mundial.proofLead` | "Reutilizamos la infraestructura actual de **Miyagi**…" | replaced — see §G |
| `mundial.proofPoints[1].body` | "**Miyagi** no cobra comisión…" | "**miyagisanchez.com** no cobra comisión de plataforma…" |
| `anchor.socialBody` | (social block being replaced — see §F) | n/a |

> S2 grep gate: add `Miyagi(?!\s*Sánchez)` and bare `mercado` (excluding Mercado Libre/MercadoPago) to
> the banned-strings spec so this can't regress.

---

## B. Hero redesign (the focus of the page)

Applies to the shared renderer (anchor + creadores + negocios + servicios) and, by hand, to
`mundial/page.tsx`. **Mobile-first.**

### Layout (desktop, right-panel — chosen)
```
┌───────────────────────────────┬──────────────────────────────┐
│  H1 heroTitle                 │  ┌── prompt block ──────────┐ │
│  p  heroLead (tightened)      │  │ «Hola, ¿puedes abrir      │ │
│                               │  │  miyagisanchez.com/vende…»│ │
│  Compruébalo tú mismo: copia  │  │                  [⧉ copiar]│ │
│  el prompt y pídele a Claude, │  └───────────────────────────┘ │
│  Gemini o ChatGPT que evalúe  │  ──────────────────────────── │
│  miyagisanchez.com y te diga  │  ⏺ 0%  comisión de plataforma │
│  si te conviene.              │  ⏺ Vende en Claude, Gemini,   │
│                               │     ChatGPT                   │
│  [ Empieza gratis → ] [ … ]   │  ⏺ Funciones premium incluidas│
└───────────────────────────────┴──────────────────────────────┘
```
Mobile: single column — H1 → heroLead → trust one-liner → **prompt block** → value list → CTAs.

### Pieces
1. **Collapse to one trust line** (replaces both the old hero `trustLine` band *and* the old right-side
   `agentTitle/agentBody` aside). New `shared.heroTrustLine`:
   > **"Compruébalo tú mismo: copia el prompt y pídele a Claude, Gemini o ChatGPT que evalúe
   > miyagisanchez.com y te diga si te conviene."**
2. **Visible prompt block** — a new reusable component (`PromptBlock`) that *shows* the prompt text in
   the familiar sunk/bordered block with a **copy icon** button (reuses `TrustPromptCopy`'s clipboard
   logic; now renders the text, not just a button). Fed the per-page directive prompt
   (`shared.trustPrompt` with the page URL). This is the focal element.
3. **Right value list** (replaces the 3 hero stats):
   - **0%** — comisión de plataforma
   - **Vende en Claude, Gemini y ChatGPT** — tu tienda, lista para agentes de IA
   - **Funciones premium incluidas** — boletos y eventos, sorteos, agenda y más
   New keys: `*.heroValues[]` (or reshape `heroStats`). Icons suggested (e.g. `iconoir-percentage`,
   `iconoir-sparks`, `iconoir-star`).

---

## C. Remove all eyebrows
Delete the badge eyebrows: `anchor.eyebrow` ("Para vendedores en México"), `aiChannel.eyebrow` ("Un
canal que otros no tienen"), and `creadores/negocios/servicios/mundial.eyebrow`. Also drop the
**persona-router card eyebrows** (`routerCards[].eyebrow`) — the card title + body already carry the
category; removing them buys whitespace. (Renderer: stop rendering the `badge` slots.)

---

## D. "Cómo funciona" aside → invite + prompt block
The steps section's right aside currently shows the distrust copy. Replace with:
- Heading: **"Compruébalo tú mismo"**
- Line: **"Copia el prompt y pégalo en tu IA para que evalúe la oferta por ti."**
- The **same `PromptBlock`** (visible prompt + copy icon).

Remove `shared.selfCheck.body`'s "No tienes que creernos…" usage here.

---

## E. AI-channel section — trim
- **Remove `aiChannel.note`** entirely ("Esto no es promesa a futuro… ¿No nos crees?…").
- Remove `aiChannel.eyebrow` (per §C).
- Keep `title` + `body` + 3 `steps`, with the `Miyagi → miyagisanchez.com` fix (§A) and tightened copy.

---

## F. Anchor social block → premium features / use cases
**Remove** `anchor.socialTitle` ("Hecho para negocios reales, no para demos") + `anchor.socialBody`.
Replace the section with a **premium-features grid** (icon cards) highlighting real, shipped
capabilities most platforms charge extra for:

- **Boletos y eventos** — vende admisiones y maneja tu evento. *(Events & Ticketing, shipped)*
- **Sorteos** — campañas de sorteo para crecer tu audiencia. *(Sweepstakes, shipped)*
- **Agenda y citas** — reserva con Cal.com para servicios y experiencias.
- **Suscripciones y contenido** — cobra recurrente y vende contenido propio.
- **Cupones y promociones** — descuentos y códigos para tus campañas. *(Seller Coupons, shipped)*
- **Tu dominio, subdominio o widget** — tu marca en cualquier canal.

Section title (no eyebrow): **"Todo esto ya viene incluido"** · lead: **"Funciones que en otras
plataformas pagas aparte — aquí son parte del marketplace."** Icon-led, short labels, lots of
whitespace.

---

## G. `/vende/mundial` specific
- `heroLead`: **remove** the 2nd sentence "Entra antes de que la demanda llegue a CDMX, Guadalajara y
  Monterrey." Keep: "Publica tus tours, rincones de comida y rentas al instante, sin comisiones."
- `proofLead`: "Reutilizamos la infraestructura actual de Miyagi: publicación, cobro, agenda y
  agentes." → **"Vende en el marketplace: publicación, cobro, agenda y agentes, listos para usar."**
- `closingTitle`: "El Mundial no espera. Tu anuncio tampoco." → **"Súbete a la ola del Mundial."**
  (rides the wave without the false-urgency "no espera"). `closingBody` unchanged (it's fine).

---

## H. Benchmark worked example (under the `/vende` comparison table)
Add a **worked take-home example** below the table. New block `anchor.benchmark.example`:

- Title: **"Ejemplo: vendes un producto de $1,000 MXN"**
- Lead: **"Cuánto te llega, según dónde vendas."**

| Plataforma | Comisión de plataforma | Mensualidad | Te llega (aprox.) |
|---|---|---|---|
| **miyagisanchez.com** | $0 | $0 | **~$1,000**¹ |
| **Mercado Libre** | ~$130 (≈13%)² | $0 | **~$870** |
| **Shopify** | $0 por venta³ | ~$390–790/mes⁴ | **~$1,000 − tu mensualidad**¹ |

- Punchline: **"En una venta de $1,000 te quedas con ~$130 más que en Mercado Libre — y sin pagar
  mensualidad como en Shopify."**
- Footnotes:
  ¹ Menos la comisión de tu procesador de pago (Stripe, MercadoPago ≈3.5% + $3), **igual en cualquier
  plataforma** y directo a tu cuenta.
  ² Comisión Clásica promedio; varía por categoría (≈8–16%). Productos de bajo precio pagan un cargo
  fijo extra.
  ³ Con Shopify Payments; +2% si usas otra pasarela.
  ⁴ Plan Basic ≈$19–39 USD/mes + IVA — lo pagues o no, con o sin ventas.
- Reuse the table's "Verificado: 25 de junio de 2026" stamp + "pídele a tu IA que confirme los números."

> Truthfulness: the example isolates the **platform's cut** (the honest differentiator) and explicitly
> notes card-processing is similar everywhere. Re-verify the ML % band + Shopify base price at publish.

---

## I. Writing/heuristics pass (all pages)
Tighten every hero `heroLead` and proof/social body: cut hedge words, one idea per line, prefer
icon + short label over sentences. Target the feel: *"pon a tu Claude/Gemini a configurarte en el
marketplace, sin fricción."* Keep brand names intact. (Per-string final copy in the COPY-BRIEF —
authored at sprint start so it lands verbatim.)

---

## Slicing (for sign-off)
**Sprint 1 — Voice & copy precision · risk low.** All `es.json` + `mundial` string changes: marketplace
word, `miyagisanchez.com` brand sweep, eyebrow removal (copy side), new hero trust one-liner +
value-list labels, AI-channel note removal + trim, premium-features copy, mundial fixes, benchmark
worked-example copy, the tightening pass. Add grep-gate for `Miyagi`/bare-`mercado`. **QA:** copy spec +
anon smoke.

**Sprint 2 — Hero & section redesign · risk low** (announce only if it reaches `globals.css`/shared
layout — it shouldn't). Build the `PromptBlock` (visible prompt + copy icon), restructure the hero to
the right-panel layout, render the new value list, drop eyebrow badges, swap the steps aside to the
invite+PromptBlock, replace the anchor social block with the premium-features grid, add the benchmark
worked-example block, apply the spacing/icon/whitespace polish. Mobile-first; reuse v2-S4 responsive
idioms. Apply the same hero changes to bespoke `mundial/page.tsx`. **QA:** anon browser smoke +
360/390/414 no-overflow check on the new hero + example block; **Daniel real-device mobile pass.**

## In / Out
**In:** everything in §A–I on `/vende*`. **Out:** changes to `/sell`/commerce/data model; new personas;
English variants; retiring `/vende/mundial` post-tournament (separate); paid-media.

## Open risks
- Benchmark % drift — re-verify at publish (same guardrail as v2).
- Premium-features list must stay truthful — only list shipped capabilities (events/tickets, sweepstakes,
  scheduling, subscriptions, coupons, channels are all shipped per BUILD-ORDER).
- `PromptBlock` reused in 2 spots + shared renderer touches all persona pages — smoke all four.

## Definition of Ready
- [x] Mirror-back + class + Stage-2.5 bucket (light enhancement).
- [x] Two design decisions resolved (hero right-panel · marketplace woven, no slogan).
- [x] Exact string inventory produced (mercado/Miyagi); benchmark example computed + footnoted.
- [x] Reuse noted (shared renderer, TrustPromptCopy clipboard, v2-S4 responsive idioms).
- [x] Sliced (2 sprints), risk-tiered (low), QA + mobile owner named.
- [ ] **Daniel approves** → scaffold epic + 2 sprints, author the COPY-BRIEF, emit kickoffs.
