# Ask-Claude Campaign — Consolidated Notes & Validation (WORKING DRAFT)

> **Status: WORKING capture (2026-06-08).** Daniel's loose campaign notes, disambiguated and
> validated against the three `agent-native-gtm/` seeds **and the live codebase**. Not groomed,
> not scoped, not committed. This is the grounded base for the campaign brief — it is **not** a
> canonical doc. Nothing here has been committed; review and tell me where it should live.
> Companion to [`ask-claude-campaign.md`](ask-claude-campaign.md) and [`README.md`](README.md).

---

## How to read this
The raw notes blended **several distinct marketing motions** into one list. I've split them into
**9 workstreams**, mapped each to what already exists in code (validated 2026-06-08), and pulled the
**money/legal/decision** items into their own section so they don't get lost. Headline: most of the
acquisition plan rides **primitives that already ship** — this is packaging + decisions, not net-new build.

---

## Decisions locked (2026-06-08)
- **Incentive (D1 resolved):** **free year 1, then standard price** — for both custom domain and
  subdomain cohorts. Preserves the SKU; still a strong founding hook. (Supersedes "free for life".)
- **Featured Designer (WS-2):** shape stays flexible (theme takeover *or* featured slot) **+ a merch
  tie-in** (designers sell seasonal merch — ties to the business model).
- **Outreach = two tracks (WS-5 / D3 resolved):**
  1. **White-glove 1:1** — Daniel personally writes + manually sends to **top-tier creators** (earned-media
     targets, WS-6). Not automated. Quality over volume; a single mention is the prize.
  2. **Mass outreach** — everyone else (migrant sellers, WS-5), on a **deliverability-protected** setup
     (separate sending subdomain or a dedicated cold-outreach tool), per-persona templates + a hand-written
     line. Kept off the production transactional domain.
- **Lead persona:** research-driven (below) — not picked from the loose list.

---

## Persona prioritization (research-backed, 2026-06-08)
Scored on volume, wedge strength, switching cost, built-tooling support, World-Cup fit, and cost-to-acquire.
**Key external facts:** Mercado Libre MX takes **8–20.5%** per sale + per-unit fees on cheap items + **2.5%
ISR from 2026**; Tiendanube/Shopify MX run **~$99–$650+ MXN/mo + gateway %**; **72–80% of NENIS / 75% of
solo entrepreneurs already sell direct via social + WhatsApp** (the cost wedge is *weak* there — they pay ~$0
now); World Cup runs **Jun 11–Jul 19 2026**, Mexico plays Estadio Azteca (CDMX) + Akron (Guadalajara).

**Wave 1 reframe (Daniel, 2026-06-08): "Hidden Gems for the World-Cup visitor."**
The printed editorial (México-86 magazine / trifold) targets **visitors** — *"¿solo conoces la Condesa y
Coyoacán? Aquí están las joyas escondidas"*: local cuisine, tours, art, shows — **and we can sell tickets**.
Curate cool events/experiences visitors want, feature the gems, then **convert the featured gems into
sellers** (they claim their pre-built shop). A **demand-gen + curated-supply** motion, not a cost-wedge
migration. The cost-wedge migrant play (Mercado Libre etc.) moves to a **later, opportunistic wave** — and
the **ML scraper is unreliable, so we do NOT rely on it** (Daniel).

**Realistic onboarding workflow (Daniel):** quality over quantity, few to start. Daniel/Cowork curates gems →
**screenshots/site → Claude extracts into the documented schema → upload → unclaimed *claimable* shop** →
feature in the magazine → seller claims. No scraper needed — supply-import schema + bulk-upload are built.

