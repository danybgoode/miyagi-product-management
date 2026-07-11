# Onboarding three-doors — Retrospective

_Closed: 2026-07-11_

## What shipped
- **Sprint 1** (PR [#221](https://github.com/danybgoode/miyagisanchezcommerce/pull/221), squash `ee90cef`)
  — the `tenant_intake` Supabase table; a Bienvenida welcome intake (what they sell / where they sell
  today); three ranked doors (agent-first, with a trust contract); a drop-anything CSV/JSON intake
  (photos descoped).
- **Sprint 2** (PR [#227](https://github.com/danybgoode/miyagisanchezcommerce/pull/227), squash `57b6831`)
  — an editable staging preview ported `ImportClient.tsx`'s inline-fix/live-revalidate pattern into
  `SetupClient.tsx`, with the apply engine (`planSetupApply`/`aggregateSetupReport`/`validateSetup`/
  `validateRows`) verified untouched; the new `<SuccessCard>` + `SuccessCardProgress` converging all
  three doors' endings (SellWizard, ImportClient, SetupClient) onto one shared layout (F12); setup-guide
  personalization from the intake answers.
- **Sprint 3** (PR [#229](https://github.com/danybgoode/miyagisanchezcommerce/pull/229), squash `5e29f4e`)
  — a cobros mini-wizard (new dedicated route, breadcrumb + step dots, R6-before info box, resume banner)
  wrapping the **already-shipped, unchanged** Mercado Pago OAuth; a Comparte share page (WhatsApp-first,
  copy-link, downloadable IG-story image, agent hand-off via the existing `<ConnectAgentPanel>`); the
  funnel instrumented end to end via the already-live `pushAnalyticsEvent` GTM helper.

Dark the entire epic behind `onboarding.three_doors_enabled` (default OFF, seeded Sprint 1) — nothing here
changed behavior for a live merchant unless the flag is deliberately flipped on.

## What went well
- **Reuse over rebuild, every sprint.** S2's staging preview reused S2's own `ImportClient.tsx` pattern
  rather than inventing a new inline-edit shape; S3's wizard reused the OAuth connect/callback routes
  completely unchanged, the `SellWizard.tsx` step-dots visual language, the `SellerTrustCard`/
  `PromoterCloseClient` WhatsApp-green button precedent, and the `SellerAcquisitionOgImage.tsx`
  `ImageResponse` pattern for the new story-image route. Zero new commerce primitives across the whole
  epic — Medusa-first held throughout.
- **The review layers kept earning their keep.** Every sprint's cross-agent + independent `pr-reviewer`
  pass caught something real before merge: S1 caught a chrome mechanism gap, Door 2's shop-less 404 gate,
  and auto-provisioning not gated behind the flag; S2 caught a raw-Tailwind CI-lint miss and a copy-accuracy
  bug ("se queda como borrador" when the row was actually just skipped); S3's independent review verified
  the HIGH tripwire boundary precisely (grepped the diff's added lines for token/exchange/sync patterns,
  confirmed only a comment matched) — the single most consequential check on a money-adjacent change.
- **The HIGH tripwire did its job as a planning constraint, not just a merge gate.** Framing D.7's boundary
  explicitly at grooming (name the four functions that must not move) meant the wizard could be *designed*
  around a redirect-target cookie from the start, rather than discovered as a scope violation mid-build.

## What we learned
- **A dashboard "completion" gate can silently always-pass if it reads an opt-*out* column as if it were
  a connected-*state* flag.** `lib/setup-guide.ts`'s `pagos` step read `shop.mp_enabled` — a DB column that
  defaults `true` for every shop (it means "hasn't disabled MP checkout," not "has connected MP") — so the
  step showed done for every fresh, unconnected shop since the column was introduced. Caught only while
  building the wizard this sprint, because the acceptance criterion ("the guide's payments step is
  checked") forced tracing what actually flips the flag. **Generalizable check:** before trusting an
  existing "is X configured" gate, read what the underlying column's *default* actually is — a boolean
  that defaults `true`/`false` for an unrelated reason (an opt-out toggle, a legacy migration default) is
  a different signal than "the feature was ever used," even when the column name suggests otherwise.
- **A scope doc's literal wording ("wrap the existing settings page in a wizard shell") can describe the
  wrong architecture if read too literally — check who else uses that page first.** Taking S3's acceptance
  language at face value would have made the flat `/shop/manage/settings/pagos` panel itself conditionally
  wizard-shaped, forcing every returning seller who already has cobros configured through a first-run flow
  just to tweak their escrow mode. A NEW dedicated route (confirmed with Daniel before building) kept the
  existing page's behavior for ongoing management completely untouched. When a scope doc's literal phrasing
  would change behavior for users OUTSIDE the flow being designed, that's worth a real design-decision
  check-in, not just an assumption.
- **A "presentational wrapper" story can still surface a genuine pre-existing bug in the surface it wraps —
  the fix belongs in the same PR, not a follow-up.** The `mp_enabled` bug above was not introduced by this
  sprint, but the acceptance criteria this sprint had to satisfy made it visible and the fix was small,
  read-only, and nowhere near the tripwire boundary — fixing it in-PR (with a regression-guard spec) was
  cheaper and safer than filing it as a separate "found a bug, not fixing now" note.
- **An existing inline action can quietly own a completion flag your new surface is about to duplicate —
  grep for the flag's OTHER writers before wiring your own.** `SetupGuideCard.tsx`'s `comparte` step already
  had its own `handleShare` (native share/clipboard) marking `settings.guide.share_done`, undocumented in
  the epic's own scope docs. Building the new Comparte page without checking this would have left two
  different UI surfaces racing to mark the same flag, or (worse) left the guide card's inline action as a
  now-redundant, undocumented parallel path. Caught by reading the actual consumer of the CTA href being
  rewired, not just the CTA string itself.

## Gaps / follow-ups
- **Owed to Daniel, live on prod:** the real Mercado Pago authorize → return → resume-banner → payable
  round-trip (money/auth — cannot be automated), and the full first-run walkthrough (intake → agent door →
  CSV → approve staging → SuccessCard → connect cobros via the new wizard → share). Numbered smoke steps
  in `sprint-3.md`.
- **Not new to this epic, still open:** the `browser-smoke.yml` CI wiring gap (`MS_TEST_BROWSER_AUTH=1`
  never set, defaults to prod where dev-Clerk-only sign-in is rejected by design) means no credentialed
  browser spec has ever run live anywhere, local or CI — found during Sprint 2, not this epic's to fix
  alone (cross-cutting CI infra).
- **Not blocking, a known trade-off documented at the time:** Sprint 2's `SetupReport` shows the "activa
  cómo cobrar" nudge unconditionally on re-apply to an already-configured shop (unlike `ImportClient`,
  which gates on a real `pagosConfigured` read) — a false-positive nudge on an idempotent re-apply. Left as
  a documented follow-up rather than scope-creeping a new fetch into that PR.
