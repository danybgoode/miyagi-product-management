# Zine editing central — Sprint 3: consolidation

**Status:** ⬜ not started

> **Gate:** ships only after Daniel has produced a real placement end-to-end via zine (Sprints 1–2
> smoke-tested). Don't remove the old tool before the new one is proven.

## Stories

### Story 3.1 — Deprecate the Maqueta layout builder
**As** Daniel (editor), **I want** the layout builder removed/hidden from `/admin/print` (editions,
tiers, providers, submissions queue, social review, and export all stay), with a pointer to zine,
**so that** there's one builder and no drift between two layout tools.
**Acceptance:** `/admin/print` still manages editions/submissions/review exactly as today; the
builder route is gone or redirects with a "la maqueta ahora vive en el estudio zine" note;
`print_layouts` data stays (harmless — note it so the doc-hygiene sweep doesn't flag drift).
**Announce:** touches a shipped admin surface — announce per WAYS-OF-WORKING before merge.
**Risk:** LOW

### Story 3.2 — Fine-tune guardrails on merchant-ad blocks
**As** Daniel (editor), **I want** merchant-ad blocks in zine to expose style overrides only
(background, border, text size, hide-fields — the `PrintBlockStyle` vocabulary) with content fields
visibly locked ("diseño del anunciante"), **so that** I can fine-tune fit without ever interfering
with what the merchant designed.
**Acceptance:** on a placed paid ad, style controls work; headline/body/photos/contact are not
editable and show the locked affordance; a vitest proves a style override never mutates the content
snapshot. House-ads (catalog pulls) and editorial blocks stay fully editable.
**Risk:** LOW

### Story 3.3 — Epic close
**As** the team, **I want** the poster's 06 section updated (Maqueta line → zine central), the
retro written, durable learnings promoted, and `node scripts/build-order.mjs` regenerated in the
same PR as the `status: shipped` flip, **so that** the docs stay truthful and CI stays green.
**Acceptance:** epic Definition of Done checklist in the README all ticked.
**Risk:** LOW

## Sprint QA
- **api spec(s):** 3.1 → assert admin print pages still serve + builder route gone/redirects
  (extend an existing admin spec or one new `e2e/*.spec.ts`).
- **unit (apps/zine vitest):** 3.2 style-override-never-mutates-content.
- **browser smoke owed:** yes, to Daniel — admin surface click-through post-deprecation.
- **deterministic gate:** `tsc --noEmit` + builds + suites green; `build-order.mjs --check` will
  fire on the status flip — regen in the same PR (LEARNINGS).

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com + local zine

1. Go to https://miyagisanchez.com/admin/print
   → Editions, tiers, submissions queue, social review, export: all work as before.
2. Open a previous edition's builder URL (…/admin/print/[editionId]/builder).
   → Gone or redirects with the pointer to zine — no broken page.
3. In zine, select a placed paid ad → try to edit its headline.
   → Not editable; "diseño del anunciante" lock shows; changing the background color works.
4. Check the epic README + poster.
   → 06 section reflects zine as the editing central; build-order board regenerated.

If any step fails, note the step number + what you saw — that's the bug report.
