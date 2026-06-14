# Ask-Claude Campaign — Brief ("Mexico 26")

> **Status: DRAFT (2026-06-08) — uncommitted, for Daniel's review.** Not groomed scope; a campaign plan.
> Grounded in [`campaign-notes-consolidated.md`](campaign-notes-consolidated.md) (notes + build validation +
> persona research) and the `agent-native-gtm/` seeds. Docs are English; quoted creative stays es-MX.
> **Spawned ask #4** of the Agent-Native GTM north-star ([`README.md`](README.md)).

---

## 1. Thesis (one breath)
Don't ask Mexican sellers to trust *us* — tell them to ask **their own AI**. Anchored on the **2026 World
Cup in Mexico (Jun 11–Jul 19)**, we publish **"Mexico 26"** — a *This-Is-England*–style cultural document /
hidden-gems guide for visitors — and use it to **pre-build claimable shops** for the local gems we feature.
The reader's agent fetches the site, gives a grounded answer, and the gem claims a shop that's **free, with
0% commission**. Worst case: free distribution and a great city guide.

## 2. Objectives & success metrics
| Objective | Primary metric | Source |
|---|---|---|
| Activate local sellers | **Claimed shops** in the window (north star) | claim flow / Supabase |
| Seed curated supply | Gems **pre-built** (claimable shops created) + **featured** | supply import |
| Sell experiences | Ticket / tour **admissions sold** via featured gems | Events (S1) |
| Drive awareness | QR scans · unique landing-slug hits · Clarity sessions · signup-code redemptions | Clarity · UTM · codes |
| Earn media | Creator **mentions** + est. reach | manual tracking |
| Attribute foot effort | Per-recruiter **referral-code** signups (primos / UNAM) | `referrals` |

> Attribution honesty: the "asked an agent" step is off-platform. We instrument the *next* step — QR/links,
> unique magazine slugs, signup + referral codes, Clarity — and accept the agent step as a proxy.

## 3. The trust spine (creative core)
**"No nos creas, pregúntale a Claude."** Emotional register: **rebel-against-the-machine / community
ownership** ("this is the time Claude takes down Bezos"; "they built their community — it's theirs"). Lines
to refine (es-MX):
- *"¿No nos crees? Pregúntale a Claude: «¿qué es miyagisanchez.com?»"*
- *"¿tf is Bezos? Pregúntale a Claude sobre miyagisanchez.com."*
- *"No confíes en nosotros. Confía en tu propia IA."*

The full per-persona × channel set is the **creative variant matrix** (separate deliverable).

## 4. Audience & personas (by wave)
| Segment | Wave | Role | Wedge |
|---|---|---|---|
| **Hidden-gem experiences** (food, tours, art, shows, tickets) | **1 — lead** | Curated supply | Free storefront + featured to WC visitors + sell your tickets/tours, 0% |
| **WC visitors / tourists** | **1** | Demand (magazine audience) | A curated guide beyond Condesa/Coyoacán |
| **Collectors** (Chopo, Rockshop) | **1** | Foot/field | Get online free; agent sets it up |
| **Creators** (Cotorrisa, Ballarta…) | Parallel | Earned media (+ possible featured gems) | Rebel/community; a mention |
| **Paid-platform migrants** (ML, Tiendanube, BigCartel) | Later/opportunistic | Cost wedge | 0% vs 8–20.5% / monthly fees |
| **Social sellers** (IG/WhatsApp) | **2 — scale** | Largest pool | Agent-native free setup ("your AI builds your shop") |

## 5. Phased plan (sequenced around the launch gate)
- **Wave 1 — runs NOW, before the about-surface ships.** The hidden-gems offer (free + featured + ticket
  sales) **sells itself** — it doesn't need an agent to persuade, so it's **not blocked** by the agent
  about-surface. Pre-build + feature gems, distribute the magazine, foot referral, creator white-glove,
  featured-designer per Mexico match.
