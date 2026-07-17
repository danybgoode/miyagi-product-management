# Agent-readability & marketing-surface hardening — Retrospective

_Closed: 2026-07-16_

> Built in the four-epic batch session (Fable 5 multi-epic experiment, merges pre-authorized).

## What shipped
One sprint, one PR [#270](https://github.com/danybgoode/miyagisanchezcommerce/pull/270), built by
a Sonnet 5 agent in an isolated worktree:
- **1.1 retargeted**: the P0 "/acerca empty body" bug was NOT reproducible live (verified twice —
  batch planning + the builder's own curls: both UAs return the full ~168KB byte-identical HTML,
  `cf-cache-status: DYNAMIC`, no-store). Root cause written in the PR: the page renders fully
  dynamic (`headers()` + awaited `searchParams`), so no cache layer can serve an empty shell;
  whatever produced the 2026-07-14 observation was a transient of the Vercel→Cloud Run cutover
  window. No code fix — the durable protection is 1.3's guard.
- **1.2 OG sweep**: `vende`'s OG template generalized into `lib/marketing-og.tsx` (vende
  re-exports keep all 11 existing consumers unchanged); own `opengraph-image.tsx` for `/acerca` +
  `/agent`; `/agent` gained canonical + og:url (had neither); `/terminos` og:url self-referential;
  root OG on the shared template.
- **1.3 CI guard**: `e2e/agent-readability.spec.ts` — no-JS fetches of `/`, `/vende`, `/acerca`,
  `/agent`, `/llms.txt`, `/robots.txt`, `/api/ucp/manifest` asserting substantive content +
  OG/canonical. 16/16 green vs live prod post-deploy.

## What went well
- **Validating the premise before building saved the sprint's P0 budget** — the "fix" story became
  a verification + root-cause + regression-guard story. Check the bug still exists before fixing it.
- Red-green worked across deployment lag: canonical/OG assertions observed red vs prod, green vs
  the branch, green vs prod after deploy.

## What we learned
- **A pre-existing source-assertion spec is a copy contract**: the root OG rewrite dropped the
  guarded positioning tagline + a pill — `e2e/marketplace-positioning.spec.ts` (rightly) failed CI
  first run. When rewriting any file a spec reads as SOURCE, grep the suite for specs asserting
  that file's strings first.
- Canonicals are deliberately prod-absolute on every host (a preview's canonical must point at
  prod) — documented in the spec after codex flagged it as suspicious.

## Gaps / follow-ups
- **Daniel smoke owed**: paste `/`, `/vende`, `/acerca`, `/agent` into WhatsApp + Telegram and
  confirm the previews (the OG PNGs render — 102KB verified — but visual quality is untested).
- Root OG `alt` text still carries the positioning title while the image headline is the tagline —
  cosmetic, intentional (spec-owned copy), noted by the fresh reviewer.
