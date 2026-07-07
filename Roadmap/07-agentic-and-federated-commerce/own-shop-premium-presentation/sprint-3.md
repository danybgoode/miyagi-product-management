# Own-shop premium presentation — Sprint 3: Content pages + flagship dogfood

**Status:** ✅ built (frontend-only, no backend touch) — PR open, awaiting Daniel's live smoke + merge.

## Stories

### Story 3.1 — Content pages: Acerca / FAQ / Políticas
**As a** seller, **I want** to author an Acerca page, an FAQ (question/answer pairs), and a Políticas page, **so that** buyers can read who I am and how I work — on my own domain, like a real store.
**Acceptance:** simple structured editor (fields, not a page builder); routes `/s/[slug]/acerca|faq|politicas` render white-label on all channels (middleware pass-through additions announced); Devoluciones content pulls from the existing returns-policy setting (merchandised, never duplicated); unauthored page → link hidden, no 404-linking; length caps + es-MX validation.
**Risk:** MED
**Built as:**
- New settings section `paginas` ("Acerca y FAQ") in `lib/shop-settings/taxonomy.ts` + `_sections/Paginas.tsx` — capped Acerca textarea (≤600 chars) + FAQ Q&A list (≤12 pairs, question ≤140/answer ≤600 chars); Políticas has a **read-only preview linking to Devoluciones**, not a second editor.
- Two-routes-one-body pattern (mirrors Sprint 2's collection pages): `app/(shell)/s/[slug]/{acerca,faq,politicas}/page.tsx` (marketplace) + `app/(shell)/{faq,politicas}/page.tsx` (channel — subdomain/custom domain, shop resolved from the `x-miyagi-shop-slug` header). `app/(shell)/acerca/page.tsx` already existed as the **platform's** bilingual About-Miyagi-Sánchez page — augmented in place with an early-return channel branch so the same URL serves shop content on a tenant domain and the untouched platform page on the marketplace host (zero risk to existing behavior/specs).
- **Zero middleware.ts edits needed** — the boundary-isolation deny-list (`isBoundaryDeniedPath`) only denies `/s`, `/s/*`, `/l`, `/l/`; the new top-level paths pass through untouched, same as `/c/[collection]` before them. Announced per the shared-surface convention; locked by a new regression spec.
- Nav: shop home page (`s/[slug]/page.tsx`) gets a footer link row (`ShopContentLinks.tsx`) showing only authored pages — no dead links.
- SEO: `app/sitemap.ts` adds each authored content-page URL under the shop's per-host block, same treatment collections got.

### Story 3.2 — Config + agent parity
**As a** seller's agent, **I want** content pages in Storefront-as-Code + `patch_store_configuration`, and an about-shop exposure on UCP, **so that** an agent can answer "¿quién es esta tienda y cuáles son sus políticas?" grounded.
**Acceptance:** schema/validation/audit for the new keys; UCP shop payload carries about/policies (agents already get personalization + trust — this completes the shop story); manifest accurate.
**Risk:** LOW
**Built as:**
- `lib/settings-import.ts`: new `content: { about, faq }` manifest block + `validateConfig()` rules (empty/oversize rejected with an issue; explicit `null` clears; malformed FAQ entries dropped, valid ones kept) — no `content.politicas` field, by design.
- `lib/store-config.ts`: `buildStoreConfigSnapshot()` reflects `settings.about`/`settings.faq` into `configuration.content` — `get_store_configuration`/`patch_store_configuration` get full parity for free; **no new MCP tool, no dispatch-switch change** (sidesteps Sprint 2's declared-but-undispatched-tool bug class by construction).
- `lib/ucp/schema.ts`: `UcpShop` gains `about` + `returns_policy`, populated in `toUcpListing()`'s embedded shop object (the same mechanism Sprint 2 used for `collections`) — an agent grounds a policy/about question from any `get_listing`/`search_listings` call, no new endpoint.

### Story 3.3 — Dogfood: miyagiprints fully dressed
**As** Daniel, **I want** miyagiprints wearing everything this epic shipped (bar, hero, preset, collections, Acerca/FAQ/Políticas), **so that** the before/after pair proves the premium feel and becomes the poster/marketing artifact.
**Acceptance:** all surfaces populated with real content (ops/content task, ~no code); before/after screenshots captured for the epic close + `Roadmap/README.md` highlight.
**Risk:** LOW (ops)
**Status:** checklist below is the deliverable — authoring the real content and capturing the screenshots is **yours** (see the Sprint 3 smoke walkthrough's step 5).

#### miyagiprints dress-up checklist (do these in `/shop/manage/settings`, in order)
1. **Diseño** (`/shop/manage/settings/diseno`) — confirm accent color, tagline, social links, banner/logo are set (Sprint 1 baseline, likely already done).
2. **Diseño → Anuncio y destacado** — set the announcement-bar text (+ optional link) and hero mode (pinned listings or promo image/CTA).
3. **Diseño → Preset** — pick a curated visual preset (font pairing + surface tone).
4. **Colecciones** (`/shop/manage/collections`) — create the shop's real sections (e.g. "Die-cut", "Zines"…) and assign listings to each; reorder as needed.
5. **Acerca y FAQ** (`/shop/manage/settings/paginas`) — write the Acerca body (who you are, what you sell, why); add 3–5 real FAQ pairs (shipping time, custom orders, etc.).
6. **Devoluciones** (`/shop/manage/settings/politicas`) — confirm a return window is set (this is what the public Políticas page shows — no separate step).
7. Once all six are saved, do the Sprint 3 smoke walkthrough below and capture **before** (today's plain grid) vs **after** (fully dressed) screenshots — marketplace `/s/miyagiprints`, the subdomain, and the custom domain if live.

## Sprint QA
- **api spec(s):** `shop-content-config.spec.ts` (content validation) · `shop-content-route-passthrough.spec.ts` (pass-through route-list, acerca/faq/politicas) · `ucp-shop-about-policy.spec.ts` (UCP shop payload contract) · re-verified `mcp-tool-dispatch-parity.spec.ts` and `shop-settings-taxonomy.spec.ts` (both touched by this sprint's additions)
- **browser smoke owed:** yes, to Daniel — miyagiprints full before/after walkthrough on a real device (marketplace + subdomain + custom domain)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge (confirmed green; one unrelated pre-existing spec, `not-found-shape.spec.ts`, fails only because it calls live production over the network with no `PLAYWRIGHT_BASE_URL` set in this sandbox — untouched by this sprint's diff)

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. As miyagiprints, author Acerca (short story of the shop) and 4 FAQ pairs in `/shop/manage/settings/paginas`; confirm Devoluciones already has a return window set (Políticas reads it automatically — no separate Políticas editor).
   → Editor saves; "Acerca y FAQ" shows ✓ on the settings index.
2. Open `https://miyagiprints.miyagisanchez.com/acerca`, `/faq`, `/politicas` (subdomain) — and the equivalent `https://miyagisanchez.com/s/miyagiprints/acerca|faq|politicas` on the marketplace host.
   → All three render white-label with the S1 preset; Políticas shows the same window as the PDP trust chip (one source, no drift).
3. On the shop home, a footer row links to Acerca / FAQ / Políticas; delete the FAQ content to confirm its link disappears (no dead link), then re-add it.
   → No dead links at any point.
4. Ask a shopping agent (UCP): "¿cuál es la política de devoluciones de miyagiprints?" via any `get_listing`/`search_listings` call against one of the shop's listings.
   → Grounded answer from the listing's embedded `shop.returns_policy` (and `shop.about` for "who is this shop").
5. Full flagship pass: marketplace `/s/miyagiprints` → subdomain → custom domain, phone in hand.
   → Bar, hero, preset, collections nav, content pages — the "stepping into StickerJunkie" feel; capture before/after screenshots for the epic close.

If any step fails, note the step number + what you saw — that's the bug report.
