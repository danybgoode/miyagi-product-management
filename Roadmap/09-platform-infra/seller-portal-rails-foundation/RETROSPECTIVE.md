# Seller-portal rails foundation — one design language — Retrospective

_Closed: 2026-07-10_

## What shipped
- **Sprint 1** (PR #208, squash `3bb5fb7`) — `<StatusBadge>` (5 semantic tokens + `promo` for the
  ML-source override), `<Button>` (one hierarchy: primary/secondary/ghost/danger), `<Card>`
  (radii-by-role: tile/panel), and one `<Toast>`+`<Banner>` in `components/feedback/` (R6
  before/during/after contract, optimistic→undo→revert). Fixed the undefined `--color-subtle`
  token (aliased to `--bg-sunk`).
- **Sprint 2** (PR #211, squash `37182fa`) — the adoption sweep across 25 files: `OrdersInbox.tsx`,
  `ManageDashboard.tsx`, `SellWizard.tsx`, `SetupClient.tsx` (the 4 named), `OfferInbox.tsx` +
  `OrderDetail.tsx` (per Sprint 1's own found-duplicate-toast note), `PrintEditionCard.tsx`, and the
  full `settings/_sections/`+`_components/` tree (15 + 4 files — confirmed with Daniel mid-sprint as
  roughly double the sprint doc's named scope). `CatalogTable.tsx` scoped to its isolated
  `DeleteDialog`; `Envios.tsx` scoped out entirely — both were in-flight sibling PR territory at
  branch time. Four new CI-lint checks added to `lib/design-token-audit.ts` (raw palette classes,
  `bg-white`, literal border-radius, Toast/Banner import location), gated as hard Playwright
  assertions on exactly the files this sprint swept (`enforcedSweptPaths`), not the whole app.

## What went well
- The Sweeper discipline held: zero behavior change across 25 files, confirmed by a comprehensive
  final grep pass (Batch 3) showing zero raw-palette/`bg-white`/literal-radius hits outside two
  explicitly-documented, allow-listed exceptions.
- Catching the Tailwind arbitrary-value string-interpolation bug (`` `text-[var(--${x})]` ``) mid-sweep,
  before it shipped — Tailwind's JIT scans source text statically, so a dynamically-built class name
  silently produces no CSS at all, not a visible error.
- The two in-flight sibling PRs (#209, #210) both merged mid-sprint after this branch forked —
  confirming the earlier decision to scope their files out of the sweep (rather than race a fix into
  files another PR was actively rewriting) was the right call. The merge was clean.
- Escalating the settings-tree scope question and the CI-lint hard-gate-scope question to Daniel
  rather than guessing either way — both turned out to be real, non-obvious judgment calls with
  more than one defensible answer.

## What we learned
- **Never build a Tailwind arbitrary-value class via string interpolation** — Tailwind's JIT compiler
  scans source text *statically* for complete class-name literals; a dynamically-interpolated class
  name (`` `text-[var(--${someVar})]` ``) is invisible to it and silently emits no CSS at build time
  (not a build error — just broken styling). Use a small static `Record<T, string>` mapping each
  known branch to a complete literal class string instead. *(2026-07-10, caught mid-sweep in
  `Negociacion.tsx` before it shipped.)*
- **A CI-lint gate's scope should match what was actually swept, not the whole app it scans.** The
  seller-portal directory tree turned out to have ~50 more files than the sprint doc named
  (analytics, collections, content, convocatoria, eventos, import, mercadolibre, profit, promotions,
  subscriptions, sweepstakes) — all with the same raw-palette/`bg-white`/literal-radii debt this
  sweep was built to catch. A blind `toEqual([])` across the whole `app/`+`lib/` tree would have
  failed immediately on files this sprint never touched. The fix: scan broadly (for visibility as
  future sweeps expand coverage) but assert the hard gate only against the files actually swept
  (`enforcedSweptPaths`) — an incremental-adoption pattern any future Sweeper epic extending an
  existing lint should reuse.
- **Multiple parallel forks doing mechanical file-sweep work can all hit a shared session rate-limit
  and terminate mid-task simultaneously** — when that happens, a fork's self-reported "result" text
  is the last tool-call description before it died, not a trustworthy completion summary. Re-derive
  actual file state directly (grep the real hit-counts, don't trust the transcript) before continuing
  — one fork's "done" claim (for a file it never actually finished) would have shipped broken imports
  (`StatusBadge`/`Banner` referenced in JSX with no corresponding import line) had `tsc` not caught it.
- **A component that's imported but never rendered is a real, findable class of dead-weight** —
  `Canal.tsx` imported the shared `SectionSaveBar` while still rendering its own byte-for-byte
  duplicate save-footer inline. Worth an explicit `grep "<ComponentName"` check whenever a sweep
  converts call-sites to a shared primitive, not just a raw-class grep.
- **When two in-flight PRs are racing a shared file with a Sweeper branch, "scope it out of pass 1"
  is the right call even when the collision is only a few lines** — `CatalogTable.tsx`'s
  `STATUS_LABEL` map had a single consumer sitting inside another PR's actively-edited column range;
  touching it would have guaranteed a manual conflict resolution for marginal benefit, resolved for
  free once that PR merged.

## Gaps / follow-ups
- **Daniel's live visual smoke** (light/dark/calm across the swept surface; see `sprint-2.md`'s
  walkthrough) — no money/auth path, safe to run anytime.
- ~~**`CatalogTable.tsx`'s `STATUS_LABEL` map + `<td>` render block** and **`Envios.tsx` entirely**~~
  **RESOLVED 2026-07-10** — PR #213 (squash `6de222f`), same session. Both files fully swept, both
  now in `enforcedSweptPaths`. Along the way: added `catalogStatusToToken()`; found and fixed a real
  duplicate-toggle-switch bug in `Envios.tsx` (imported the shared `<ToggleSwitch>` but never used it
  — same shape as this epic's own `Canal.tsx`/`SectionSaveBar` finding); fixed a real gap in the
  token-lint's `literalRadiusPattern` (it silently missed Tailwind's directional/corner radius classes
  like `rounded-l`/`rounded-r`, which `Envios.tsx` used six times with zero coverage); cross-agent
  review (agy) caught one real bug pre-merge (a `title` on a natively-disabled `<button>` never shows
  in most browsers — moved to the wrapping `<label>`).
- **The other ~50 seller-portal files never in either sprint's scope** (analytics, collections,
  content, convocatoria, eventos, import, mercadolibre, profit, promotions, subscriptions,
  sweepstakes) still carry the same raw-palette/`bg-white`/literal-radii debt — visible via the
  lint's broad scan, not yet gated. Each future sweep should add its files to `enforcedSweptPaths`.
- **Cross-agent review skipped on PR #211** — `agy` couldn't take the 335 KB diff (its argv-only
  input has a 256 KB cap, no stdin path) and `codex` was over its usage quota at merge time. Merged
  on green CI with Daniel's explicit go-ahead (cross-review is advisory-only by design). A future PR
  this large should either run cross-review in smaller path-scoped chunks, or accept the same gap.
