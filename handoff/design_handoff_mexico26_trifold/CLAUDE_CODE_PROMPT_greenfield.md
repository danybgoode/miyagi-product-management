# Paste-ready prompt for Claude Code — GREENFIELD (standalone project)

Use this instead of `CLAUDE_CODE_PROMPT.md` when building outside the main repo, as a new purpose-built project. The README, `reference/`, and `briefs/` still apply unchanged.

---

You are building a **greenfield, purpose-built project** for a single print artifact: the **"México 26"** tri-fold brochure. There is no existing repo or design system to inherit — scaffold from scratch and keep it **easy to edit every edition**.

**Read first (in this order):**
1. `design_handoff_mexico26_trifold/README.md` — full spec, tokens, per-panel breakdown, dynamic-data map.
2. `design_handoff_mexico26_trifold/Mexico 26 Trifold.html` — the canonical hi-fi reference. The `<style>` block is the design system; the two `.sheet` blocks are the 6 panels; the `<script>` has `buildQR()` and `fit()`.
3. `design_handoff_mexico26_trifold/reference/*` — the Mexico-86 + ESTO tabloid look references.
4. `design_handoff_mexico26_trifold/briefs/*` — campaign intent, es-MX copy, attribution model.

**Goal:** a **Carta/Letter landscape (11×8.5in), 6-panel, double-sided tri-fold** brochure, **data-driven and print-to-PDF ready**, recreated faithfully from the HTML reference.

**Scaffold:** choose the framework (I'd suggest **Next.js + TypeScript**, or **Vite + React + TS** if you want it lighter — your call, justify it briefly). Set up a clean repo: fonts self-hosted, a print route/page, a typed edition data file, and a real QR library. Break each panel into its own component (`Portada`, `SolapaManifiesto`, `Contraportada`, `Joyas`, `DisenadorInvitado`, `PreguntaleAClaudio`). Keep the correct **letter-fold imposition** from the README (Exterior: solapa · contraportada · portada / Interior: joyas · diseñador · claudio). Use `@page { size: 11in 8.5in; margin: 0 }`, one `.sheet` per page; a screen-only scaled preview on gray.

**Design tokens (define these yourself — no external system):**
- Palette: `--paper #f4f1e8`, `--paper-2 #ece5d4`, `--ink #16160f`, `--selva #1d6f42` (brand green), `--selva-ink #114128`, `--selva-deep #061a0f`, `--selva-soft #dfe9df`, `--hibisco #b04341` (the one hot accent), `--hibisco-deep #8b3331`.
- Fonts (self-host): **Monoton** (cover nameplate), **Anton** (banner headlines), **PT Serif** (editorial body), **Space Grotesk** (brand chrome), **JetBrains Mono** (kickers/captions/slugs), **Bruno Ace** (alternate nameplate variants).
- Halftone/photo-well/QR/article CSS: lift from the reference HTML's `<style>` block.

**Make these dynamic (props/data, not hardcoded):**
- **Gems** array `{ category, name, neighborhood, oneLiner, slug }` → render 6 rows; each QR encodes `/s/[slug]` with UTM + a unique magazine slug.
- **QR codes:** ⚠️ the prototype's `buildQR()` draws a *fake* pattern — **replace with a real encoder** (`qrcode` / `qrcode.react`), encoding the actual destination URL. Keep the look (ink modules on white, 2px ink frame, mono slug caption).
- **Featured designer** (rotates per Mexico match): name, bio, @handle, takeover image, QR.
- **Founder note:** editable rich-text/markdown field, rendered as the ESTO-style article.
- **Aberdeen homage:** editable text (flag for legal/chant check before print).
- **Photo wells:** image slots (guest photo, founder portrait, designer takeover) with the halftone duotone treatment as the empty state.

**Styling rules:**
- Match type/spacing to the reference; respect print minimums (body ≈8–10pt).
- PT Serif for editorial body, Anton for banners, Space Grotesk + JetBrains Mono for brand chrome, Monoton for the cover nameplate (`Cover Wordmark Options.html` has alternates if we want to switch).

**Deliverables:**
1. The scaffolded repo + print route + panel components, rendering from a typed `Mx26Edition` data object (give me the TypeScript types).
2. Real QR generation with UTM/slug attribution.
3. A root `README`: how to run it, how to edit an edition (gems, designer, founder note, QR targets), and how to export PDF.
4. Keep it diff-friendly and incremental — I'll be editing this constantly.

Before coding, give me a short plan: framework choice + why, file layout, the `Mx26Edition` data shape, and the QR/attribution approach. Then implement.
