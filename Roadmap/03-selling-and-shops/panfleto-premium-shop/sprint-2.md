# Panfleto — the first premium shop — Sprint 2: Rename + dress-up miyagiprints → panfleto

**Status:** ✅ ALL 3 STORIES SHIPPED + LIVE. **Sprint 1 confirmed merged** (frontend `#217`/`6c42c43`,
backend `#81`/`3b252c1`, both on `origin/main`). Branched fresh: `feat/panfleto-premium-shop-s2` off
`origin/main` in both repos (the old `feat/panfleto-premium-shop` is a squash-merged dead end).

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
**Status:** ✅ SHIPPED + LIVE. Daniel executed the rename (`miyagiprints` → `panfleto`), the subdomain
grant, and — beyond scope — added a verified custom domain. `e2e/panfleto-rename-alias.spec.ts`
(self-activating) now genuinely **passes** (not skips) all 3 assertions against the live shop:
`/s/miyagiprints` redirects to `/s/panfleto`, `panfleto.miyagisanchez.com` renders white-label,
`mschz.org/panfleto` resolves. Two real spec bugs found and fixed against the live result (PR
[#226](https://github.com/danybgoode/miyagisanchezcommerce/pull/226), squash `17b4293`): (1) the
page-level redirect is a **308** (Next.js `permanentRedirect()`), not 301 — 301 is what middleware's
own `NextResponse.redirect(url, 301)` issues for the mschz.org/subdomain host paths, a genuinely
different code path for the same alias intent; (2) a codex cross-review catch — the collection-render
check (Story 2.3) originally asserted loose "Stickers" text, which the shop's pre-existing "Stickers
personalizados" product title also satisfies regardless of whether the collection exists; fixed to
assert the shop's own nav-strip href shape instead.

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
**Status:** ✅ SHIPPED + LIVE. Copy approved by Daniel as drafted (verbatim, promo image left unset
per his call). Executed live via MCP tool calls against `POST /api/ucp/mcp` using the shop's own
agent token: one `patch_store_configuration` call (profile tagline/announcement/hero/theme_preset +
content.about/content.faq + returns_policy — all 3 blocks applied, zero issues), three
`create_collection` calls (Historias/Convocatorias/Stickers, all created cleanly), one
`update_listing` call assigning the existing "Stickers personalizados" product
(`prod_01KWNH3FF7BGGFVRVSBEMZSX35`) into the Stickers collection. `profile.name` was left untouched
(Daniel's own rename already set it to "Panfleto"; the draft's lowercase suggestion was superseded by
his live choice, not overridden). Verified via `get_store_configuration` + `list_my_collections`
(both read back exactly as sent) and a live storefront curl (`/s/panfleto/c/{historias,convocatorias,
stickers}` all present in the nav HTML). `e2e/panfleto-dressup-render.spec.ts` genuinely **passes**
(not skips) both checks; the full `mcp-create-collection.spec.ts` + `mcp-store-config-presentation.spec.ts`
suites (15 tests) pass live.

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

**✅ Approved by Daniel as drafted (2026-07-11) and shipped live — see Story 2.3 status above.**

## Daniel's three actions — all done
1. ✅ **Renamed the slug** (Story 2.1) — `miyagiprints` → `panfleto`, confirmed live.
2. ✅ **Granted the subdomain** (Story 2.1) — `panfleto.miyagisanchez.com` confirmed white-label live.
   Daniel also added a **verified custom domain**, beyond this sprint's scope — not touched by any
   spec or code here.
3. ✅ **Provisioned the MCP agent token** (Story 2.3) — used to execute every MCP call in this sprint.

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

**Agent-verified already** (2026-07-11, via `curl`/Playwright against prod — not a substitute for
your own eyeball pass, especially for visual/copy quality):
1. Open https://miyagisanchez.com/s/miyagiprints
   → Redirects to https://miyagisanchez.com/s/panfleto. ✅ confirmed (308).
2. Open https://panfleto.miyagisanchez.com in a private window.
   → White-label shop, new brand, no platform chrome. ✅ confirmed (200, "panfleto" in the HTML).
3. Open https://mschz.org/panfleto
   → 301 to the canonical shop URL. ✅ confirmed.
4. Tap through Historias / Convocatorias / Stickers collections + Acerca.
   → Curated content, es-MX copy, sticker product intact under its collection. ✅ nav links + sticker
   curation confirmed via API; **visual/copy quality is still yours to eyeball** — tagline, hero,
   Acerca body, FAQ, and the `papel` theme preset haven't had a human look at them live yet.

If any step fails, note the step number + what you saw — that's the bug report.
