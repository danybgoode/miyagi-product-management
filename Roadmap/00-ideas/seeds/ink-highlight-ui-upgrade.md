---
title: "Ink + highlight — a visual language that doesn't read as AI-default, and the copy that goes with it"
slug: ink-highlight-ui-upgrade
status: ready
area: "09"
type: feature
priority: null
appetite: M
underwritten_by: null
risk: low
epic: null
build_order: null
updated: 2026-08-22
---

# Pitch — Ink + highlight

## Problem
Daniel started recruiting merchants himself, and the single most repeated piece of feedback is that
the site **"looks fully AI."** That is not a hallucination on the merchants' part and it is not a
failure of `ui-refresh-launch`: the M3-era language that epic shipped in July — soft elevation,
16px surface radii, pill controls, muted semantic palette, tidy card grids — is *exactly* the
house style every model reaches for. It was a good look in July. It is now the default look of the
web, and a merchant deciding whether to trust a one-person marketplace reads "default" as
"nobody actually built this."

An outside agent produced three UI studies; Daniel picked **"03 · Ink + highlight"** — editorial
newsprint: warm paper, hard ink rules, uppercase section heads, de-chromed product cards, and one
acid highlight used as a marker. It is homepage-only, it silently redesigned surfaces it had no
business touching (the navbar most of all), and it is written in raw hex — but the modules it drew
are, on inspection, the modules the homepage already has. But the *language* is
right, and it is right for a reason worth writing down: the marketplace's own content — a printed
magazine, a neighbourhood, one-of-a-kind objects — is editorial, and the current chrome is not.

Riding along are four communication fixes Daniel wants folded into the same pass, because they
touch the same files and the same merchants:

1. `/us/sell` and `/mx/vende` shout **"IA" / "AI"** in the hero's big slot. The category is not the
   pitch. The pitch is *your products get listed on ChatGPT, Claude and Gemini* — the new SEO.
2. The `/us/sell` copy-paste prompt is literally **`"what is miyagisanchez.com?"`** — five words, no
   URL, no comparison, and it does not ask for the thing the sentence above it promises.
3. `/acerca`'s founder grid ends on **"MSc en Finanzas · University of Aberdeen, 2024"** — the one
   academic credential in a row of three operating proofs, and it already appears in the prose above it.
4. The footer's contact address is invisible — only the word "Contacto", with the address hidden in a
   `title` attribute.

## Appetite
**M.** Enough to build one coherent visual layer plus the copy pass, across the buyer marketplace and
the marketing surfaces. It is explicitly *not* enough to repaint checkout or the seller portal, and if
the layer starts wanting structural changes to navigation or new homepage modules, that is the signal
to cut, not to spend more.

## Outcome & signal
After this ships, a merchant landing on `miyagisanchez.com/mx` or `/us/sell` sees a page that reads as
*made*, not *generated* — and the AI-distribution promise is stated in the words a merchant already
understands. Daniel tests it the way the problem was found: show the same three or four merchants the
new pages and ask the same open question. "It looks AI" stops being the first thing said.

Secondary, checkable signal: the `/us/sell` prompt, pasted into a real assistant, comes back with a
useful comparison instead of a paragraph about a Mexican marketplace.

## Stage-2.5 bucket
**Mixed — and two of the four asks are lighter than they look.**

- **Genuinely new** — the Ink + highlight layer. There is no editorial mode today; `data-mode` has
  `calm` and `dark`, both of which are *contrast/motion* variants, not a different language.
- **Already possible today** — "communicate the MSc in the prose above." Verified in
  `lib/about-content.ts`: both locales already say *"Tiene una maestría en Finanzas — la razón por la
  que este proyecto está diseñado para operar con costos mínimos…"*. The only real work is removing
  the box and choosing its replacement. (A light copy edit can strengthen the sentence — the mockup
  marks the phrase — but nothing has to be *added*.)
- **Light enhancement, possibly zero-deploy** — the `/us/sell` prompt and the hero "AI" slot are
  string leaves in the dictionary. `platform_copy_overrides` + `/admin/contenido` can change them
  today with no build (`lib/copy-overrides-merge.ts`; `lib/copy-tree.ts` resolves numeric array
  segments, so `sellerAcquisition.us.heroValues.1.value` is reachable). **They still ship as code
  changes** — an override is a patch, and these are permanent improvements that belong in the
  dictionary the specs regression-test — but the override path is available if Daniel wants the
  wording live tonight, before the epic runs.
- **Light enhancement** — the footer address. Structural, but a few lines.

## Bill of materials (What / Why)

