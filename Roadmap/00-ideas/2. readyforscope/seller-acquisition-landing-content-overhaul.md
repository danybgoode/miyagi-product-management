---
title: "Seller-acquisition landing pages — content strategy + es-MX + mobile overhaul"
slug: seller-acquisition-landing-content-overhaul
status: awaiting-approval
area: "08"
type: feature
risk: low
relates_to: "08-growth-and-promotions/seller-acquisition-landing-pages"
updated: 2026-06-25
---

# Seller-acquisition landing pages — content strategy + es-MX sweep + mobile overhaul

**Status: awaiting Daniel approval — no code yet.** This is the gate. Nothing scaffolds until approved.
Macro-section: **08 · Growth & Promotions**. Re-polish of the **shipped** epic
`08-growth-and-promotions/seller-acquisition-landing-pages` (closed 2026-06-10). Proposed as a **v2
overhaul epic**, not a reopen — the original shipped the *structure*; this puts real, intentional
content and a working mobile build inside it.

## Mirror-back
> You want to take the seller-recruitment landing pages — `/vende` and every page under it
> (`/vende/creadores`, `/vende/negocios`, `/vende/servicios`, `/vende/mundial`) — and replace the
> placeholder copy with an **actual content-marketing strategy**: real es-MX copy (with correct
> accents/ñ/¿¡), written per persona around our value props and their jobs-to-be-done / pain
> relievers — **not** a literal translation. Along the way: fix the broken "copy this prompt" CTA so
> it actually makes a visitor's AI agent evaluate Miyagi *for them* (incl. a cost comparison vs Mercado
> Libre and Shopify); kill the "No pedimos fe" distrust framing everywhere and replace it with a
> "check it yourself" invitation; add the **sell-on-AI-agents** value prop and a **truthful
> price/feature benchmark**; and do a **full mobile-responsive sweep** because the pages overflow on
> phones. Right?

## Classification
**Feature (content-led growth)** on an existing shipped surface, carrying **an embedded bug-fix track**
(mobile overflow) and **two small genuinely-new sections** (benchmark table · AI-channel value prop).
Risk **low** throughout — marketing pages, no payments/checkout/fulfillment/auth/DB/money. *Caveat per
LEARNINGS:* if any responsive fix touches shared layout (`app/(shell)/layout.tsx`) or `globals.css`
tokens, announce it — those break sibling PRs. The work is overwhelmingly contained to
`locales/es.json` + the `app/(shell)/vende/**` tree.

## Stage 2.5 — can we already do this?
Mostly **light enhancement**, partly **genuinely new**:

- **Copy overhaul → light.** All landing copy already lives in **one place**:
  `apps/miyagisanchez/locales/es.json → sellerAcquisition` (`shared`, `anchor`, `creadores`,
  `negocios`, `servicios`, `mundial`). Rewriting copy = editing that one JSON block. No new layout.
- **es-MX accent/ñ/¿¡ sweep → light.** Same JSON edit; it's a correctness pass, not a build.
- **Kill "No pedimos fe" → light.** It's `sellerAcquisition.*.agentTitle` ("No pedimos fe") +
  `agentBody`, rendered in two spots (hero aside + steps aside). Rewrite the strings.
- **Better copy-paste prompt → light.** It's `sellerAcquisition.shared.trustPrompt` (today the literal
  string `"que es miyagisanchez.com?"`) consumed by `TrustPromptCopy.tsx`. Change the string (+ maybe
  the label). The wiring already copies to clipboard correctly.
- **Mobile-responsive sweep → light-to-medium bug-fix.** The shared renderer
  (`_components/SellerAcquisitionSections.tsx`) and the standalone `mundial/page.tsx` use inline-style
  grids; the overflow is real and needs a hands-on audit at 360–390px, but it's CSS, not new features.
- **Price/feature benchmark table → genuinely new (small).** New section component + copy. Anchor only
  (decided).
- **Sell-on-AI-agents value prop → genuinely new (small).** New/expanded proof point + copy; the
  underlying capability already ships (UCP/MCP — see reuse list), so it's content, not a build.

No "already possible, just communicate it" path makes the copy good — the copy *is* the deliverable.
But there is **zero net-new infrastructure**: no routes, no data model, no backend, no commerce.

