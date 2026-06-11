---
title: "Marketplace positioning — page title, OG tags & social card"
slug: marketplace-positioning-meta
status: shipped
area: "08"
type: chore
priority: null
risk: low
epic: "08-growth-and-promotions/marketplace-positioning-meta"
build_order: null
updated: 2026-06-11
---

# Scope — Marketplace positioning (title / description / OG / social card)

> **Status: ✅ SIGNED OFF (Daniel, 2026-06-10).** Groomed 2026-06-10 against a fresh code read
> (`app/layout.tsx`, `app/opengraph-image.tsx`, `app/api/ucp/manifest/route.ts`). Daniel approved with
> his own final title + description wording (below). Scaffolding next.
>
> **Class:** Chore (copy / SEO / social metadata). **Stage-2.5 bucket:** **light enhancement** — a
> copy change across a handful of existing metadata surfaces, no new feature, no commerce/Medusa
> change. **Risk: LOW** — frontend-only, no payments/auth/DB/shared-infra; doc-and-string edits to
> `app/` metadata. (The reviewer may auto-merge on a green gate per WAYS-OF-WORKING.)

## The ask (mirrored back)
*You want the public-facing metadata — the browser/Google `<title>`, the meta description, the
OpenGraph/Twitter tags, and the rendered social-share image — to tell a first-time visitor (or Google,
or a shared link) **what Miyagi actually is: a marketplace where you buy and sell, and where you can
open your own shop** — instead of the current "Infraestructura de comercio," which is B2B/infra jargon
that doesn't communicate. The reference points are Gumtree / Vinted ("the go-to marketplace", "buy,
sell & open a shop") and the **segundamano** recognition that makes it click for people in Mexico.
Right?*

## Daniel's decisions this groom (2026-06-10)
1. **Positioning angle → "Marketplace + own shop" (broad).** Lead with buy/sell **and** "abre tu
   tienda," not segundamano-only. *But* — the **segundamano recognition is preserved deliberately** in
   the description, keywords and the OG card (it's the "and then it clicks" hook you flagged), even
   though it isn't the headline. Truer to scope (the platform is also autos, servicios, nuevo, own
   shops) while keeping the instant recognition.
2. **Scope → metadata + social only.** Title, description, OG/Twitter tags, the rendered OG image, and
   an audit of the UCP manifest `about` line. **No on-page changes** this round — the logged-out
   homepage hero / empty-state copy is explicitly **out** (noted below as a future option).
3. **Tone → strip the jargon, keep the "sin comisiones" hook.** Drop "Infraestructura de comercio,"
   "API agentic," "widget." Keep **0% comisión / sin comisiones** as the seller differentiator (real
   edge vs Mercado Libre). Do **not** re-add dominio-propio / API channel language to the public meta.

## What already exists — the audit (reuse, don't rebuild)
Every surface carrying the old positioning, all **es-MX, frontend-only, low-risk**:

| Surface | File | What it controls |
|---|---|---|
| Site `<title>` default + template, `description`, `keywords`, OpenGraph, Twitter card | `app/layout.tsx` (`export const metadata`, ~L38–73) | Google result, browser tab, link-preview text |
| Rendered social-share **image** — `alt`, tagline line, pill badges | `app/opengraph-image.tsx` (`alt` L3, tagline L97, pills L102) | The 1200×630 PNG shown when the link is shared |
| Agent-facing API description | `app/api/ucp/manifest/route.ts` (`description`, L31) | What an AI agent reads about the site |