| What | Why |
|---|---|
| `[data-surface="editorial"]` scope on the buyer + marketing route groups | Same mechanism as the shipped `[data-mode]` / `[data-shop-preset]`. Checkout, seller portal, embeds and seller storefronts are out of range *by construction*, not by discipline. |
| `--hi` / `--hi-ink` token pair, defined in default, `calm` and `dark` | One new token family, not a palette. Undefined in a mode = the layer breaks there. |
| Editorial primitives: section head, rule weights (5px / 2px), de-chromed product card, offset-shadow module | Four shapes carry the whole language. Anything beyond four is decoration. |
| Radius + elevation overrides *inside the scope only* (surfaces 0, controls 4px, shadow → rule) | The tell that reads as "AI" is soft-and-rounded. Scoped so the shipped `.btn` hierarchy is not forked. |
| Hero value slot: names the destinations, not the category | "AI" is what we are. "ChatGPT · Claude · Gemini" is what the merchant gets. |
| `/us/sell` prompt rewritten to three instructions | The prompt is the proof mechanic. A generic one proves nothing and wastes the most persuasive element on the page. |
| `/acerca` 4th box → "Integración Linio–Falabella" | Same kind of proof as the other three. The MSc keeps its home in the prose. |
| Footer address as the visible label | An address only a hover reveals is not a support channel — and agents read text, not `title`. |

## Scope

**In v1:**
- The editorial layer on: marketplace home (`/mx`, `/us`), listing browse (`/l`), PDP, `/mx/vende`
  (and its persona pages), `/us/sell`, `/acerca`, and the platform footer.
- **Every section the homepage actually renders**, in its live order (read from
  `app/(mx-site)/mx/page.tsx`; `/us` is the same `MarketHomePage` with `market: 'us'`):
  signed-out hero + trust badges · `HomeAnnouncementCard` · **`HomeRetomaOffers`** (the
  "Retoma donde te quedaste" rail + ≤2 offer alerts, a signed-in client island in the top slot) ·
  `ComparadorTeaserCard` *(mx)* · Recién llegado al barrio · `CategoryChips` ·
  **the Pulso local strip linking `/vecindario`** *(mx; live-items variant and the empty-state
  banner variant are two different renders — both need the skin)* · Selección de la semana
  (Destacado + grid) · Categorías · `HomeSellerModule` + the terminal seller block.
- **A bug fix found while verifying the above:** `HomeRetomaOffers.tsx:151` builds every rail card's
  href as `` `/mx/l/${card.medusaId}` `` and the component takes no `market` prop — so a signed-in
  buyer on `/us` taps their own favourite and lands in the Mexican market. One story, `risk: low`.
- Chrome (header, nav, tab bar, account menu) **re-skinned** — same elements, same IA.
- The four copy/content asks above, in both locales where the surface is bilingual.
- `--hi` defined in all three modes; contrast guard green throughout.

**Out of v1 (no-gos):**
- **Checkout.** Not repainted, not re-scoped, not touched. It is the one HIGH-risk surface and it
  inherits nothing because the layer is scoped.
- **Seller portal / `/shop/manage`.** It has its own shipped design language
  (`seller-portal-rails-foundation`) and ~50 files with known unswept token debt. Repainting it here
  turns an M into an L.
- **Seller storefronts, subdomains, custom domains, embeds.** Sellers own their look; five presets
  exist. The platform's editorial layer must not leak into a tenant's brand.
- **Navigation restructuring.** The mockup added a second nav row and moved search. `navigation-settings-reorg`
  spent four sprints landing the current IA. Re-skin it; do not re-litigate it.
- **Extending `/vecindario` (Pulso local) to the US market.** It is `market === 'mx'` gated and
  `NEIGHBORHOOD_PULSE_COPY` is a hardcoded Spanish constant, not a dictionary namespace. Correct as
  it stands; internationalising it is its own ask.
- **The comparador teaser on `/us`.** Also `market === 'mx'` gated, and rightly so — it benchmarks
  against Mercado Libre and Shopify.
- **Yellow as an accent colour.** It is a marker. It never carries text, never a button fill, never a link.
- **New fonts.** Space Grotesk stays. A typeface change is its own bet.
- **A feature flag.** Per WAYS-OF-WORKING (2026-08-10), no flag unless asked. `git revert` is faster.

## Rabbit holes
- **"Scoped" has to be real.** The seductive shortcut is to edit `--r-lg` and `--shadow-*` at `:root`
  and let everything inherit — that is what `ui-refresh-launch` did, and it is what would drag
  checkout into this epic. The layer must be an attribute selector on the route groups' layouts, and
  a story must *prove* a checkout page renders byte-identically.
