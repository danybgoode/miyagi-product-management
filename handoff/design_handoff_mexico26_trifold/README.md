# Handoff: "México 26" — Trifold Brochure (Miyagi Sánchez)

## Overview
A double-sided **tri-fold brochure** (Carta / US-Letter, **11×8.5 in, landscape**, 3 panels per side = 6 panels) for the **"México 26"** hidden-gems city guide aimed at World-Cup visitors to CDMX. Aesthetic: **retro-punk / *This-Is-England* cultural zine** crossed with a **1994 ESTO Mexican sports-tabloid** (bold condensed banners, dense justified serif columns, inline halftone photos, heavy rules). Brand: **Miyagi Sánchez**, forest-green `#1d6f42`, es-MX copy. Every gem entry and key page carries a **QR placeholder** that should resolve to its claimable shop / the digital magazine.

This brochure is a **campaign artifact**, not an app screen. The production goal is to make it a **data-driven, editable print template** the team can re-render every edition (new gems, new featured designer, new founder note, real QR codes), and export to **print-ready PDF**.

## About the Design Files
The files in this bundle are **design references authored in a single self-contained HTML file** — a high-fidelity prototype of the final look, layout, and print imposition. They are **not** production code to ship verbatim.

Your task: **recreate this as a maintainable, parameterized template inside the `miyagisanchezcommerce` Next.js codebase** (the repo this design was built against), using its existing design tokens (`app/globals.css`) and patterns. Two viable shapes — pick per the team's preference (see "Production options" below):
1. A **React print route** (e.g. `app/(print)/mx26/page.tsx`) that renders the trifold from data and supports print-to-PDF.
2. A **standalone HTML/Handlebars template** rendered server-side for the existing `PrintAdBuilder` flow.

If you implement in React, **break each panel into its own component** and drive everything (gems, QRs, featured designer, founder note) from props/data — the single-file HTML is monolithic by necessity of the prototype tool, not by design intent.

## Fidelity
**High-fidelity (hi-fi).** Final colors, typography, spacing, imposition, and copy are all intentional. Recreate pixel-faithfully, then wire the dynamic parts. Exact tokens and per-panel specs below.

---

## Canvas & Imposition
- Two **sheets**, each `1056 × 816 px` = **11 × 8.5 in @ 96dpi** (landscape). Pixel == 1/96 in, so px values map 1:1 to inches for print.
- Each sheet is a 3-column CSS grid (`1fr 1fr 1fr`), one **panel** per column (`352px` wide), `40px 34px` padding (a few panels override top/bottom padding for fit).
- **Letter tri-fold imposition** (right panel folds in first, left folds over):
  - **Sheet 1 — Exterior**, L→R: **[Solapa interior / manifesto flap]** · **[Contraportada / back cover]** · **[Portada / front cover]**
  - **Sheet 2 — Interior**, L→R: **[Joyas / gems]** · **[Diseñador invitado]** · **[Pregúntale a Claudio]**
- Print CSS: `@page { size: 11in 8.5in; margin: 0 }`; each `.sheet` is one page (`break-after: page`); on-screen the sheets are JS-scaled to fit the viewport (drop this in the React version; use a print stylesheet + a screen "fit" wrapper).
- Screen-only chrome (masthead, legend, panel-role pills, fold ticks) is hidden in `@media print` — keep that separation.

---

## Design Tokens

### Brochure palette (warm newsprint over the brand greens)
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#f4f1e8` | sheet background (warm newsprint); also the stripe-gap color in the nameplate |
| `--paper-2` | `#ece5d4` | sidebar / inset fills |
| `--ink` | `#16160f` | body text, rules, banners |
| `--selva` | `#1d6f42` | **brand green** (matches repo `--color-accent`) — primary |
| `--selva-ink` | `#114128` | dark green accents |
| `--selva-deep` | `#061a0f` | photo-well base |
| `--selva-soft` | `#dfe9df` | homage box fill |
| `--hibisco` | `#b04341` | **the one hot accent** (matches repo `--color-energy`) — "26", flags, pull-quotes |
| `--hibisco-deep` | `#8b3331` | byline / hood labels |

These align with the repo's `app/globals.css` (`--selva-500 #1d6f42`, `--jamaica-500 #b04341`, paper/ink scale). Prefer the repo tokens in production; the brochure just renames them for a print-warm paper.

### Typography (all Google Fonts)
| Family | Role |
|---|---|
| **Monoton** | cover nameplate "MÉXICO 26" (parallel-line / "líneas paralelas" Mexico-86 homage; all-caps, `skewX(-9deg)` italic). *Alternates in the options board — see Assets.* |
| **Anton** | ultra-condensed punk banner headlines (`¿tf is Bezos?`, MAFUFADAS, article headlines, gems title), all-caps |
| **PT Serif** (400/700 + italic) | **editorial body only** — justified columns, drop caps, photo captions (the ESTO newsprint feel) |
| **Space Grotesk** (400–700) | brand chrome: logo wordmark, sub-labels, gem names, UI-ish text |
| **JetBrains Mono** (400/500/700) | eyebrows, kickers, bylines, QR captions, slugs, colophon |
| **Bruno Ace** | used in the options board (striped/solid/knockout nameplate variants); not in the current cover |

