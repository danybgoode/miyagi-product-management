---
title: "Ticket & event management"
slug: spike-ticket-event-management
status: in-progress
area: "10"
type: epic
priority: wave-4
risk: high
epic: "10-events-and-ticketing/events-and-ticketing"
build_order: "#7"
updated: 2026-06-08
---

# Spike — Ticket & event management (BUILD-ORDER #7)

> **Class:** Spike (time-boxed investigation → a **written decision**, no code, no slicing).
> **Status: READY TO INVESTIGATE.** Groomed + scope-defined 2026-06-07 as BUILD-ORDER #7
> (Wave 4 — new capability, orientation first). **This is spike-first by explicit decision** — we do
> not commit to an epic until the spike says what (if anything) needs building.
> **Stage-2.5 bucket:** *orientation* — the question is precisely "which parts are already-possible /
> light-enhancement / genuinely-new," so the spike's entire job is to sort the ask into those buckets
> before anyone slices an epic.

## Why / the ask
**As** the product owner, **I want** a decision on how Miyagi should support **ticket & event
management** — sellers running events (paid or free) and getting attendees through the door — **so
that** we either expose a path that already works (positioning + a light enhancement) or scope an epic
deliberately, instead of building a generic "events product" we may not need. The marketplace already
carries three adjacent primitives (`service`/`digital` listings, the **sweepstakes** public-entry
machine, and the **print-social** events section); the spike's job is to measure how far those compose
toward "ticketed events" **before** committing net-new work.

> **Daniel's framing calls at groom (2026-06-07):** the **core driver** (paid admission vs free RSVP vs
> both), **check-in scope** (scan-at-door vs sell+deliver only), and **ticket shape** (single GA vs
> tiers/dates) were all deferred **to the spike** — he wants the investigation to recommend the v1 wedge,
> not pre-commit. So those three are the spike's primary decisions to land (see *What to investigate*).

## Current state — what each adjacent primitive gives us today

**1. `listing_type` (the "event as a listing" path).** Types are
`product | service | rental | digital | subscription` (`app/sell/AttrsSection.tsx:5`,
`SellWizard.tsx:25`) — **there is no `event` type.** Today an event can only be modeled as:
- a **`service`** listing (presencial modality, duration, experience — `AttrsSection.tsx:162`), or
- a **`digital`** listing (the ticket as a downloadable file).

