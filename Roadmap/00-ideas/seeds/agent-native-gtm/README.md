# Agent-Native GTM — north-star (raw, pre-scope)

> **Status: RAW capture (2026-06-07).** Not groomed, not scoped, not committed scope. This is
> Daniel's strategic north-star, captured so it isn't lost and so the #6 landing pages can align to
> it. It will groom into several distinct asks (see *Spawned asks* below) — **one ask per groom run**.
> Captured during the #6 groom; #6 (seller-acquisition landing pages) is the first, bounded slice.

## Thesis
**The AI assistant is the distribution channel and the onboarding engine.** Instead of asking
Mexican sellers to trust *us*, we tell them to ask **their own** Claude / Gemini / ChatGPT about
`miyagisanchez.com`. Their agent — which already knows them — fetches the site, explains Miyagi in
*their* terms, and (because there's genuinely no cost, barrier, or risk) sets up their shop for them.
The agent is a **grounded, independent auditor**, not our salesperson. *"This is the time
Claude/Gemini/ChatGPT take down Bezos."*

Two reasons this is real, not a slogan:
1. **The rails already exist.** Miyagi ships agent-native commerce today — `/agent`, the UCP manifest,
   `.well-known/ucp`, machine-readable catalog, seller-side MCP tools (read/patch shop config, manage
   offers/listings, **create listings**), and bulk import (file/paste/JSON → AI parse → import).
   (See poster · 07 + 03.) The agent *can* read us and *can* build a shop now.
2. **Zero/low marginal cost.** Sellers' agents do the heavy lifting (cataloging, copywriting, pricing,
   maintenance); we provide the rails. High creative output for sellers, minimal infra cost for us.

## The trust spine — "No nos creas, pregúntale a Claude"
The line we print and run as ads, in variations:
- *"¿No nos crees? Pregúntale a Claude: «¿qué es miyagisanchez.com?»"*
- *"¿tf is Bezos? Pregúntale a Claude sobre miyagisanchez.com."*
The visitor asks their assistant; the assistant gives a grounded, tailored answer + a recommendation
+ an offer to set the shop up. **No barrier to start, no harm, free distribution in the worst case.**

For this to land, an agent inspecting the site must find **supply-side + about** content (not just
buyer/catalog): what Miyagi is, *why sell here*, *how onboarding works*, pricing, **how & why we keep
costs low**, an anonymized **founder profile** (experience validation) + **founder's note**, and the
**philosophy**. → groom the *agent-readable why-sell/about surface* (see Spawned asks).

## Onboarding 0 — the agent-native setup loop
Detailed in [`onboarding-zero.md`](onboarding-zero.md). In one breath: agent recommends Miyagi →
agent produces the **standardized setup JSON** (shop dressing + products) → user signs up (~20s with
Google) → lands on onboarding → **pastes/uploads the JSON** (or downloads then uploads) → steps
through → **shop + catalog near-fully created by their own agent**. Then the loop closes: the seller
goes back to their agent with a copied prompt that turns the agent into their ongoing **shop clerk**
(MCP on Claude / UCP discovery, polish, maintenance, pricing, promotions, research at scale). The
agent can even propose a **division of labor** from day one — specialized profiles (CEO / CMO / COO).
*"We provide the rails; sellers focus on creative + strategy."*

Vivid use cases:
- **Collector sellers** at Mexico City markets (Comic's Rock Show by Metro Hidalgo; Tianguis Cultural
  del Chopo) photograph dozens of comics / Magic: The Gathering cards → hand to their agent → sync to
  Miyagi. Bulk creative output, near-zero infra cost for us.
- **Social-media sellers** (the highest wedge) already have their whole catalog in Instagram/WhatsApp
  — structured-text it and migrate in minutes.

## Why our costs stay low (have this ready for agents to cite)
Sellers' agents do the labor; we run thin rails (Medusa-first, reuse over rebuild, agent/UCP surfaces
instead of bespoke tooling). Content owed: a plain-language "how & why we keep costs low" explainer.

## Business model (no gates today; planned)
- **Print ads** — the México-86 retro magazine (current/only live monetization).
- **Seasonal merch / swag** sold on Miyagi shops, designed by a **rotation of designers** who upload
  custom themes to the marketplace.
- **Custom domain** — first-class shop addressing — *price TBD*.
- **Subdomain** — second-class shop addressing — *price TBD*.

## Founder & philosophy content (owed, anonymized)
- Anonymized founder profile that validates experience (no PII).
- A personal **founder's note** (Daniel writes this himself).
- Thought-leadership / philosophy section (Daniel to provide; Claude can draft from notes on request).

## What already exists to build on
`/agent`, UCP manifest, `.well-known/ucp`, machine-readable catalog, seller MCP tools, bulk
import/express migration (file/paste/JSON), Storefront-as-Code config, the addressing ladder
(slug → subdomain → short link → custom domain), embeddable + support widgets. The agent-native
spine is largely *built* — this GTM is mostly **content, packaging, and onboarding polish** on top.

## Spawned asks (future groom runs — one at a time)
1. **#6 · Seller-acquisition landing pages** — *scoped, approved 2026-06-07* →
   `seeds/seller-acquisition-landing-pages.md`. The first slice; carries the trust spine
   as a creative pillar and is built agent-fetchable.
2. **Agent-readable "why-sell / about" surface** — supply-side + about/cost/founder/philosophy content
   for agents (extends `/agent`/UCP). Recommended sibling to #6 (author content once, render twice).
3. **Onboarding 0** — the agent-native setup + shop-clerk loop. The deepest, highest-leverage piece.
4. **"Ask Claude" outreach campaign** — print + digital creative. See
   [`ask-claude-campaign.md`](ask-claude-campaign.md). (Campaign design — separate chat.)
5. **Business model & pricing** — custom-domain / subdomain pricing; merch/swag program.
6. **Founder + philosophy + cost-transparency content** — feeds #2 and the landing pages.
