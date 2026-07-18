# UI refresh before launch — Sprint 2: Polish passes — buyer core + marketing

**Status:** 🟨 in progress — both stories built, PR open (`feat/ui-refresh-s2`, PR #282 against
`apps/miyagisanchez`, title: "ui-refresh S2: buyer core + marketing polish passes [LOW]"),
**Daniel's preview walkthrough owed before merge**.

## Stories

### Story 2.1 — Polish pass: buyer core (home, /l, PDP) ✅ built, PR open (Daniel's preview review owed)
**As** a buyer, **I want** the launch-visible surfaces to carry the new feel beyond what tokens alone
express — spacing rhythm, card hierarchy, motion on interactions, calm content-first reading on PDP,
**so that** the first impression is top-shelf.
Token re-skin constraint holds: component polish, no structural rewrites. Extend the design-token
guard's `enforcedSweptPaths` with each file touched (LEARNINGS: enforce exactly what you swept).

**Status:** built on `feat/ui-refresh-s2` (commit `8f1aa4a`). Converted stray bare Tailwind radius
utilities (`rounded-xl/lg/md/full`, directional `rounded-t-2xl`/`rounded-b-xl`) and old-scale
hardcoded font sizes (literal `15`/`17` — the exact px values S1 bumped to 16/18 via
`--t-base`/`--t-md`) onto the `--r-*`/`--t-*` token scale across home (`app/(site)/page.tsx`), `/l`
search + listing grid (`SearchBar.tsx`, `l/page.tsx`), and every PDP surface (`l/[id]/page.tsx` + all
vertical hero/buy-box components: AutoHero, ServiceHero, InmuebleHero, EventBuyBox,
ConfiguratorBuyBox, RentalBooking, Gallery, SubscriptionSection, SpecsTable, ExcerptPanel,
CollapsibleDescription). SearchBar's colored filter card also picked up 2 bare `bg-white` →
`bg-[var(--fg-inverse)]` swaps (zero-diff — `--fg-inverse` resolves to white) to fully clear the
raw-color guard. `SubscriptionSection.tsx` got the same radius treatment but was **deliberately left
out** of `enforcedSweptPaths` — it also carries pre-existing raw `green-*`/`red-*` Tailwind palette
classes (a success/error state) that are a color-*value* redesign, out of this token-re-skin sprint's
scope. Extended `lib/design-token-audit.ts`'s `enforcedSweptPaths` with the 14 buyer-core files now
fully clean (radius + raw-palette + bg-white).
**Channel parity:** the PDP body (`app/(shell)/l/[id]/*`) is the same component tree
ChannelLayout/embed render from (confirmed via the existing channel-aware `TrustSignals` wiring), so
`/s/[slug]` white-label + embed inherit this pass automatically — no duplicate surface to sync (not
independently smoke-tested this sprint; inherits S1's channel spot-check).
**Verified pre-PR:** `tsc --noEmit` clean; `npm run build` succeeds, `/` still static;
`design-token-foundation.spec.ts` (19 specs, both new `enforcedSweptPaths` gates) + `perf-budget` +
`agent-readability` suites green; full Playwright `api` project green modulo 6 pre-existing,
unrelated live-network/flag failures (`launchpad-*`, `not-found-shape`) reproduced identically on an
unmodified sibling worktree.
**Owed to Daniel:** the actual preview walkthrough (this doc's Sprint 2 smoke steps) — no visual
review has happened yet, only the deterministic guards.
**Acceptance:** Daniel preview-approves each surface; guards + perf budget green; browser smoke specs
for the key interactions stay green.
**Risk:** low

### Story 2.2 — Polish pass: marketing pages (/vende, /acerca, /agent) ✅ built, PR open (Daniel's preview review owed)
**As** a seller prospect (or their AI), **I want** the campaign pages polished to the same standard,
**so that** the ad-driven first touch matches the product.
Keep agent-readability intact — the `agent-readability.spec.ts` guard (epic
`agent-readability-marketing-surface`) must stay green; content/DOM stays fetch-parseable.

**Status:** built on `feat/ui-refresh-s2` (commit `dc5d2a5`). `/vende` (main page + the shared
`SellerAcquisitionSections.tsx` every `/vende/*` vertical variant renders through) was already fully
token-clean — no change needed. `/acerca` and `/agent` get the calm content-first reading-surface
treatment called for in the epic: both apply the S1 `--measure-prose` token (66ch) to their long-form
prose containers, replacing a hardcoded `maxWidth: 760` — the smallest honest application (the varying
per-section marketing hero widths on `/vende`, 560–700px, were deliberately left alone: real
intentional per-section design rhythm, not a uniform reading measure, and flattening them to one value
would have been overreach). `/agent` also picked up the same `15px → var(--t-base)` icon-size fix as
the buyer-core pass. Extended `enforcedSweptPaths` with both files (already guard-clean, no
radius/palette debt to fix).
**Verified pre-PR:** same deterministic gates as 2.1 (shared commit history/CI run);
`agent-readability.spec.ts` green including the `/acerca` and `/agent` OG/social-preview + substantive
-content checks; es-MX copy untouched — zero copy changes, only `maxWidth`/`fontSize` style values.
**Owed to Daniel:** the preview walkthrough + a manual agent-fetch spot-check of `/acerca` (the CI spec
guards this, but the sprint doc calls for a hand confirmation too).
**Acceptance:** Daniel preview-approves; agent-readability spec green; es-MX copy untouched (rule #5).
**Risk:** low

## Sprint QA
- **api spec(s):** agent-readability spec + token guards + perf budget (all existing)
- **browser smoke owed:** yes, to Daniel — preview pass per surface
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: branch preview, then production · https://miyagisanchez.com

1. Home → browse → PDP on your phone.
   → Consistent rhythm and hierarchy; PDP reads calm and content-first; interactions feel intentional.
2. Open /vende and /acerca.
   → Same design language as the product; prompts/copy unchanged.
3. Ask your AI to read miyagisanchez.com/acerca.
   → Still fully readable (the CI spec guards this, but confirm once by hand).

If any step fails, note the step number + what you saw — that's the bug report.
