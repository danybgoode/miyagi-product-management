# Admin content & announcements — runtime marketing copy + platform banners — Retrospective

_Closed: 2026-07-09_

## What shipped
- **Sprint 1** (merged 2026-07-08, PR #197): `platform_copy_overrides` Supabase table + a pure
  fail-open merge seam (`applyCopyOverrides`/`getOverriddenDictionary`), `/admin/contenido` per-key
  editor with restore, and CSV/XLSX/JSON bulk export/import with diff preview. Only the
  `sellerAcquisition` (`/vende`) namespace was keyed at this point.
- **Sprint 2** (merged 2026-07-08, PR #198, `0fd667d`): doc-first coverage audit, then keyed the
  homepage (`home.*`) and migrated `/acerca` to a bilingual `acerca.*` namespace — with scope
  deliberately widened at Daniel's sign-off to the full agent-facing fan-out (`/agent`, the UCP
  manifest, `/llms.txt`, the MCP `about_miyagi` resource).
- **Sprint 3** (merged 2026-07-09, PR #200, `78b1430`): the announcement primitive —
  `platform_announcements` table (RLS Pattern B + partial unique index for one-active-per-audience),
  a fail-open ISR-safe reader mirroring Sprint 1's exact shape, admin CRUD with activation-conflict
  handling, a dismissable seller strip atop `/shop/manage`, and an understated dismissable buyer card
  on the static homepage. Reused the existing `content.overrides_enabled` kill-switch — no new flag
  across the whole epic.

**Net capability:** the platform admin can now edit any keyed marketing string and run scheduled,
audience-scoped platform comms (seller strip + buyer homepage card) — both without a deploy, both
behind one kill-switch, with `/` staying a static CDN asset throughout.

## What went well
- **The S1 fail-open/cached-read pattern (`lib/copy-overrides.ts`) reused cleanly, twice.** Sprint 3's
  `lib/announcements.ts` is a near-literal structural copy — same bounded 2s fetch, same
  `unstable_cache` + `revalidateTag` shape, same fail-open posture. Building the second consumer of a
  pattern is where you find out whether it was actually general — this one was.
- **The static-shell discipline held across three sprints without a single regression.** Both S2 (the
  homepage copy overrides) and S3 (the buyer announcement card) added new server-side reads to
  `app/(site)/page.tsx` via the same ISR-safe `unstable_cache` primitive, and `/` never left `○`. The
  `static-shell-split.spec.ts` tripwire (planted a full epic earlier, in `marketplace-static-shell`)
  did its job exactly as designed: it forced a conscious re-check at S2, not a silent regression, and
  needed zero changes at all for S3 since the buyer card's read followed the same sanctioned pattern.
- **Local cross-agent review (codex) + the independent `pr-reviewer` subagent caught real bugs before
  Daniel ever saw the PR.** Two codex passes on PR #200 found a genuine timezone bug (a
  `datetime-local` admin input silently reinterpreted in the server's own timezone), a missing
  render-time CTA-link re-validation, half-filled-CTA acceptance, a non-atomic replace-swap, and a
  silent-success DELETE on an unknown id — all fixed before merge. The independent `pr-reviewer`
  subagent then verified every claim in the PR body against the actual diff and approved. Two
  different-model-family passes plus a same-family independent review, all before a human ever had to
  look, is the process working as intended.
- **The auto-mode permission classifier correctly blocked two attempts to write live content directly
  into the shared production Supabase table** — once for a real `active: true` row, and again for a
  reformulated `active: false` "smoke test" row (correctly read as tunneling around the first block).
  Both blocks were right: this is shared prod (no dev-scoped Supabase credential exists), and even an
  inactive test row is a write to production state an agent shouldn't unilaterally make. The intended
  path — the audited Clerk-gated admin API with a real admin session — stayed Daniel's, exactly as the
  sprint doc already scoped it.

## What we learned
- **A migration file merging into the codebase is NOT evidence it was ever run against production.**
  While applying Sprint 3's own migration via the Supabase MCP, discovered Sprint 1's
  `platform_copy_overrides` table doesn't exist in the live database at all
  (`to_regclass('public.platform_copy_overrides')` → `null`) — despite merging cleanly in PR #197 two
  days earlier. The whole copy-override feature has been silently fail-open-to-compile-time-copy in
  production since S1, with no visible symptom (fail-open by design means "override missing" and
  "table missing" look identical from the outside). **Generalizable rule: after any PR that ships a new
  Supabase migration, verify the table actually exists live** (`to_regclass` or `list_tables` via the
  Supabase MCP) — a green CI + a merged PR proves the code is correct, not that the DDL ever ran
  against the real database. This repo's convention of applying migrations by hand (SQL editor or MCP,
  not an automated `supabase db push` in CI) makes this gap easy to introduce and invisible once
  introduced, precisely because the read path is designed to degrade silently.
- **A `<input type="datetime-local">` value has NO timezone — converting it to a real ISO string must
  happen in the BROWSER, not the server.** The browser's own `new Date(naiveString)` parse correctly
  uses the visitor's real local timezone; a server-side `Date.parse()` of that same naive string uses
  the SERVER's local timezone instead (UTC on Vercel) — silently shifting any schedule an admin outside
  UTC enters. Fix: always convert client-side (`new Date(value).toISOString()`) before sending to an
  API; never send the naive string and let the server interpret it. Caught by the codex cross-review,
  not the local build/typecheck (a timezone bug produces a *valid*, differently-wrong ISO string, so
  nothing type-checks or throws).
- **A pure decision module is worth the extra indirection specifically so a cross-review finding can be
  fixed as a one-line addition, not a wiring change.** The CTA render-time re-validation
  (`sanitizeAnnouncementCta`) and the one-active-per-audience conflict decision
  (`decideActivationConflict`) both live in `lib/announcements-merge.ts`, free of `next/*`/`server-only`
  — when the review found the CTA gap, the fix was one new pure function plus three unit tests, with
  zero changes to how either the API route or `getActiveAnnouncement` are wired together.

## Gaps / follow-ups
- **Owed to Daniel:** the live activate-a-campaign smoke (seller + buyer), dismiss-persistence on a
  real device for both placements, and the aesthetic sign-off on the buyer card — per sprint-3.md's
  walkthrough. Not blocking this epic's close (LOW risk, no money path), same as prior sprints in this
  epic.
- **Owed to Daniel — separately, and higher priority:** apply the missing `platform_copy_overrides`
  migration to production (see "What we learned" above). Until then, Sprint 1+2's entire runtime
  copy-override feature is silently inert in prod — every `/admin/contenido` edit is accepted by the
  UI but has nowhere live to land.
- **Known non-blocking gap from Sprint 2** (unchanged, carried forward): `/acerca`'s
  `generateMetadata()` still reads the literal `ABOUT_PAGE.es` for `<title>`/meta description, not the
  override; the `acerca.*` JSON seed and `about-content.ts`'s literal constants are kept in sync by
  hand with no automated drift guard.
- **`GET /api/admin/announcements` is currently unused** — the admin page reads announcement rows
  server-side directly (same "always live, never stale to the admin who just saved" pattern as the
  copy-override rows), so the GET route exists for API completeness/future use but nothing calls it
  yet. Harmless (Clerk-gated, read-only), flagged by the independent reviewer as a minor note, not
  fixed.
- **Revisit trigger for the CMS build-vs-buy call** (from the original scope doc, still valid): if
  scope ever grows to composable page-building — not key-value overrides, not one banner primitive —
  re-run the CMS eval. Nothing in this epic's three sprints came close to that line.
