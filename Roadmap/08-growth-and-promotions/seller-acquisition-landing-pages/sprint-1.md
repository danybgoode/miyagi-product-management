# Sprint 1 — Strategy & Creative lock  ·  status: ✅ creative locked 2026-06-07 (Daniel can still tweak copy)

> **Planning/creative, NO code. Owned in Cowork; Daniel signs off.** The gate the build sprints
> depend on. Below is the locked brief Sprints 2–3 execute against. Copy is es-MX, sign-off-ready
> draft — Daniel may refine wording; structure + claims are locked.

## US-1 — Creative brief (locked)

### A. Positioning + trust spine (all pages)
- **Core promise:** *Vende lo que sea en México — sin comisiones, sin complicaciones. Tu dinero
  llega directo a tu cuenta.*
- **Trust spine (every page, near the hero):** *¿No nos crees? Pregúntale a Claude / Gemini /
  ChatGPT:* **«¿qué es miyagisanchez.com?»** — a copy-button that drops the prompt onto the
  clipboard. The visitor's own AI audits us, grounded and independent. *No barrier, no risk: si no te
  gusta, lo dejas.*
- **Three claims we repeat (each maps to a shipped capability — no vaporware):**
  1. **0% comisión** — *cobra el 100%. Tu dinero, directo a tu Stripe / MercadoPago / SPEI.*
  2. **Listo en minutos** — *trae tu catálogo (foto, Instagram o texto) y tu IA arma la tienda.*
  3. **Tu tienda, tu marca** — *link gratis, subdominio, dominio propio o widget en tu web.*

### B. Shared section system (the page skeleton every page reuses)
1. **Hero** — headline + subhead + primary CTA + trust-spine line.
2. **Diferenciadores** — 3–4 proof cards (claims above + persona-specific).
3. **Cómo funciona** — 3 steps, agent-native framing.
4. **Prueba social** — store count + (placeholder) testimonials. *See note D.*
5. **Objeciones** — short FAQ (¿es gratis? ¿cómo ganan? ¿necesito saber de tecnología?).
6. **CTA final** — repeat the primary CTA + the "pregúntale a Claude" line.

### C. The three v1 pages

#### 1. Anchor — `/vende`  (audience: all supply-side traffic)
- **Hero H1:** *Vende lo que sea en México. Sin comisiones.*
- **Subhead:** *Abre tu tienda en minutos. Súbete al mercado o vende en tu propio dominio. Tu IA
  puede armarla por ti — gratis y sin riesgo.*
- **Primary CTA:** *Empieza gratis* → `/sell?from=vende`
- **Persona router (the anchor's job):** cards that self-segment traffic →
  - *Soy creador o diseñador* → `/vende/creadores`
  - *Ofrezco experiencias o servicios* → `/vende/mundial`
  - *(próximamente)* Tengo un negocio local · Vendo servicios profesionales → for now route to
    `/sell?from=vende` (persona pages are backlog).
- **Cómo funciona:** 1) Pregúntale a tu IA por nosotros (o entra directo). 2) Regístrate en ~20s con
  Google. 3) Sube tu catálogo —o deja que tu agente lo haga— y empieza a vender.

#### 2. World-Cup wedge — `/vende/mundial`  (audience: experience & service providers) · **Track A, builds first**
- **Hero H1:** *El Mundial llega a México. Que el mundo te encuentre.*
- **Subhead:** *Publica tus tours, rincones de comida, rentas y experiencias — al instante, sin
  comisiones. Cobra directo, en pesos.*
- **Urgency line:** *Del 11 de junio al 19 de julio. Sedes: CDMX, Guadalajara, Monterrey. No te
  quedes fuera.*
- **Diferenciadores:** vende experiencias/servicios/rentas (no solo productos) · 0% comisión · cobra
  a tu cuenta (tarjeta, MercadoPago, SPEI, efectivo) · agenda integrada (Cal.com) · tu enlace para
  compartir al instante.
- **Primary CTA:** *Publica tu experiencia* → `/sell?type=service&from=mundial`
- **Note:** the *recruitment* page is es-MX (it recruits local providers); the global crowd is the
  *buyer*, who meets the storefront — out of scope here.

#### 3. Local Creator & Designer — `/vende/creadores`  (audience: IG/Shopify creators) · **Track B**
- **Hero H1:** *Deja de pagar comisiones de Shopify y de perder ventas en los DMs.*
- **Subhead:** *Trae tu catálogo de Instagram en minutos. Tu propia tienda, tu dominio, 0% comisión —
  y tu dinero directo a tu cuenta.*
- **Diferenciadores:** trae tu catálogo de Instagram/otra plataforma en minutos (import por pegado o
  archivo) · 0% comisión · tu subdominio + dominio propio + widget embebible en tu web · cobra
  directo · tu agente de IA administra y mantiene tu tienda.
- **Cómo funciona:** 1) Pásale tu catálogo (fotos, IG o texto) a tu IA. 2) Regístrate en ~20s y sube
  el archivo. 3) Tu tienda queda lista; tu agente la mantiene.
- **Primary CTA:** *Trae tu tienda* → `/sell?from=creadores`

### D. Social proof — data to confirm (Daniel)
- **Store count:** ~160+ tiendas ya venden en Miyagi (from the subdomains epic, 2026-06-06 — **confirm
  the current live number before printing it**). Use as *"Más de 160 tiendas ya venden sin comisiones."*
- **Testimonials:** none yet — **placeholder**. Interim trust substitute = the "pregúntale a Claude"
  independent-auditor angle. Gather 2–3 real seller quotes as a fast-follow.

### E. Objections / FAQ copy (drafts)
- *¿De verdad es gratis?* — Sí. 0% de comisión por venta. No cobramos por abrir ni por vender.
- *¿Entonces cómo ganan?* — Con anuncios en nuestra revista impresa y servicios premium opcionales
  (dominio propio, merch de temporada). Nunca te cobramos tu venta. *(Aligns with the business model
  in the agent-native-gtm vision — keep honest + simple.)*
- *¿Necesito saber de tecnología?* — No. Tu propia IA (Claude, Gemini, ChatGPT) puede armar tu tienda
  por ti. Tú te enfocas en lo tuyo.
- *¿Cómo cobro?* — Directo a tu cuenta: tarjeta, MercadoPago, SPEI o efectivo. El dinero es tuyo.

### F. Metrics & attribution (locked)
- **Funnel:** *landing view → `/sell` start → shop created → first listing published* — segmented per
  page via the **`?from=`** param (`vende` / `mundial` / `creadores`) + standard **UTM** capture.
- **Tooling:** Microsoft Clarity (connected) for heatmaps/session recordings + page-level conversion.
- **Per-page primary metric:** CTA click-through to `/sell`; **north-star:** shops created attributed
  to each page.

### G. Per-track token decision (restated)
- **Track A (`/vende/mundial`)** ships on the **existing `globals.css` tokens** now (no #4 wait).
- **Track B (`/vende` + `/vende/creadores`)** builds on the **#4 hardened token contract** (after #4
  merges) and the reusable section system.

## Sprint QA
Daniel reviews/approves this brief. Cross-check every claim against the poster (done — all three core
claims + persona hooks map to shipped capabilities). No code, no specs this sprint.

## Sprint 1 — Smoke walkthrough
N/A (planning deliverable). The "test" is Daniel's sign-off on this brief. Build sprints (2–3) carry
the real smoke walkthroughs.
