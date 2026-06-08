---
title: "Seller-acquisition landing pages"
slug: seller-acquisition-landing-pages
status: in-progress
area: "08"
type: feature
priority: wave-3
risk: low
epic: "08-growth-and-promotions/seller-acquisition-landing-pages"
build_order: "#6"
updated: 2026-06-08
---

# Scope — Seller-Acquisition Landing Pages (BUILD-ORDER #6)

> **Status: SCOPE APPROVED 2026-06-07 — all six open decisions resolved (see below).** Ready to
> scaffold the epic + sprints on Daniel's go. Groomed 2026-06-06. Class: **Feature (greenfield,
> growth/supply-side)** — front-loaded with a **strategy + creative** phase before any design or
> build (Daniel's sequencing). Stage-2.5 bucket: **genuinely new** (no seller-recruitment landing
> page exists today).
>
> **Quality over speed (Daniel, 2026-06-07):** the two-track split is approved, but we do **not**
> crash quality to hit June 11. The World Cup is a tailwind through **July 19**, not a hard
> ship-or-miss gate — Track A ships as soon as it's *good*, even if a little into the tournament.

## The ask (mirrored back, corrected)
The BUILD-ORDER line read "**Sellers landing page redesign**," but on disambiguation Daniel
corrected the framing: **this is not a redesign of an existing page, and not the shop storefront.**
It's a **greenfield creative project to build landing pages that recruit new sellers** (supply-side
acquisition) — an **anchor page** (somewhere like `vende.miyagisanchez.com`) for general traffic,
**plus persona-specific landing pages** that match the pain points of our highest-value supply
targets, riding the **2026 FIFA World Cup in Mexico** as a tailwind.

> *You want a system of seller-recruitment landing pages — one anchor + per-persona pages — so that
> top-of-funnel traffic converts into real shops instead of bouncing off a generic pitch. Right?*

**Two corrections vs. the BUILD-ORDER #6 line, for the record:**
1. **The #3a "channel-aware storefront trust-signal audit" constraint does NOT apply here.** That
   constraint was attached to #6 on the assumption #6 was the *shop storefront* redesign. These are
   marketing pages, not the white-label storefront. **The per-channel storefront trust audit should
   move to #3c** (where the storefront trust-polish work lives). *(Flagged for a BUILD-ORDER edit.)*
2. **What does carry over from BUILD-ORDER:** the **#4 design-token dependency** (build on the design
   system, don't invent a parallel one) — with a nuance for the urgent track (see *Open decisions*).

---

## Stage 2.5 — Can we already do this?
**Genuinely new.** There is **no** seller-recruitment landing page today. What exists is the
**conversion destination**, not the funnel into it:
- `app/sell/page.tsx` is the **publish/onboarding wizard** (signed-out: a light "0% comisión" hero +
  CTA; signed-in: `SellWizard` to create a shop + first listing). It's where a convinced seller
  *acts* — not a persuasion surface for cold traffic.
- The platform homepage is buyer/marketplace-oriented, not a supply pitch.

So #6 builds the **top of the supply funnel** and points it at the existing `/sell` destination.
No "already possible" or "light enhancement" path hits the outcome — this is a build. But the
**creative/strategy** must be locked first (Daniel), so Sprint 1 is planning-only.

---

## Strategy (the part to nail first)

### Core supply-side promise
Miyagi already has the proof points a recruitment pitch needs — the landing pages just have to
*say* them sharply, per persona. The differentiators we can stand on **today** (from the poster):
- **0% comisión** — sell with no marketplace fee; get paid directly to your **own** Stripe /
  MercadoPago / SPEI. (The anti-Shopify, anti-marketplace-take hook.)
- **Trae tu tienda en minutos** — express migration / bulk import (file or **paste from Instagram**
  → AI parse → import). The "escape the DMs / escape Shopify" hook.
- **Tu propia tienda en línea, sin construirla** — free shop URL + subdomain + short links + custom
  domain + embeddable widget. A real storefront without building a site.
- **Vende más que productos** — services, rentals, digital goods, subscriptions, events
  (`listing_type`). The hook for experience/service providers.
- **Hecho para México** — SPEI / MercadoPago / efectivo, CP-first addresses, español primero, plus
  the **print edition** (México-86 retro magazine) for local merchants.

