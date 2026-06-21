---
title: "Spike — Neon egress root-cause + DB account strategy (Neon vs Supabase)"
slug: db-egress-and-account-strategy
status: ready
area: "09"
type: spike
priority: null
risk: high
epic: null
build_order: null
updated: 2026-06-21
---

# Spike — Neon egress root-cause + DB account strategy

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **09 · Platform & Infra**. Slug: `db-egress-and-account-strategy`.
Class: **Spike** (a "how does X work / should it be A or B" investigation → a *written decision*, not code).
A **Chore tail** (account separation + site-wide Clarity) is scoped here in outline but is **not sliced or
scaffolded until the decision lands** — per the groom spike path.

Trigger: a Neon usage email — *"project medusa-bonsai has used 80% (4 GB) of its 5 GB monthly public network
transfer allowance."*

## Mirror-back
> You want to (1) find out what's actually burning Neon's public-network-transfer budget when there should be
> ~no real user traffic, (2) get the two side-projects (`panfleto-miniflux`, `justread`) off the
> medusa-bonsai Neon account so each project is isolated, (3) decide whether bot/visitor tracking (analytics +
> Clarity) is worth turning on now, and (4) benchmark Neon vs Supabase so you know whether the Neon bet is
> paying off — with a dedicated account per project on whichever you keep. Right?

## Grooming decisions (2026-06-21, Daniel)
- **DB direction:** *decide placement, keep Medusa on Neon.* Migrating the live commerce DB off Neon is
  **out of scope** for this spike — the benchmark informs *where things live* and *how to cut egress*; a
  Supabase migration is only **flagged as a future option** if it clearly wins.
- **Analytics:** *extend Clarity site-wide + UTM* (lightest path — Clarity is already partially wired).
- **Account structure:** *yes, dedicated account per project on **both** Neon and Supabase.*
- **This run:** *spike scope doc only* — findings + decision drive what (if anything) scaffolds next.

---

