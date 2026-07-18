# UI refresh before launch — Retrospective

_Closed: 2026-07-18_

## What shipped
- **S1.1 — token spec (written decision, Daniel-approved 2026-07-17).** Opus-researched against
  current M3 guidance with citations; deliberately conservative: rem conversion + a 16px body
  floor as the one real size bump, two radius nudges onto the M3 corner scale (`--r-lg` 18→16,
  `--r-xl` 24→28), additive `--measure-prose: 66ch` — palette, brand accent, spacing, motion
  (already M3-conformant), and elevation all explicitly left alone. Seasonal-theme composition
  precedence verified in code before any value moved.
- **S1.2 — the token layer (PR #281, 2026-07-18).** Exactly the approved spec, one `globals.css`
  commit; root font-size unpinned so rem tracks browser settings; seasonal-theme toggle
  empirically re-verified post-change. Merged in a quiet window (no sibling app PRs touching it).
- **S2 — buyer core + marketing polish (PR #282, 2026-07-18).** The real straggler class wasn't
  hardcoded font sizes generally — it was bare Tailwind radius utilities that predate the token
  scale, plus literal 15/17px values that exactly matched the OLD token values. ~35 radius + 12
  font-size conversions across home, `/l`, and the full PDP component tree; `--measure-prose`
  applied to `/acerca` + `/agent` long-form prose; 16 fully-cleaned files added to
  `enforcedSweptPaths`. Codex: zero findings at any level.
- **S3 — seller portal + checkout (PR #283, 2026-07-18, HIGH → Daniel merge).** Same sweep across
  33 seller-portal files (9 to `enforcedSweptPaths`, 24 excluded with documented palette debt);
  checkout pass strictly class-attribute diffs (verified line-by-line AND programmatically by the
  fresh reviewer: every changed line a token swap, provider logic/amounts untouched).
  **Daniel's Stripe-4242 money-path smoke: done and green 2026-07-18.**

## What went well
- **The approval gate did its job cheaply:** one page of researched, cited decisions meant three
  polish sprints executed mechanically with zero scope debates — and "deliberately left alone"
  lists prevented every tempting drive-by change.
- **The incremental-adoption guard pattern scaled:** each sweep extended `enforcedSweptPaths`
  only for files it fully cleaned, so the guard ratchets forward without ever red-flagging
  unswept territory (the exact shape the rails-foundation epic prescribed).
- The HIGH checkout story stayed genuinely visual: smallest-possible-diff discipline + a
  reviewer verification designed for exactly that claim ("every changed line is a token swap")
  made a checkout-surface merge safe to approve quickly.

## What didn't / incidents
- Nothing broke. The one recurring friction was environmental (session caps killing builders
  mid-story) — recovered by resume-from-transcript each time, no rework.

## What we learned
- **A cross-cutting token change is safest as: approved written spec → one-commit value change →
  mechanical polish sweeps that ratchet a guard.** Each layer is independently revertable and
  reviewable; the spec's "left alone" list is as load-bearing as its change list. *(Sharpens the
  design-token-foundation incremental-adoption rule rather than adding a new one — no separate
  LEARNINGS entry.)*

## Gaps / follow-ups
- 24 seller-portal files + `SubscriptionSection.tsx` + `payment/success` carry documented raw
  status-color palette debt (needs a color-role design decision, out of re-skin scope) — future
  sweep fodder, all enumerated in the S2/S3 build notes.
- `[data-mode]` dark/calm has no wired UI toggle anywhere (pre-existing, noted during S1.2).
