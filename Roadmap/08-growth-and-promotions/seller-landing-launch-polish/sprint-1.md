# Sprint 1 — Voice & copy precision  ·  status: 🏗️ built — PR #133 (draft), smoke owed on preview

> **Build refs (branch `feat/seller-landing-launch-polish`):** copy `9f888ea` (es.json + en.json) ·
> guards `c49f3eb` (copy + aichannel specs) · draft PR
> [#133](https://github.com/danybgoode/miyagisanchezcommerce/pull/133), risk **LOW**.
> Gate: `tsc` ✅ · `npm run build` ✅ (all `/vende*` compiled) · 21 pure-fs api copy specs ✅.
> Page-render specs need Medusa (unreachable locally) → CI "Playwright vs preview" is the
> authoritative pre-merge signal.

> All string changes for the launch polish. Edits to `apps/miyagisanchez/locales/es.json →
> sellerAcquisition` (+ `en.json` mirror for type-parity) and the bespoke `mundial/page.tsx` strings.
> Final copy is verbatim in `COPY-BRIEF.md` (this folder). No layout work — that's Sprint 2.

## Goal
Every `/vende*` page reads in the corrected brand voice (marketplace, full `miyagisanchez.com`), with
clutter copy removed and the new hero/section strings in place, ready for Sprint 2 to lay out.

## Stories
### US-1 — Land the launch-polish copy ✅ (built — `9f888ea` + `c49f3eb`, PR #133)
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
Env: the PR #133 Vercel preview pre-merge; `https://miyagisanchez.com/vende*` after deploy.

> **Scope of this smoke (copy-only):** verify the **in-place string changes** that replace already-rendered
> copy. The **new** keys (`heroTrustLine` visible prompt block, `anchor.heroValues`, `anchor.premiumFeatures`
> grid, `anchor.benchmark.example` worked-example) are **staged in copy but NOT laid out until Sprint 2** —
> they will *not* appear on the page yet. Their presence is asserted by the api spec
> `e2e/seller-acquisition-copy.spec.ts`, not by eye, this sprint. The benchmark **table** (shipped v2) still
> renders; only its new `example` sub-block waits for S2.

1. Open `{BASE_URL}/vende` and read the hero + sections.
   → Hero lead reads "…súbete al **marketplace**…" (not "mercado"); no bare "Miyagi" anywhere on the page
     (only "miyagisanchez.com" / "Miyagi Sánchez" / "el marketplace"); "marketplace" reads naturally.
2. Search the page (Cmd-F) for the removed lines.
   → None of "no es promesa a futuro", "Hecho para negocios reales", or "El Mundial no espera" appears;
     the old eyebrow badge texts ("Para vendedores en México", "Un canal que otros no tienen") are gone.
     (An empty eyebrow/social gap is expected interim state — S2 removes the dead rendering.)
3. Open `/vende/creadores`, `/vende/negocios`, `/vende/servicios` and skim each hero + proof.
   → No bare "Miyagi" (brand reads "miyagisanchez.com" / "el marketplace"); tightened hero leads read clean.
4. Open `/vende/mundial`.
   → heroLead is just "Publica tus tours, rincones de comida y rentas al instante, sin comisiones."
     (no "Entra antes de que la demanda…"); proofLead says "Vende en el marketplace…";
     closing reads "Súbete a la ola del Mundial."

If any step fails, note the step number + what you saw — that's the bug report.

**Deferred to Sprint 2 (layout):** visible PromptBlock under "Compruébalo tú mismo", right-panel hero with
`heroValues`, premium-features grid (replaces the now-empty social band), benchmark worked-example block,
and dropping the empty eyebrow rendering. **Real-device mobile pass owed to Daniel** at epic close.