What's **missing** from listings for events: an **event date/time**, a **venue/location** distinct from
the shop, **capacity (aforo)**, and any notion of a **ticket** vs the listing itself. Note: Medusa
`manage_inventory` already caps a sellable quantity (`lib/listings.ts:103-109`) — so a **seat cap is
already expressible** as inventory. And digital fulfillment exists (R2/Supabase signed URLs,
`app/api/sell/listing/[id]/download/route.ts`) **but the buyer-side delivery gate is an explicit TODO**
— the route only authorizes the shop owner today (`route.ts:37-49`: *"When Stripe webhooks are added…
also allow verified buyers"*). So "deliver a ticket to a paying buyer" is **not** currently wired.

**2. Sweepstakes (`/g/[slug]`) — the strongest reusable machine.** The giveaway loop already ships:
public mobile entry page (`app/g/[slug]/`), **email-code verification with no marketplace account**,
instant **QR** (`app/api/sell/sweepstakes/[id]/qr/route.ts`), start/end **dates**, a **scheduled-job
draw** (Medusa job on Cloud Run → `app/api/internal/sweepstakes`), winner dashboard, notifications, and
a consolation broadcast. This is **most of a free-RSVP-with-QR pattern already built** — different
verb (enter-to-win vs register/buy), same public-page + verify + QR + scheduled-job spine.

**3. Print-social events — announcement only.** The print Community/social section accepts "events" as
**reader-facing editorial submissions** (`06-print-edition/README.md`) — reviewed, laid out in the
magazine, QR/WhatsApp bridge back to the marketplace. **Zero commerce, RSVP, or ticketing.** It's a
*promotion* surface for an event, not a management one.

## What to investigate (the spike's questions)
1. **Demand & wedge — land Daniel's three deferred calls.** Which is the real v1 job: **paid
   ticketed events** (commerce spine), **free RSVP/registration** (sweepstakes-style spine), or
   **both**? Name the smallest wedge that delivers real value. This drives everything below.
2. **Paid path — can a `service`/`digital` listing + Medusa already sell a ticket today?** Trace it
   end to end: create the listing → buyer checks out → **does the buyer receive anything that works as
   a ticket?** (The digital-download buyer gate is unbuilt — `download/route.ts:37-49`.) Is "seat cap =
   `manage_inventory`" sufficient for aforo, or misleading? Does the **agent/UCP checkout**
   (`app/api/ucp/checkout-session`) buy a ticket coherently?
3. **Free path — how much of the sweepstakes machine transfers to RSVP?** The public page + email-code
   verify + QR + scheduled job are built for `/g/[slug]`. What's the **delta** to reuse them for
   "register for an event" (vs "enter to win") — generalize the entry table, or stand up a sibling
   `/e/[slug]`? Is this a **light enhancement** of sweepstakes or a fork?
4. **Check-in — is scan-at-door worth v1, and what does it cost?** We generate QR but have **no
   validation/redemption** flow (one-time-use mark, attendee-present roster). Weigh value vs cost and
   recommend in-or-out for v1.
5. **Ticket shape — single GA vs tiers/dates.** Does the wedge need multiple tiers (early-bird/VIP,
   multiple sessions)? Map to Medusa **variants** if so; recommend whether v1 stays single-GA.
6. **Model & Medusa-first.** If anything is genuinely new: does it ride **Medusa product metadata**
   (event date/venue/aforo on the listing; tickets as variants; redemption state on the order/line
   item — mirroring how personalization & manual-payment state already live on metadata), or is it
   **non-commerce** (Supabase, like sweepstakes entries)? Apply the AGENTS five rules (Medusa owns
   commerce · Supabase non-commerce only · UCP/MCP first-class · Clerk untouched · bilingual es+en).
7. **Print bridge.** Should a marketplace event auto-offer itself into the print-social events section
   (reuse the existing submission/QR bridge), or stay separate? Light or out-of-scope.

## What already exists (reuse, don't rebuild) — the Medusa-first starting list
- **Sweepstakes spine:** `app/g/[slug]/` (public page), `app/api/sell/sweepstakes/[id]/qr/route.ts`
  (QR), `app/api/sweepstakes` + `app/api/internal/sweepstakes` (entry + scheduled draw), the email-code
  verification flow, and the Supabase campaign/entry schema — the template for any free-register-with-QR
  surface.
- **Listings:** `service`/`digital` types + the `AttrsSection` per-type attribute pattern; Medusa
  `manage_inventory` as a seat cap; `lib/listings.ts` normalization (where an `event` type or
  event-attrs would slot, and where Epic A's `listing_type` filter work lands — same `buildQuery` seam).
- **Digital fulfillment:** the R2/Supabase signed-URL delivery (`download/route.ts`) — the place a
  buyer ticket-delivery gate would attach (its TODO is the exact hook).
- **QR for print:** `lib/print-qr.ts` (a second QR generator already in the codebase).
- **Manual-payment + personalization state patterns** (`lib/manual-payment-state.ts`,
  `lib/personalization.ts`) — the proven "state/payload on Medusa metadata, pure `lib/` helper" shape
  any ticket-redemption state should mirror.
- **Print-social events** submission + QR/WhatsApp bridge — the promotion surface for an event.

## v1 boundary (provisional — the spike confirms/redraws it)
- **In (candidate):** the single recommended wedge from Q1 (paid OR free, not a full events platform).
- **Out (until the decision says otherwise):** multi-tier/multi-session ticketing, assigned/reserved
  seating, a dedicated `event` listing type if a `service`+metadata composition suffices, paid
  ticket *resale*/transfer, and any new payment/checkout/coupon behavior.

## Output (Definition of Done for this spike)
A **written decision** appended below, sorting the ask into Stage-2.5 buckets and naming:
1. the **wedge** (paid / free / both) and the smallest valuable v1;
2. for each capability — **already-possible** (show the path + positioning), **light enhancement**
   (small story/config on an existing feature), or **genuinely-new** (epic-worthy);
3. the **model** (Medusa metadata vs Supabase) and the **consumers that must change** if new;
4. **check-in** in or out of v1, and **ticket shape** (GA vs tiers);
5. the v1 in/out boundary.
**No code, no branch, no slicing.** On a "build" outcome, this decision becomes the input to a deliberate
epic groom (likely under **07-agentic-and-federated-commerce** or a new events area). On an
"already-servable" outcome, the deliverable is the positioning + any one light enhancement — no epic.

## Risk
The **spike itself is low-risk** (read-only investigation → a doc; Daniel signs off the decision). It
*scopes* work that could later be high-risk (anything touching checkout/fulfillment/money — e.g. a buyer
ticket-delivery gate) — that tiering is decided when/if an epic is groomed, not here.

## Decision
_Investigation completed 2026-06-07 (read-only; traced against the live codebase). **Signed off by Daniel
2026-06-07 — with a scope amendment: free-RSVP + the shared attendee-ticket primitive are pulled INTO
scope, promoting #7 to an epic.** The amendment is at the bottom of this file ("Sign-off + scope
amendment"); the investigation below stands unchanged as the evidence base._

### TL;DR
**Selling admission to an event is already-servable today** — a `service` or `digital` listing sells
through the real checkout, delivers a confirmation (a downloadable PDF for `digital`, via Stripe), and
caps seats with `manage_inventory`. The genuinely-new piece is **not "selling a ticket"; it's "a
unique, scannable ticket you redeem at the door"** — that primitive (per-attendee token + QR +
one-time check-in roster) **does not exist anywhere** in the system. My recommendation: ship the
**paid-admission wedge as already-servable + one light enhancement** (event date/venue/aforo attrs on
the listing) and **defer check-in and free-RSVP behind real demand** — do *not* groom a full events
epic yet.

### Daniel's three deferred calls — landed

**1. Wedge / core driver → PAID admission first, not "both", not free-RSVP.**
The paid path reuses the most already-working machinery for the least net-new work. The free-RSVP path
*looks* close to the sweepstakes machine but the reusable slice is thin (see Q3) and a free RSVP with
**no** door check-in is just a contact-capture form we don't need a feature for. Start paid; revisit
free only if a real seller asks.

**2. Check-in (scan-at-door) → OUT of v1.**
It is the single from-scratch build in the whole ask: there is **no redemption/validation/scan concept
anywhere** (grep for redeem/checkin/scan/attendee/aforo → zero hits in commerce code). Both QR
generators in the repo (`sweepstakes/[id]/qr`, `lib/print-qr.ts`) encode a **marketing URL**, never a
per-attendee token. For small events the seller checks names off their order list manually. Build
scan-at-door only when a seller genuinely needs door-volume control — *that* is the epic trigger.

**3. Ticket shape → single GA for v1.**
Tiers/sessions map cleanly to Medusa **variants**, but the listing surface only ever reads
`variants[0]` (`lib/listings.ts:99`) and there is no multi-variant purchase UI — so tiers are their own
lift. GA = one listing, one price, aforo = inventory. Defer tiers.

### Q-by-Q findings

**Q2 — Paid path, end to end (does the buyer get a usable ticket?). YES, with caveats.**
- `digital` listing → **Stripe card only** (MP rejects digital at `app/api/mp/checkout/route.ts:54`;
  UCP marks `bank_transfer`/`mercadopago` unavailable for digital). On `checkout.session.completed` the
  Stripe webhook calls `fulfillDigitalOrder` (`webhooks/stripe/route.ts:530`) → signs a **48 h** R2/Supabase
  URL → writes `marketplace_orders.digital_download_url` → emails "Descargar ahora" (`lib/email.ts:636`)
  and the **success page** renders the link (`app/payment/success/page.tsx:201`). So a digital "ticket"
  **is delivered today** — but it's the **same static file for every buyer** (no uniqueness, no
  anti-duplication), which is exactly why door check-in is the new primitive, not the sale.