## Stage-2.5 bucket — mixed, and that's the point
- **The investigation itself = genuinely new** (a spike; there's no existing root-cause artifact).
- **Analytics/Clarity = light enhancement.** Clarity is **already partially wired** — `window.clarity('set', …)`
  fires on the `/vende` seller-acquisition pages (`app/vende/_components/SellerAcquisitionVariantTag.tsx`),
  and `lib/print-qr.ts` references GA/Clarity tracking. "Install analytics" is therefore *verify the base
  loader's scope + extend it site-wide*, **not** a net-new integration.
- **Account separation = operational chore**, mostly **outside the codebase** (Neon/Supabase consoles + CLI +
  GCP Secret Manager DSN rotation), with a small infra-doc/secret follow-up in-repo.

## The core reframe (validate-first overturns the framing)
The ask assumes the egress is **traffic** ("unless they are bots… install analytics"). The architecture says
otherwise. **Neon "public network transfer" is egress from the *database*, and almost nothing user-facing
touches Neon directly:**

| Layer | Talks to | Counts toward Neon egress? |
|---|---|---|
| Web visitors / bots → Next.js (Vercel) | Vercel edge/functions | **No** |
| Next.js → commerce data | Medusa backend (Cloud Run) Store API | **No** (FE↔Cloud Run) |
| Next.js → conversations/offers/favorites | **Supabase** | No (that's Supabase egress) |
| **Medusa backend (Cloud Run us-east4) → Neon (AWS us-east-1)** | **Neon public endpoint** | **YES** — every query |
| **Daily `pg_dump` backup job (Cloud Run) → reads whole Neon DB → R2** | **Neon public endpoint** | **YES — and it's a full-DB read every day** |
| **Staging** (`medusa-web-staging`) → **Neon `staging` branch** | Neon public endpoint | **YES** |

So **installing analytics/Clarity will not explain or reduce the Neon number** — it measures a different layer
(human visitors to the frontend). It's still a reasonable thing to want; it just answers a different question.
Surface this explicitly so we don't "fix" egress by adding a tracker.

### Prime suspects, ranked (to confirm with live data)
1. **The daily full DB backup.** `infra/gcp/backups/` ships a daily Cloud Run job that `pg_dump`s Neon → R2;
   the 09-infra README marks backend-production-readiness S2 escrow **LIVE (2026-06-12)**. A full dump ≈
   *DB-size bytes egressed per run × ~30/month*. If the commerce DB is ~130 MB, that alone ≈ ~4 GB/month —
   which **matches the email's "4 GB" almost exactly.** Strongest single hypothesis.
2. **Backend↔Neon over the *public* endpoint.** Cloud Run reads/writes every query over Neon's public host
   (not a private/PrivateLink path), so steady-state backend chatter (health checks, scheduled jobs,
   connection churn, any polling) bleeds egress even with zero shoppers.
3. **Staging branch.** `deploy-staging.sh` runs `medusa-web-staging` against a Neon `staging` branch (pooled).
   Even scale-to-zero, any staging activity adds to the **same account** pool.
4. **The two side-projects** (`panfleto-miniflux`, `justread`) — **only if** they share the org. Miniflux is an
   RSS aggregator that polls feeds continuously (frequent reads/writes); `justread` likely similar. See next.

### Why the account split is a real lever (not just mental tidiness)
**Neon's 5 GB egress allowance is account/plan-level, not per-project** (Free plan: 100 projects, but storage
and compute are *per-project* while the **5 GB egress is the account total**). The `.neon` file pins
`orgId: org-fancy-pond-57061061`. **If** `panfleto-miniflux` and `justread` live in that org, they draw from the
*same* 5 GB pool medusa-bonsai is reporting against — so moving them out frees real headroom **and** isolates
the mental model. (Caveat: the email attributes 4 GB **to medusa-bonsai specifically**, so the side-projects are
likely *not* the dominant cause — medusa-bonsai's own backup/backend egress is. The split is worth doing
regardless; just don't expect it to be the whole fix.) **Confirm org membership with the live CLI before
concluding.**

---

## The spike — investigation plan (each step ends in a recorded finding)
> Runs where the Neon/Supabase CLIs are **authed** — Daniel's machine / a Claude Code session — **not** the
> planning sandbox (no CLI, no creds here). Each step writes its result back into the *Decision* section below.

**S0 — Live Neon usage breakdown (the load-bearing step).**
- `neonctl projects list` → confirm which projects live under `org-fancy-pond-57061061` (is the org shared with
  `panfleto-miniflux` / `justread`?).
- Pull per-project **data-transfer** metrics for the current billing period (Neon Console → *Usage*, or
  `neonctl` consumption API). Get medusa-bonsai's number, the side-projects' numbers, and the **account total**.
- Confirm whether the 5 GB is being reported per-project or account-wide for this account.
- **Finding to record:** the egress split across projects + branches.

**S1 — Attribute medusa-bonsai's own egress.** Decompose its ~4 GB across: (a) the daily backup job, (b)
backend steady-state, (c) the staging branch. Cheap checks: backup dump size × run count (R2 object sizes in
`miyagi-db-escrow/neon/…`), the DB logical size (`\l+` / `pg_database_size`), Cloud Run egress on the backend +
staging services, and Neon's compute-active hours. **Finding:** ranked, quantified causes.

**S2 — Egress-reduction levers (decide which to pull).** Candidate levers, to accept/reject with rationale:
- **Backup:** dump **less often** (daily → 2–3×/week) and/or **compressed** (`pg_dump -Fc` already gz'd?), and/or
  scope to schema+changed data. A weekly cadence roughly **quarters** that contribution. *(Mirrors the
  LEARNINGS cadence rule — "match a job's cadence to its real freshness need.")*
- **Private networking:** move backend↔Neon onto a path that doesn't count as public transfer (Neon
  private networking / keep traffic in-region) — biggest structural win if backend chatter is material.
- **Staging:** pause/scale the staging Neon branch when idle.
- **Idle bleed:** audit backend scheduled jobs / pollers for anything chatty (LEARNINGS already flags
  visibility-gating + cron-cadence wins on the *frontend*; check the backend equivalent).

**S3 — Neon vs Supabase benchmark (written, evenhanded).** Compare on the axes that actually bite *this* project:
egress allowance + overage price, compute/storage model, branching (Neon's clone-cheap superpower vs Supabase's
all-in-one), backup story, and operational overhead. Seed facts (verify current at run time):

| Axis | Neon (Free) | Supabase (Free) |
|---|---|---|
| Monthly egress allowance | **5 GB** (account-level) | **10 GB** (5 GB DB egress + 5 GB cached egress) |
| Overage | metered transfer | DB egress ~$0.09/GB (Pro, after included) |
| Model | pure serverless Postgres; instant branching | Postgres + auth + storage + realtime + APIs |
| Already used here for | **commerce** (Medusa backend) | **non-commerce** (conversations/offers/favorites) |

**Decision target:** keep Medusa on Neon (per the grooming call); state plainly *whether the Neon bet is paying
off for our usage* and *under what trigger we'd revisit* (e.g. "if egress overage > $X/mo or branching goes
unused for N months, reopen a migration spike"). Do **not** plan a commerce-DB migration here.

**S4 — Account-isolation target + migration outline (decision, not build).** Define the end-state:
- **Neon:** medusa-bonsai gets its **own dedicated Neon account/org**; `panfleto-miniflux` + `justread` move to a
  **separate** account. Outline the move (Neon project transfer between orgs vs dump-and-restore), the DSN
  rotation (each consumer's `DATABASE_URL` / `NEON_BACKUP_DSN` in **GCP Secret Manager** — see the
  image-only-deploy + secret-parity LEARNINGS), and the cutover/rollback.
- **Supabase:** define a **dedicated Supabase project per project** as the target; record current sharing and the
  move outline. (No migration executed in this spike.)

**S5 — Analytics/Clarity scope (light).** Audit the **current** Clarity loader: does the base script load
**site-wide** or only on `/vende`? (The `window.clarity?.(…)` optional-chaining implies the loader may be
scoped or conditional.) Decide the smallest change to get **site-wide Clarity + UTM** coverage — almost
certainly a frontend-only, **LOW** chore. Frame it honestly as *visitor/bot visibility on the frontend*, which is
**orthogonal to Neon egress** (see the reframe). Decide go/no-go now vs after S0.

---

## What already exists (reuse, don't rebuild)
- **Backups:** `infra/gcp/backups/{provision-db-backup,db-backup}.sh` + `BACKUPS.md` — the Neon→R2 dump job
  (cadence + targets are env-driven: `BACKUP_TARGETS`, a Cloud Scheduler cron) → tune, don't rebuild.
- **Staging:** `infra/gcp/{provision-staging,deploy-staging}.sh` + `STAGING.md` — the Neon-branch staging path.
- **Secrets/deploy parity:** `infra/gcp/deploy.sh` (image-only deploys preserve env/secrets) +
  `infra/gcp/test/deploy-invariants.test.js` (the static parity guard) — any DSN rotation must keep this green.
- **Clarity:** `app/vende/_components/SellerAcquisitionVariantTag.tsx` (custom-tag calls), `lib/print-qr.ts`
  (GA/Clarity QR tracking) — extend the existing integration; find the base loader before adding a second one.
- **Seller analytics dashboard:** `app/shop/manage/analytics/` already exists (commerce-side, not web traffic).
- **Microsoft Clarity MCP** is connected in this workspace (`list-session-recordings`,
  `query-analytics-dashboard`) — usable to *read* Clarity data once coverage is site-wide.

## In scope (v1 of this spike)
- A **written root-cause** of medusa-bonsai's Neon egress, quantified and ranked.
- A **decision** on which egress levers to pull (cadence / private networking / staging / idle bleed).
- A **Neon-vs-Supabase benchmark** with a keep-on-Neon recommendation + an explicit re-open trigger.
- An **account-isolation target** (dedicated Neon **and** Supabase per project) + a move/rollback outline.
- An **analytics/Clarity scope decision** (site-wide Clarity + UTM, go/no-go + size).

## Out of scope
- **Migrating the commerce DB off Neon** (explicitly deferred; flag-only if Supabase clearly wins).
- **Executing** any account move, DSN rotation, or backup-cadence change (those become the chore epic *after*
  approval of the decision).
- **Building** new analytics tooling beyond extending Clarity (no PostHog/GA4 buildout this run).
- Anything touching commerce data model, Medusa modules, or UCP/MCP surfaces.

## AGENTS five-rules check
No violation. Neon stays the commerce Postgres (rule #1: Medusa owns commerce). Supabase stays non-commerce
(rule #2). No auth/Clerk change (#4). No new bilingual surface (#5) — Clarity is invisible instrumentation. UCP/MCP
(#3) untouched. The only sensitive surface is **HIGH-risk infra**: DB DSNs, backups, Secret Manager — hence the
high risk tier and Daniel-merge on the eventual chore.

## Risk
**High** — the *eventual* work touches DB connection strings, the live backup job, and GCP secrets (account
moves can break prod commerce or the escrow backup). The **spike itself is read-only/LOW** (inspect usage, read
metrics, write a decision). The chore that follows is **HIGH → Daniel executes/merges**, with cutover +
rollback steps and the `deploy-invariants` guard kept green.

## Open risks / unknowns to close in S0–S1
- Are `panfleto-miniflux` / `justread` actually in `org-fancy-pond-57061061`? (If not, the split is pure tidiness.)
- Is the 5 GB enforced per-account or surfaced per-project for this plan? (Changes what "move the others" buys.)
- Is the daily backup the dominant cause, or is it backend steady-state / staging?
- Does Neon offer a private-networking path that wouldn't count as public transfer on our plan/region?
- Does the base Clarity loader already load site-wide, or only on `/vende`?

## Research citations (current as of 2026-06-21)
- Neon plans / **5 GB egress is account-level**: https://neon.com/docs/introduction/plans · https://neon.com/pricing
- Supabase Free **10 GB egress** (5 DB + 5 cached) + overage: https://supabase.com/pricing ·
  https://supabase.com/docs/guides/storage/serving/bandwidth
- Neon vs Supabase 2026 comparison: https://www.closefuture.io/blogs/neon-vs-supabase

## On approval (the spike path)
Emit the **investigation kickoff** (below) — no branch, no build. The spike ends with the *Decision* section
filled in. **Only then** do we groom the follow-on **chore epic** (account separation + backup-cadence tune +
site-wide Clarity) into 09 · Platform & Infra with sprints.

### Investigation kickoff (paste into a session where the Neon/Supabase CLIs are authed)
```
Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
Then read Roadmap/00-ideas/2. readyforscope/db-egress-and-account-strategy.md.

This is a SPIKE — investigation only, no code, no branch. Work S0→S5 in the doc. For each step, run the
authed neonctl / supabase / gcloud commands, record the quantified finding inline, and end by filling a
"## Decision" section: ranked egress root-cause, levers to pull, Neon-vs-Supabase recommendation (keep on
Neon + the re-open trigger), the dedicated-account target + move/rollback outline, and the Clarity
site-wide go/no-go. Validate every number against the live console — do not assume. Then ask Daniel to
approve the decision so the follow-on chore epic can be groomed.
```
