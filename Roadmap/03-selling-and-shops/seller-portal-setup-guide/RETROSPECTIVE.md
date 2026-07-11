# Setup guide on dashboard — Retrospective

_Closed: 2026-07-11_

## What shipped
One sprint, all 4 stories, PR #215 (squash `05a8b3a`):
- **B.1** — extracted the settings page's inline `completedSections()` + value-based `_ok` derivations
  verbatim into `lib/setup-guide.ts` (`computeShopCompletion`/`completedSectionKeys`), repointed
  `settings/page.tsx` at the seam with a byte-identical render. Added `getSetupSteps()`, a 5-step curated
  view reusing 3 of the 12 flags (perfil/pagos/envios) plus two new signals (`productCount>0` for catálogo,
  `shareDone` for comparte). `e2e/setup-guide.spec.ts` — the pure-logic gate, grew to 13 tests over the
  sprint.
- **B.2** — `SetupGuideCard.tsx` on Resumen: "n de 5" progress bar, one step open at a time (body + CTA),
  done steps collapse with strikethrough. Built on the already-merged P0·A `<Card>`/`<StatusBadge>`
  primitives. `page.tsx` added one lightweight Supabase read for the exact `ShopRow` columns
  `settings/page.tsx` already selects (so the two surfaces' completion state can never drift apart);
  product count reused the already-fetched `listings.length`.
- **B.3** — `SetupGuideCard.tsx` became a client component. "Ocultar" (optimistic hide, PATCHes
  `guide_dismissed`, reverts on failure) and a real share action on step 5 (`navigator.share`, clipboard
  fallback) — both through the existing `useSettingsSave()`/`PATCH /api/sell/shop` seam every settings
  section already uses. New `GuideRestoreToggle.tsx` in Configuración flips it back. Fail-safe: an
  absent/malformed flag shows the guide by default.
- **B.4** — new `lib/analytics-events.ts` (`pushAnalyticsEvent`), the first reusable custom-event pusher
  into the GTM `dataLayer` that `<SiteAnalytics>` bootstraps (the site-wide-analytics-gtm epic only shipped
  the container load, no event API — this was new code, not reuse). Wired all 6 Grower-signal events.

## What went well
- **The skateboard framing (B.1 first) paid off exactly as designed.** Extracting the completion logic
  before building any UI meant the card, the dismiss/restore flow, and the events all sat on one
  regression-guarded seam — and when a real behavioral bug surfaced in review (below), fixing it in one
  function fixed the card, the "~4 min" pill visibility, and the smoke walkthrough's accuracy all at once.
- **Two independent review passes each caught a real, distinct bug, and both were cheap to fix because
  they were caught pre-merge, not in prod.** The `pr-reviewer` subagent caught a genuine spec-vs-implementation
  gap in the step-ordering logic; a codex cross-review caught a share-completion logic bug neither the
  builder nor the first reviewer had flagged. Running both, in sequence, on a LOW-risk PR was worth it.
- **Verifying an assumption against the actual code, not the plan doc, resolved the review's core question
  fast.** Rather than guess whether "payments open by default when incomplete" was real product intent or
  just imprecise wording, grepping `SellWizard.tsx` for `shopDescription`'s validation rules settled it in
  one command: the shop description is optional, so an incomplete-profile-but-complete-catalog shop is a
  realistic case, not a hypothetical.
- Reusing `useSettingsSave()` (the same hook every settings section already uses) for the new dismiss/share
  PATCH calls meant B.3 needed zero new persistence code — just new call sites.

## What we learned
- **A pure-logic spec can name the exact behavior it's testing and still not assert it.** The original
  `e2e/setup-guide.spec.ts` test titled "payments (step 3) carries the '~4 min' estimate..." checked the
  step's static copy fields but never asserted `.open` — so it kept passing even though the step-ordering
  bug meant payments wasn't actually the open step on a fresh shop. When a test's own name makes a claim
  ("X is open by default"), assert that specific claim explicitly, not just the properties that happen to
  be easy to check on the same object. *(2026-07-11, seller-portal-setup-guide.)*
- **An "extract this logic verbatim" refactor can silently break a CI lint that keys on file path, not file
  content.** `lib/design-token-audit.ts`'s raw-hex-literal guard allowlists specific `(path, literal,
  contains)` triples — moving the exact same expression to a new file broke the guard even though nothing
  about the *code* changed, because the allowlist entry stayed pointed at the old location. The narrower
  per-story spec run (just the new file) didn't catch it; only a full `api`-project run did, right before
  opening the PR. **Any code-move refactor should grep for path-keyed config (lint allowlists, exclusion
  lists) referencing the old path, not just run the specs for the new code.** *(2026-07-11.)*
- **"One step open at a time, first-incomplete-in-order" and "this specific step is always open when
  incomplete" are two different resolution rules that read almost identically in prose — and the difference
  only shows up on a specific input shape.** The epic doc's "payments/step-3 open by default when
  incomplete" was accurate the whole time; the first implementation just defaulted to the simpler
  strict-order rule because the one worked-out acceptance example (profile+payments-only) happens to produce
  the same answer under both rules. When a plan's stated resolution rule and a straightforward
  implementation of "one at a time" could diverge, work out a *second* example by hand (not just the one
  the plan already spells out) before writing the code — it would have caught this before review did.
  *(2026-07-11.)*
- **A cross-agent review's "should-fix" tier is worth taking seriously even when the reviewer explicitly
  frames it as advisory-only.** The share-cancel bug (marking a step done on a cancelled native-share
  dialog) and the ignored-PATCH-result bug were both real, both cheap one-function fixes, and both were
  outside what the primary `pr-reviewer` pass happened to focus on — the two review layers caught different
  things, confirming the "complementary, not redundant" framing in `WAYS-OF-WORKING.md`. *(2026-07-11.)*

## Gaps / follow-ups
- **Daniel's live smoke walkthrough on prod** (`sprint-1.md`) — the card's full render/interaction (n/5 bar,
  payments pill, dismiss, restore, share) plus the payments OAuth connect step. He opted to run this himself
  post-merge rather than block the merge on it; no money/checkout code was touched by this epic, so the risk
  of shipping ahead of the smoke is low.
- **`guide_step_complete`'s one-time backfill on pre-existing completions** (documented in
  `SetupGuideCard.tsx`, not fixed) — a seller who already had payments/profile configured before this epic
  shipped will fire a one-time "complete" event on their first post-deploy dashboard load, indistinguishable
  from a guide-driven completion. A per-mount baseline would filter it out, but would also suppress the
  payments-via-OAuth-redirect completion signal (a full page load, not a same-mount refresh) — the actual
  signal the epic's Grower framing cares about most. Left as a bounded, one-time data-quality footnote; worth
  a deliberate fix (e.g. a feature-launch cutover timestamp) only if the metrics turn out to need it.
- **No dedicated pure-logic spec for `lib/analytics-events.ts`** — it reads `window.location` internally
  (unlike `analytics-gating.ts`'s param-based `shouldLoadAnalytics`), so it isn't Node-testable the same way.
  Verified via `tsc` + `next build` + manual review instead. If a future epic adds more event call sites,
  consider refactoring the gate check to accept hostname/pathname as explicit params (mirroring
  `shouldLoadAnalytics`) so it becomes testable without a DOM.
