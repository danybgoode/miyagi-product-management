# Zine editing central — Sprint 3: consolidation

**Status:** ✅ built + locally verified — Story 3.1's PR is open, pending Daniel's merge
announcement/confirmation (see below); apps/zine's Story 3.2 is committed to its own local `main`.

> **Gate:** ships only after Daniel has produced a real placement end-to-end via zine (Sprints 1–2
> smoke-tested). Don't remove the old tool before the new one is proven.
> **Gate confirmed** 2026-07-03, in conversation with Daniel — Sprints 1–2 merged (PR #161, PR #164)
> and the real place→verify→un-place round trip was run live in prod 2026-07-02 (commit `c4ad068`).

## Stories

### Story 3.1 — Deprecate the Maqueta layout builder ✅
**As** Daniel (editor), **I want** the layout builder removed/hidden from `/admin/print` (editions,
tiers, providers, submissions queue, social review, and export all stay), with a pointer to zine,
**so that** there's one builder and no drift between two layout tools.
**Acceptance:** `/admin/print` still manages editions/submissions/review exactly as today; the
builder route is gone or redirects with a "la maqueta ahora vive en el estudio zine" note;
`print_layouts` data stays (harmless — note it so the doc-hygiene sweep doesn't flag drift).
**Announce:** touches a shipped admin surface — announce per WAYS-OF-WORKING before merge.
**Risk:** LOW
**Done:** commit `e97627d` in `apps/miyagisanchez`, branch `feat/zine-editing-central-s3`. Confirmed
via Explore that the "builder" (`app/(shell)/admin/print/[editionId]/builder/page.tsx` +
`BuilderClient.tsx`) is a separate code path from the print/export pipeline
(`.../[editionId]/print/page.tsx`, `.../pdf`, `.../export`), which reads the same `print_layouts`
table but is untouched by this story. `builder/page.tsx` now `redirect()`s to
`/admin/print?notice=zine-maqueta`; `BuilderClient.tsx` deleted (no longer referenced); the old "✎
Maquetar" link replaced with a plain "Edición en el estudio zine" note; a one-time dismissible
banner reads the `notice` param. New Playwright spec `e2e/admin-print-maqueta-retired.spec.ts`
(anonymous `api` project) asserts the redirect (307/308, `location` contains the notice) and that
`/admin/print` still resolves. `tsc --noEmit` + `npm run build` + the full local `api` suite (31
passed, 5 pre-existing skips) all green. Live-verified in a local anonymous browser session: hitting
the old builder URL correctly chains builder→`/admin/print?notice=...`→(anonymous)`requireAdmin`
redirect→home, no crash, no 404. **PR not yet opened/merged** — announcing to Daniel before pushing
per this story's own gate.

### Story 3.2 — Fine-tune guardrails on merchant-ad blocks ✅
**As** Daniel (editor), **I want** merchant-ad blocks in zine to expose style overrides only
(background, border, text size, hide-fields — the `PrintBlockStyle` vocabulary) with content fields
visibly locked ("diseño del anunciante"), **so that** I can fine-tune fit without ever interfering
with what the merchant designed.
**Acceptance:** on a placed paid ad, style controls work; headline/body/photos/contact are not
editable and show the locked affordance; a vitest proves a style override never mutates the content
snapshot. House-ads (catalog pulls) and editorial blocks stay fully editable.
**Risk:** LOW
**Done:** commit `f43967e` in `apps/zine` (local `main` — no PR, matches this app's local-only
decision). Ported `PrintBlockStyle` as `BookletAdSlotStyle` into `lib/types.ts` + `lib/schema.ts`;
new pure `lib/ad-slot-style.ts` (`setAdSlotStyle`, `isContentLocked`) — `tests/ad-slot-style.test.ts`
proves a style change never touches headline/body/price/photo/source (6 new cases, 63/63 total
green). `TrifoldStudio.tsx`'s `BookletAdSlotFields` now locks headline/body/price (disabled inputs +
a "🔒 Diseño del anunciante" note) and renders a new style panel only when
`ad.source?.type === 'submission'`; `BookletPreview.tsx`'s `AdSlot` applies `bg`/`border`/`text_size`/
`hidden_fields` at render time. `tsc --noEmit` clean. **Live-verified in the local editor:**
temporarily faked a `submission` source on the sample edition's quarter-page ad (backed up first) —
confirmed the lock note + disabled fields + style panel render, toggled "hide headline" and
confirmed "Autosaved" plus the rendered preview correctly hid the headline while keeping
label/body/price, then reverted the sample file to its exact original committed state (verified with
`git diff` showing zero changes). The very next slot ("Plana completa," no `source`) rendered fully
editable throughout, confirming zero regression for house-ads/editorial.

### Story 3.3 — Epic close ✅
**As** the team, **I want** the poster's 06 section updated (Maqueta line → zine central), the
retro written, durable learnings promoted, and `node scripts/build-order.mjs` regenerated in the
same PR as the `status: shipped` flip, **so that** the docs stay truthful and CI stays green.
**Acceptance:** epic Definition of Done checklist in the README all ticked.
**Risk:** LOW
**Done:** `Roadmap/README.md` 06 section + a new Recent highlights entry; `RETROSPECTIVE.md` written;
3 durable learnings promoted to `LEARNINGS.md` (gate re-confirmation at sprint start; verify shared
surface before deprecating; content-lock as a UI concern not a data one); team memory updated
(`zine-editing-central-epic.md` + `print-edition-builder.md` retirement note + `MEMORY.md` index).
`node scripts/build-order.mjs` regen + the epic README's `status: shipped` flip land together once
Story 3.1's PR is confirmed/merged (see Story 3.1's "not yet merged" note above — the regen is
deliberately held until the actual deploy state is real, not asserted early).

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