## Daniel's grooming calls (2026-06-25)
1. **Prompt = directive.** The copy-paste CTA must explicitly instruct the agent to read
   `miyagisanchez.com/vende`, evaluate the offer **for the visitor's business**, and **compare cost vs
   Mercado Libre & Shopify**. (Replaces the weak `"que es miyagisanchez.com?"`.)
2. **Benchmark = comparison table on the anchor only.** `/vende` gets a Miyagi vs Mercado Libre vs
   Shopify table (cost + key features); persona pages keep a one-line cost hook, not the full table.
3. **`/vende/mundial` = light copy fix only.** The World Cup runs **Jun 11 – Jul 19, 2026**; today is
   **Jun 25** — the window closes in ~3 weeks. Apply the es-MX + de-distrust sweep so it isn't broken,
   but don't over-invest. Plan to retire/repurpose post-tournament (captured as spawned work).
4. **AI channel = "agent-readable & buyable via the open standard."** Frame the sell-on-AI value prop
   truthfully: your store is built on **UCP/MCP** (the open agentic-commerce standard) so AI agents
   (Claude, Gemini, ChatGPT, et al.) can find, recommend and buy from you — rather than claiming a
   named, consumer-facing "buy on ChatGPT" button that we'd have to verify ships today. Protects the
   anti-vaporware promise.

## Present-day pricing research (for a truthful benchmark) — verified 2026-06-25
The benchmark's whole credibility rests on being accurate, and our brand pillar is *no vaporware /
check it yourself*. Figures below are **directional and cited**; exact category/plan numbers get
locked during the copy sprint (US-2) and re-checked at publish.

