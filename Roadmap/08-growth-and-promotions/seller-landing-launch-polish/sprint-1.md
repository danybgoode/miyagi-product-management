# Sprint 1 — Voice & copy precision  ·  status: ⬜ not started

> All string changes for the launch polish. Edits to `apps/miyagisanchez/locales/es.json →
> sellerAcquisition` (+ `en.json` mirror for type-parity) and the bespoke `mundial/page.tsx` strings.
> Final copy is verbatim in `COPY-BRIEF.md` (this folder). No layout work — that's Sprint 2.

## Goal
Every `/vende*` page reads in the corrected brand voice (marketplace, full `miyagisanchez.com`), with
clutter copy removed and the new hero/section strings in place, ready for Sprint 2 to lay out.

## Stories
### US-1 — Land the launch-polish copy ⬜
**As** supply traffic about to be sent here at launch, **I want** precise, on-brand copy, **so that**
the page reads trustworthy and easy to act on.
**Acceptance:**
- "mercado" → "marketplace" (our word only — `anchor.heroLead`); brand names *Mercado Libre /
  MercadoPago* untouched;
- bare "Miyagi" → `miyagisanchez.com` (brand) or "el marketplace" (common noun), per COPY-BRIEF §A;
- new `shared.heroTrustLine` added; old hero `trustLine` band + the `agentTitle/agentBody` hero aside
  copy retired (layout in S2);
- `shared.selfCheck` repurposed to the steps-aside invite ("Copia el prompt y pégalo en tu IA…");
- `aiChannel.note` removed; `aiChannel` + all `eyebrow` keys removed/blanked; AI-channel copy trimmed;
- anchor `socialTitle/socialBody` replaced by `anchor.premiumFeatures` block copy;
- `anchor.benchmark.example` copy added (rows + punchline + footnotes + date stamp);
- mundial: `heroLead` 2nd sentence removed, `proofLead` → "Vende en el marketplace…", `closingTitle` →
  "Súbete a la ola del Mundial.";
- tightening pass on hero leads / proof bodies (COPY-BRIEF §I).
Risk: low.

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` green.
- **Specs:** extend `e2e/seller-acquisition-copy.spec.ts` — add banned-string assertions for
  `Miyagi(?!\s*Sánchez)` and our-word `mercado` (excluding Mercado Libre/MercadoPago), and for the
  removed lines ("no es promesa a futuro", "Hecho para negocios reales", "El Mundial no espera",
  "Entra antes de que la demanda"). Anon smoke that pages still render.
- Confirm `es.json`/`en.json` key parity (no type break).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: PR Vercel preview pre-merge; `https://miyagisanchez.com` after deploy.

1. Open `{BASE_URL}/vende` and read the hero + sections.
   → No bare "Miyagi" anywhere (only "miyagisanchez.com" or "el marketplace"); "marketplace" reads naturally.
2. Search the page for the removed lines.
   → None of "no es promesa a futuro", "Hecho para negocios reales", or any eyebrow badge text appears.
3. Open `/vende/mundial`.
   → heroLead has no "Entra antes de que la demanda…"; proofLead says "Vende en el marketplace…";
     closing reads "Súbete a la ola del Mundial."
4. Scroll the `/vende` benchmark area.
   → The worked-example copy ($1,000 product, take-home per platform + punchline + footnotes) is present.

If any step fails, note the step number + what you saw — that's the bug report.
