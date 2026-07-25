# Merchant Partner lifecycle — Retrospective

_Closed: 2026-07-25_

## What shipped

A Merchant Partner's **stewardship portfolio** over the shipped activation CRM: who they are
accountable for, what is overdue and why, help preparing a follow-up they personally send, a 30-day
retention loop, and agent parity — all behind `promoter.partner_portfolio_enabled`, born OFF.

Three stacked PRs, merged in order, with all migrations applied and verified live **before** merge.

| Sprint | PR | What |
|---|---|---|
| 1 | [#308](https://github.com/danybgoode/miyagisanchezcommerce/pull/308) (squash `33facbf`) | Response-window SLA policy (versioned, admin-writable, code-default fallback) · grant-scoped work queue with a total ordering and an **explainable** overdue reason · admin reassignment with required reason, effective time and explicit task transfer |
| 2 | [#310](https://github.com/danybgoode/miyagisanchezcommerce/pull/310) | Fact-bounded editable follow-up drafts with auditable provenance · idempotent steward reminders (`UNIQUE (relationship_id, kind, window_key)`) · the no-auto-send boundary |
| 3 | [#311](https://github.com/danybgoode/miyagisanchezcommerce/pull/311) | 30-day retention task off the write-once `first_sale` transition · partner-agent read + propose/confirm parity on its own MCP route · PII-free SLA/retention events on the widened emission claim key |

**Nine architecture decisions (D1–D9) were locked against live code and the live database before any
builder started**, and every builder cited them instead of re-deriving them. Three deviations from the
scaffolded scope were decided up front rather than discovered mid-build: no LLM exists in this repo, so
drafts are a versioned deterministic composer (Daniel's call); `resolveToolShop` is structurally wrong
for a portfolio, so the agent reuses the UI's population; and the emission claim key had to widen.

## What went well

- **The locking pass paid for itself three times over.** Each builder started with a file-by-file
  contract naming the seams to reuse, and none re-litigated architecture. Each of the three deviations
  would otherwise have been a mid-build stall.
- **Model routing by risk worked as designed.** Opus built Sprint 1 (the authorization boundary, the
  migration, the contract S2/S3 import); Sonnet built 2 and 3 over a locked contract. Review was
  inverted — the fresh pass on the highest-risk PR ran on Opus.
- **Stacking, not siblings.** All three sprints touched `lib/portfolio/`, the `/partner` page,
  `lib/flags.ts` and the migration set. Stacking made the flag-count edit a one-time change instead of
  a per-merge conflict; the squash-merge cost was one clean `--onto` replay per sprint.
- **Salvage-and-resume beat restarting, four times.** Builders and reviewers died to shared session
  limits repeatedly. Re-deriving `git status` and messaging the same agent recovered the work every
  time — and twice a "failed" agent had got materially further than its own failure report claimed.
- **Every fix was proved by planting the defect first.** Not one "verified by inspection".

## What we learned

**Guards.** *Source-text guards fail on well-documented, correctly-refactored code far more often than
on defects.* Five separate cases: three needed comment-stripping (a module naming the forbidden thing
to explain that it avoids it — the documentation is the evidence, and the guard punished it); one
matched an `import` instead of a call site; one pinned `await tgSend(` so a correct fix looked like a
regression. Strip comments, anchor inside the function body, assert the invariant rather than the
spelling — otherwise the guard trains people to weaken it.

**Read-then-write.** *A read is not a claim.* Codex found this same class in **three** places across
three PRs: two concurrent policy `PUT`s both reading version N; two concurrent confirms both seeing
`confirmed_at` null; a completion reporting success after its follow-up insert failed. And
`.select()`-back is load-bearing, not decoration — **supabase-js reports no error for an UPDATE that
matched nothing**, so without it a lost update is indistinguishable from a save. `.upsert()` hides the
whole problem.

**Claim ordering has a third position.** Fixing the double-apply by claiming *before* applying
introduced a new failure: an unapplicable payload got its proposal permanently burned. Validation is
pure and side-effect-free, so **validate → claim → apply** — strictly better than either two-step order.

**A dark feature that notifies humans is not dark.** The reminder cron had no kill-switch and delivered
real push and Telegram while the feature was off. The dividing line for gating a background job is
*"does a human get contacted"*, not *"is it a cron"* — internal state and telemetry can run ungated,
contact cannot.

**"Reachability" has two halves.** Pre-checking the push *subscription* while missing the push
*transport* still recorded false successes, because `notify()` returns silently without VAPID and
`tgSend` never inspects its response. A fire-and-forget seam cannot report delivery; needing an outcome
means adding an **additive** probe, never changing the shared contract 13 admin call sites depend on.

**The "free while empty" window can close between planning and applying.** D8's justification — "safe
only because the table holds 0 rows" — was true on 2026-07-24 and **false when applied**: the sweep
emitted 33 milestones at 10:00 on 2026-07-25. The widening was still safe for a *different, stronger*
reason (`NOT NULL DEFAULT ''` plus an already-unique old key ⇒ the widened key is unique over the same
set). **Re-verify a schema-change premise at apply time, not plan time**, and correct the stated reason
rather than leaving a stale one standing.

**A gate result is only as current as the commit it ran against.** I reported CI green from a run that
predated my own fix commits. Check the head SHA — and run the **full** suite: `e2e/portfolio-*` was
green while the repo was red.

**Paraphrasing a contract drifted permissive again — fifth time in this family, and this time in a
shipped migration header.** The header asserted the MCP route gated on the epic flag; it gated on
nothing of the kind, so the agent *write* path would have gone live with the kill-switch off. Only an
empty `partner_grants` table made it harmless — the population was empty, the gate was open. Import the
flag key by reference; never re-type it in prose.

**Re-review the fixed tip.** Round 2 found three more real bugs, two of them holes in the round-1
fixes. A fix is a new change and deserves the scrutiny the original got.

## Gaps / follow-ups

**Owed to Daniel — browser smokes, descoped as pre-launch ceremony** (zero real merchants; the
walkthroughs presuppose operations that do not exist). Re-run on demand once real partners exist:
two-partner 403 matrix · admin reassignment preserving attribution · draft → edit → confirm in a real
channel · reminder idempotency · agent propose/confirm.

**No authenticated round-trip anywhere in this epic** — the standing Clerk/partner-credential fixture
gap every relationship spec in this repo notes. All partner-MCP assertions are static source-text, so
nothing in the suite would catch a behavioural authorization regression.

**Known limitations, stated rather than hidden:**

- `preview_url` is always `null` in v1 — the only way to get one mints a grant, which a draft route has
  no business doing. The fact list still advertises it; hide it alongside the fact that mints links.
- `lib/relationship-reconciliation.ts` reads the emissions table with no limit or paging, and that table
  changed from bounded write-once to unbounded recurring. Slow-burn (per-distinct-window, not daily) and
  inert for the scorecard, which filters on `eventType`. Wants a limit.
- The retention-outcome CHECK is kept in lockstep with `RETENTION_OUTCOMES` **by hand**; the spec guard
  is one-directional, so a CHECK growing *more* permissive than the dictionary would pass.
- No UUID validation on `draftId`/`proposalId` (a garbage id gives 500, not 404); no length cap on
  `editedText`/`confirmed_text`; `DraftAssistant` renders on `viewer` rows where generate will 403.
- `escalation_clerk_user_id` is never validated as a real Clerk id.
- The reminder cron has **no scheduler entry** — no `crons` block, no Cloud Scheduler manifest in repo.
  The rail is code-complete and unscheduled until someone creates the job.

**Cross-family review is currently a ONE-pool reality**, not the three LEARNINGS describes: codex was
weekly-capped for most of this epic and devin is not installed. Antigravity alone passed two diffs with
zero findings that codex later found blocking bugs in — a clean pass from a single pool is weak evidence.
