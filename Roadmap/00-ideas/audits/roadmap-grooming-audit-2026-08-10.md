# Roadmap grooming audit — 2026-08-10

**Advisory only — no app code touched, nothing merged/deployed.** Follow-up to
[`roadmap-grooming-audit-2026-07-20.md`](roadmap-grooming-audit-2026-07-20.md) (three weeks between
passes — the previous cadence was weekly through 07-06/07-13/07-20, then lapsed; this pass resumes it).
Same method: read `Roadmap/WAYS-OF-WORKING.md` + `Roadmap/00-ideas/README.md` for the funnel lifecycle
(seed frontmatter `status:` = raw | ready | queued | scaffolded | in-progress | shipped | archived; once
an epic exists, its README frontmatter `status:` is the SSOT), ran `node scripts/build-order.mjs --check`
and `node scripts/doc-format.mjs --check`, cross-checked every seed's frontmatter against its epic (where
one exists), read the two epics `BUILD-ORDER.md` already self-flags as status drift against their sprint
docs and retrospectives, and spot-checked the live Notion "Marketplace Roadmap" sync via its GitHub Actions
run history.

**Bottom line: the funnel is in good shape.** Both items `BUILD-ORDER.md`'s own drift detector flags are
false positives once you read the docs behind them (§1) — same recurring class the 07-13/07-20 audits
already named. One seed's body text has drifted meaningfully out of sync with its own frontmatter and
with a shipped epic it appears to describe (§2) — worth a look, not urgent. One scoped spike has sat
`ready` for a month without being queued (§3). Everything else — 142 epics, 102 seeds, the generated board,
and the Notion projection — checks out clean.

---

## 1. `BUILD-ORDER.md`'s two self-flagged "status drift" epics — both reviewed, both false positives

The generated board's "⚠️ Status drift" section currently lists 2 epics where the README frontmatter
disagrees with the sprint/retro-derived guess. Read each one's sprint docs, retrospective, and DoD state
to determine which side is right:

