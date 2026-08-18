# Living Shop — Sprint 3: Controlled shop information architecture

**Status:** ✅ shipped — `abec4c9` (PR #391)

**Risk:** LOW-MED — new shop routes/nav composition; verify custom-domain pass-through before touching middleware.

## Stories

### Story 3.1 — Typed section configuration
**As a** seller, **I want** to decide which approved shop sections appear and in what order, **so that** my storefront reflects my business without becoming an open-ended CMS.

**Acceptance:** settings schema supports the fixed section keys `wall`, `shop`, `collections`, `events`, `about`, `faq`, `policies`; Wall + Shop are always enabled; optional sections may be enabled/hidden and reordered after required anchors; invalid/duplicate keys normalize or reject safely; hidden section does not create a dead nav link; no custom slug/page key exists.

### Story 3.2 — One coherent shop nav across channels
**As a** buyer, **I want** the same merchant-defined section navigation on marketplace, subdomain and custom domain, **so that** the shop behaves like one site everywhere.

**Acceptance:** nav renders only enabled + actually available sections; route bases are correct for marketplace vs owned hosts; active-state and mobile overflow/menu behavior are accessible; the existing collection nav is folded into this coherent shop nav rather than creating two competing nav bars.

### Story 3.3 — Complete Shop index
**As a** buyer, **I want** a dedicated Shop destination separate from the Wall, **so that** I can intentionally browse the full catalog even when the homepage is story-led.

**Acceptance:** section route renders the shop's complete public catalog with existing filters/sorting only where already supported; host isolation applies; Wall never becomes the only route to products; canonical/OG treatment is correct.

### Story 3.4 — Public Events index
**As a** buyer, **I want** an Events section for merchants who run events, **so that** I can browse upcoming activity without hunting through Wall history.

**Acceptance:** section lists only this shop's public/upcoming events (free + paid event surfaces reconciled into one public model where possible); past/cancelled treatment defined; route hides/404s when no public events and seller did not explicitly keep it visible with an empty-state; owned-host route works without exposing another seller.

### Story 3.5 — Existing About / FAQ / Policies under the controlled IA
**As a** buyer, **I want** supporting information to feel like part of the same shop site, **so that** trust/content pages are not orphan footer links.

**Acceptance:** existing content routes reuse the unified nav + theme; authored/real-data gates stay intact; section visibility setting can hide nav exposure without destroying content; direct-route behavior is deliberate and documented.

## QA

- pure section-normalization/order specs;
- API/render specs that absent content never creates dead nav links;
- route/isolation specs for marketplace + simulated custom/subdomain headers;
- browser mobile-nav spec;
- disprove whether middleware already passes new root routes before editing it.

## Smoke walkthrough

1. In the studio's **Secciones** tab, hide *Preguntas* and move *Eventos* above *Colecciones*, then save. **OWED (Daniel)**
   → Toast confirms; the saved config comes back normalized with Muro and Tienda locked in front.
2. Open `https://miyagisanchez.com/mx/s/<slug>`.
   → The nav shows only sections that are both enabled AND have content. Preguntas is absent.
3. Open `https://miyagisanchez.com/mx/s/<slug>/tienda`.
   → The complete catalog, with the collection chips as a filter. The Wall is not the only route to products.
4. Open `https://miyagisanchez.com/mx/s/<slug>/eventos`.
   → 🚨 **Expect a 404 today.** `marketplace_events` holds ZERO rows platform-wide, so no shop has an Events section and the route correctly refuses. Create an event in *Eventos* first to see the index.
5. Open the same paths on the subdomain, without the `/mx/s/<slug>` prefix — `https://<slug>.miyagisanchez.com/tienda`.
   → Identical nav and order; links stay on the owned host. **No middleware change was needed for this** (epic D6).
6. Open a section the shop does not have, e.g. `/colecciones` on a shop with none.
   → **404**, not an empty page — an empty destination must never enter a sitemap.