| Persona / segment | Role in Wave 1 | Wedge | Built support |
|---|---|---|---|
| **Hidden-gem experiences** (food, tours, art, shows, tickets) | **LEAD — curated supply** | "Free storefront + featured to WC visitors + we sell your tickets/tours, 0%" | Events&Ticketing S1 **live** · supply import · claim · print editor |
| **WC visitors / tourists** | **Demand** (magazine audience) | A curated guide beyond the obvious neighborhoods | Print editor · catalog · Neighborhood Pulse (adjacent) |
| **Collectors** (Chopo, Rockshop) | Wave 1 foot/field | "Get online free, agent sets it up" | Bulk import · claim |
| **Paid-platform migrants** (ML, Tiendanube, BigCartel) | **Later / opportunistic** | 0% vs 8–20.5% / monthly fees | Supply schema / bulk import (NOT the flaky ML scraper) |
| **Social sellers** (IG/WhatsApp) | **Wave 2 (scale, gated)** | Agent-native free setup | Bulk import + Onboarding-0 (scaffolded) |
| **Creators** (Cotorrisa, Ballarta…) | Parallel white-glove (+ possible featured gems) | Rebel/community mention | Claim (host their shops) |

**Why this sequences cleanly around the launch gate:** the hidden-gems editorial sells itself to visitors and
to gems via the *offer* (free + featured + ticket sales) — it does **not** depend on an agent persuading
anyone, so it runs **before** the about-surface ships. The agent-native social-seller scale wave stays Wave 2.

**Caveat to verify in planning:** Events & Ticketing **Sprint 1 is live** (paid admission + date/venue/aforo +
buyer confirmation, agent-buyable) — so we *can* sell show/tour tickets now. The **scannable
redeem-at-the-door QR + free RSVP** are **S2/S3, in progress, not yet live**. Plan ticket-selling around
paid-admission-with-confirmation today; door-scan lands soon.

**Related existing work (the seed Daniel half-remembered):** no prior "hidden gems" campaign seed, but two
adjacent pieces exist — **Neighborhood Pulse** (`01-discovery-and-shopping/neighborhood-pulse`,
scaffolded/signed-off: colonia-tagged community + trending feed, reuses events) and **Events & Ticketing**
(S1 live). Cross-link both; the campaign duplicates neither.

---