- `service` listing → sells via **any** method (Stripe/MP/SPEI/cash/WhatsApp) and can attach **Cal.com
  scheduling** (`schedule` option in `ucp/checkout-session`), giving appointment-style events a real
  booking confirmation for free. Delivers a purchase-confirmation email, not a file.
- **Aforo = `manage_inventory`** is **real, not misleading** — it genuinely caps sellable quantity
  (`lib/listings.ts:103-109`, surfaced as `available_quantity`/`in_stock`). Good enough for GA capacity.
- **Agent/UCP checkout buys a ticket coherently** — `POST /api/ucp/checkout-session` returns the same
  authoritative payment options as the web checkout (shared `checkout-options` source) plus the schedule
  option; an agent can complete a paid admission today.
- **The one real gap on the paid path:** the standalone re-download endpoint is **owner-only** — the
  buyer gate is an explicit TODO (`download/route.ts:37-49`, returns 402 to non-owners). Primary
  delivery (email + success page + order record) works; the buyer just can't *re-fetch* their ticket
  on demand later. That's a **light enhancement**, not a blocker.

**Q3 — Free path, sweepstakes-reuse delta. Smaller than it looks — a fork, not a light enhancement.**
The reusable spine is genuinely there: public mobile page `app/g/[slug]`, **email-code verify with no
marketplace account** (`lib/sweepstakes.ts` send/verify), an entries table, the QR lib, and a scheduled
cron. **But** the sweepstakes data model is **raffle-shaped, not RSVP-shaped**: `tickets` (a draw pool
with `award_key`/`voided_at`, no redemption), `draws` (random winner), `broadcasts` (consolation), and a
**hard legal gate** baked into the DB (`permit_reference`, `organizer`, `compliance_attested_at` —
`20260605000000_sweepstakes.sql:52`). None of that applies to "register for an event," and the entry
table is keyed to a campaign, not an event listing. **Verdict: reuse the *pattern* (public-page +
email-verify + QR lib), stand up a sibling surface (`/e/[slug]` + a `marketplace_event_registrations`
table) — do not generalize the sweepstakes entry table.** Estimated reuse ≈ the verify flow + QR lib +
page scaffold (~40%); the model, capacity logic, and (if wanted) per-attendee token are new. This is why
free-RSVP is parked, not in v1.

