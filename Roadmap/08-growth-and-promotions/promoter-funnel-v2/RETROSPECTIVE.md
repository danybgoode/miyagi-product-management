# Retrospective · Promoter Funnel v2 (08, mixed LOW→HIGH)

**Shipped:** 2026-07-03, 6 sprints, all merged to `main`. Follow-up to `promoter-program` (shipped
2026-06-30). HIGH stories (S0, S3, S4) were Daniel merges; S1/S2/S5 merged on green CI + clean review.

| Sprint | PR | Squash | What |
|---|---|---|---|
| S0 — subdomain-paywall bug | [#160](https://github.com/danybgoode/miyagisanchezcommerce/pull/160) | `9f39002`* | investigated a reported gating bug — closed **not reproducible**, test-only |
| S1 — landing v2 | [#162](https://github.com/danybgoode/miyagisanchezcommerce/pull/162) | `8513fee` | single-sourced prompt, real earnings, CTA/wording sweep, handbook |
| S2 — self-serve application | [#163](https://github.com/danybgoode/miyagisanchezcommerce/pull/163) | `de56db3` | public apply form → admin approve/reject → code minted + sent |
| S3 — the offer | [#165](https://github.com/danybgoode/miyagisanchezcommerce/pull/165) | `3f25623` | bundle/per-SKU pricing, free-first-year subdomain, 2x1 print ad |
| S4 — street money | [#167](https://github.com/danybgoode/miyagisanchezcommerce/pull/167) | `f81a41a` | net-remittance transfer (SPEI/DiMo/CoDi) + admin approval |
| S5 — close-flow completeness | [#168](https://github.com/danybgoode/miyagisanchezcommerce/pull/168) | `26f4506` | real listings, structured locations, coverage notice, ad design, receipt, rate card |

*S0's own commit ref is the root-repo doc commit; the PR itself was a test-only, no-runtime-change diff.

## What shipped (the motion, end to end)
The v1 promoter funnel assumed Daniel in the loop everywhere: codes hand-minted in person, an empty
`%` where earnings should be, a stale "subdomain is free" claim, a CTA that dead-ended new visitors,
and a close flow that ignored street reality (cash-first merchants, promoters who won't front their
own card, shops stood up with no photos, a zine that doesn't reach every neighborhood). v2 makes the
whole funnel legible and self-serve: anyone applies at `/vende/promotor` and gets approved without
Daniel hand-minting; the landing shows real per-SKU earnings and bundle pricing from one admin
config; the in-person close (`/promotor/cerrar`) now produces a shop that's **indistinguishable from
self-serve** — a real published listing with photos, a structured CP-first location, a designed
printed ad (or deferred to the merchant's panel), a branded receipt email, and a downloadable rate
card to show what's for sale — closed either by card or by net-remittance transfer for promoters who
won't front the price themselves. Perks (free first subdomain year, 2x1 print) reward promoter
attribution specifically. Everything rides existing rails: no new payment path, no new commerce
tables — Supabase only holds promoter-scoped state Medusa has no concept of (applications, transfers,
bundle config).

## What went well
- **The reuse thesis held across all 6 sprints, not just the easy ones.** S1's earnings/pricing
  reused the existing admin config with zero new tables; S3's free-subdomain-year reused the exact
  one-time-grant seam the paid Stripe path already writes; S4's transfer state machine mirrored the
  print cash-report machine; S5's ad-design step submitted to the **already-existing, unchanged**
  `close/print` route (built in S4) with zero backend changes — the biggest "new capability" of the
  sprint needed no new plumbing at all.
- **Two review passes (cross-agent + a fresh reviewer subagent), every sprint, both types of finding
  showing up repeatedly.** Real bugs caught pre-merge: a claim-before-mint race in S2's approval flow,
  a wrong-price commission calc in S1, a dead-on-arrival admin route in S3, a missing "already
  entitled" guard on the free-subdomain grant, an unescaped shop name in S5's receipt HTML, silent
  photo-upload failures in S5. Equally important: **both reviewers correctly declined false positives
  by checking established precedent in the code itself**, not just trusting the builder's stated
  reasoning — e.g. S5's "custom route creates a listing" flag matched the already-shipped MCP
  `create_listing` tool's identical shape.
- **Escalate-don't-guess worked as designed.** Two genuine ambiguities (S5's unclaimed-listing
  publish-status conflict, and the rate-card's baseline-artwork dependency) were surfaced as
  clarifying questions rather than guessed — both resolved a real design fork before code was written,
  not after.
- **Money-path discipline held under pressure.** S3's free-subdomain grant, S4's net-remittance flow,
  and S5's receipt notifier all threaded through existing "verify the write landed" / "already
  entitled" guard patterns rather than inventing new ones — the shape from `promoter-program`'s own
  retro (decouple payer from grantee at the seam) kept paying off sprint after sprint.

## What we learned (promoted to LEARNINGS)
- **Sync a stale local checkout against `origin/main` BEFORE reading "what already exists" during
  planning — a missing merge can hide an entire prior sprint's UI shape.** Sprint 5's planning session
  found its `apps/miyagisanchez` checkout one commit behind `origin/main`, missing Sprint 4's merge —
  the local `PromoterCloseClient.tsx` still showed the pre-S4 3-step shape, silently missing the
  `transferEnabled` prop and the whole transfer sub-flow. Caught by reading via `git show
  origin/main:<path>` during planning, not assumed from a stale working tree; fast-forwarded before
  branching. Generalizes past this epic: any multi-sprint epic where sessions hand off cold should
  `git fetch` + diff against `origin/main` before trusting a local file's "current" shape.
- **A scope doc's "baseline reference file" may have moved to a separate, undeployed repo since the
  doc was written — verify the file's actual current location and deploy-reachability before designing
  a generator around reading it at runtime.** Sprint 5's rate-card story assumed a baseline zine PDF +
  JSON (named in the epic's own "what already exists" list) would be read by the PDF generator; both
  had moved to `apps/zine`, a separate local-only git repo with no CI and no deploy — unreachable from
  the Cloud Run Puppeteer service regardless. Surfaced as a clarifying question before writing code,
  not discovered mid-build; the generator was designed to build the layout fresh from existing
  primitives instead, with zero runtime dependency on either file.
- **When a "publish gate" and an "unclaimed-shop checkout gate" both exist, check whether the second
  makes the first redundant for that one case, rather than layering more state.** The shared listing-
  activation gate (no delivery/payment config ⇒ draft) exists to stop a live listing no buyer could
  check out on — but every promoter-created shop is unclaimed, and `isShopClaimed()` already blocks
  checkout entirely regardless of publish status. Skipping the redundant gate specifically for
  unclaimed shops (not touching it for claimed self-serve shops) let a promoter-created listing publish
  immediately without inventing a delivery/payment stub just to satisfy an already-moot check.
- **A cross-agent review's "missing UCP/MCP surface" finding needs a precedent check against sibling
  routes, not a blanket "every commerce action should be agent-exposed" read of AGENTS rule #3.** Every
  `close/*` route in this epic (domain, subdomain, ml-sync, print, and S5's new listing route) is
  deliberately Clerk-authed, human-only, in-person tooling — never UCP-exposed — matching a precedent
  set back in `promoter-program` S4. A reviewer unfamiliar with that precedent will flag it every time;
  checking the sibling routes' actual shape before declining (not just asserting "this is fine")
  is what makes the decline defensible.

## Gaps / owed
- **Money/auth browser smokes owed to Daniel across the epic** (an automated browser smoke can't cover
  a real card, a real transfer, or a second Clerk identity): S2's admin approve/reject session; S3's
  per-SKU checkout charge, live $0 subdomain activation, and real 2x1 close; S4's flag flip
  (`promoter.transfer_enabled` OFF → ON) + full live money smoke (transfer → approve → activation;
  reject path); S5's full in-store close (photos → listing → coverage notice → ad design → receipt →
  claim → rate-card download) on a real device. Each sprint's `sprint-N.md` has the numbered
  walkthrough.
- **`promoter.transfer_enabled` remains OFF in prod** — S4 merged the net-remittance feature dark by
  design; flipping it on, entering real CLABE/DiMo/CoDi in `/admin/promoter`, and running the live
  money smoke are still Daniel's to do.
- **S5's known, accepted non-blocking gap:** the merchant close-receipt email has no Stripe-webhook-
  retry dedup at 4 of its 6 completion call sites (the 3 one-time webhook handlers + the print-ad paid-
  emails function) — a rare webhook redelivery could double-send the receipt. Accepted rather than
  fixed in-sprint because it extends a pre-existing, already-accepted retry-tolerance gap in the same
  webhook (the Telegram alerts on those same code paths already double-fire on retry with no dedup
  today) — not a new risk category this epic introduced, and properly fixing it is a cross-cutting
  webhook-hardening change outside this epic's 6 stories. Worth its own follow-up chore.

## Fast-follows seeded
None spun out as new epics this time — every S5 gap above is either owed-to-Daniel verification or a
small, explicitly-scoped follow-up (the webhook-retry dedup), not new epic-sized scope.
