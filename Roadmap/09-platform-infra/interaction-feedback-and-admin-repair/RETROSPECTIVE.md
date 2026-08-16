# Retrospective — Interaction feedback + admin repair

_Closed: 2026-08-15_

7 storefront PRs (#370, #374–#379) + 2 root docs PRs (#137, #138), one session.

## What shipped

| | |
|---|---|
| #374, #375 | Press (`:active`) + pending (`useLinkStatus`) feedback, a route progress bar, and `Button loading` at ~20 async call sites |
| #376, #379 | `/admin/contenido` nav: ~2600 entries → 110, grouped into 12 collapsible namespaces with one open |
| #377 | `hola@miyagisanchez.com` visible on the site; emoji guard round 2; market-selector flag emoji → ISO chips; every onboarding-checklist step actionable; payments CTA → the section, not the wizard |
| #378 | `/admin/tenants` + `/admin/comunicaciones` paginate at 25 |
| #370 | Browser-smoke gallery fixtures discovered from the catalog API instead of pinned to Actions secrets |

## What actually happened

Daniel opened with nine assorted complaints and no framing. The most useful thing this run did was
notice that they were not nine things.

**Two threads, not nine tickets.** Every item was either *the product does not acknowledge input* or
*an admin surface is making a confident claim that is false*. Naming that early is what turned a
to-do list into an epic with locked decisions, and it is why the fixes generalise instead of patching
the exact pixel Daniel pointed at. Four of five checklist rows were inert, not one; three namespaces
were missing from the route map, not the one he saw; and the emoji hole was in the detector, not the
file list.

## What we learned

### The three findings worth carrying

#### 1. A guard's file list can be right while its DETECTOR is blind

Twice, in unrelated guards, in one session.

`lib/emoji-guard.ts` listed `analytics/AnalyticsClient.tsx` in `enforcedSweptPaths` from the day the
sweep shipped, and that file carried 🆕 and ⏳ the whole time — **green**. Neither glyph is in the
pattern's Unicode ranges. Every previous lesson about guards has been *widen the population*, and
widening the population here would have found exactly nothing.

`lib/copy-overrides-routes.ts` was the same shape in prose: its header comment asserted "every
`locales/es.json` top-level namespace is covered" while 2587 of 3372 keys had no entry at all.
Nothing enumerated the live dictionary, so nothing could contradict the comment.

The tell that separates this from ordinary under-coverage: **the guard is green on a file you can see
the violation in with your own eyes.** If you think "but that file *is* in the enforced set", stop
looking at the set.

The fix in both cases was the same: test the detector against a fixture of what you claim to ban, and
derive the population from the live artifact rather than from a list *or* a comment. The new coverage
spec immediately found `partnersRecruiting.landing` and `.application` — real sections on
`/us/operators`, mis-captioned since that namespace shipped, that nobody had reported.

#### 2. Two specs in this run passed while the property was absent — including one of mine

The press browser-spec compared the pressed transform against the **resting** one. Because
`.card-tile:hover` lifts the tile, moving the pointer onto it already changed the transform, so the
spec passed on hover alone — and **stayed green through a mutation that deleted the entire
`.card-tile:active` rule.** It was measuring hover and reporting it as press. The fix is to baseline
on the state you are *not* testing, and to let the transition settle before sampling (the first fix
still failed, because the baseline was captured mid-animation).

Independently, the delegated pagination diff shipped `pageAfterAdminListChange(previous, changed)`
where every call site passed `changed: true`, and its only spec asserted that `true` returns `1`.

Both are the top `LEARNINGS.md` entry wearing new clothes. The mutation run is what caught the first
one; reading caught neither.

#### 3. The nightly's diagnosis was right and its remedy was not enough

A routine had already opened #370 saying the gallery fixtures were stale. Correct. But "add a clearer
error message" only improves the wording of a failure that recurs whenever anyone tidies up a test
shop — and the actual cause was **Daniel's own `/admin/tenants` delete at 03:45 UTC**, using a feature
that had shipped the day before, read from `admin_audit_log` rather than guessed.

Two things fell out of fixing it properly. The fixture id was recoverable from the failing run's
`trace.zip` without ever reading a secret. And discovery has to be **deterministic *and* cheap**:
taking the first multi-photo match grabbed a ten-image PDP whose `load` event blew the 30s timeout
under four parallel workers, while passing fine serially. Found by running it against production.

## What went well

- **Locking the decisions first paid twice.** D4 (mount the progress bar at `MarketDocument`'s
  `<body>`) is the whole reason `/shop/manage` — the surface Daniel actually complained about — got
  the bar at all; the obvious mount point, `PlatformShell`, silently skips both the seller portal and
  the white-label channel.
- **CSS did the work components would have drifted on.** One rule set covers all 18 `.card-tile` call
  sites. A press prop would have been 18 edits and 18 chances to forget one.
- **Delegation earned its keep and still needed verifying.** Both Codex dispatches landed with honest
  red-then-green evidence and honest "I could not establish a baseline for this" caveats. Both also
  needed a follow-up commit from the orchestrator — one for a decorative spec, one for inherited lint
  debt that becomes yours the moment you touch a file.

## What to do differently

- **Mutation-test every visual-state spec, without exception.** Two of this run's most confident
  assertions were vacuous, and neither was visible to review.
- **When a comment asserts coverage, that is a spec waiting to be written.** Both false claims here
  were load-bearing and both had been true-sounding for months.
- **Ask "what is the detector blind to?" alongside "what is the population?"** The existing learning
  only covers half the failure mode.

## Corrected mid-build

The ⏸/⏰ conversions in `sell/edit/[id]/page.tsx` and `OfferInbox.tsx` were about to be promoted into
`enforcedSweptPaths` — the widened pattern then showed both still carry pass-2 emoji inside plain TS
label configs. Adding them would have made the gate red on work it was never asked to do. Conversions
kept, promotions backed out, reasoning left in the file.

## Gaps / follow-ups

Owed to Daniel:

- The acceptance walk in the README — **on a phone**, since press is the half that only matters where
  hover does not exist.
- **A public listing with zero photos, or retire that browser-smoke spec.** All 66 live listings have
  at least one, so it reports FIXTURE UNAVAILABLE and skips, deliberately loudly.
- `hola@miyagisanchez.com` in Clerk's own sign-up/verification templates — those live in the Clerk
  dashboard, not this repo.
- ~~`dimo` and `cash_pickup` are written by the payments settings save and are **not** on
  `CheckoutSettings`.~~ **Closed 2026-08-16 (#380)** — and the fix found that the inline cast written
  while flagging it had *itself* guessed the shape wrong: `phone` is `string | null`, not `string`.
  Production holds explicit nulls in several of the 7 shops carrying these blocks. A cast written
  from the save code alone reproduces the same error; querying the live rows is what caught it.