**Audit finding:** the UCP manifest **already** says *"A P2P marketplace for Mexico with native AI
agent support…"* — it's already marketplace-framed and better than the human copy. **No change needed
there** (it's agent-facing English; leave as-is). The work is `layout.tsx` + `opengraph-image.tsx`.

**Out of scope / leave alone:** `app/shop/manage/settings/ShopSettings.tsx` L3256 ("…SSL activo,
infraestructura nuestra") — different context (custom-domain settings copy), not the brand tagline.

## Proposed copy (es-MX) — before → after
*(Final wording is reviewable at build; this is the signed-off intent.)*

**`app/layout.tsx`**

- **title.default:** ~~`Miyagi Sánchez — Infraestructura de comercio`~~ →
  **`Miyagi Sánchez — Abre tu tienda, compra y vende`** *(Daniel's final wording)*
- **title.template:** `%s | Miyagi Sánchez` *(unchanged)*
- **description:** ~~`Publica, vende y cobra sin comisiones. Marketplace · dominio propio · widget · API agentic. Hecho para México.`~~ →
  **`El nuevo punto de encuentro para comprar y vender de todo en México. Encuentra cosas de segunda mano, eventos, productos o servicios, abre tu propia tienda y vende sin comisiones.`** *(Daniel's final wording — keeps the segundamano hook + adds eventos / servicios breadth)*
- **keywords:** → **`['marketplace México', 'segundamano', 'comprar y vender', 'vender sin comisiones', 'abrir tienda online', 'eventos', 'México']`**
- **openGraph.title / twitter.title:** match the new title.default (sans template).
- **openGraph.description / twitter.description:** match the new description.
- **appleWebApp.title:** `Miyagi Sánchez` *(unchanged)*

**`app/opengraph-image.tsx`**

- **`alt`:** → **`Miyagi Sánchez — Abre tu tienda, compra y vende`**
- **tagline (L97):** ~~`Infraestructura de comercio · Comisión: 0%`~~ →
  **`Compra y vende de todo en México · Sin comisiones`**
- **pill badges (L102):** ~~`['Marketplace', 'Dominio propio', 'API agentic', '0% comisión']`~~ →
  **`['Marketplace', 'Segundamano', 'Tu propia tienda', '0% comisión']`** *(keeps Marketplace + 0%
  comisión; swaps the two jargon pills for the segundamano hook + the own-shop pitch)*

## Acceptance criteria (Daniel can run these)
1. **View page source** of `https://miyagisanchez.com` → `<title>` reads *"Miyagi Sánchez — Abre tu
   tienda, compra y vende"*; `<meta name="description">`, `og:title`, `og:description`,
   `twitter:title`, `twitter:description` all carry the new marketplace+own-shop copy.
2. **No "Infraestructura de comercio"** anywhere in the rendered head or the OG image.
3. **Open `https://miyagisanchez.com/opengraph-image`** → the card shows the new tagline and the new
   pills (`Marketplace · Segundamano · Tu propia tienda · 0% comisión`), no "API agentic" / "Dominio
   propio".
4. **Paste the homepage URL** into a link-preview tester (or a WhatsApp/Twitter draft) → title +
   description + image read as the marketplace, not "infraestructura."
5. **`grep -rn "Infraestructura de comercio" app/`** → returns nothing (the ShopSettings
   "infraestructura nuestra" line is a different string and stays).

## QA / smoke stage
- **Deterministic gate (the spec):** add **one `api` Playwright spec** that fetches `/` as HTML
  (`request.get('/', { headers: { Accept: 'text/html' } })`) and asserts the SSR `<head>` **contains**
  the new title + description and **does NOT contain** `Infraestructura de comercio`. Pure SSR read, no
  browser, no auth — fits the always-on `api` project.
  - ⚠️ **Per LEARNINGS (robots/casing, 2026-06-09):** before merge, `grep` the live e2e suite for any
    spec asserting the *old* tagline/title/OG bytes and update it in the same PR. (This groom found
    **none** in the mounted tree, but the builder re-checks against the full checkout.)
- **Smoke (no money/auth path):** anonymous — a `curl -s https://<preview>/ | grep -i '<title>'` and a
  browser open of `/opengraph-image`. **No step is owed to Daniel** (nothing touches a money/auth
  surface); the agent can fully self-smoke this one.

## In / out of scope
- **In:** `app/layout.tsx` metadata block; `app/opengraph-image.tsx` (alt/tagline/pills); one `api`
  spec; the regression grep of the suite.
- **Out (this round):** the logged-out **homepage hero / empty-state** on-page copy (`app/page.tsx`
  "El marketplace está tomando forma") — deferred by Daniel's scope call; **easy follow-up** if the
  meta change lands well. UCP manifest copy (already marketplace-framed). ShopSettings domain copy.
  Any new bilingual (`en`) strings — these surfaces are **es-MX, not on the bilingual allow-list**
  (AGENTS rule #5); keep es-MX only.

## Open risks
- None material. Pure copy on a low-risk surface. Only watch item is the **suite-grep for a stale
  assertion** (called out in QA) — the one way a metadata-byte change bites CI.

## Slice (single sprint — it's one small chore)
One sprint, three trivial stories:
- **S1.1** — Rewrite `app/layout.tsx` metadata (title/description/keywords/OG/Twitter). *LOW.*
- **S1.2** — Rewrite `app/opengraph-image.tsx` (alt + tagline + pills). *LOW.*
- **S1.3** — Add the `api` meta spec + grep/update any stale suite assertion. *LOW.*

> **As a** first-time visitor / sharer / search engine, **I want** the title, description and share
> card to say "marketplace where you buy, sell and open your own shop," **so that** I immediately
> understand what Miyagi is (the way "es como segundamano" makes it click). **Acceptance:** the five
> checks above.

---
*Shipped. Scope, acceptance, QA, and retrospective live under
`08-growth-and-promotions/marketplace-positioning-meta/`.*

## Shipped

✅ Shipped 2026-06-11 via frontend PR [#83](https://github.com/danybgoode/miyagisanchezcommerce/pull/83)
(squash `cf0fa8a`). The old "Infraestructura de comercio" positioning is gone from the public
metadata and OG card; the new copy says Miyagi is a marketplace to buy, sell, and open a shop in
Mexico.