- **Launch gate → Wave 2.** When **`agent-readable-about-surface`** ships (the persuasive supply-side answer)
  + **Onboarding-0** lands, flip on the at-scale **social-seller** wave: "ask Claude → it sets up your shop
  free." Biggest pool; deliberately second.

## 6. The "Mexico 26" magazine (editorial + production)
A cultural document of Mexico at the WC moment — subculture, authentic, rebel tone (fits Konzz's retro-punk +
"únete a la rev"). Trifold, **Carta** size. **Every entry carries a QR / link** → site · the gem's claimable
shop · the digital magazine.

**Table of contents (refine):**
1. **"¿Solo conoces la Condesa y Coyoacán?"** — the hidden-gems guide; each gem = a **claimable shop we pre-upload**.
2. **Editorial note — Daniel** (founder's note; doubles as about-surface content).
3. **"State of Mexico 26"** — editorial.
4. **Guest author — surprise featured artist** (Featured Designer: Konzz / Oscar / Enrique).
5. **"¿Por qué miyagisanchez? Únete a la rev"** — why-sell / manifesto.
6. **Homage to U. of Aberdeen** — Daniel writes it; Scotland back at the WC (Group C; v Brazil Jun 25, Miami →
   diaspora/online cross-promo; possible uni-newspaper repost). Riffs: "No Scotland No Party," "Here's your
   famous Aberdeen." *(Verify chant lyrics before print.)*
7. **"Pregúntale a Claude sobre Miyagi"** — trust-spine creative.
8. **QRs / links throughout** (attribution per §11).

**Production:** the in-app **print editor** (`PrintAdBuilder`) exists; **Claude Design** is the richer route
for the trifold (on-brand, exports PDF/PPTX, hands to Code). Decision owed (§12).

## 7. Wave-1 hidden-gems supply
**Shortlist (CDMX-first; starter — validate + curate down to a quality few):**
- **Food / markets:** Mercado de Medellín · Mercado San Juan · San Rafael + Mercado San Cosme · Portales
  tianguis · La Merced · San Miguel Chapultepec · Campeche St tianguis (Fri).
- **Shows / ticketed:** lucha libre (Arena México Tue/Fri/Sun · Arena Coliseo Sat) · taco+mezcal+lucha tour
  operators · pulquerías / cantinas / live music.
- **Art / subculture:** San Rafael galleries · local artists · **Tianguis Cultural del Chopo** (Sat).
- **Collectors:** Comic's Rock Show (Metro Hidalgo) · Rockshop · El Chopo.

**Onboarding loop (gem → claimable shop), manual, no scraper:**
curate → Daniel sends screenshots/URL/paste → **I extract into the documented schema** (`SUPPLY_IMPORT_SCHEMA.md`,
`listing_type=service` for experiences) → stage→import via `/api/supply/*` or bulk-upload → **unclaimed
claimable shop** → feature in magazine with a **QR → `/s/[slug]` claim page** → seller claims free → their
agent maintains it (Onboarding-0, when shipped).

## 8. Channels / motions (condensed)
- **Print + field:** magazine/trifold + flyers + posters (high-traffic) + stencils (check legality) at
  Rockshop, Tianguis de Polanco, Tianguis del Arte (Sullivan), El Chopo, bazaars; **piggyback creator
  exhibitions** (find where high-pull creators show next — research follow-on).
- **Foot referral:** "primos código de referidos" + Mariana & Lucero (UNAM) — per-recruiter codes (built).
- **Featured Designer (WC):** Konzz first (retro-punk), Oscar + Enrique next; rotate **per Mexico match**;
  flexible (theme takeover or slot) **+ merch tie-in**. Theme rotation is built (`platform-theme.ts`).
- **Earned media:** white-glove (§9).
- **Agent-native (Wave 2):** the "ask Claude" loop at scale once the gate clears.

## 9. Outreach — two tracks
1. **White-glove 1:1 (Daniel writes + sends manually):** top-tier creators — La Cotorrisa, Carlos Ballarta,
   Ruzzarin, Niñas Bien, Relatos de la Noche, Remanchados de Miedo, Videoclub de Medianoche. Angle:
   rebel/community; offer to host their shops; goal = a mention. No automation.
2. **Mass outreach (the rest):** per-persona templates + a hand-written line, on a **deliverability-protected**
   setup — a **separate sending subdomain** (keep it off the production transactional domain) or a dedicated
   cold-outreach tool. Target list built from research.

## 10. Incentives & referral
- **Signup incentive (resolved):** **free year 1, then standard** — first cohort custom domain, next cohort
  subdomain. Applied via a **signup code**. (Preserves the paid SKU.)
- **Referral (built, with a gap):** per-user codes + signup attribution exist (`referrals.ts`). **Gap (D4):**
  rewards today are buyer print-ad coupons on first order — the **seller-signup / domain-perk** reward needs
  an extension or manual fulfillment. Flag to Claude Code.

## 11. Measurement & attribution
Unique **landing slug per creative**, **UTM** on every link the agent/print surfaces, **QR** per magazine
entry/section, **signup code** (incentive) + **referral codes** (foot), **Microsoft Clarity** (connected) for
on-site behavior. Stand up a **live Cowork artifact dashboard** (pulls Clarity + claim/signup counts) + a
**weekly scheduled digest**.

## 12. Dependencies, risks & open decisions
**Launch gate (Wave 2 only):** `agent-readable-about-surface` (scaffolded) — the persuasive supply-side answer.
**Adjacent build state:** Events & Ticketing **S1 live** (paid admission + confirmation; **door-scan QR + free
RSVP = S2/S3, in progress**); Onboarding-0 (scaffolded); Neighborhood Pulse (scaffolded, adjacent).

Open decisions:
- **D2 — consent/brand** when pre-building a gem's shop from their content (softer for public markets/venues;
  "we link to you + you can claim or remove" mitigates). Need a clear opt-out line.
