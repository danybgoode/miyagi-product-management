# Sprint 2 — Hero & section redesign  ·  status: ✅ built (PR #134, awaiting review/merge)

> Built 2026-06-26 on `feat/seller-landing-launch-polish-s2` (fresh off `main` — the old
> `feat/seller-landing-launch-polish` is S1's squash-merged dead-end branch). Commits:
> **S2.1** `3d9d184` (visible PromptBlock + right-panel hero) · **S2.2** `355d7de` (premium grid +
> benchmark example + steps prompt) · **S2.3** `1c840e8` (mundial bespoke hero). Gate green:
> `tsc --noEmit` + `next build` + the api specs.

> The design work behind the launch polish. Builds on Sprint 1's strings. Mobile-first; reuse the
> v2-S4 responsive idioms. Shared renderer (`_components/SellerAcquisitionSections.tsx`) + bespoke
> `mundial/page.tsx` + `page-config.ts`. Announce only if a fix reaches `globals.css`/shared layout.

## Goal
The hero centers on a **visible** copy-paste prompt block; the right panel leads with AI channels +
premium features; eyebrows and clutter are gone; the anchor shows a premium-features grid and a
benchmark worked-example; everything has more whitespace and reads fast.

## Stories
### US-2 — Build the redesigned hero + sections ✅
*Shipped in three path-scoped commits: S2.1 hero (`3d9d184`) · S2.2 sections (`355d7de`) ·
S2.3 mundial (`1c840e8`).*
**As** a visitor about to be acquired, **I want** a clean hero where I can see and copy the evaluation
prompt instantly, **so that** I act (copy → evaluate, or empieza gratis) without friction.
**Acceptance:**
- **`PromptBlock` component** — renders the per-page directive prompt (`sellerTrustPrompt(id)`) as
  visible text in the familiar sunk/bordered block with a **copy icon** button (reuses
  `TrustPromptCopy` clipboard logic; shows feedback on copy).
- **Hero (right-panel layout, mobile-first):** left = title + tightened lead + `shared.heroTrustLine` +
  CTAs; right = `PromptBlock` (focal) + value list. On mobile: title → lead → trust line → PromptBlock
  → value list → CTAs.
- **Value list** replaces hero stats. **Anchor:** 0% comisión de plataforma · Vende en Claude, Gemini
  y ChatGPT · Funciones premium incluidas. **Persona pages** keep their existing 3 stats (still
  relevant) but adopt the new hero structure + PromptBlock.
- **Eyebrows removed** — stop rendering hero/section eyebrow badges *and* persona-router card eyebrows.
- **"Cómo funciona" aside** → invite line + the same `PromptBlock` (no distrust copy).
- **Anchor social block → premium-features grid** (`anchor.premiumFeatures`): icon cards (boletos y
  eventos · sorteos · agenda · suscripciones · cupones · dominio/subdominio/widget), short labels,
  whitespace.
- **Benchmark worked-example block** under the table (`anchor.benchmark.example`): the take-home table +
  punchline + footnotes; responsive (scrolls/reflows at 360px).
- **Whitespace/precision polish** across sections; lean on icons over sentences where it helps.
- **Apply the hero changes to bespoke `mundial/page.tsx`** (PromptBlock + trust line + no eyebrow).
Risk: low.

## Sprint QA — what shipped
- **Deterministic gate (green):** `tsc --noEmit` + `npm run build` + the api specs.
- **api specs (the blocking gate, pure — no server):**
  - `seller-acquisition-hero-s2.spec.ts` — anchor hero leads with the value list (0% · IA · Premium,
    each iconned); personas fall back to their stats; every hero feeds the PromptBlock a directive
    prompt + copy labels; anchor uses `shared.heroTrustLine`; the mundial prompt carries its page URL.
  - `seller-acquisition-sections-s2.spec.ts` — anchor carries the 6-card premium grid (replacing the
    social block); personas keep their social stats; benchmark carries the worked example (table +
    punchline + footnotes).
- **browser specs (opt-in, nightly via `browser-smoke.yml`; run in CI against the preview):**
  - `seller-acquisition-anchor.browser.spec.ts` — hero PromptBlock visible + `vende-prompt-copy` copies the prompt.
  - `seller-acquisition-anchor-s3.browser.spec.ts` — benchmark example punchline + premium grid render;
    **no router-card eyebrow badge** (`.badge-soft` count 0).
  - `seller-acquisition-mundial.browser.spec.ts` — bespoke hero PromptBlock copies; **no `.badge-promo` eyebrow**.
  - `seller-acquisition-mobile.browser.spec.ts` — `Copiar prompt` button visible + **no horizontal
    overflow at 360/390/414** across all five `/vende*` pages (new hero + premium grid + example block).
- **Owed to Daniel — real-device mobile pass** — the focal hero + PromptBlock on a real phone
  (tap-to-copy, on-screen-keyboard viewport, safe-area insets). Headless viewport ≠ device.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: `BASE_URL` = the PR #134 Vercel preview pre-merge; `https://miyagisanchez.com` after deploy.
**Phone for steps 5–6.**

1. Open `{BASE_URL}/vende` on desktop.
   → Hero shows the title + one trust line on the left, and on the right a **visible prompt block** —
   the full directive prompt as readable text with a **"Copiar prompt para mi IA"** button. **No eyebrow badge.**
2. Click the copy button in the hero prompt block, then paste somewhere.
   → The full directive prompt is on your clipboard (it mentions `miyagisanchez.com`, Mercado Libre, and
   Shopify); the button flips to **"¡Copiado! Pégalo en tu IA"** briefly.
3. Read the hero right-panel value list (under the prompt block).
   → **0% · comisión de plataforma** · **IA · vende en Claude, Gemini y ChatGPT** · **Premium · funciones
   premium incluidas**. No old "20s con Google" / "4 canales" stat tiles.
4. Scroll down.
   → "Cómo funciona" aside shows the invite (**"Compruébalo tú mismo"**) **+ a prompt block** (not the old
   "No tienes que creernos…"); the old social-proof stats block is now a **premium-features grid**
   (**"Todo esto ya viene incluido"** — boletos · sorteos · agenda · suscripciones · cupones · dominio);
   under the benchmark table there's a **worked example** (**"Ejemplo: vendes un producto de $1,000 MXN"**)
   with a punchline + footnotes; the persona-router cards have **no eyebrow badge**.
5. On a phone, open `/vende` and `/vende/mundial`.
   → Single-column; the prompt block sits under the lead + trust line and is fully tappable; the CTAs sit
   last; **no horizontal overflow** (nothing scrolls sideways; the benchmark tables scroll inside their own card).
6. Open `/vende/creadores`, `/vende/negocios`, `/vende/servicios` (phone).
   → Each hero has the prompt block + trust line, **no eyebrow**, and fits the screen; each keeps its own
   3 stats in the value list.

If any step fails, note the step number + page + what you saw — that's the bug report.