| Platform | What a Mexican seller pays | Source |
|---|---|---|
| **Mercado Libre (MX)** | **Per-sale commission ~8–16%** on *Clásica* listings, **~12.5–20.5%** on *Premium*, varying by category; **plus** a fixed per-unit charge on low-ticket items (~$25 on items < $99, ~$30 on $99–149). | ProfitOS / Tiendanube / Wivo (2026) |
| **Shopify (MX)** | **Monthly subscription** (Basic ≈ $19–39 USD/mo depending on monthly-vs-annual + promo) **+ 16% IVA** on the subscription; **+2% transaction fee if you don't use Shopify Payments**; **+ payment processing ~3.5% + $3 MXN** per card sale (×1.16 IVA). | Faciliza / Panamerik (2026) |
| **Miyagi Sánchez** | **0% platform commission.** You get paid **directly** to your own Stripe / MercadoPago / SPEI / cash. No monthly subscription to open a store. | Product (poster · AGENTS rule #1) |

> Truthfulness guardrails for copy: (a) say "comisión de plataforma 0%" — **not** "0 costos," since
> the seller still pays their own payment-processor fees (Stripe/MercadoPago) just like anyone; (b)
> present competitor ranges, not single cherry-picked numbers; (c) date-stamp the comparison and cite
> sources in a footnote/agent-readable note so the visitor's agent can corroborate. Exact Shopify base
> price drifts with promos — confirm at publish before printing a single number.

## The content strategy (the part to nail)

### Frame: value props × persona jobs-to-be-done
The original epic already locked the persona set and the proof points; **what was never written is
copy that connects a value prop to a persona's actual job and pain.** That mapping is the spine of
the rewrite:

| Persona (page) | Job-to-be-done | Primary pain | Lead value prop(s) | Cost hook |
|---|---|---|---|---|
| **Creator / designer** (`/vende/creadores`) | Sell unique pieces / drops without losing margin or living in Instagram DMs | Shopify fees + DM chaos + no real storefront | 0% comisión · paste-from-IG import · own subdomain/domain/widget | "Lo que Shopify te cobra al mes, aquí es $0" |
| **Local business** (`/vende/negocios`) | Put a physical shop / inventory online (and in the print edition) | Not digital-native; ML eats margin | Express migration · 0% comisión · **print edition** (no competitor has it) | "Sin comisión por venta, a diferencia de Mercado Libre" |
| **Services pro** (`/vende/servicios`) | Sell + schedule services/sessions without complexity | Tools are clunky / take a cut | Services & rentals listing types · Cal.com scheduling · direct payment | "Cobras el 100% de tu servicio" |
| **Experience / WC** (`/vende/mundial`) | Capture World Cup demand fast | Window is closing now | Fast publish · services/experiences · arranged delivery | (light-touch; window closing) |
| **Anchor** (`/vende`) | Self-segment cold supply traffic + carry the universal promise | Generic pitch bounces | All of the above, distilled + the **benchmark table** + the **AI-channel** prop | Full comparison table |

### The five things this overhaul changes everywhere
1. **es-MX correctness sweep** — restore accents (á é í ó ú), **ñ**, and opening marks **¿ ¡** across
   the entire `sellerAcquisition` block. Current copy is written without them (e.g. "comision",
   "publicacion", "Que tipo de vendedor eres?"). This is a full find-and-fix, not spot edits.
2. **Kill "No pedimos fe" → "check it yourself."** Remove the distrust framing (`agentTitle: "No
   pedimos fe"` + its body) on **every** page. Replace with an invitation to self-verify.
   *Direction:* heading like **"Evalúalo tú mismo"** / **"No tienes que creernos — compruébalo"**, body
   that says *ask your own agent to read the page, compare the offer, and tell you if it fits your
   business.* (Wording finalized in US-2.)
3. **Fix the copy-paste prompt** (the key CT). See "Proposed prompt" below — directive, accented,
   asks for a tailored evaluation **and** the ML/Shopify cost comparison.
4. **Add the AI-channel value prop** — selling *through* AI agents is a new channel for merchants;
   communicate it and *how it works* (truthful UCP/MCP framing, decision #4).
5. **Add the benchmark** — the Miyagi vs ML vs Shopify table on the anchor (decision #2).

Plus the cross-cutting **mobile-responsive sweep** (its own track).

### Specific placeholder strings flagged for rewrite (the inventory)
All under `locales/es.json → sellerAcquisition`:

| Key | Today (placeholder, the problem) | Direction |
|---|---|---|
| `shared.trustPrompt` | `"que es miyagisanchez.com?"` — misspelled, weak; an agent just gives a generic "what is" summary, **not** a tailored eval or cost comparison | Replace with the directive prompt below |
| `anchor.agentTitle` / `*.agentTitle` | `"No pedimos fe"` — distrust signal | "Evalúalo tú mismo" (self-verify invite) |
| `anchor.agentBody` | "Pídele a tu propio agente que lea miyagisanchez.com/vende, compare la oferta y te diga si tiene sentido…" — close, but tied to distrust heading + missing accents | Keep the *self-eval* spirit, re-voice positively, fix accents |
| `anchor.proofTitle` / `proofLead` | "Todo lo que prometemos ya existe… / Sin vaporware: publicacion, cobro directo, tienda propia y agentes ya forman parte de Miyagi." — insider jargon ("vaporware"), says little to a lead | Rewrite to a benefit the lead understands, or cut the subtext |
| `anchor.routerTitle` / `routerLead` | "Que tipo de vendedor eres? / Elige el camino… Cada ruta conserva la atribucion para medir que mensaje convierte mejor." — the subtext is **internal analytics jargon** leaking to users | Rewrite subtext to something meaningful to a lead, or remove it |
| `anchor.trustLine` + per-page `trustLine` | "No nos creas: preguntale a Claude…" — accents; "No nos creas" leans on the same distrust framing | Re-voice as invitation, fix accents |
| `shared.faqs`, all `heroLead`/`proofPoints`/`steps`/`closing*` | written without accents throughout | full es-MX sweep |

### Proposed copy-paste prompt (directive — decision #1, for sign-off)
Replaces `shared.trustPrompt`. Draft:

> **Hola, ¿puedes entrar a https://miyagisanchez.com/vende, revisar qué es y qué ofrece, y decirme si
> me conviene para mi negocio? Compara cuánto pagaría ahí contra Mercado Libre y Shopify, y dime qué
> podría vender y cómo empezar.**

Covers all four outcomes Daniel asked for: (1) read the site, (2) tailored "does it fit *my* business",
(3) explicit cost comparison vs ML & Shopify, (4) what they could sell + how to start. It's longer than
the current string — acceptable, it's a one-click copy. *Open sub-question for US-2:* keep one universal
prompt, or swap the URL per persona page (`/vende/creadores`, etc.)? Recommendation: per-page URL so the
agent reads the most relevant page.

> **Does the current prompt work? (Daniel's question.)** No. `"que es miyagisanchez.com?"` asks only
> "what is X" — an agent returns a generic definition, not a tailored fit-assessment and not a cost
> comparison, because nothing in the prompt requests them. The directive prompt fixes that.

## Medusa-first reframe — what already exists (reuse, don't rebuild)
**Zero Medusa, zero commerce, zero backend, zero new data model.** AGENTS five rules satisfied
trivially (public pages, es-MX, no commerce, Clerk untouched). Verified against the repo 2026-06-25:

| Capability | Where | Reuse for |
|---|---|---|
| **All landing copy, single source** | `apps/miyagisanchez/locales/es.json → sellerAcquisition` | The entire copy overhaul + es-MX sweep is edits here |
| **Shared section renderer** | `app/(shell)/vende/_components/SellerAcquisitionSections.tsx` (hero · proof · persona router · steps · social · FAQ · closing) | Mobile fixes land here once → all config-driven pages benefit |
| **Per-page config builder** | `_components/page-config.ts` (`buildAnchorPageConfig`, `buildCreatorPageConfig`, …) | Where a new "benchmark" / "AI-channel" block gets wired into the anchor config |
| **Copy-paste CTA component** | `_components/TrustPromptCopy.tsx` (clipboard wiring already works) | Just feed it the new prompt string + label |
| **Standalone WC page** | `app/(shell)/vende/mundial/page.tsx` (bespoke, not on the shared system) | Light copy fix only; note it duplicates structure → mobile fix must be applied here separately |
| **Persona routing + variant/UTM logic** | `lib/seller-acquisition.ts` (`resolveSellerPersonaRoute`, variant + `?from=` attribution) | Unchanged; pure-logic seam already tested |
| **Design tokens / primitives** | `globals.css` (`.btn`, `.card-tile`, `.badge`, `.t-*`, `--s-*` spacing, `--r-*` radii) | Build the new table/section from these; don't invent CSS |
| **Agent rails (grounds the AI-channel claim)** | `/agent`, `GET /api/ucp/manifest`, `POST /api/ucp/mcp`, `.well-known/ucp` | Lets us say "agents can read & buy from you" truthfully |
| **SEO/OG per page** | `*/opengraph-image.tsx` + per-page `metadata` | Update OG copy to match new headlines; no new build |
| **Microsoft Clarity** (connected) | — | Measure the overhaul's effect; no new analytics build |

## UX / creative heuristics (carried from the original epic, reinforced)
- **One page, one persona, one promise.** Anchor self-segments; persona pages never hedge.
- **Proof over adjectives, no internal jargon.** Cut "vaporware," "atribución," "conserva la
  atribución" — write to the lead, not to ourselves.
- **Mobile-first.** Cold ad/social traffic is on phones; nothing may overflow at 360px.
- **Invitation, not defensiveness.** "Compruébalo tú mismo," never "no nos creas / no pedimos fe."
- **Honest, local es-MX voice** — Mexico-tuned, fully accented, not translated-from-English.

## Proposed slicing (for sign-off)

### Sprint 1 — Content & copy brief (lock the words) · risk: **low** (Roadmap/docs only, **no code**)
- **US-1.** *As Daniel, I want the full per-persona es-MX copy deck + the prompt + the benchmark copy +
  the AI-channel copy locked in writing, so the build sprint is paste-not-author.* **Acceptance:** a
  copy brief in the epic folder containing, for every page, the final accented es-MX strings for every
  `sellerAcquisition` key (hero, proof, steps, agent/self-eval block, router, FAQ, closing), the final
  copy-paste prompt(s), the anchor benchmark table content (with sources + date), and the AI-channel
  section copy. **QA:** Daniel reviews & approves the brief. No code.

### Sprint 2 — Copy + es-MX implementation · risk: **low**
- **US-2.** *As supply traffic, I want every `/vende*` page to read as intentional, accented es-MX copy
  written for my persona, so it persuades instead of reading like placeholder.* **Acceptance:** all
  approved strings land in `locales/es.json`; "No pedimos fe" gone everywhere; the directive prompt is
  what the CTA copies; accents/ñ/¿¡ correct throughout (incl. `mundial`, light-touch). **QA:** anon
  browser smoke per page (renders, CTA copies the new prompt); a quick grep/spec asserting no
  un-accented offenders + no "No pedimos fe" remains.

### Sprint 3 — Benchmark + AI-channel sections · risk: **low**
- **US-3.** *As a cost-sensitive seller, I want a clear Miyagi vs Mercado Libre vs Shopify comparison
  on `/vende`, so I see the savings without doing the math.* **Acceptance:** a responsive comparison
  table section on the anchor (cost + key features), sourced + date-stamped; persona pages keep the
  one-line hook. **QA:** anon smoke + mobile render check.
- **US-4.** *As a merchant, I want to understand selling through AI agents as a new channel.*
  **Acceptance:** an anchor section (and one proof point reused on personas) explaining, truthfully via
  UCP/MCP framing, that agents can find/recommend/buy — with a one-line "how it works." **QA:** anon
  smoke; copy reviewed against the anti-vaporware guardrail.

### Sprint 4 — Mobile-responsive sweep · risk: **low** (announce if it touches shared layout/`globals.css`)
- **US-5.** *As a visitor on a phone, I want every `/vende*` page to fit my screen with no horizontal
  overflow, so the page feels trustworthy.* **Acceptance:** at 360 / 390 / 414px, no horizontal scroll
  or clipped content on `/vende`, `/creadores`, `/negocios`, `/servicios`, `/mundial`; hero stat grids,
  the new table, and long headings wrap/reflow correctly. **QA:** **Daniel-owned mobile smoke** on a
  real phone (responsive bugs evade automated viewport checks) + an automated check at the three
  widths if cheap. *If a fix touches `app/(shell)/layout.tsx` or `globals.css`, announce per LEARNINGS.*

> **Sequencing note:** US-5 (mobile) is independent of copy and could run in parallel / first if Daniel
> prefers a quick correctness win before the content lands. Default order above is content-first per
> Daniel's "content strategy first, then cascade to implementation."

## In / Out of scope (v1)
**In:** full es-MX copy rewrite of all `/vende*` pages (anchor + creadores + negocios + servicios +
mundial-light); accent/ñ/¿¡ correctness sweep; remove "No pedimos fe" everywhere; directive copy-paste
prompt; anchor benchmark table (Miyagi vs ML vs Shopify, sourced); AI-channel value-prop section
(UCP/MCP framing); mobile-responsive sweep; matching OG/SEO copy updates.
**Out:** any change to `/sell`/checkout/commerce/data model; new routes or personas; English variants
(es-MX only, AGENTS rule #5); paid media/campaign ops; a named "buy on ChatGPT" integration claim
(unless separately verified); retiring/repurposing `/vende/mundial` post-tournament (captured below);
the agent-readable "why-sell/about" sibling surface (separate epic, already spawned).

## Open risks / watch-items
- **Benchmark accuracy drift.** Shopify base price + ML category rates move; copy must be date-stamped
  and re-verified at publish, or an agent will catch us being stale (ironic given the pillar).
- **AI-channel over-claiming.** Keep to the UCP/MCP "agent-readable & buyable" framing; don't print a
  named consumer "buy on ChatGPT" button unless verified live.
- **`mundial` duplication.** It's a bespoke page, not on the shared system — every cross-cutting fix
  (accents, mobile) must be applied to it separately. Low effort but easy to forget.
- **Shared-surface caveat.** Mobile fixes *should* stay inside `vende/**`; if they reach `globals.css`
  or `(shell)/layout.tsx`, treat as higher-care + announce (LEARNINGS).

## Spawned work — captured, NOT in this epic (one ask per run)
- **Retire / repurpose `/vende/mundial` after Jul 19** into an evergreen "experiences / tourism"
  persona (or sunset it). Groom post-tournament.
- **Agent-readable "why-sell / about" surface** — author the supply-side value-prop/cost/founder
  content once, render as human landing + agent-readable (already noted in the original epic's spawned
  work; this overhaul produces the copy that would feed it).

## Definition of Ready check
- [x] As-a/I-want/so-that clear; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (light enhancement + two small new sections).
- [x] v1 in/out boundary written.
- [x] Present-day facts researched + cited (ML + Shopify MX pricing, 2026-06-25).
- [x] Reuse list produced (Medusa-first reframe — zero commerce, copy lives in one JSON block).
- [x] Each story risk-tiered (all low); QA stage named per sprint; mobile smoke owner = Daniel.
- [x] Four open decisions resolved with Daniel (2026-06-25).
- [ ] **Daniel approves this scope doc** → then scaffold the v2 epic + sprint docs and emit the
      per-sprint Claude Code kickoffs.
