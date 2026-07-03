# Zine editing central — Retrospective

_Closed: 2026-07-03_

**Risk:** mixed LOW→HIGH (S1.2 only) · **Build order:** S1 → S2 → S3. Bridges the standalone zine
studio (`apps/zine`) to the marketplace print pipeline, then retires the duplicate Maqueta builder
once a real placement was proven end-to-end in prod.

## What shipped
- **S1 — the bridge** (PR [#161](https://github.com/danybgoode/miyagisanchezcommerce/pull/161)
  `5583bf9`). Moved zine into the monorepo as its own local-only app (no GitHub remote, no CI — a
  deliberate decision). Shipped `withPrintStudio` — token-gated (Clerk admin OR `PRINT_STUDIO_TOKEN`
  Bearer) reads of open editions/paid ads/social submissions/catalog, plus a narrow write-back
  limited to the `approved ⇄ placed` transition. A fresh-reviewer pass caught a real PII leak (buyer
  email + SPEI bank details via a bare `select('*')`) before merge — fixed same-day with a
  `toStudioSafeSubmission` projection. Zine's "Anuncios pagados" drawer places a real paid submission
  verbatim (merchant's template + content, real R2 photos) into a booklet slot.
- **S2 — variable sheets + the other two sources** (PR [#164](https://github.com/danybgoode/miyagisanchezcommerce/pull/164)
  `55bdce9`). The booklet grows/shrinks in pliegos of 4 (was hardcoded at 12pp); editorial sections
  stay pinned; imposition math is a pure, vitest-regression-pinned function. Catalog pull brings live
  listings in as house-ads with a real QR (first-ever QR render on any ad slot). Social pull brings
  approved community submissions into the booklet via a discriminated-union extra page
  (`{kind:"ad"}|{kind:"social"}`). Seven rounds of advisory cross-review on the backend PR surfaced
  real issues before merge (a read-then-write race, an unvalidated `editionId` reaching a raw
  PostgREST filter, a placed-but-unassigned row leaking across editions, a `null`-body 500). After
  merge, a real place→verify→un-place round trip ran against **production** for all three sources
  (paid ad, catalog listing, social submission) with zero residual state — the gate this epic set for
  itself before touching the old builder.
- **S3 — consolidation** (this sprint, local commits + `apps/miyagisanchez` PR). Retired the
  interactive Maqueta builder (`/admin/print/:id/builder` → redirects to `/admin/print` with a
  one-time "la maqueta ahora vive en el estudio zine" notice, replacing the old "✎ Maquetar" link
  with a plain pointer); the print/export pipeline and `print_layouts` table for existing editions
  are untouched — they still serve saved layouts, just never gain new ones through a builder UI.
  Added merchant-ad guardrails in zine: a placed paid submission's headline/body/price lock behind a
  "🔒 diseño del anunciante" note, exposing only fit-only style overrides (background/border/text
  size/hidden fields — the `PrintBlockStyle` vocabulary ported from `apps/miyagisanchez`) via a pure
  `setAdSlotStyle` setter that a vitest proves never touches content. House-ads and editorial slots
  are unaffected — no lock, no style panel, matching the acceptance exactly.

## What went well
- **The self-imposed gate held.** The epic's own README explicitly forbade deprecating Maqueta before
  a real placement was smoke-tested — S2's close confirmed that live in prod (all three sources,
  place→verify→un-place, zero residual state) before S3 touched a single line of the builder.
- **"Duplicated by necessity" stayed disciplined.** Zine has no cross-repo import path to
  `apps/miyagisanchez`'s types, so the `PrintBlockStyle` vocabulary was ported (not re-derived) with
  the same field names/semantics — the S3.2 lock UI is new-to-zine but not a new design.
- **Cross-review earned its keep again.** Seven rounds on S2.3's PR caught races and validation gaps
  a single-pass review would likely have missed; none were cosmetic.
- **Reuse-first checks avoided real scope creep.** Before writing S3.1, confirmed the print/export
  pipeline (`.../print`, `.../pdf`, `.../export`) reads `print_layouts` independently of the builder
  UI — so deprecating the builder didn't risk breaking "export," which the acceptance required to
  keep working.

## What we learned
_(Promoted to `Roadmap/LEARNINGS.md`.)_
- **A sprint doc's own gate is worth re-confirming explicitly at the start of the NEXT sprint's
  planning, even when the repo already records it.** S3 opened by asking Daniel to confirm the S1–S2
  gate rather than assuming a prior sprint's "Done" note was sufficient sign-off — the commit trail
  (`c4ad068`) already showed the live round trip, but a HIGH-consequence action (deprecating a
  daily-used admin tool) still warranted an explicit yes in-conversation.
- **Before touching a "deprecated" surface, verify what it actually shares with the surfaces you must
  keep working.** The Maqueta "builder" and the print/export "pipeline" looked like one feature from
  the epic's prose but are two separate routes reading the same table — confirming that via a direct
  read (not just the sprint doc's phrasing) prevented an over-broad removal.
- **A content-lock is a UI concern, not a data one — keep the pure setter usable on any slot.**
  `setAdSlotStyle` deliberately has no awareness of `source.type`; the lock is enforced only in the
  editor component (`isContentLocked`), so a future caller (e.g. a bulk style tool) isn't blocked by a
  rule that belongs to one screen.

## Gaps / follow-ups
- **Physical fold-and-check of an exported PDF at a non-12pp size** — owed to Daniel since S2; the
  imposition math is vitest-proven and the on-screen guide was visually confirmed at 16pp, but the
  literal paper fold has never been checked.
- **Admin-surface click-through smoke of the retired builder route** — owed to Daniel; the redirect
  is covered by a new Playwright spec (anonymous, `api` project) and was live-verified in a local
  browser session (both hops resolve, no crash), but the authed admin experience (seeing the actual
  notice banner) needs his session.
- `print_layouts` Supabase table is now write-only-in-the-past (no new rows via a builder UI) —
  intentionally left in place; flagged so a future doc-hygiene sweep doesn't read it as orphaned data.