| Epic | frontmatter (used) | derived | verdict |
|---|---|---|---|
| [`miyagi-partners-recruiting-v3`](../../08-growth-and-promotions/miyagi-partners-recruiting-v3/README.md) | In progress | Shipped | **Frontmatter correct — stated explicitly in-doc.** Both sprints are `**Status:** ✅ shipped` and `RETROSPECTIVE.md` is closed (2026-08-09, yesterday), which is exactly why the derivation guesses "Shipped." But the retro's own header says otherwise: *"epic status remains in progress pending Golden flag registration and owner smoke."* PRs [#342](https://github.com/danybgoode/miyagisanchezcommerce/pull/342) and [#343](https://github.com/danybgoode/miyagisanchezcommerce/pull/343) merged and the migration verified live, but the epic is deliberately held open pending the Flagsmith flag (`partners.recruiting_v3_enabled`) and Daniel's owner-session smoke — the same two gates the epic DoD requires before a kill-switched epic can close. **Suggest:** once those two land, flip `status: shipped` — nothing else blocks it. |
| [`merchant-lifecycle-projection`](../../08-growth-and-promotions/merchant-lifecycle-projection/README.md) | Shipped | Scaffolded | **Frontmatter correct — a structural false positive.** This epic has zero local `sprint-N.md` files by design: it's an explicit "pointer" doc for a *consumer* integration whose authoritative spec and sprint history live in the sibling `golden-beans` repo (`Roadmap/01-growth-engine/event-destination-router/`), stated at the top of the README ("Do not edit the golden-beans repo; if the contract looks wrong, raise it there"). The derivation heuristic infers status from local sprint-file counts, sees none, and guesses "Scaffolded." The README's own "Where the code is" table lists concrete, dated artifacts (migrations `20260722160000_…` / `20260722170000_…`, the webhook receiver, the daily sweep cron) consistent with a genuinely shipped integration — this repo's `apps/` tree is gitignored here so the code itself couldn't be re-verified this pass (see *Known verification gap* below), but nothing in the doc reads as aspirational. **No action needed.** Same recurring class the 07-13 and 07-20 audits already flagged in the sprint-derivation heuristic (doesn't know about deliberate close-gates or cross-repo pointer epics) — noting again so it doesn't get "corrected" reflexively; worth a decision on whether to special-case cross-repo consumer epics in the generator, or leave this as permanent, understood advisory noise. |

## 2. Seed body text has drifted from its own frontmatter — `designer-collaboration-portal.md`

[`00-ideas/seeds/designer-collaboration-portal.md`](../../00-ideas/seeds/designer-collaboration-portal.md)
— frontmatter is `status: raw`, `epic: null`, `updated: 2026-06-08` (63 days stale, the oldest of the 6
funnel seeds). `status: raw` means "unrefined idea, no scope yet." But the body opens with:

> Epic: Rotating Brand Collaboration & Seasonal Theme Engine
> Implementation status - 2026-06-05
> - Code complete on `feat/seasonal-theme-engine`.
> - Sprint docs live under `Roadmap/08-growth-and-promotions/seasonal-theme-engine/`.

That epic — [`seasonal-theme-engine`](../../08-growth-and-promotions/seasonal-theme-engine/README.md) —
is real, scaffolded, and now `status: shipped` (9/9 stories, `BUILD-ORDER.md`'s Shipped section). So the
seed's own body describes work that has since actually shipped under a different, already-linked epic,
while the frontmatter still reads `raw`/`epic: null` — the two halves of this one file tell contradictory
stories. Two readings, and only Daniel can say which is true:

- **If "designer collaboration portal" is fully subsumed by the shipped `seasonal-theme-engine` epic** —
  this seed is an orphaned duplicate description from before scaffolding and should move to
  `status: archived` with a one-line pointer to the epic that absorbed it (the same fix pattern the
  07-20 audit used on `spike-arranged-only-delivery.md`).
- **If a genuinely separate, still-undone slice was deferred** (the filename itself says "deferred from
  #4") — the body's implementation-status banner is just stale reporting on a *different*, now-shipped
  epic, and the seed needs a fresh Definition-of-Ready pass scoping only what's actually still undone,
  not a rewrite that re-describes already-shipped work.

Either way, the current file is misleading to a reader skimming just the frontmatter (which is what the
funnel board reads) or just the body (which is what a groomer reads first).

## 3. One scoped spike aging in `ready` without being queued

[`00-ideas/seeds/spike-compra-protegida.md`](../../00-ideas/seeds/spike-compra-protegida.md) —
`status: ready`, `updated: 2026-07-10` (31 days). This is a fully-scoped, one-session, time-boxed spike
(delivery audit + an escrow-granularity decision) with a written investigation plan and named hypotheses
— genuinely ready, not stalled on missing scope. It's just sat un-queued for a month. Not urgent (`risk:
high` is on the eventual *build*, not the read-only investigation itself), but worth a queue-or-explicitly-
defer call so it doesn't silently age past relevance — the doc's own H2 notes "the poster lags the code,"
which is exactly the kind of drift this audit exists to catch and which this spike would resolve on its
own docs-only track.

**Not flagged, for contrast:** [`ai-adoption-maturity-benchmark.md`](../../00-ideas/seeds/ai-adoption-maturity-benchmark.md)
(`ready`, 21 days) reads similarly aged but its body shows a deliberate 2026-07-20 rescoping banner
explaining the narrowed remaining scope and where the other two-thirds went (`golden-beans`,
`dobby-foundation`) — correctly `ready`, just not yet queued. `affinity-marketplace-infrastructure.md`
(`raw`, 13 days) and `custom-static-pages.md` (`raw`, 30 days) are ordinary raw backlog, not flagged.
`us-curated-marketplace.md` (`ready`, 6 days) is fresh.

## 4. Everything else checked, no action needed

- **`node scripts/build-order.mjs --check`** → `BUILD-ORDER.md is up to date.` (generated 2026-08-09,
  current against today's docs).
- **`node scripts/doc-format.mjs --check`** → `clean (165 path(s) enforced, 229 advisory finding(s)
  elsewhere)`. No hard-gate violations.
- **Scaffolded-seed status "mismatches" against their epic (35 seeds)** — spot-checked several
  (`panfleto-premium-shop`, `miyagi-partners-mcp`, `reporthub-as-notion`, others): every one has
  `status: scaffolded` in the seed while its linked epic README has since moved to `in-progress` or
  `shipped`. **This is documented, by-design behavior, not drift** — `00-ideas/README.md` states plainly
  that once `epic:` is set, the seed's `status:` becomes funnel-only and is never re-read for the board
  (only the epic README frontmatter is authoritative). Confirmed no tooling reads these seed statuses
  post-scaffold. No correction needed or suggested.
- **Notion "Marketplace Roadmap" board** — verified live via `notion-sync.yml`'s GitHub Actions run
  history rather than a direct DB query this pass: the nightly drift-safety-net cron ran successfully at
  2026-08-10T09:18:47Z (this morning), and a push-triggered sync ran successfully at
  2026-08-09T20:01:41Z — roughly six hours after the commit that closed `miyagi-partners-recruiting-v3`'s
  retrospective, consistent with the workflow's `push: branches: [main], paths: ['Roadmap/**', …]`
  trigger. Both green, both recent. No drift indication.
- **Canonical `status:` enum, repo-wide** — no non-canonical values found across the 102 seeds or the
  epic READMEs sampled this pass (the exact class of bug the 2026-07-06 audit's §1 caught in
  `mercadolibre-sync`).
- **The "Building now" epics** (`panfleto-premium-shop`, `miyagi-partners-recruiting-v3`,
  `reporthub-as-notion`) — sprint status lines are internally consistent with their story counts and
  epic status; no stalls.

## Known verification gap (repo-scope limitation, unchanged from prior audits)

GitHub access this pass is scoped to `danybgoode/miyagi-product-management` only. PR numbers cited in
sprint docs against the two app repos (`miyagisanchezcommerce#NNN`, `medusa-bonsai-backend#NN`) are taken
on faith from the docs, and `apps/**` source paths referenced in epic docs (e.g. `merchant-lifecycle-projection`'s
"Where the code is" table, §1) could not be independently verified — those repos are gitignored in this
monorepo-root checkout by design (`AGENTS.md`).

---

### Suggested next step
Daniel's call on §2 (`designer-collaboration-portal.md`: archive as superseded, or re-scope the still-open
slice) and §3 (queue or explicitly defer `spike-compra-protegida.md`) — both small, docs-only, non-urgent.
§1's two items need no doc change; once `miyagi-partners-recruiting-v3`'s flag + owner smoke land, flip its
`status:` to `shipped`. Nothing here blocks any in-flight work.

Advisory only — not a gate. `notion-sync.yml` propagates after merge.