Type scale is bespoke per panel (sizes inline in the CSS). Minimums respected for print: body ≈ 10.5–13.5px (≈8–10pt), fine mono captions ≈ 8–9px. Banner headlines 26–40px; cover "26" ≈ 96px.

### Other tokens
- Rules: `--rule-thick` 5px ink, `--rule-green` 3px selva, dotted 2px ink, `.art-rule` 3px ink.
- Photo well: duotone — `--selva-deep` base + radial-gradient halftone dots (`9px` grid) + 45° hatch + `1.5–2px` ink border.
- Paper grain: `radial-gradient(rgba(22,22,15,.045) 1px, transparent 1.4px)` at `5px` tile, `multiply`, `opacity .6`.
- Sticker ("0 IA"): `104px` circle, `--hibisco` fill, `2px` ink border, `rotate(-11deg)`, `0 6px 0` hard shadow.

---

## Panels (screens)

### 1. Portada (front cover) — Sheet 1, right
- **Kicker bar** (green, mono): `DOCUMENTO CULTURAL · CDMX · MUNDIAL '26`; issue line `№ 01 — JUN ▸ JUL 2026 · GRATIS`.
- **Nameplate** "MÉXICO 26": green "MÉXICO" (50px) over hibiscus "26" (96px), **Monoton**, all-caps, `skewX(-9deg)`, stacked. *(This is the "Líneas paralelas" option; the team reviewed 6 variants — see `Cover Wordmark Options.html`.)*
- **Banner subhead**: `MAFUFADAS MUY` (ink) `SÁCALE PUNTA.` (green) — Anton, flat, all-caps. *(Replaced the earlier hard-to-read overprint line.)*
- **"0 IA" sticker** (hibiscus burst, `hecha pa' tu IA`) — the pun: built for AI, has none.
- **Logo lockup**: `logo-mark` (split green/ink square) + `miyagisanchez•` wordmark; tagline mono.
- Decorative halftone bloom bottom-right.

### 2. Solapa interior (manifesto flap) — Sheet 1, left
- **Guest-author article (centerpiece)**: woodcut "Pieza invitada" banner → Anton headline `[ TITULAR DEL AUTOR INVITADO ]` → mono byline `Por [ Autor invitado ]` → halftone **photo well** (floated right, captioned) → **justified PT Serif body** with green drop cap. *All placeholder — see Dynamic data.*
- **Manifesto sidebar** (`--paper-2` box, ink border): `¿POR QUÉ MIYAGISANCHEZ?` + 3-line credo (0% comisión / sin intermediarios / tu IA arma tu tienda).
- **Bottom headline**: `¿tf is Bezos?` (Anton, hibiscus) + ask-your-AI line + **QR** → `miyagisanchez.com` + handles.

### 3. Contraportada (back cover) — Sheet 1, center
- **Founder's note as an article**: "Carta del fundador" banner → headline `[ TITULAR DE LA CARTA ]` → byline `Por Daniel` → **portrait photo well** (floated left) → justified PT Serif body w/ drop cap. *Placeholder; also feeds the `/acerca` about-surface.*
- **Homage box** (`--selva-soft`, ink border, hatched crest): `Homenaje — U. of Aberdeen · Scotland '26` + editable line. **Verify any chant/reference before print.**
- **Big QR** → `miyagisanchez.com/mx26` + "La revista completa".
- Mono colophon.

### 4. Joyas escondidas (gems) — Sheet 2, left
- Header: kicker `LA GUÍA` + Anton title `LAS JOYAS ESCONDIDAS` + italic `Lo que no sale en TripAdvisor.`
- **6 gem rows** (dotted dividers), each = category tag (green/red/ink) · name (Space Grotesk 700) · neighborhood (mono, hibiscus) · one-line · **mini QR + `/s/slug`**.
  Current data: Mercado de Medellín (Roma Sur, `/s/medellin`), Arena México (Doctores, `/s/arena`), Tianguis del Chopo (Buenavista, `/s/chopo`), Mercado de San Juan (Centro, `/s/sanjuan`), Taco-mezcal-lucha tour (San Rafael, `/s/ruta`), Rockshop·Comic's (Metro Hidalgo, `/s/rockshop`).
- Footer note: "Escanea cada joya → su tienda ya está armada…".

