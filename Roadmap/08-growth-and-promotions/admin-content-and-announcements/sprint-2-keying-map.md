# Sprint 2 — Coverage audit + keying map (Story 2.1)

**Status:** doc landed 2026-07-08 — awaiting Daniel's section-by-section confirmation (see checklist
at the end). No code changes have been made yet; this doc is the gate Story 2.2 waits on.

> Scope: **editorial/marketing strings only**. Functional, accessibility, data-driven, and shared
> commerce-taxonomy strings stay in code — flagged explicitly below wherever they came up during the
> audit, so nothing is silently dropped from consideration.

---

## 1. Baseline — `sellerAcquisition` (verify, no action needed)

Confirmed complete and wired end-to-end today:
- Every `/vende/*` page (`anchor`, `creadores`, `negocios`, `servicios`, `autos`, `mundial`,
  `promotor` + `shared`) reads its copy via `getOverriddenDictionary('es').sellerAcquisition`, so it
  already flows through the Sprint-1 merge seam and shows up in `/admin/contenido`.
- It is **es-only by deliberate design** — every call site hardcodes `getOverriddenDictionary('es')`.
  `locales/en.json` carries a structurally-mirrored `sellerAcquisition` block, but it is unused —
  `lib/bilingual-namespaces.ts`'s own header comment documents this explicitly, and
  `sellerAcquisition` is correctly **not** on `BILINGUAL_NAMESPACES`. This matches AGENTS rule 5
  (es-MX default; bilingual is an opt-in allow-list, not automatic).
- **Action: none.** This baseline is the reference pattern Sprint 2's `home.*` namespace should copy
  (namespace in `locales/es.json` → read via `getOverriddenDictionary('es')` at the call site).

---

## 2. Homepage (`app/(site)/page.tsx`) — proposed `home.*` namespace

The homepage is a static route (`export const revalidate = 60`, no `headers()`/`currentUser()`), which
is exactly why the merge seam uses `unstable_cache` rather than a per-request read — keying it does
**not** change its static-shell status, since the read happens at build/ISR-revalidate time, not per
request.

### 2a. Core strings — recommended IN, low ambiguity

| # | Current hardcoded string (es-MX) | Proposed key | Element |
|---|---|---|---|
| 1 | "Compra y vende en México — gratis, protegido y con ofertas." | `home.ribbon.body` | Value-prop ribbon text |
| 2 | "Cómo funciona →" | `home.ribbon.cta` | Ribbon CTA label (→ `/acerca`) |
| 3 | "Selección de la semana" | `home.selection.heading` | Section heading |
| 4 | "Ver todo →" | `home.selection.cta` | Section CTA (→ `/l`) |
| 5 | "Categorías" | `home.categories.heading` | Section heading — **see footnote** |
| 6 | "El marketplace está tomando forma" | `home.emptyState.heading` | Whole-page empty-state heading |
| 7 | "Las primeras publicaciones aparecerán aquí pronto." | `home.emptyState.body` | Empty-state body |
| 8 | "Publica lo primero" (both signed-in and signed-out CTA variants) | `home.emptyState.publishCta` | Empty-state primary CTA — **one key serves both hrefs**, since the string is identical; the href stays code-driven by auth state |
| 9 | "Pasea por el vecindario" | `home.emptyState.secondaryCta` | Empty-state secondary CTA (→ `/vecindario`) |
| 10 | "Únete a la comunidad" | `home.terminalCta.heading` | Terminal CTA section heading (signed-out only) |
| 11 | "Guarda favoritos, haz ofertas y abre tu tienda — sin comisiones." | `home.terminalCta.body` | Terminal CTA subheading |
| 12 | "Crear cuenta" | `home.terminalCta.primaryCta` | Terminal CTA primary button (→ `/sign-up`) |
| 13 | "Seguir explorando" | `home.terminalCta.secondaryCta` | Terminal CTA secondary button (→ `/l`) |

**Footnote on #5:** the code comment above this heading says "Categorías con vida" but the actually
rendered string is just "Categorías" — a stale comment, not a live discrepancy. Recommend keying the
**rendered** string ("Categorías") and fixing/removing the stale comment in the same pass.

### 2b. Borderline — recommend IN, flagged for explicit sign-off

| # | String | Why borderline |
|---|---|---|
| 14 | "Destacado" (badge on the featured listing card) | Reads as a merchandising/commerce label tied to the "featured" curation mechanic, not pure marketing copy — but it's static across every featured item (not derived from listing data), so it behaves like editorial copy in practice. Recommend keying as `home.featured.badge`. |

### 2c. Explicitly OUT of scope — flagged, not silently dropped

