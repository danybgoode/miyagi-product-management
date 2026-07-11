# Panfleto — the first premium shop — Sprint 2: Rename + dress-up miyagiprints → panfleto

**Status:** 🚧 in progress · Story 2.2 (`create_collection` MCP tool) ✅ merged + live. Stories 2.1 +
2.3 await Daniel's three live actions (see "Your three actions" below). **Sprint 1 confirmed merged**
(frontend `#217`/`6c42c43`, backend `#81`/`3b252c1`, both on `origin/main`). Branched fresh:
`feat/panfleto-premium-shop-s2` off `origin/main` in both repos (the old `feat/panfleto-premium-shop`
is a squash-merged dead end).

**Live baseline confirmed (2026-07-11, via the public catalog API):** the shop has exactly **one**
product today — "Stickers personalizados", $50 MXN, category `creatividad`, no collection yet — and
`about`/`returns_policy` are both null. This is a real blank slate, not an overwrite.

## Stories

### Story 2.1 — Rename with 301 + subdomain grant
**As** the shop owner, **I want** the miyagiprints shop renamed to `panfleto` with the old slug
aliased and the subdomain granted, **so that** every existing link keeps working while the new
identity takes over.
**Acceptance:** `/s/panfleto` is the shop; `/s/miyagiprints` (and its listing URLs) 301 to the new
slug (shipped custom-slugs alias); `panfleto.miyagisanchez.com` renders the shop white-label via an
admin subdomain grant; the `mschz.org/panfleto` flat short link resolves.
**Risk:** low
**Execution:** both mutations require a live authenticated session (Clerk seller session for the
slug PATCH, Clerk admin session for the subdomain grant) — **Daniel executes both directly**, no
CLI/script/MCP tool exists or is being built for either. Exact steps below, under "Your three actions."
**Status:** 🚧 QA built (`e2e/panfleto-rename-alias.spec.ts` — self-activating, verified live against
today's un-renamed prod: correctly skips all 3 assertions; caught + fixed a real bug in the process
— `mschz.org`'s branded 404 is itself a 301, not a 404 status, so the skip condition had to key off
the redirect target). Awaiting Daniel's two live actions.