- **The contrast guard is not optional and it will bite.** `e2e/design-token-foundation.spec.ts`
  asserts WCAG-AA and fails on any newly-introduced raw colour in customer-facing dirs. `#eaff42` as
  a foreground on `--papel-50` is ~1.08:1 — it fails AA by an order of magnitude. Every use of it
  must be a background under `--fg` (`#1a1a18` on `#eaff42` measures 15.6:1, which is why the marker
  role works and the accent role cannot).
- **Tailwind arbitrary values built by interpolation emit no CSS** — promoted to LEARNINGS from
  `seller-portal-rails-foundation`. If the editorial primitives need per-variant classes, use a static
  class-string map.
- **Three modes, not one.** `calm` and `dark` both redefine surfaces and shadows. A `--hi` defined
  only at `:root` will look wrong in `calm` and unreadable in `dark`.
- **Channel parity.** `AGENTS §Federated Channels` requires the change to be correct on marketplace,
  subdomain, custom domain and embed. Here "correct" means *absent* on the last three — which still
  has to be asserted, not assumed.
- **The perf budget.** `hyper-performant-website`'s guard is an acceptance constraint. Hard rules and
  flat fills should make the page *cheaper*; a regression means something was added, not restyled.
- **The homepage is a prerendered static CDN asset, and the personalized parts are client islands.**
  `e2e/home-static.spec.ts` asserts `/` stays prerendered. Nothing in this skin may add a server read
  or make `HomeRetomaOffers` anything other than an island — a visual change that turns the homepage
  back into a per-request function reintroduces the ~30 s cold start `marketplace-static-shell`
  killed. The rail also renders a **skeleton** that reserves its real height; the skin must keep the
  reserved height honest or the page shifts under the visitor.
- **`copy.footer.contact` goes orphaned** in both locales when the address becomes the label. Retire
  the key; do not leave it dangling for the next copy audit to find.
- **`/us/operators` shares `shared.trustPrompt`.** Rewriting the EN prompt changes that page too —
  check it reads correctly there, or give the US market its own key.

## What already exists (reuse, don't rebuild)
- `app/globals.css` — `--papel-*` (the warm paper/ink ramp the mockup independently converged on;
  `--papel-50` **is** the mockup's `#fbfaf6`), `--selva-*`, the `--r-*` / `--shadow-*` / `--t-*` /
  `--s-*` scales, `:root[data-mode="calm"|"dark"]`.
- `[data-shop-preset="retro"]` (`globals.css` ~L458) — **prior art for this exact CSS shape**:
  `box-shadow: 3px 3px 0`, hard borders, `--shop-radius: 4px`, an uppercase label bar. The pattern is
  already proven inside the token system and inside the CI guards.
- `09/design-token-foundation` + `token-contract.md` — the semantic-token contract and the raw-colour
  + WCAG-AA CI guard. The refresh adds token *values*; the guards stay.
- `09/seller-portal-rails-foundation` — `<Button>`, `<Card>`, `<StatusBadge>`, `<Banner>`, `<Toast>`
  and `lib/design-token-audit.ts`'s four lints. Extend, never fork.
- `08/seasonal-theme-engine` — already owns the **exclusion list** (seller storefronts, dashboards,
  checkout, account, embeds) derived from the layout's channel/route signals. The editorial layer
  reuses that signal rather than writing a second scope list.
- `app/components/PlatformShell.tsx` — the header/footer the layer re-skins; `lib/contact.ts` is
  already the single source for the address (and the Reply-To on 63 emails).
- `app/(mx-site)/mx/page.tsx` — **one** `MarketHomePage` serves both markets (`/us` is a 17-line
  adapter), so every homepage skin change lands on MX and US at once. Its client islands —
  `HomeRetomaOffers`, `ComparadorTeaserCard`, `HomePersonalizationProvider`, `FavoritesProvider`,
  `CategoryChips`, `HomeAnnouncementCard`, `HomeSellerModule` — all already exist and are re-skinned,
  not rebuilt. `lib/neighborhood-pulse.ts` + `-server.ts` back the Pulso local strip.
- **Two copy systems, not one.** Page copy is `locales/{es,en}.json` → `home.*`; the Retoma island's
  strings live in the `BuyerCopyText` population map (`components.HomeRetomaOffers.*`). Anything
  reworded in that rail goes through the second one.
- `app/(shell)/mx/vende/_components/` — `SellerAcquisitionSections.tsx`, `PromptBlock.tsx`,
  `page-config.ts`. `/us/sell` and every `/mx/vende` persona share this one section system, so the
  hero change lands on both markets at once.
- `lib/copy-overrides*.ts` + `/admin/contenido` — the override path for the two string-only asks.
- `lib/about-content.ts` + `lib/about-content-overrides.ts` — the `/acerca` model; the founder prose
  already carries the MSc.
- `09/ui-refresh-launch` — its retro, its sprint sequencing, and its carve-out precedent
  ("pure visual layer, revert = `git revert`; no runtime seam").

## UX heuristics & rails check
- **CI guards covering this surface:** `e2e/design-token-foundation.spec.ts` (raw colour + WCAG-AA);
  `lib/design-token-audit.ts`'s four lints (raw palette, `bg-white`, literal radii, feedback-import
  location) over `enforcedSweptPaths`; the `hyper-performant-website` perf budget;
  `e2e/market-route-population.spec.ts` (the `*-site` route groups); the agent-readability no-JS spec
  that fetches `/`, `/vende`, `/acerca`, `/agent`, `/llms.txt` and asserts substantive content — that
  one is a **direct acceptance check** for the footer address and the hero copy.