| Group | Where | Reason |
|---|---|---|
| Shared commerce taxonomy | `conditionLabel()` (`lib/listings.ts`) — "Nuevo", "Como nuevo", etc.; `CATEGORIES` labels (`lib/types.ts`) — "Autos y motos", "Inmuebles", etc.; `formatPrice()`'s `'Precio a consultar'` fallback (`lib/listings.ts`) | Static es-MX strings, but genuinely commerce taxonomy shared across PDP, search, seller forms, and more — not homepage-exclusive. A separate "taxonomy keying" effort (if ever wanted) should own these, not this epic. |
| `NEIGHBORHOOD_PULSE_COPY` (`lib/neighborhood-pulse.ts`) | Vecindario strip inline in `page.tsx`, plus reused verbatim in `PlatformShell`'s global nav and footer (`eyebrow`, `viewFeedCta`, `navLabel`, `intro`, `fallbackSubmitter`) | Placed on the homepage, but the constant is defined once and consumed by the global nav/footer too — keying it here would silently ripple into shared chrome. Deferred; revisit if/when nav/footer copy is ever brought into this system. |
| `HomeRetomaOffers.tsx` / `HomeSellerModule.tsx` static shell copy (~8 strings: "Retoma donde te quedaste", "Tu tienda esta semana", "¿Vendes algo?", etc.) | Personalization client islands, populated from a Cloud Run fetch | Explicitly excluded per this sprint's own framing (dynamic/personalized, not static editorial markup). Tracked separately if a future sprint wants to key personalized-module chrome. |
| `PlatformShell.tsx` header/footer (~10 strings: nav CTAs, footer links, "© 2026 Miyagi Sánchez", search placeholder, etc.) | Global chrome rendered on every route, including white-label channels | Out of scope for a "homepage" story — different blast radius (every route, not just `/`). Would need its own scope doc if ever pursued. |
| `PRINT_SOCIAL_TYPES` labels (`lib/print.ts`) | Vecindario pulse-item badges | Shared taxonomy used by `/vecindario` and admin too, same reasoning as commerce taxonomy above. |

---

## 3. `/acerca` — proposed `acerca` namespace + migration approach

### Current state
`/acerca` (`app/(shell)/acerca/page.tsx` + `AboutSections.tsx`) is **not** on the dictionary system
today. All its copy lives in `lib/about-content.ts`: a hand-rolled, already-bilingual (`{es, en}`)
pure-data module — `ABOUT_PAGE` (9 page-chrome fields: eyebrow, title, lead, CTAs, meta tags) and
`ABOUT_SECTIONS` (7 sections: `what_is`, `why_sell`, `how_to_start`, `cost_transparency`, `pricing`,
`founder`, `philosophy`, each with `heading`/`lead`/`body[]`/optional `points[]{title, body}` per
locale). It is genuinely bilingual and **is** on the AGENTS-rule-5 allow-list, via its own mechanism
(not the shared `locales/{es,en}.json` dictionary).

### Important — this content also feeds AI-agent-facing surfaces
`lib/about-content.ts` is explicitly the single source for **five** surfaces, not just the human
`/acerca` page: the MCP `about_miyagi` resource (`app/api/ucp/mcp/route.ts`), the UCP manifest `about`
block (`app/api/ucp/manifest/route.ts`), `/llms.txt`, and the `/agent` page's why-sell/how-to-start/
cost-transparency sections. **Keying this content for admin overrides will make all five surfaces
admin-editable, not just `/acerca`.** This is consistent with the file's own "author once, render many"
design intent, but it's new blast radius (an admin edit could now change what an AI agent reads about
the platform) — flagged here for explicit confirmation, not assumed.

### Recommended migration approach
Sprint-2.md's acceptance text already points here ("`/acerca` via its content lib... flowing through
`getDictionary()` + the Sprint-1 merge seam"), and it's also the path of least resistance since
`applyCopyOverrides` only composes at the `Dictionary` level:
1. Add a new `acerca` namespace to `locales/es.json` and `locales/en.json`, mirroring
   `ABOUT_PAGE`'s 9 fields and each `ABOUT_SECTIONS` entry's `heading`/`lead`/`body[]`/`points[].title`/
   `points[].body` — arrays and nested objects are already supported by the existing dot-path grammar
   in `lib/copy-tree.ts` (e.g. `acerca.sections.pricing.body.1`).
