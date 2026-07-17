# mschz.org full coverage — short links for every shareable surface — Retrospective

_Closed: 2026-07-16_

> Built in the four-epic batch session (mschz + agent-readability + mcp-parity-config +
> miyagi-partners) — the Fable 5 multi-epic experiment, merges pre-authorized.

## What shipped
One sprint, two PRs: frontend [#269](https://github.com/danybgoode/miyagisanchezcommerce/pull/269)
(pure prefix matcher in `lib/shortlink.ts` + a small middleware branch BEFORE the flat resolver +
`g`/`e`/`v` reserved + share-UI/QR surfaces emit `mschz.org/<prefix>/…`), backend
[#99](https://github.com/danybgoode/medusa-bonsai-backend/pull/99) (reserved-list mirror sync).
Built by a Sonnet 5 agent in an isolated worktree; kill-switch carve-out as groomed (`git revert`
suffices).

Live-verified post-deploy (2026-07-16): all five prefixes 301 to the identical path+query
(`/g/test-sorteo?x=1` → `miyagisanchez.com/g/test-sorteo?x=1`); rest-of-path case preserved
(`/G/CasePreserved` verbatim); non-allowlisted multi-segment (`/checkout/whatever`) → branded
`/404`; flat single-segment resolver untouched. One-off prod sanity query: zero live shop slugs,
alias keys, or listing short slugs/codes equal to any of `g e v s l` — the passthrough shadows
nothing.

## What went well
- The sprint doc's "reuse, don't rebuild" section was accurate to the line — the builder agent
  landed the passthrough exactly where the doc pointed, first try.
- Red observed naturally: spec written against `PASSTHROUGH_PREFIXES` before the helper existed
  (module-load failure), then green.
- Review lattice: codex caught a real UI inconsistency nit (hardcoded `mschz.org` text vs
  `SHORTLINK_ORIGIN` href) — fixed pre-merge; two declines held up under the independent
  fresh-reviewer pass, which approved with nits only.

## What we learned
- **A reviewer's "inside the try/catch envelope" check caught honest imprecision**: the
  passthrough branch sits *before* the `try`, safe only because the matcher is pure. The report
  language mattered more than the code — state placement precisely.
- The launchpad manager's single "Página pública" link doubles as the shareable-link display, so
  it now routes through the 301 hop — the one deliberate in-app redirect (nit, recorded not fixed).

## Gaps / follow-ups
- **Daniel smoke owed**: QR camera scan of a real sweepstakes/event/campaign QR (the printed
  artifact path).
- Backend reserved-word rejection (`g`/`e`/`v` as a chosen slug) is structurally unreachable
  (SLUG_MIN=3) — defense-in-depth only, no live smoke needed.
