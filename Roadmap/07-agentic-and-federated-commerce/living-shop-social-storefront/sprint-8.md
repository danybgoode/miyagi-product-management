# Living Shop — Sprint 8: the shop looks like the concept

**Status:** ✅ shipped — `241b2f2` (PR #393)

**Risk:** LOW — presentation only. No money, no auth boundary, no schema change.

## Why this sprint exists

The design reference (`references/miyagi-sanchez-living-shop-concepts.html`) was not
in the scaffold and was not read during the architecture lock. Sprints 1–7 built the
Wall's **data model, information architecture and theme mechanism** correctly; the
**presentation** is nowhere near the concept. Product-owner appetite is **big**,
especially for Retro Social and overall layout polish.

One item here is a defect rather than polish: the `feed-sidebar` recipe turns
`.wall-feed` into a two-column grid whose only children are the Wall **cards**, so at
desktop width Retro tiles cards into columns with nothing in the 18rem track — the
sidebar the recipe promises was never built.

## Stories

### Story 8.1 — Shop header: identity, navigation, bag
**As a** buyer, **I want** the shop's name and avatar to sit with its navigation, **so that** I always know whose shop I am in and can move around it.

**Acceptance:** sticky header carrying avatar (logo, or initials fallback), shop name, the Sprint-3 section links, and the cart affordance; backdrop blur over the shop background; identity truncates rather than wraps on narrow screens; links scroll horizontally on mobile without clipping the identity; the active section is marked.

### Story 8.2 — Living hero
**As a** buyer, **I want** the top of the shop to say what this place is, **so that** I understand it before I scroll.

**Acceptance:** eyebrow (category · location), display headline from the shop's tagline with the shop name as fallback, lead paragraph from the description, primary CTA to the catalog and secondary to the Wall; an art panel built from the shop's banner or newest product image with a poster card and decorative stickers; collapses to one column below the breakpoint; a shop with none of this content degrades to identity-only rather than an empty frame.

### Story 8.3 — Wall post anatomy
**As a** buyer, **I want** each Wall entry to read like something a person posted, **so that** the shop feels inhabited.

**Acceptance:** every post carries a head (avatar, shop name, relative time, entry kind) and a module label; a Product entry renders media with an overlaid drop card carrying title, price and a shop action; a Collection entry renders a three-up commerce strip of its current members; an Event entry keeps its date/venue/action; **no reactions, likes or share counts** — product decision 8 stands, and the concept's `♡ 84` is illustrative only.

### Story 8.4 — The supporting rail
**As a** buyer, **I want** the shop's identity, collections and status beside the Wall, **so that** I can act without leaving the story.

**Acceptance:** a rail of panels — About this shop with trust chips, Browse collections with thumbnails and counts, Shop status from real dispatch/returns/next-event data; each panel carries a module label; the rail renders in the second grid track when the recipe asks for `feed-sidebar` and stacks under the Wall otherwise and on mobile; a panel with no real data does not render; **this closes the empty-column defect**.

### Story 8.5 — Retro Social matches the concept
**As a** seller, **I want** Retro Social to look like the reference, **so that** choosing it feels like a real decision rather than a tint.

**Acceptance:** the concept's palette, the 18px grid background, hard offset shadows on every module, the label bar on posts and panels, the pink-underlined navy nav with its inverted active pill, the yellow bag, the shadowed 2px buttons, the rotated poster, and the display/body font pair; contrast holds at AA on every pairing; no marquee, blink, autoplay or sub-44px target; reduced motion respected.

### Story 8.6 — Shop footer
**As a** buyer, **I want** the shop's own links at the end, **so that** the page closes rather than stops.

**Acceptance:** footer lists the shop's enabled sections plus the platform attribution, derived from the same section config the nav uses; never a dead link.

### Story 8.7 — Dogfood on two real shops
**As the** product owner, **I want** `champions-not` and `panfleto` dressed with placeholder content, **so that** I can judge the result against the concept.

**Acceptance:** both shops carry Wall entries of every kind that their catalog supports, an About body, and a preset — `champions-not` on Retro Social, `panfleto` on its existing Papel; captured against the concept at desktop and 375px.

## QA

- pure specs for the header/hero/panel derivations (what renders, and what is withheld when data is absent);
- a spec that the supporting rail occupies the second grid track, so the empty-column defect cannot return;
- contrast assertions across the Retro pairings;
- the no-reactions rule asserted, not assumed;
- deliberate red mutation for every new spec family;
- full deterministic gate; `live-smoke` on both dogfood shops.

## Smoke walkthrough

1. Open `https://miyagisanchez.com/mx/s/champions-not`.
   → Retro Social: grid background, framed modules with label bars, navy/pink nav, hard shadows.
2. Scroll.
   → The header stays; the active section stays marked.
3. Look at the Wall.
   → Each post has an avatar, the shop name, a relative time and a kind label.
4. Find the Collection entry.
   → A three-up strip of that collection's current products, priced live.
5. Look to the right of the Wall at desktop width.
   → About, Browse collections and Shop status — not an empty column.
6. Narrow to 375px.
   → One column, rail below the Wall, nothing clipped, every target comfortably tappable.
7. Open `https://miyagisanchez.com/mx/s/panfleto`.
   → Papel, unchanged in palette, but with the same anatomy: header, hero, post heads, rail, footer.
