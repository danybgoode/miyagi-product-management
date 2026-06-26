# Sprint 2 — Hero & section redesign  ·  status: ⬜ not started

> The design work behind the launch polish. Builds on Sprint 1's strings. Mobile-first; reuse the
> v2-S4 responsive idioms. Shared renderer (`_components/SellerAcquisitionSections.tsx`) + bespoke
> `mundial/page.tsx` + `page-config.ts`. Announce only if a fix reaches `globals.css`/shared layout.

## Goal
The hero centers on a **visible** copy-paste prompt block; the right panel leads with AI channels +
premium features; eyebrows and clutter are gone; the anchor shows a premium-features grid and a
benchmark worked-example; everything has more whitespace and reads fast.

## Stories
### US-2 — Build the redesigned hero + sections ⬜
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

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` green.
- **Specs:** anon browser smoke — hero PromptBlock renders + copy button works on all five pages; steps
  aside shows a PromptBlock; anchor shows premium-features grid + benchmark example; **no eyebrow
  badges present**. Extend the nightly mobile spec: **no horizontal overflow at 360/390/414** on the
  new hero + premium grid + example block across all five pages.
- **Daniel real-device mobile pass** — the focal hero + PromptBlock on a real phone (tap-to-copy, safe-area).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: PR Vercel preview pre-merge; `https://miyagisanchez.com` after deploy. **Phone for steps 5–6.**

1. Open `{BASE_URL}/vende`.
   → Hero shows title + one trust line + a **visible prompt block with a copy icon** (right side on desktop). No eyebrow badge.
2. Click the copy icon in the hero prompt block.
   → The full directive prompt copies (paste-check), with visual "copiado" feedback.
3. Read the hero right panel value list.
   → 0% comisión de plataforma · Vende en Claude, Gemini y ChatGPT · Funciones premium incluidas. No "20s con Google", no "4 canales".
4. Scroll down: "Cómo funciona" aside shows the invite + a prompt block (not the old "No tienes que creernos…"); the social block is now a **premium-features grid**; the benchmark has a **worked example** under it.
5. On a phone, open `/vende` and `/vende/mundial`.
   → Single-column; prompt block sits under the lead, fully tappable; no horizontal overflow.
6. Open `/vende/creadores`, `/vende/negocios`, `/vende/servicios`.
   → Each hero has the prompt block + trust line, no eyebrows, fits the screen.

If any step fails, note the step number + page + what you saw — that's the bug report.