### 5. Diseñador invitado — Sheet 2, center
- Kicker `DISEÑADOR INVITADO` + Anton headline `Cada partido de México, un diseñador.`
- Large **art-takeover photo well** (placeholder) + editable bio box + **QR** → `miyagisanchez.com/artista` + merch line. Rotates per Mexico match.

### 6. Pregúntale a Claudio (trust spine) — Sheet 2, right
- Anton headline `PREGÚNTALE A CLAUDIO sobre Miyagi.` + red italic lead `No confíes en nosotros. Confía en tu propia IA.`
- **Prompt box** (ink, mint label): pasteable `«¿Qué es miyagisanchez.com y por qué me convendría vender ahí?»`
- 3 numbered steps · italic aside · Anton callout `Esta es la vez que tu IA le baja el negocio a Bezos.` · **big QR** → `miyagisanchez.com`.

---

## Interactions & Behavior
This is a static print artifact — the only "behavior" is **screen-fit scaling** (JS scales `.sheet` to viewport) and **print** (`@page` letterboxes one sheet per page). In production:
- Keep a **screen preview** (scaled, on gray) and a **print path** (PDF export). The prototype's `fit()` JS can be replaced by a CSS `@media screen` transform or a container-query scale.
- No entrance animations (intentionally — must print/PDF cleanly).

## State / Dynamic data (what to parameterize)
| Field | Source | Notes |
|---|---|---|
| **Gems** (×6) | curated list / Supabase supply import (`SUPPLY_IMPORT_SCHEMA.md`, `listing_type=service`) | `{ category, name, neighborhood, oneLiner, slug }`; QR → `/s/[slug]` claim page |
| **QR codes** | generate real QR | **Replace the faux-QR generator** (see below) with a real encoder; bake **UTM params** + a unique magazine slug per code for attribution (Clarity + claim counts) |
| **Featured designer** | per-Mexico-match rotation (`platform-theme.ts` already rotates themes) | name, bio, @handle, takeover image, QR |
| **Founder note** | CMS/markdown; also powers `/acerca` | keep editable; this is the about-surface content |
| **Aberdeen homage** | editable text | legal/chant verification gate before print |
| **Photo wells** | image upload slots | guest photo, founder portrait, designer takeover |
| **Cover nameplate** | design choice | currently Monoton; 5 alternates in the options board |

## ⚠️ The QR codes are placeholders
The prototype draws a **deterministic *fake* QR** (`buildQR()` in the source — a seeded SVG pattern with finder squares). It does **not** encode anything. **In production, swap in a real QR library** (e.g. `qrcode` / `qrcode.react`) and encode the actual destination URL (with UTM + magazine slug). Keep the visual treatment (ink modules on white, 2px ink frame, mono caption with the slug).

## Design Tokens → repo mapping
Use `app/globals.css` tokens where they exist:
- `--selva` → `--color-accent` / `--selva-500` (`#1d6f42`)
- `--hibisco` → `--color-energy` / `--jamaica-500` (`#b04341`)
- paper/ink → `--papel-*` scale
Add the **brochure-only** bits (warm `#f4f1e8` paper, the 6 print fonts, halftone/photo-well/QR/article CSS) as a scoped print stylesheet so they don't leak into the app UI.

## Assets
All in this bundle:
- **`Mexico 26 Trifold.html`** — the editable hi-fi source (single file; all CSS/JS inline; the canonical reference).
- **`Mexico 26 Trifold (standalone).html`** — fully self-contained/offline export (fonts inlined) for sharing/printing.
- **`Cover Wordmark Options.html`** — the 6 nameplate explorations (Rayas '86 inline/stacked, Bloque invertido, Macizo, Líneas paralelas/Monoton ← chosen, Neón). Use to switch the cover treatment.
- **`reference/`** — Mexico-86 logo refs (`logomex.png`, `mexico-86-world-cup-logo.png`, neon screenshot) and ESTO tabloid scans (`estonews.png`, `newspaper-bulgaria-hero-children.png`) that drove the aesthetic.
- **`briefs/`** — `ask-claude-campaign-brief.md` and `creative-variant-matrix.md` (campaign strategy + es-MX copy matrix; the source of truth for tone and the QR/attribution model).
- Fonts: Google Fonts (Monoton, Anton, PT Serif, Space Grotesk, JetBrains Mono, Bruno Ace) — loaded via `<link>`; self-host in prod for offline/print reliability.
- No raster brand assets beyond the CSS logo lockup; all imagery is placeholder wells.

## Files to reference first
1. `Mexico 26 Trifold.html` — read top-to-bottom; the `<style>` block is the design system, the two `.sheet` blocks are the panels, the `<script>` has `buildQR()` (replace) + `fit()` (replace).
2. `briefs/ask-claude-campaign-brief.md` §6–§11 — editorial intent + attribution.
3. Repo `app/globals.css` — token source of truth.