### Core creative pillar — "No nos creas, pregúntale a Claude" (the agent as independent auditor)
*(Added 2026-06-07 from Daniel's north-star. This is the trust spine the landing pages stand on.)*

The single sharpest trust move for Mexico: **don't ask the visitor to trust us — tell them to ask
their own AI.** The hero invites: *"¿No nos crees? Pregúntale a Claude / Gemini / ChatGPT: «¿qué es
miyagisanchez.com?»"* The visitor's **own** assistant — which already knows their context — fetches
the site, explains what Miyagi is **in their terms**, and (because there is genuinely no barrier,
cost, or risk to start) recommends they try it. The agent is positioned as a **grounded, independent
auditor**, not our salesperson. *(Companion print/ad creative: "¿tf is Bezos? pregúntale a Claude
sobre miyagisanchez.com.")*

**Why this has real technical legs today (not vaporware):** the platform already ships agent-native
discovery — `/agent`, the UCP manifest, `.well-known/ucp`, and accurate machine-readable catalog
(poster · 07). So an agent *can* read us now. **The gap this pillar exposes:** today's agent surface
describes **buyer/catalog** facts; the "ask Claude about us" use case needs **supply-side + about**
content that's agent-readable — what Miyagi is, *why list here*, *how onboarding works*, pricing, how
we keep costs low, and a (anonymized) founder profile + founder's note + philosophy. 

**The elegant reuse this implies:** author the supply-side value-prop + about/cost/founder/philosophy
content **once**, render it **twice** — as the human landing pages (this epic) **and** as an
agent-readable "why-sell / about" surface (a recommended sibling epic — see *Spawned work*). Same
source of truth, two audiences. The landing pages should be **built to be cleanly agent-fetchable**
(semantic HTML, real text not image-baked copy, structured metadata) so the campaign works the day
they ship.

### Persona evaluation — the "highest domino" lens (Daniel asked for this)
A domino is "highest" if converting that persona (1) is high-value & durable, (2) generates supply
that makes the marketplace better for everyone (a quality flywheel), and (3) is reachable with a
sharp pitch we can **back up today**. Evaluating Daniel's two + my additions:

| Persona | Pitch | Platform fit (proof) | Durability | Verdict |
|---|---|---|---|---|
| **1. Local Creator & Designer** *(Daniel's "Quality Domino")* | "Deja de pagar comisiones de Shopify y de perder ventas en los DMs de Instagram." | **Excellent** — 0% comisión, paste-from-IG import, free subdomain + embed widget, custom-domain upsell | **High, year-round** | **The durable highest domino.** Best-quality supply → quality flywheel. Anchor + this page = the permanent core. |
| **2. Experience & Service Provider** *(Daniel's "World Cup Tourist Magnet")* | "Captura al público global. Publica tus tours, rincones de comida y rentas al instante." | **Strong** — services/rentals/events listing types, arranged delivery, Cal.com scheduling | **Time-boxed** (decays after Jul 19) | **The highest-URGENCY domino.** A wedge, not a foundation — fast-track this week (see timing). |
| 3. Brick-and-mortar local merchant ("changarro" / boutique) | "Tu negocio de la esquina, ahora también en línea — y en la revista." | Differentiated — express migration **+ print edition** (a hook no Shopify/IG competitor has) | High, local | **Strong #3, backlog.** Harder sell (less digital-native); great host-city/geo angle for WC cities. |
| 4. IG/WhatsApp reseller ("revendedor") | "Tus ventas, fuera de los DMs." | Overlaps Creator (same import + storefront hooks) | Medium | **Fold into Creator** as a messaging variant — not a separate v1 page. |
| 5. Services pro (tutores, belleza, oficios, reparación) | "Cobra y agenda sin complicaciones." | Services listing type + scheduling | High, year-round | **Good #4, backlog** — softer WC tie; validate via persona 2's services first. |
| 6. Event organizer / ticketing | — | Needs **#7 (ticket & event mgmt)**, not built | — | **Premature — do not target** until #7 ships. |

**Recommended v1 target set:** **Anchor + Persona 1 (Creator, durable) + Persona 2 (WC Experience,
urgent).** Backlog next: Persona 3 (Print merchant), then Persona 5 (Services pro). Defer Persona 6.

### The timing reality — the headline finding
**The 2026 FIFA World Cup runs June 11 – July 19, 2026** (Mexico hosts: **Mexico City, Guadalajara,
Monterrey**). **Today is June 6 — kickoff is in 5 days.** The tourist inflow is already arriving and
the window is *closing*, not opening. Implication for slicing:

- The normal *strategy → creative → design → build* multi-sprint cadence **cannot** deliver a
  polished WC page before the tournament's peak. So a **two-track** split is recommended:
  - **Track A — time-boxed wedge:** a **lean** WC Experience/Service page, sharp copy, focused
    design, on the **existing** `globals.css` tokens. Ships **as soon as it's good** — ideally early
    in the window, but **quality is not sacrificed for the June 11 date** (Daniel, 2026-06-07): the
    tailwind runs through July 19, so a page that lands a little into the tournament still captures it.
  - **Track B — durable system:** the reusable landing system + anchor + Creator page, built properly
    on the locked creative and the #4 tokens, outliving the tournament.
- **Approved (2026-06-07):** two-track split, with the quality-over-speed caveat above.

*(Source: FIFA — World Cup 2026 host cities & dates; group stage Jun 11–27. Cited because the whole
WC angle leans on a present-day, fast-moving event.)*

### Page architecture (IA)
- **Anchor (`/vende`)** — general supply promise + a **persona router** (cards that route to the
  right persona page: "Soy creador/diseñador" · "Ofrezco experiencias/servicios" · …). Captures
  brand-awareness traffic and self-segments it.
- **Persona pages (`/vende/<persona>`)** — one promise, one audience. Each reuses a **shared section
  system**: hero (persona headline + subhead + primary CTA) → differentiators/proof → cómo funciona
  (3 steps) → social proof → objection handling → final CTA. Persona-specific copy + hooks override
  the shared shell.
- **Primary CTA everywhere → the existing `/sell` onboarding** (optionally deep-linked, e.g.
  `/sell?type=service` to pre-seed the listing type; `?from=<persona>` for attribution).

### Success signal (how Daniel tests it)
What's true after this ships that isn't now: cold supply traffic has a page that **speaks to it** and
**converts to a shop**. Measurable funnel: *landing view → `/sell` start → shop created → first
listing published*, **segmented per persona** via UTM/`?from=` attribution. Reuse **Microsoft
Clarity** (connected) for heatmaps/session recordings + conversion. Optionally attach an acquisition
**incentive** (the WC promo / referral rails already exist).

---

## Medusa-first reframe — what already exists (reuse, don't rebuild)
**Zero Medusa, zero commerce, ~zero backend.** These are presentation/marketing pages that *route*
to the existing onboarding. AGENTS five rules satisfied trivially (no commerce, no Supabase data
model needed if we go direct-to-`/sell`, Clerk untouched — pages are public/anonymous, copy es-MX).

Concrete reuse:
- **`/sell` onboarding + `SellWizard`** — the conversion destination; CTAs deep-link into it.
- **#4 design tokens / `globals.css`** — semantic tokens + UI primitives (`.btn`, `.card-tile`,
  `.badge`, `.chip`, `.t-*` type utilities) already exist; build pages from them.
- **Wildcard `*.miyagisanchez.com` cert** (subdomains epic) — *if* we choose a `vende` subdomain;
  otherwise a `/vende` path needs no infra at all.
- **Reserved-word concept** (custom-slugs epic) — *if* subdomain: `vende` must be reserved so the
  middleware shop-resolver never treats it as a shop slug.
- **Existing World Cup framing** — the "Sube tus promos" coupon campaign + the WC referral angle, for
  message continuity and an optional acquisition incentive.
- **Microsoft Clarity** (connected) — landing-page conversion analytics; no new analytics build.
- **es-MX bilingual** — these pages recruit **local Spanish-speaking supply**; the "global crowd" in
  Persona 2 is the *buyer*, not the page audience, so the page stays es-MX (no English variant in v1).

---

## UX / creative heuristics
- **One page, one persona, one promise.** The anchor self-segments; persona pages never hedge.
- **Proof over adjectives.** Every claim maps to a real capability (0% comisión, paste-from-IG
  import, own subdomain) — no vaporware. *Reference end-states are inspiration, never scope.*
- **Mobile-first, fast.** Cold ad/social traffic on phones; the wedge especially must load fast.
- **CTA is always "empieza a vender" → `/sell`.** Minimize the gap between persuasion and action.
- **Honest, local voice (es-MX).** Mexico-tuned, not translated-from-English marketing.

---

## Proposed slicing (for sign-off) — strategy first, then two tracks

### Sprint 1 — Strategy & Creative lock · risk: **low** (Roadmap/docs only, **no code**)
- **US-1.** *As Daniel, I want the personas, positioning, page IA, and per-persona copy direction
  locked, so design/build start from approved creative.* **Acceptance:** a creative brief in Roadmap
  fixes (a) the v1 persona set (anchor + Creator + WC-Experience), (b) es-MX headline/subhead/proof/
  CTA per page, (c) the shared section system + anchor router, (d) success metrics + attribution
  plan, (e) the per-track #4-token decision. **QA:** Daniel reviews/approves the brief. No code.

### Sprint 2 — Track A: the urgent World Cup wedge page · risk: **low** *(new public page; announce if it touches shared routing/layout)*
- **US-2.** *As a local experience/service provider, I want a page that pitches me on capturing World
  Cup demand, so I list my tour/food/rental fast.* **Acceptance:** a lean page at `/vende/mundial`
  (or the chosen host), es-MX, mobile-first, on **existing** tokens; primary CTA → `/sell?type=service`
  (or chosen deep-link); UTM/`?from=mundial` captured; Clarity tracking on. Ships **within the
  tournament window.** **QA:** **anonymous browser smoke** (page renders, CTA navigates to onboarding)
  — automatable, **not** Daniel-gated; quick Lighthouse/perf pass.

### Sprint 3 — Track B: the durable anchor + Creator system · risk: **low**
- **US-3.** *As a maintainer, I want a reusable landing-section system, so new persona pages are
  config + copy, not net-new layout.* **Acceptance:** shared hero/proof/how-it-works/social-proof/
  objection/CTA components on **#4 tokens**; a pure-logic seam (persona config / UTM parse) extracted
  to `lib/` and unit-tested.
- **US-4.** *As supply-side traffic, I want an anchor page that routes me to my persona.*
  **Acceptance:** `/vende` renders the promise + persona router; cards route to persona pages.
- **US-5.** *As a local creator/designer, I want a page that pitches "leave Shopify/the DMs," so I
  migrate my shop.* **Acceptance:** `/vende/creadores` on the system; surfaces the paste-from-IG
  import + own-storefront hooks; CTA → `/sell?from=creadores`.
- **QA:** anonymous browser smokes per page (render + CTA nav); one `api`/pure-logic spec on the
  extracted `lib/` seam (free coverage per LEARNINGS); perf pass.

### Sprint 4 — more personas + SEO/OG + A/B · risk: **low** · *promoted to PLANNED 2026-06-07*
- Persona 3 (`/vende/negocios` — local/print merchant) → Persona 5 (`/vende/servicios` — services pro);
  per-persona SEO + OpenGraph (sitemap, metadata, OG images); lightweight A/B hooks (variant via
  `lib/flags.ts`/`?v=`, tagged into Clarity). Cheap once S3's section system exists (config + copy).
  **Defer** Persona 6 (event/ticketing — blocked on #7).

---

## In / Out of scope (v1)
**In:** anchor page (`/vende`) + persona router; Persona 1 (Creator) page; Persona 2 (WC Experience)
page; a reusable landing-section system on #4 tokens; CTAs into existing `/sell`; UTM/`?from=`
attribution + Clarity tracking; es-MX copy; the locked creative brief.
**Now also in (Sprint 4, promoted 2026-06-07):** Persona 3 (`/vende/negocios`) + Persona 5
(`/vende/servicios`) pages; per-persona SEO/OG; A/B hooks.
**Out:** any change to `/sell`/checkout/commerce; new Medusa/Supabase data models (direct-to-`/sell`,
no lead-capture table); Persona 6 / event-ticketing (blocked on #7); English-language variants;
paid-ads/media buying (that's campaign ops, not this build); the #3a per-channel **storefront** trust
audit (belongs to #3c).

---

## Resolved decisions (Daniel, 2026-06-07)
1. **World Cup track split.** ✅ **Two-track** approved (Track A wedge + Track B durable) — with the
   **quality-over-speed** caveat: don't sacrifice quality to hit June 11; the tailwind runs to Jul 19.
2. **#4 dependency per track.** ✅ Track B (durable system) waits for #4 tokens; **Track A wedge
   ships on the existing `globals.css` tokens now** and inherits #4 polish later.
3. **Anchor location.** ✅ **`/vende` path** (recommended) — `/vende` + `/vende/<persona>`. No
   middleware change, shared SEO authority, no shop-resolver collision. Subdomain is a later flip.
4. **Persona set + order.** ✅ v1 = **anchor + Creator + WC-Experience**; backlog **Print merchant →
   Services pro**; event/ticketing deferred (blocked on #7).
5. **Acquisition incentive.** ✅ Keep CTAs clean for now ("empieza a vender") — **but** the CTA copy
   is shaped by the agent-native onboarding flow (see *Spawned work* → Onboarding 0): the primary
   action is "pregúntale a Claude / configura con tu agente," landing on `/sell`.
6. **Lead capture.** ✅ **Direct-to-`/sell`**, no new table in v1.

---

## Spawned work — captured, NOT in this epic (one ask per run)
Daniel's 2026-06-07 north-star is bigger than the landing pages. It's captured as a pre-scope vision
in **`Roadmap/00-ideas/seeds/agent-native-gtm/`** and will groom into its own asks. #6 stays bounded
to the landing pages, but is **designed to be compatible** with these (agent-fetchable, CTA aligned):

- **Onboarding 0** — agent-native shop setup: the visitor's own agent produces a standardized setup
  JSON, the visitor signs up (~20s, Google) and pastes/uploads it on onboarding → shop + catalog
  near-fully created; then the agent becomes the ongoing "shop clerk" via MCP/UCP. *(Future epic —
  the deepest, highest-leverage piece. Touches `/sell` onboarding + the import JSON schema + MCP/UCP.)*
- **Agent-readable "why-sell / about" surface** — the supply-side + about/cost/founder/philosophy
  content rendered for agents (extends `/agent`/UCP). **Recommended sibling to #6** — same content
  authored once, rendered as human landing + agent-readable. *(Could be a #6 stretch or its own epic.)*
- **"Ask Claude about miyagisanchez.com" outreach campaign** — print + digital creative
  ("no nos creas, pregúntale a Claude"; "¿tf is Bezos?"). *(Campaign design — separate chat.)*
- **Business model & pricing** — print ads · seasonal merch/swag (rotating designer themes) ·
  custom domain (first-class, price TBD) · subdomain (second-class, price TBD). *(Strategy/pricing.)*
- **About / cost-transparency / founder content** — "how & why we keep costs low," anonymized
  founder profile (experience validation), founder's note, philosophy/thought-leadership. *(Content;
  feeds both the landing pages and the agent-readable surface.)*

---

## Definition of Ready check
- [x] As-a/I-want/so-that clear; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (genuinely new — no recruitment page exists).
- [x] v1 in/out boundary written; persona eval + recommendation produced.
- [x] Present-day facts researched + cited (World Cup 2026 dates/host cities).
- [x] Reuse list produced (Medusa-first reframe — zero commerce, direct-to-`/sell`).
- [x] Each story risk-tiered (all low); QA stage named per sprint; smoke owner identified
      (anonymous browser smokes — agent-owned, not Daniel-gated).
- [x] **Daniel approved this scope doc (2026-06-07)** — all six decisions resolved above.
- [ ] *(On scaffold: BUILD-ORDER edit owed — restate #6 as greenfield seller-acquisition landing
      pages; move the #3a per-channel storefront trust audit to #3c; note the spawned agent-native-gtm
      vision + its future asks.)*
- [ ] *(Next: scaffold epic + sprints under `08-growth-and-promotions/` on Daniel's go; emit Claude
      Code kickoff prompts — Track A wedge first.)*