- **D4 — referral reward** extension for seller/domain perks (or manual at first).
- **Magazine build:** `PrintAdBuilder` vs **Claude Design** for the trifold.
- **Lead-gem curation:** Daniel picks the quality few from the shortlist.

Resolved: incentive (free year 1) · featured-designer (flexible + merch) · outreach (two tracks) · Wave-1
framing (hidden gems) · ML scraper not relied on.

## 13. Timeline (World-Cup anchored)
- **Now → Jun 10 (pre-launch):** lock framing · curate + pre-build first gems · design the trifold · set up
  measurement (codes, QR, Clarity, dashboard) · Konzz call (Jun 9, 12:00) + Oscar/Enrique meets · build
  outreach lists + sending subdomain.
- **Jun 11 (opening, Azteca) → Jul 19 (final):** distribute magazine/flyers at drop points + creator events ·
  featured designer per Mexico match · foot referral (primos/UNAM) · white-glove creator outreach · mass
  outreach track · sell featured experiences/tickets.
- **On gate clear:** flip on Wave 2 (social-seller scale via the ask-Claude loop).

> *Mexico fixtures to peg activations to: CDMX (Azteca) + Guadalajara (Akron; Mexico v South Korea Jun 18).
> Confirm full Mexico match dates when finalized.*

## 14. Roles — Cowork / Claude Code / Claude Design
- **Cowork (here):** strategy, consolidation, copy, gem extraction → import, measurement, dogfood/QA, the
  planning docs.
- **Claude Code:** the launch-gating **about-surface**; referral-reward extension (D4); any gaps.
- **Claude Design:** the trifold magazine, social tiles, QR layouts, persona-page prototypes, the **pitch deck**
  (exports PPTX; hands off to Code).

## 15. Appendix
**Appointments:** Konzz — call Tue 2026-06-09 12:00 (booked) · Oscar — meet (booked) · Enrique — meet (not booked).
**Sources & full validation:** see [`campaign-notes-consolidated.md`](campaign-notes-consolidated.md).