## Magazine — "Mexico 26" editorial (Daniel's vision, 2026-06-08)
Concept: a **_This Is England_ / _This Is Germany_–style cultural document** of Mexico at the 2026 World Cup —
"**Mexico 26**" (also nods to the México-86 retro magazine, the live print-ad monetization). Subculture,
authentic, rebel tone (fits Konzz's retro-punk + the "únete a la rev" spine). Trifold, **Carta** size.
**Every entry carries a QR / direct link** → the site, the gem's claimable shop, or the digital magazine.

Table of contents (from Daniel — to refine):
1. **"¿Solo conoces la Condesa y Coyoacán?"** — the hidden-gems guide: local cuisine, tours, creators, hidden
   spots → each is a **claimable shop we pre-upload** (the curated supply).
2. **Editorial note — Daniel** (founder's note; doubles as the about-surface "founder's note" content owed).
3. **"State of Mexico 26"** — editorial state-of-things piece.
4. **Guest-author note — surprise featured artist** (Featured Designer guest piece: Konzz / Oscar / Enrique).
5. **"¿Por qué miyagisanchez? Únete a la rev"** — the why-sell / manifesto (rebel-against-the-machine; feeds
   the about-surface why-sell content).
6. **Homage to University of Aberdeen** — Daniel writes this himself (1 of 2). Scotland's back at the WC after
   28 yrs (**Group C** w/ Brazil, Morocco, Haiti; **Scotland v Brazil Jun 25, in Miami** — not MX → a
   diaspora/online cross-promo, possible cross-post w/ the Aberdeen uni newspaper). Riffs (Tartan Army /
   Seaton Park): "No Scotland No Party," "Here's your famous Aberdeen." *(Verify any chant lyrics before print.)*
7. **"Pregúntale a Claude sobre Miyagi"** — the trust-spine campaign creative.
8. **QRs / direct links throughout** → site, shops, digital magazine (attribution per WS-9).

*Build: the in-app **print editor** (`PrintAdBuilder`) exists; **Claude Design** is the richer option for the
trifold creative (on-brand, exports PDF/PPTX, hands off to Code).*

---

## Wave-1 hidden-gems shortlist (starter — CDMX-first, 2026-06-08)
Grounded candidates to curate → pre-build as claimable shops → feature. CDMX leads (Azteca matches + fan
traffic); GDL (Akron; Mexico v South Korea Jun 18) + MTY expand. Each gem → a claimable shop
(`listing_type=service` for tours/experiences/local biz); shows/tours can **sell tickets** (Events S1).

- **Food / markets (beyond the obvious):** Mercado de Medellín (Roma Sur, "Little Latin America") · Mercado
  San Juan (Centro, gourmet/exotic) · San Rafael + Mercado San Cosme (art-deco barrio, galleries, tacos) ·
  Portales tianguis (working-class) · La Merced (historic mega-market) · San Miguel Chapultepec (traditional)
  · Campeche St tianguis (Condesa, Fri). → individual fondas / stalls / specialty vendors as shops.
- **Shows / ticketed experiences:** lucha libre — Arena México (Tue/Fri/Sun) / Arena Coliseo (Sat); tour
  operators bundling tacos+mezcal+lucha (sell tickets/slots) · pulquerías, cantinas, live-music/cabaret.
- **Art / creators / subculture:** San Rafael galleries · local artists · **Tianguis Cultural del Chopo**
  (Sat — punk/alt, on-tone) · the featured designer + guest artists.
- **Collectors (Daniel's notes):** Comic's Rock Show (Metro Hidalgo) · Rockshop · El Chopo — comics/MTG/vinyl.

> Suggestions to validate on the ground; Daniel curates the final few (quality over quantity). Per-gem
> contact/handle research is a follow-on once the pillars are locked.

---

## Onboarding workflow — gem → claimable shop (the loop I'd run)
Quality over quantity, manual curation, **no scraper**. End to end:
1. **Curate** a gem (Daniel picks, or I propose from the shortlist).
2. **Capture** — Daniel sends screenshots / a site or IG URL / a paste.
3. **Extract (me)** — structure it into the documented schema (`SUPPLY_IMPORT_SCHEMA.md`: source_url, title,
   description, price, shop_name, location, state, municipio, image_url, category, `listing_type`, condition;
   `service` for tours/experiences/local biz).
4. **Stage → import** — via `/api/supply/*` (stage → review → import) or the bulk-upload paste→AI→staging grid;
   creates an **unclaimed, claimable shop** (`clerk_user_id: null`).
5. **Feature** — the gem goes in the magazine with a **QR → its `/s/[slug]` claim page**.
6. **Convert** — seller hits "¿Es tuya esta tienda? Reclámala", claims free (free-year-1 perk); their own
   agent then polishes/maintains (Onboarding-0, when shipped).

*All primitives exist today except Onboarding-0's guided loop (scaffolded). Tickets: paid admission live;
door-scan soon.*

---

## The 9 workstreams

### 1. Trust spine & creative (the umbrella)
The "**No nos creas, pregúntale a Claude**" mechanic from the seeds. Notes add a sharpened emotional
angle that resonates: **rebel-against-the-machine / "this is the time Claude takes down Bezos"**, and
community ownership ("they built their community, it's theirs"). Every other workstream borrows this spine.
- *Maps to:* `ask-claude-campaign.md`, `agent-native-gtm/README.md` (trust spine).
- *Gate:* the persuasive **supply-side answer** an agent gives is still thin (see Validation) — `agent-readable-about-surface` is the launch gate.

### 2. Featured Designer program (World Cup activation)
- **Konzz** — first featured designer (retro-punk vibes). **Oscar** & **Enrique** — backup/next.
- All three featured **during the World Cup**, idea: rotate **per Mexico match**.
- Oscar pitch also includes: organize *"retas México contra el mundo"*, open his own shop, refer friends.
- Enrique: feature him + his businesses.
- *Maps to:* business-model seed (#5 — "seasonal merch designed by a rotation of designers").
- *Built today:* **`lib/platform-theme.ts` + `PlatformThemeToggle` + `PlatformBrand`** — the homepage
  already runs a designer-rotation theme ("Miyagi x Designer N · Colección de temporada"). A featured
  designer is an **existing capability**, not a build. **`lib/sweepstakes.ts`** (bilingual) could power a
  per-match giveaway.

### 3. Guerrilla / field distribution
- Strategic route to **paste posters** (high-traffic points), **stencils** (Chapultepec sidewalks + high
  foot-traffic), **flyers + trifolds** (the first magazine print).
- Drop points: **Rockshop, Tianguis de Polanco, Tianguis del Arte (Sullivan), El Chopo**, + upcoming bazaars.
- **Piggyback creator exhibitions**: find where high-pull creators show next and go distribute + talk —
  e.g. [@licenciadodominguez](https://www.instagram.com/licenciadodominguez/),
  [@sofiaweidner](https://www.instagram.com/sofiaweidner/),
  [@elmanchon_oficial](https://www.instagram.com/elmanchon_oficial/).
- *Research subtask:* a calendar of upcoming CDMX creator flea-markets / bazaars + where those creators
  exhibit next. (IG is hard to fetch programmatically — likely manual + web search; flag.)
- *Note (legal):* sidewalk stenciling can count as vandalism in CDMX — worth a quick check before routing.

### 4. Foot-soldier referral acquisition
- **"Primos código de referidos"** — give each cousin/recruiter a code; they acquire on foot, attributed.
- **Mariana & Lucero** on **UNAM duty**.
- *Built today:* **`lib/referrals.ts`** — stable per-user 6-char codes (`getOrCreateReferralCode`),
  **signup attribution** (`attributeReferral`), a "Mis referidos" stats page, and admin-editable reward
  settings (no deploy). The **attribution plumbing is ready to reuse.**
- *Gap:* the **reward economics are buyer-purchase-oriented** — reward = a one-use *miyagiprints print-ad
  coupon* minted on the **referred buyer's first order**. For **seller** acquisition (and the domain perks
  in WS-7) the reward type/trigger would need extension, or manual fulfillment at first. → Decision D4.

### 5. Seller migration / direct outreach
- Find shops on **IG** susceptible to migrate; specifically **BigCartel Mexican tenants** → wedge them with
  a **no-brainer switch on cost savings**, onto the subdomain tier.
- **Cold email / outreach in general**: draft emails **per persona / per wedge / by highest domino**; run
  **market research** to build a target list; needs a way to **write personalized notes by hand**.
  Daniel uses **Resend** in production.
- Core idea: **pre-build claimable shops** for the highest-domino local sellers; link back to their
  sites/original content.
- *Built today (this is the big one):*
  - **Claim flow = live "Google My Business" pattern.** `app/s/[slug]/claim/page.tsx` shows
    *"¿Es tuya esta tienda? Reclámala"* for an **unclaimed** shop (no `clerk_user_id`), flips to
    "Reclamada" + owner-recovery once claimed. `lib/claimJwt.ts` (signed 24h claim tokens),
    `ClaimButton`/`ClaimForm`.
  - **`lib/provisioning.ts`** creates **unclaimed shop mirrors** that a seller can later claim.
  - **Scrapers** (`lib/scrapers/mercadolibre.ts`, `serpapi.ts`) + **supply import** (`lib/supply.ts`,
    `app/admin/scrape`, `app/supply/`) to source the pre-build content.
  - So **pre-populate → seller claims** is buildable **today**.
- *Gaps:* (a) current scrapers are **MercadoLibre + SerpAPI**, **not IG/BigCartel** — those need new
  adapters **or** route through paste/file **bulk import** instead. (b) Cold-email tooling — see D3.
- *Decisions:* D2 (consent/brand), D3 (Resend deliverability).

### 6. Creator / earned-media (a mention)
- Target voices: **La Cotorrisa, Carlos Ballarta, Ruzzarin, Niñas Bien, Leyendas (Legendarias?),
  Relatos de la Noche, Remanchados de Miedo, Videoclub de Medianoche** — find the angle per show.
- Angle: **rebel-against-the-machine / community ownership**. Goal is simply **to be on their radar** — a
  single podcast mention would be huge. **No signup required**; could offer to host all their shops; lean on
  the "ask Claude" mechanic.
- *Distinct from WS-5:* this is **earned media / influencer**, low-ask, high-leverage — not a migration sale.

### 7. Acquisition incentive structure
- Apply a **specific code on signup**.
- **First 100** signups → **custom domain free for life**. **Next 100** → **subdomain free for life**.
- *Built today:* coupons/promotions exist (`app/admin/coupons`, `app/shop/manage/promotions`,
  platform-coupon minting). Signup attribution exists (WS-4).
- *Gap:* "free **domain** for life" is a **domain entitlement**, not a coupon — net-new (or manual ops at
  first). → Decision D1 (this also **collides with the business model** — see Conflicts).

### 8. Print production
- **First magazine** → the handout is a **trifold**. Open question: **use the built editor?**
- *Built today:* **`app/sell/print/[editionId]/PrintAdBuilder.tsx`** + `app/admin/print/` — there **is** a
  built print-ad/edition editor (the México-86 magazine is the live print-ad monetization). That's the
  "built editor." **Claude Design** is the richer alternative for the trifold creative (on-brand, exports
  PDF/PPTX, hands off to Code).
- *Quick fact (asked):* **A4 (210×297 mm) ≠ Carta/Letter (216×279 mm).** Mexico predominantly uses
  **Carta**. Design the trifold to **Carta** unless the printer specifies A4.

### 9. Measurement & attribution
From the seeds + notes: **signup codes** (incentive WS-7 + per-recruiter referral WS-4), **unique landing
slugs per creative**, **UTM** links the agent surfaces, **QR codes** → the prompt, and **Microsoft Clarity**
(connected) for on-site behavior. A live Cowork **artifact** dashboard + a weekly **scheduled** digest can
sit on top.

---

## Conflicts & decisions needed (flagged — not decided)

- **D1 — RESOLVED (2026-06-08):** **free year 1, then standard price** for both cohorts. Preserves the
  paid SKU while keeping a strong founding hook. (Chosen over free-for-life / badge+discount.)
- **D2 — Pre-built claimable shops: consent / brand posture (LEGAL).** Auto-creating shops from a creator's
  IG/site touches impersonation/trademark. "Link to their original content" mitigates; the live claim flow
  helps. Need a clear **opt-out / "remove my shop"** path and a stance on using marks/logos before claim.
- **D3 — Cold outreach via Resend (DELIVERABILITY).** Resend is a **transactional** ESP; cold/bulk outreach
  through your production domain risks your **transactional sending reputation** and may breach Resend's
  positioning + Mexican anti-spam norms. Suggested approach: a **separate sending subdomain** for outreach,
  small batches, per-persona templates with a **hand-written personalized line** (mail-merge + manual field).
  Open to alternatives (e.g. a dedicated outreach tool).
- **D4 — Referral reward type.** `referrals.ts` rewards a **buyer** with a print-ad coupon on first **order**.
  For seller-signup + domain perks, either extend the reward engine or fulfill manually at first.

---

## Open questions
1. **Lead persona / highest domino** to open with: collectors (Chopo/Rockshop) · social sellers (IG/WhatsApp) ·
   BigCartel migrants · creators (earned media)?
2. **Featured Designer mechanic:** full theme takeover per Mexico match, or a featured slot/collection? Merch tie-in?
3. **Pre-built shops scope:** how many, which sources (only ML/SerpAPI scrapers exist; IG/BigCartel need
   adapters or manual bulk-import)?
4. **Incentive (D1):** cohort sizes + "for life" vs time-boxed.
5. **Magazine trifold:** built print editor vs Claude Design?

---

## Appointments / action tracker
- **Konzz** — call **tomorrow (Tue 2026-06-09) 12:00** · *booked*. First featured designer (retro-punk).
- **Oscar** — meet · *booked*. Pitch: organize "retas México contra el mundo", open his shop, featured +
  referrals.
- **Enrique** — meet · *not booked*. Featured + his businesses.

---

## What's already built — validation table (2026-06-08)
| Note / idea | Status in code | File(s) |
|---|---|---|
| Per-recruiter referral codes + signup attribution | **Built** (reuse) | `lib/referrals.ts` |
| Referral **reward = domain perk / seller signup** | **Gap** | (reward is buyer print-ad coupon) |
| Pre-built **claimable** shops ("ready to be claimed") | **Built** (GMB pattern) | `app/s/[slug]/claim/`, `lib/claimJwt.ts`, `lib/provisioning.ts` |
| **Sell show/tour tickets** (paid admission + confirmation, agent-buyable) | **Built — S1 live** | `10-events-and-ticketing` (S1 prod 2026-06-08), `lib/event-tickets.ts`, `lib/paid-event-tickets.ts` |
| Scannable **door-redeem QR + free RSVP** | **In progress** (S2/S3) | `events-and-ticketing/sprint-2,3` |
| **Screenshots/raw → AI extract → staged import** (Daniel's workflow) | **Built (shipped)** | `bulk-upload-agentic` seed (shipped), `lib/catalog-import.ts` |
| **Supply import schema** → unclaimed claimable shop | **Built + documented** | `SUPPLY_IMPORT_SCHEMA.md`, `/api/supply/*`, `lib/supply.ts` |
| ML/SerpAPI scraper to source content | **Built but UNRELIABLE — don't rely (Daniel)** | `lib/scrapers/*` |
| Neighborhood/colonia discovery feed (adjacent) | **Scaffolded** (signed off) | `01-discovery-and-shopping/neighborhood-pulse` |
| Signup **incentive code** | **Partial** (coupons exist) | `app/admin/coupons`, `shop/manage/promotions` |
| **Free domain for life** entitlement | **Gap** (net-new / manual) | — |
| Featured-designer theme rotation | **Built** | `lib/platform-theme.ts`, `PlatformBrand` |
| Per-match giveaway | **Built** (sweepstakes) | `lib/sweepstakes.ts` |
| Magazine / trifold "built editor" | **Built** | `app/sell/print/[editionId]/PrintAdBuilder.tsx`, `app/admin/print` |
| Persuasive **supply-side agent answer** (campaign gate) | **Gap** (launch gate) | `agent-readable-about-surface` (scaffolded) |
| On-site measurement | **Built** (connected) | Microsoft Clarity |

---

## Sources (persona research, 2026-06-08)
- Mercado Libre MX commissions (8–20.5% + per-unit fees + 2.5% ISR 2026): [Wivo Analytics](https://www.wivoanalytics.com/blog/cuanto-cobra-mercado-libre-por-venta-en-2025-guia-completa-de-comisiones-envios-y-mas/), [Tiendanube blog](https://www.tiendanube.com/blog/comision-mercado-libre-mexico/)
- Tiendanube / Shopify MX costs: [negocioderopa.com.mx](https://negocioderopa.com.mx/blog/shopify-vs-tiendanube/), [Tiendanube costos](https://www.tiendanube.com/blog/tiendanube-costos/)
- Social/WhatsApp selling prevalence (72–80% NENIS/solo entrepreneurs): [Roastbrief/Canva](https://roastbrief.com.mx/2025/12/el-comercio-visual-se-apodera-de-mexico-canva-descubre-que-el-72-de-las-nenis-y-el-75-de-los-emprendedores-individuales-y-pymes-ahora-venden-directo-desde-sus-redes-sociales-y-whatsapp/), [GoDaddy](https://www.godaddy.com/resources/latam/emprender/redes-sociales-pymes-mexico-2025)
- World Cup 2026 dates/host cities: [FIFA](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/host-cities), [Wikipedia](https://en.wikipedia.org/wiki/2026_FIFA_World_Cup)
- Scotland WC 2026 (Group C; v Brazil Jun 25 Miami; 28-yr absence): [ESPN](https://www.espn.com/soccer/story/_/id/47200957/scotland-2026-world-cup-draw-brazil-morocco-tough-group), [Sky Sports](https://www.skysports.com/football/news/12098/13543087/world-cup-2026-group-c-guide-fixtures-schedule-standings-and-odds-for-scotland-brazil-morocco-and-haiti)
- CDMX hidden gems / markets: [Indie Traveller](https://www.indietraveller.co/mexico-city-hidden-neighborhoods/), [CityUnscripted](https://www.cityunscripted.com/travel-magazine/hidden-gems-in-mexico-city)
- Lucha libre venues/tickets: [Get Lost in Mexico City](https://getlostinmexicocity.com/lucha-libre-mexico-city/)