### Story 2.2 — `create_collection` MCP tool
**As** a seller agent, **I want** to create a shop collection through the MCP tool surface (not just
list them), **so that** the full storefront dress-up — including collections — is genuinely
agent-doable.
**Acceptance:** a new `create_collection` tool appears in the MCP tool list; calling it with the
shop's agent token creates a real Medusa Product Category under that seller; `list_my_collections`
immediately reflects it; an unauthorized/malformed call fails the same way sibling tools do.
**Risk:** low (additive; closes a real gap — `list_my_collections` today tells an agent to use the
portal UI, since no create path exists). Touches **both repos**: a new backend
`internal/seller-collections` route (mirrors `internal/seller-products`) + the frontend MCP tool
(mirrors `create_listing`'s shape). This means Sprint 2 is **not** frontend-only — the epic README's
"Deploy order" note gets corrected as part of this sprint.
**Status:** ✅ built — backend `POST /internal/seller-collections` (reuses the existing, already-
tested `createSellerCollection` helper — no new collection-creation logic, just an internal-auth
wrapper); frontend `createSellerCollectionViaInternal` + the `create_collection` MCP tool
(schema + handler + dispatch case + `MCP_SELLER_TOOLS`/manifest wiring). QA:
`e2e/mcp-create-collection.spec.ts` (schema, both auth-rejection cases, manifest wiring, pure
name-validation cases — verified live) + `e2e/mcp-tool-dispatch-parity.spec.ts` (verified live,
confirms dispatch wiring). Both repos `tsc --noEmit` clean; backend `medusa build` clean. Reviewed
(fresh pr-reviewer agent on each PR: approve) + cross-agent advisory (codex): backend clean; frontend
surfaced 2 real findings (schema promised 2–60 char name validation the handler didn't enforce; the
QA spec claimed input-validation coverage it didn't have) — both fixed pre-merge (extracted
`validateCollectionName` to `lib/collection-derive.ts`, next-free, directly unit-tested). **✅ MERGED +
LIVE** — backend PR [#83](https://github.com/danybgoode/medusa-bonsai-backend/pull/83) (squash
`6fe6bdc`), frontend PR [#222](https://github.com/danybgoode/miyagisanchezcommerce/pull/222) (squash
`9e8a1f6`).

### Story 2.3 — Full brand dress-up (dogfooding the agent path)
**As a** visitor, **I want** panfleto to read as an editorial publishing house, **so that** the first
premium shop demonstrates what the tier means.
**Acceptance:** name/tagline/announcement bar/hero set; a theme preset applied (S4 may swap in a new
editorial preset later); collections created (Historias · Convocatorias · Stickers — the existing
sticker product curated into Stickers, nothing deleted); Acerca/FAQ/Políticas written. **Executed via
MCP tool calls** (`patch_store_configuration` + `create_collection` + `update_listing`) against the
live `/api/ucp/mcp` endpoint using the shop's own agent token — not the settings UI — per "dogfood the
agent path." Copy meets the epic's content bar and is drafted below for Daniel's read **before any
MCP call executes.**
**Risk:** low (content/config only — no money, no auth path touched).
**Status:** 🚧 copy drafted below; QA built (`e2e/mcp-store-config-presentation.spec.ts` extended
for `content.about`/`content.faq` + `e2e/panfleto-dressup-render.spec.ts`, self-activating —
verified live: both skip cleanly today). Execution is necessarily **post-merge/deploy** — the
`create_collection` tool this story dogfoods only exists on prod once Story 2.2 ships — and
**post-approval** of the copy below.

## Drafted copy (Story 2.3) — for Daniel's read before shipping

Content bar applied: es-MX, simple, concrete, direct address. No time-to-complete promises (nothing
claims the horror call is open yet — that's Sprint 3's job). No "esto nos recuerda…" wrap-ups. No
filler intensifiers.

**Name:** `panfleto` (lowercase, matching the existing `miyagiprints` convention)

**Tagline:**
> Terror latinoamericano. Escrito, votado, impreso.

**Announcement bar** (`announcement.text`, ≤140 chars — this draft is ~75):
> panfleto publica relatos de terror de autores mexicanos y latinoamericanos.

`announcement.link`: **none for S2** (`null`) — there's no convocatoria page live yet; Sprint 3
Story 3.2 repoints this at the call once it launches.

**Hero** (`mode: 'promo'` — the shop has too little live inventory yet for a `listings`-mode hero):
- `promo_cta_text`: "Conoce panfleto"
- `promo_cta_link`: `https://panfleto.miyagisanchez.com/acerca`
- `promo_image_url`: **gap — no image asset exists yet.** Needs a real hero image from Daniel (or
  this field stays unset for S2, which `applyStoreConfig` allows; hero still renders in a degraded
  text-only form). Flagging rather than guessing.

**Theme preset:** proposing `papel` (warm paper tones, editorial typography — the closest existing
fit) as an interim choice; Sprint 4 may add a dedicated dark/editorial preset and swap it in later.

**Acerca** (`content.about.body`, ≤600 chars):
> panfleto es una editorial que publica relatos de terror de autores mexicanos y latinoamericanos.
> Cualquiera puede enviar un relato, sin cuenta y sin costo. Los relatos aceptados se publican como
> adelanto digital. Los lectores votan por sus favoritos, y el relato más votado se imprime en una
> edición física. panfleto también vende stickers de edición limitada.

**FAQ** (`content.faq.items`, Q≤140/A≤600 each — scoped to what's true *today*, not the not-yet-open
call):
1. **¿Qué publica panfleto?**
   Relatos de terror de autores mexicanos y latinoamericanos, elegidos por votación de los lectores.
   El relato más votado se imprime en una edición física.
2. **¿Panfleto era miyagiprints?**
   Sí. Es la misma tienda con nombre nuevo. Los enlaces antiguos con miyagiprints siguen funcionando
   y redirigen aquí.
3. **¿Qué vende panfleto además de las historias?**
   Stickers de edición limitada, en la colección Stickers.

**Políticas** (mirrors `returns_policy` — no separate field):
- `window`: "7 días"
- `shipping_paid_by`: `buyer`
- `conditions`: "Producto sin uso, en empaque original."
- `custom_note`: "Los relatos publicados en el sitio no son un producto físico y no aplican para
  devolución."

**Collections** (3, created via the new `create_collection` tool; Historias/Convocatorias start empty
— Sprint 3 populates them):
1. **Historias** — "Los relatos que panfleto ha publicado, con su adelanto para leer antes de
   decidir si votas."
2. **Convocatorias** — "Los relatos aceptados en la llamada abierta actual, mientras compiten por la
   edición impresa."
3. **Stickers** — "Stickers de edición limitada, impresos por panfleto." → the existing "Stickers
   personalizados" product gets assigned here via `update_listing.collection_names`.

**⬜ Waiting on Daniel's read/approval of this copy block before any MCP call executes.**

## Your three actions
Once the PRs are merged + deployed, do these in order:
1. **Rename the slug** (Story 2.1). Shop settings → Canal → change the shop's slug from
   `miyagiprints` to `panfleto`. This is the self-serve `PATCH /api/sell/shop/slug` flow — the old
   slug 301-aliases automatically for 90 days.
2. **Grant the subdomain** (Story 2.1). Admin → Tenants → find the shop (now `panfleto`) → grant
   `subdomain`. This writes the comp grant that makes `panfleto.miyagisanchez.com` route white-label.
3. **Provision (or rotate) the shop's MCP agent token** (Story 2.3 — found while checking what
   Story 2.3's execution needs). `POST /api/sell/agent-token` is Clerk-session-gated only — same as
   the two actions above, no internal/admin path exists — and the plaintext token is returned
   **once**, never retrievable again. Shop settings → "Agentes e integraciones" → generate (or
   rotate, if one already exists but the plaintext is gone) → paste me the token so I can run the
   Story 2.3 MCP calls with it.

## Sprint QA — one spec per story
- **2.1:** extend `e2e/own-shop-seo.spec.ts` and/or `e2e/subdomain.spec.ts` with the slug-alias 301 +
  subdomain white-label render assertions.
- **2.2:** new spec (or extend `e2e/mcp-tool-dispatch-parity.spec.ts`) asserting `create_collection`
  → real Medusa category → visible in `list_my_collections`, plus an auth-rejection case.
- **2.3:** extend `e2e/mcp-store-config-presentation.spec.ts` (already round-trips
  announcement/hero/theme_preset) to cover `content.about`/`content.faq`, plus a render-level check
  that the three collections (and the curated sticker) appear on the storefront.
- **deterministic gate:** backend `medusa build` → `tsc --noEmit` → `npm run test:unit`; frontend
  `tsc --noEmit` → `npm run build` → Playwright `api` — both green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/s/miyagiprints
   → 301 to https://miyagisanchez.com/s/panfleto.
2. Open https://panfleto.miyagisanchez.com in a private window.
   → White-label shop, new brand, no platform chrome.
3. Open https://mschz.org/panfleto
   → 301 to the canonical shop URL.
4. Tap through Historias / Convocatorias / Stickers collections + Acerca.
   → Curated content, es-MX copy, sticker product intact under its collection.

If any step fails, note the step number + what you saw — that's the bug report.