**Q4 — Check-in. OUT (see deferred call #2).** Cost is a from-scratch build: a per-attendee token minted
at purchase/registration, a QR encoding *that token* (not a URL), a seller-facing scan/redeem endpoint
with one-time-use marking, and an attendee-present roster. Value is real only at door volume. Park it.

**Q5 — Ticket shape. Single GA (see deferred call #3).**

**Q6 — Model & Medusa-first.**
- **Event attrs (date/time/venue/aforo)** → **Medusa product metadata**, exactly mirroring the
  personalization (`lib/personalization.ts`) and manual-payment-state (`lib/manual-payment-state.ts`)
  precedent: a pure `lib/` helper + attrs on `product.metadata`, surfaced through `normalizeMedusaOrder`/
  `lib/listings.ts`. Aforo stays native `manage_inventory`. **No new commerce tables.**
- **Redemption state** (if check-in is ever built) → order/line-item metadata + a minted token, again on
  Medusa metadata — never a parallel Supabase orders concept (AGENTS rule #1).
- **Free RSVP** (if ever built) → **Supabase** (`marketplace_event_registrations`), like sweepstakes
  entries — it's non-commerce (AGENTS rule #2).
- UCP/MCP, Clerk, bilingual: the metadata attrs flow into `toUcpListing` for free; no auth change;
  event copy is es-MX (the seller portal has no `en` render path — see `LEARNINGS.md` i18n note).

**Q7 — Print bridge. Out of scope for v1.** The print-social events section is **announcement-only**
(editorial submission + QR/WhatsApp back to the marketplace, zero commerce). A marketplace event could
*optionally* auto-offer itself into that submission flow later, but it's a nice-to-have promotion hook,
not part of the wedge.

### Capability sort (Stage-2.5 buckets)

| Capability | Bucket | Notes |
|---|---|---|
| Sell paid admission (service/digital listing) | **Already-possible** | Real checkout + confirmation; digital delivers a PDF (Stripe only). Positioning, not code. |
| Cap seats (aforo) | **Already-possible** | Native `manage_inventory`. |
| Appointment-style events (book a time) | **Already-possible** | Cal.com `schedule` option on service listings. |
| Agent/UCP buys an event ticket | **Already-possible** | `ucp/checkout-session` already coherent. |
| Event date / time / venue as first-class listing fields | **Light enhancement** | Add an event block to `AttrsSection.tsx` (same shape as autos/inmuebles), surface in `lib/listings.ts` + the PDP (`app/l/[id]`) + `toUcpListing`. Metadata-only. |
| Buyer can **re-download** their ticket later | **Light enhancement** | Build the buyer gate that's already TODO'd in `download/route.ts:37-49` (verify buyer-owns-order against `marketplace_orders`). |
| Unique, scannable per-attendee ticket + door check-in | **Genuinely-new** | No redemption primitive exists; epic-worthy; gate on real demand. |
| Free RSVP / registration surface | **Genuinely-new** | Sweepstakes is a fork, not a reuse; epic-worthy; gate on real demand. |
| Multi-tier / multi-session tickets (variants) | **Genuinely-new** | Needs multi-variant purchase UI; defer. |
| Auto-offer event into print-social section | **Out of scope (v1)** | Optional later promotion hook. |

### Consumers that must change (only for the light-enhancement path)
`app/sell/AttrsSection.tsx` (event attr block) · `app/sell/SellWizard.tsx` (wire the attrs; optionally an
`event` *category*, reusing `service`/`digital` as the listing_type — **no new `listing_type` needed**) ·
`lib/listings.ts` (normalize/surface event attrs) · `app/l/[id]/page.tsx` (render date/venue) ·
`lib/ucp/schema.ts` `toUcpListing` (so agents see the event details) · `app/api/sell/listing/[id]/download/route.ts`
(buyer re-download gate). All metadata-driven; **no migration, no new payment/checkout behavior.**

### v1 in/out boundary
- **In (v1):** position **paid admission** on existing `service`/`digital` listings + **one light
  enhancement** = event date/time/venue attrs on the listing (metadata). Optionally the buyer
  re-download gate. Aforo = inventory. Single GA.
- **Out (until demand says otherwise):** door **check-in / QR redemption / unique per-attendee tickets**,
  **free RSVP** surface, **multi-tier/variant** tickets, a dedicated `event` `listing_type`, ticket
  resale/transfer, and any new payment/checkout/coupon behavior.

### Outcome & next step
This is an **"already-servable + one light enhancement"** outcome, **not** a full events epic. Deliverable
is the positioning (how to run an event today) + the single light enhancement (event attrs on the
listing) — groomable as a **small story under 07-agentic-and-federated-commerce**, not a standalone epic.
The genuinely-new pieces (check-in/redemption, free RSVP) stay parked as a *future* epic, triggered only
when a real seller needs scan-at-door or free registration. **No code, no branch — Daniel signs off this
decision first.**

---

## Sign-off + scope amendment (Daniel, 2026-06-07) — #7 promoted to an epic

Daniel signed off the investigation **but overrode the "park it" recommendation**: the free-RSVP fork is
pulled into scope, **with check-in**, and the attendee-ticket primitive is built **once and shared by
both paid and free events**. Rationale agreed in grooming: a free RSVP *without* check-in is the
contact-capture form the spike itself warned against — the value lives in the unique scannable ticket,
which is the same primitive paid ticketing needs. Building it once turns two parked "genuinely-news" into
**one coherent epic: a ticket-primitive spine with two front doors (paid checkout · free RSVP).**

**Daniel's amendment calls:**
- **RSVP value/phasing →** RSVP **+ check-in**, *phased within one epic* (RSVP surface ships before the
  scan primitive — no thin-value end state shipped as the finish line).
- **Ticket primitive →** **shared by both** paid admission and free RSVP (one token/redemption spine).

This **supersedes** the investigation's "already-servable + one light enhancement, no epic" outcome for
planning purposes. The capability-sort table still holds as the *evidence*; the difference is Daniel is
electing to build the two "genuinely-new" rows now rather than gate them on later demand.

### Epic shape (skateboard → car) — Definition-of-Ready slices

> Proposed home: a **new macro-section `10-events-and-ticketing`** (events span selling + checkout + a
> public attendee surface; they don't fit cleanly inside 03/07). *Placement is the one open call for the
> scaffold gate — see "Open call" below.* Working epic slug: `events-and-ticketing`.

**Slice 1 · Paid admission, made real (ships first; mostly already-servable + one light enhancement).**
Independent of Slices 2–3 — the cheap win that de-risks the rest.
- **S1.1 — As a seller, I want event date/time/venue/aforo fields on a listing, so that buyers see when
  & where the event is and seats are capped.** Add an event attr block to `AttrsSection.tsx` (same shape
  as autos/inmuebles), wire through `SellWizard.tsx`, surface in `lib/listings.ts` + the PDP
  (`app/l/[id]`) + `toUcpListing`. Aforo = native `manage_inventory`. **Metadata-only, no new
  `listing_type`** (reuse `service`/`digital`). **Risk: LOW.** *QA:* api spec on the normalizer/listing
  surface; anonymous browser smoke that the PDP renders date/venue.
- **S1.2 — As a buyer, I want to re-download my ticket/confirmation later, so that I don't lose it.**
  Build the buyer gate that's already TODO'd in `download/route.ts:37-49` (verify buyer-owns-order
  against `marketplace_orders`). **Risk: HIGH** (delivery/auth gate on a paid artifact → Daniel merges).
  *QA:* api spec — owner 200, verified buyer 200, stranger 402/403.

**Slice 2 · Free RSVP public surface (fork the sweepstakes *pattern*, per Q3).**
- **S2.1 — As a seller, I want to create a free event with an RSVP page, so that people can register
  without buying.** New seller surface (Mi tienda → Eventos); **Supabase** `marketplace_events` +
  `marketplace_event_registrations` (non-commerce, AGENTS rule #2); public `/e/[slug]` scaffolded from
  `app/g/[slug]`. **Do NOT generalize the sweepstakes entry table** (it's raffle/legal-shaped). **Risk:
  LOW** (Supabase, non-commerce). *QA:* api spec on event create/read.
- **S2.2 — As an attendee, I want to register with email-code verification (no marketplace account), so
  that signing up is frictionless.** Reuse the `lib/sweepstakes.ts` send/verify flow + the QR lib;
  store the registration; send a confirmation. **Risk: LOW.** *QA:* api spec on register+verify;
  anonymous browser smoke of the public page render.

**Slice 3 · The attendee-ticket primitive + check-in (the spine — shared by Slices 1 & 2).**
Depends on Slices 1 & 2 (it issues tokens into both the paid order and the free registration).
- **S3.1 — As the platform, I want a unique per-attendee ticket token minted at purchase (paid) and at
  registration (free), so that every attendee has a unique scannable credential.** A pure, next-free
  `lib/` helper (mirror `lib/manual-payment-state.ts`) minting token + redemption state; persisted on
  **order/line-item metadata** for paid (Medusa-first, AGENTS #1) and on the registration row for free;
  **the QR encodes the token, not a URL** (today both QR gens encode a marketing URL). **Risk: HIGH**
  (order/fulfillment metadata + delivery → Daniel merges). *QA:* pure-logic spec on the state machine
  (illegal transition + double-mint rejected) — free coverage on the `lib/` seam.
- **S3.2 — As a seller, I want to scan a ticket at the door and have it marked used exactly once, so that
  no ticket is reused.** Seller scan/redeem endpoint with a one-time-use guard that covers **every
  mutation** that reaches the redeemed state (per LEARNINGS "a server gate must cover every mutation");
  attendee-present roster. **Risk: HIGH → Daniel merges.** *QA:* pure-logic spec (double-redeem
  rejected); api spec on the redeem endpoint; **the real scan/door flow is a browser smoke owed to
  Daniel** (authed seller session).
- **S3.3 — As a seller, I want an attendance roster/view, so that I can see who's checked in.** Reads the
  redemption state. **Risk: MED.** *QA:* api spec on the roster read.

### Build / deploy order
Slice 1 first (cheap, independent, ships alone) → Slice 2 (independent of 1; Supabase migration first per
LEARNINGS async-deploy) → Slice 3 (after 1 & 2 — it tokenizes both surfaces; backend-first where it
touches order metadata). Maps to **~3 sprints, one per slice.**

### Risk tier (mixed epic)
Slices 1.1 / 2.1 / 2.2 **LOW**; S3.3 **MED**; **S1.2, S3.1, S3.2 HIGH → Daniel merges** (delivery, money
artifacts, fulfillment-state). When unsure, high.

### v1 in/out boundary (amended)
- **In (v1):** paid-admission positioning + event attrs (S1.1); buyer re-download (S1.2); free RSVP
  surface with email-verify (S2); the **shared attendee-ticket primitive + door check-in** (S3); roster
  (S3.3). Single GA. Aforo = inventory.
- **Out (still deferred):** multi-tier / multi-session **variant** tickets, assigned/reserved seating, a
  dedicated `event` `listing_type`, ticket **resale/transfer**, auto-offer into the print-social section,
  and any new payment/checkout/coupon behavior.

### Open call for the scaffold gate
**Placement:** create a new macro-section **`10-events-and-ticketing`** (recommended), or nest the epic
under **03-selling-and-shops** or **07-agentic-and-federated-commerce**? This is the one decision owed
before scaffolding the epic README + sprint files and emitting the per-sprint Claude Code kickoff prompts.
**Nothing is scaffolded yet — this amended scope is the gate.**