2. Turn `lib/about-content.ts`'s `ABOUT_PAGE` / `ABOUT_SECTIONS` from hardcoded literals into a thin
   wrapper that reads from `getOverriddenDictionary()` output, keeping `aboutCopy()` / `getAboutSection()`
   / `ABOUT_CTA_HREF` / `ABOUT_SELLERS_HREF` as the stable API surface every consumer (page, MCP, UCP
   manifest, llms.txt, `/agent`) already calls — so no consumer-side code needs to change, only the
   data source underneath it.
3. Add `acerca` to `BILINGUAL_NAMESPACES` (`lib/bilingual-namespaces.ts`) so the `en` side is editable
   in `/admin/contenido`, matching its existing genuine bilingual status.

### Proposed key groups
| Group | Keys | Notes |
|---|---|---|
| `acerca.page.*` | `eyebrow`, `title`, `lead`, `primaryCtaLabel`, `secondaryCtaLabel`, `stubBadge`, `langToggleLabel`, `metaTitle`, `metaDescription` | Mirrors `ABOUT_PAGE`. All pure editorial/marketing copy — recommend IN. `langToggleLabel` is borderline (a UI label, not marketing prose) but is user-facing text an editor could reasonably want to change — recommend IN. |
| `acerca.sections.what_is.*` | `heading`, `lead`, `body.0`, `body.1`, `points.0.title`, `points.0.body`, `points.1.*`, `points.2.*` | Pure editorial — recommend IN. |
| `acerca.sections.why_sell.*` | same shape, 4 points | Pure editorial — recommend IN. |
| `acerca.sections.how_to_start.*` | same shape, 3 points (numbered steps) | Recommend IN — flag: the points are ordered steps, so an edit that reorders text without reordering the array would read oddly; not a blocker, just a note for the editor UI's own testing. |
| `acerca.sections.cost_transparency.*` | `heading`, `lead`, `body.0`, `body.1` (no points) | Recommend IN. |
| `acerca.sections.pricing.*` | `heading`, `lead`, `body.0`, `body.1`, `body.2` | Recommend IN, **with an explicit flag**: this section's live body text contains real MXN prices ($199/año, $25/mes, $499/año). Editing this is money-adjacent copy — recommend Daniel treat edits here with the same care as a price change, not casual copy tweaks. See stub-flag discrepancy below. |
| `acerca.sections.founder.*` | `heading`, `lead`, `body.0` | Recommend IN as the **placeholder** text only ("Próximamente" / "Coming soon: an anonymized founder profile…") — this section is genuinely `stub: true`, not real content yet. |
| `acerca.sections.philosophy.*` | `heading`, `lead`, `body.0`, `body.1` (no points) | Recommend IN. |

### Discrepancy flagged for Daniel
`lib/about-content.ts`'s own header comment states both `founder` **and** `pricing` are `stub: true`
placeholders. In the actual data, only `founder` has `stub: true` — `pricing` has `stub: false` and
contains fully-written, live prices. Recommend: (a) fix the stale comment to say only `founder` is a
stub, and (b) key `pricing` as real, currently-live editorial+numeric copy (not a placeholder).

---

## 4. Daniel confirmation checklist

Check each box to authorize Story 2.2 to key that section. Story 2.2 will only touch sections
confirmed here.

- [ ] Homepage — value-prop ribbon (`home.ribbon.*`)
- [ ] Homepage — "Selección de la semana" heading + CTA (`home.selection.*`)
- [ ] Homepage — "Categorías" heading (`home.categories.heading`) — includes fixing the stale
      "Categorías con vida" comment
- [ ] Homepage — "Destacado" featured badge (`home.featured.badge`) — borderline, confirm explicitly
- [ ] Homepage — empty state (`home.emptyState.*`, 3 strings)
- [ ] Homepage — terminal CTA block (`home.terminalCta.*`, 4 strings)
- [ ] Homepage — confirm OUT-of-scope list (shared taxonomy, `NEIGHBORHOOD_PULSE_COPY`, personalization
      islands, `PlatformShell` chrome) — i.e., confirm none of these should be pulled into this sprint
- [ ] `/acerca` — page chrome (`acerca.page.*`, 9 fields)
- [ ] `/acerca` — the 5 non-stub sections (`what_is`, `why_sell`, `how_to_start`, `cost_transparency`,
      `philosophy`)
- [ ] `/acerca` — `pricing` section, understanding it contains live MXN prices
- [ ] `/acerca` — `founder` stub placeholder text
- [ ] `/acerca` — confirm the agent-surface fan-out (MCP `about_miyagi`, UCP manifest, `/llms.txt`,
      `/agent` page) becoming admin-editable as a side effect is intended, not a surprise
- [ ] `sellerAcquisition` baseline — confirmed complete, es-only-by-design, no action needed (informational, no build decision)