- **Audits-lens findings that apply:** `00-ideas/audits/results-refresh-2026-06/` is the standing
  lens; to be re-read at build time for anything it already says about the home/`/vende` surfaces.
- **Design-language debt:** the seller portal's ~50 unswept files are *known* debt and are
  deliberately outside this epic's scope — the scoped layer is what keeps them outside it.

## Acceptance criteria

**S1 — the editorial layer**
- `/mx` renders in the editorial language: warm paper, hard rules, uppercase section heads, square
  surfaces, no soft elevation.
- A checkout page and a seller-portal page, opened side by side with `main` before the change, are
  visually identical.
- A seller's own storefront (marketplace, subdomain and custom domain) is unchanged.
- Light, `calm` and `dark` all render correctly; the highlight is legible and never a text colour.
- `tsc` + `build` + Playwright green, contrast guard and perf budget included.

**S2 — buyer surfaces**
- Home, `/l` and PDP all read as one system; product cards have no card chrome; the comparador strip
  is the only module carrying the offset shadow.
- **Checked signed-in as well as signed-out**, on `/mx` **and** `/us`: the Retoma rail, its offer
  alerts, the seller snapshot and the announcement card are all in the editorial language — an
  unskinned island in the top slot is the most visible possible miss.
- The Pulso local strip is skinned in **both** its states — with live pulse items, and as the
  empty-state banner.
- A rail card on `/us` opens the US listing route, not `/mx/l/…`.
- Header, nav, account menu and PWA tab bar contain exactly the same items as before.

**S3 — marketing surfaces + the copy pass**
- `/us/sell` and `/mx/vende` hero: the big slot names ChatGPT, Claude and Gemini and explains it in a
  sentence a merchant recognises; no page says "AI"/"IA" as a standalone headline value.
- The `/us/sell` copy-paste prompt, pasted into a real assistant, returns a cost answer, a comparison
  against named US platforms, and a statement about whether the catalog is agent-readable. Daniel
  runs this himself in one assistant; the agent runs it in another.
- `/acerca`'s founder grid shows four boxes ending in "Integración Linio–Falabella"; the MSc appears
  in the prose in both locales and nowhere else.
- The footer shows `hola@miyagisanchez.com` as visible text in the page's HTML, still clickable, on
  desktop and mobile. `copy.footer.contact` is retired from both dictionaries.

## Kill-switch / runtime gate
`risk: low` — block deliberately omitted. For the record, matching `ui-refresh-launch`'s precedent:
**carve-out — a scoped visual layer plus copy; there is no runtime seam and revert is `git revert` of
the layer commit.** WAYS-OF-WORKING (2026-08-10) also forbids a new flag unless the product owner asks.

## Open risks / research
- **The "new SEO" claim needs a present-day check before it goes in the hero.** The pitch rests on
  agents actually surfacing merchant catalogs. `aiChannel` copy already claims UCP/MCP backing by
  Google, Stripe, Shopify and Visa; a builder should confirm that framing is still current at build
  time rather than inheriting it, since the standard is moving. The safe formulation is what the
  platform *does* — the catalog is exposed in the open format agents read — not a traffic promise.
- **The prompt must be dogfooded, not asserted.** The proposed text was written against the live
  copy in `locales/en.json`, but the round-trip through a real assistant has not been run this
  session (the fetch of `miyagisanchez.com` needed an approval that did not come back in time).
  Running it — in two assistants, on the real URL — is a story, not a footnote.
- **Merchant read is the real signal, and n is small.** Four merchants saying "looks AI" is enough to
  act on; four merchants saying "better" afterwards is not proof it converts. Treat the outcome as a
  trust signal, not a conversion metric.
