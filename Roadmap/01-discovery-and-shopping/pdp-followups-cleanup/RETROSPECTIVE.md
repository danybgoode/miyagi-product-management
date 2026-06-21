# Retrospective — PDP follow-ups cleanup

**Shipped:** 2026-06-21 · single sprint · frontend-only · PR [#95](https://github.com/danybgoode/miyagisanchezcommerce/pull/95) squash `3213f6c` · Risk: LOW.

## What shipped
Two LOW correctness gaps deferred at PDP-redesign S4/S5 close, bundled into one PR:

- **S1.1 (C) — protocol-less `booking_url`.** A seller who typed a scheme-less scheduling link (`cal.com/foo/visita`) made the "Agendar" CTA resolve to a broken **same-origin relative** href instead of the real calendar — and the UCP reads (agents) hit the same bug. New pure, next-free `lib/url.ts` `ensureUrlProtocol()` applied at the **one** PDP resolution seam (`app/l/[id]/page.tsx` — every hero inherits) **and both** UCP source points (`api/ucp/checkout-session`, `api/ucp/mcp`) so storefront and agents agree.
- **S1.2 (B) — personalized-event buy label.** An event listing that's *also* personalized rendered the generic "Comprar ahora" via `PersonalizationBuyBox`. Added optional `buyNowLabel`/`signInBuyLabel` props (pure `personalizationBuyLabels` selector, old strings as fallback); the page passes the labels it already computes **only for event-led listings** → non-event personalized listings byte-for-byte unchanged.

## Went well
- **The scope doc nailed the seams up front.** "What already exists (reuse, don't rebuild)" pinpointed exact files/lines; a 4-file read confirmed every one before planning — no Explore/Plan subagents needed for a pre-scoped LOW epic.
- **One resolution seam fans out.** Normalizing `booking_url` at the single `page.tsx` resolution point fixed all five hero consumers (`AutoHero`/`InmuebleHero`/`ServiceHero`/generic link/`RentalBooking`) with one wrap — the redesign's earlier "resolve once, every hero inherits" structure paid off.
- **Pure `lib/` seams → free coverage.** Both stories extracted a pure, next-free helper (`ensureUrlProtocol`, `personalizationBuyLabels`), each covered by a fast `api`-gate spec with zero network — the deterministic gate did the repetitive checking.
- **The Antigravity cross-review earned its keep.** One single advisory pass caught a real should-fix the author (and the modelled-on `canonicalSourceUrl`) both missed: `raw.startsWith('http')` false-positives a scheme-less domain that merely starts with "http" (`httpbin.org` → left protocol-less → broken link). Fixed with `/^https?:\/\//i` + two regression cases before merge.

## Learned / gotchas
- **Don't faithfully clone a flawed pattern.** `ensureUrlProtocol` was modelled on `lib/supply.ts` `canonicalSourceUrl`, which uses `startsWith('http')` — so the clone inherited the false-positive bug. When modelling on an existing helper, sanity-check its predicate against *your* input domain (booking URLs can be any host, incl. `http*`-prefixed ones) rather than copying it verbatim. (The same latent bug likely still sits in `canonicalSourceUrl` — noted as a possible cross-cutting follow-up, not fixed here to keep scope tight.)
- **Parallel planning sessions share the monorepo-root worktree — and one rebased the other's commit away.** The first doc commit (`3d1c5b1`, sprint-1.md) landed on a sibling's `chore/dev-tooling-reliability` branch (the root repo was checked out there, not `main`); the sibling then **rebased and dropped it**. Re-applied cleanly on `main` via an isolated `git worktree` (the LEARNINGS-endorsed pattern). Reinforces: planning sessions each need their own worktree, and a doc commit on a sibling's feature branch is fragile.
- **The auto-mode classifier correctly blocked a composite `git branch -f main` + working-tree-discard in the shared root.** It was autonomous scope escalation risking the sibling's uncommitted work; the right move was to wait (the tree became clean once the sibling committed) and use an isolated worktree, not to work around the denial.

## Gaps / owed
- **Nothing owed to Daniel** — no money/auth path; smokes are anonymous. The fool-proof anonymous smoke walkthrough is in `sprint-1.md` (4 steps, prod URLs). The browser smoke is best-effort (needs a fixture listing with a scheme-less `booking_url`); the pure-logic `api` specs are the gate.
