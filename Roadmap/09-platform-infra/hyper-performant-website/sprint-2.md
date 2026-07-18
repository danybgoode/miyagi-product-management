# Hyper-performant website — Sprint 2: CSS/JS + the guard

**Status:** 🟦 built — draft PR "hyper-performant-website S2: iconoir subset + Clerk lazy-mount + perf guard [LOW]", awaiting review/merge. Branch `feat/hyper-perf-s2` (fresh off `main` post-S1-squash-merge, per S1's own dead-end-branch note).

## Stories

### Story 2.1 — Iconoir subset (kill the 204 KiB render-blocking CSS) ✅
**Done.** `iconoir` is now a pinned npm devDependency (7.11.1, exact — no CDN, no `@main`).
`scripts/build-iconoir-subset.ts` (`npm run build:iconoir`) reads the real pinned
`node_modules/iconoir/css/iconoir.css`, keeps only the 138 `.iconoir-<name>::before{...}` rules this
codebase actually references (`lib/iconoir-subset.ts` scans `app/`+`components/`+`lib/`+`locales/`+
`app/globals.css` — the emoji-to-iconoir-sweep retro's own "argue for scan scope" lesson applied from
the start — including 3 runtime `` `iconoir-${cat.icon}` `` template-composition sites, resolved via a
documented registry with `CATEGORIES` imported live from `lib/types.ts` so a new category is picked up
automatically), and writes `app/iconoir-subset.css` — imported as a normal same-origin CSS module in
`app/layout.tsx`, replacing the jsDelivr `<link>` entirely. Fails loudly (non-zero exit) if a used class
doesn't exist in the pinned bundle — closes the emoji-sweep epic's own flagged-but-never-built gap
("nothing stops a 12th broken Iconoir class") as a byproduct.
**Measured:** 187.8 KiB raw subset → 18.5 KiB gzip / **14.9 KiB brotli**, vs. the original 204 KiB
CDN transfer for the full 1671-icon bundle (same-origin now, zero third-party round trip).
**Acceptance:** zero render-blocking requests from external CDNs — ✅ source-code-asserted
(`e2e/iconoir-subset.spec.ts` + `e2e/perf-budget.spec.ts`'s S2.3 head-scan check) and will be
live-verified once deployed. "Reduce unused CSS" clearing is PENDING Daniel's PageSpeed re-run.
**Risk:** low — touches the shared `layout.tsx` head, per the sprint's own risk note.

### Story 2.2 — Clerk UI lazy-mount + legacy-polyfill purge ✅
**Done.** Root cause found: `PlatformShell.tsx` (rendered on every page, incl. the homepage) and
`account/page.tsx` both statically `import { UserButton } from '@clerk/nextjs'` and only gated the
RENDER with a client-side `<AuthShow when="signed-in">` — a runtime React conditional, not a
build-time code split, so Clerk's UI-bundle load trigger fired for every visitor regardless of auth
state. Four new `app/components/clerk-lazy/Lazy{UserButton,SignIn,SignUp,UserProfile}.tsx` wrappers
move each behind `next/dynamic(..., { ssr: false })`; all four call sites (PlatformShell, account hub,
sign-in, sign-up, account/settings) swapped over. Clerk **auth** itself is untouched (AGENTS rule #4) —
`ClerkProvider`, `useAuth`/`useUser`/`useSession` all unchanged, verified by spec.
Added an explicit `browserslist` (package.json) targeting modern evergreen browsers (chrome/edge/
firefox ≥100, safari/ios_saf ≥15.4) for the legacy-polyfill purge — the audit's ~14 KiB finding
(`Array.from/at/flat/flatMap`, `Object.fromEntries/hasOwn`, `String.trimStart/trimEnd`) is SWC's
default down-level target for first-party code with no browserslist configured. Empirically verified in
the worktree: a SEPARATE ~112 KiB Next-owned `polyfillFiles` (core-js, nomodule-gated) chunk is
byte-identical with/without this config either way — that's a different, unaffected mechanism, not
what the audit's specific first-party chunk pointed at.
**Acceptance:** TBT < 200 ms on the PageSpeed mobile run — **PENDING Daniel's live run** (can't be
measured from this worktree, no real-browser long-task profiling available here). Sign-in still
works on first click — mechanism is in place and spec-asserted (lazy-mount wiring, ClerkProvider
untouched); the actual click-through across marketplace/subdomain/custom-domain channels is
**PENDING Daniel**.
**Risk:** low

### Story 2.3 — Perf-budget guard in the deterministic gate ✅
**Done.** `e2e/perf-budget.spec.ts` hardened: (1) deterministic — `app/layout.tsx`'s `<head>` may not
carry an external stylesheet besides the accepted Google Fonts one (structural regression guard for
the exact class of bug 2.1 just fixed); (2) deterministic fixture — the 150 KiB budget comparison
itself, exercised against synthetic over/under-budget byte counts; (3) live — fetches every
render-blocking `<head>` asset on the real homepage and fails if any exceeds 150 KiB (hard-gated to
the prod host only, same S1 skip semantics); (4) live — broadened the S1 image-cache-header check from
"the first match" to "the first three" `/api/img` URLs.
**Observed RED:** the new >150 KiB live check correctly fails RIGHT NOW against live prod — prod is
still serving the old 2,888,008-byte jsDelivr `iconoir.css` because this PR hasn't deployed yet. That
IS the guard working as intended; it self-resolves the moment this PR merges. (Also class-tested via
the deterministic fixture above, independent of prod's current state.)
**Acceptance:** budget spec red when a >150 KiB render-blocking asset appears — ✅ demonstrated (see
above); the "uncached first-row image" half of this acceptance was already covered by S1's cache-header
check, now broadened to 3 images instead of 1.
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/iconoir-subset.spec.ts` (new, 11 assertions) + `e2e/perf-budget.spec.ts`
  (hardened — S2.2 Clerk-lazy-mount source checks, S2.3 budget guard). Full `api` suite, sequential
  run: **2428 passed, 7 failed** — 6 are the SAME pre-existing live-prod-environment flakiness S1's own
  QA notes already documented as unrelated (`launchpad-campaign-vote`, `launchpad-submission`,
  `not-found-shape` — rate-limit/WAF status drift, untouched by this branch); the 7th is the S2.3
  budget guard's expected pre-deploy failure explained above.
- **CI note:** GitHub Actions minutes were exhausted for the month at PR-open time — CI did NOT run on
  this PR. Compensated with a rigorous LOCAL gate (below), stated explicitly in the PR body. The Vercel
  preview still deploys (Vercel-side, unaffected by GH Actions quota).
- **browser smoke owed:** yes, to Daniel — final PageSpeed run (the epic acceptance: ≥ 90 / LCP < 2.5 s
  / < 1.5 MB — the actual TBT number for 2.2's acceptance), plus one real sign-in on prod across all
  three channels (auth-adjacent change in 2.2).
- **deterministic gate:** `tsc --noEmit` ✅ + `npm run build` ✅ (homepage `/` still prerenders as
  static `○`, ISR revalidate 1m) + Playwright `api` (see above) — all run locally, repeatedly, given
  the CI-quota gap.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Run https://pagespeed.web.dev on https://miyagisanchez.com (Mobile).
   → Performance ≥ 90 · LCP < 2.5 s · total payload < 1.5 MB.
2. Hard-refresh the homepage with DevTools → Network.
   → No cdn.jsdelivr.net request; icons render correctly across home, browse, PDP, seller portal.
3. Click "Iniciar sesión" and complete a real sign-in. (auth path — owed to Daniel)
   → Clerk UI loads on demand (slight fetch on click is OK) and sign-in completes normally.

If any step fails, note the step number + what you saw — that's the bug report.
