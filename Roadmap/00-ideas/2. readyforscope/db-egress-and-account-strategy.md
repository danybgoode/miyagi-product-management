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

**Status: spike COMPLETE — Decision filled + APPROVED by Daniel 2026-06-21 ("approve as written"). Follow-on chore epic to be groomed. No code in this spike.**
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

## Decision
> **Investigation run 2026-06-21** on Daniel's machine (authed `neonctl` 2.22, `gcloud` 555, Supabase MCP,
> Microsoft Clarity MCP). Every number below was read from the **live console / API**, not assumed.
> **Headline: the doc's prime hypothesis (the daily backup) is _wrong_ — the backup is ~1–2% of egress.
> The real cause is the always‑on backend reading Neon over a cross‑cloud public endpoint.**

### S0 — Account/org membership + egress split (the load-bearing finding)
- **All three projects share one Neon org** `org-fancy-pond-57061061` ("Daniel"):
  `medusa-bonsai` (`shiny-paper-72860331`, AWS **us-east-1**), `panfleto-miniflux`
  (`square-mode-16910372`, AWS us-east-2), `justread` (`curly-pond-03179354`, AWS us-east-1).
  So the side-projects **do** draw from the same pool. (Confirmed via `neonctl projects list` + `orgs list`.)
- **The 5 GB egress allowance is per-organization** — confirmed on Neon's live pricing ("Plans apply per
  organization"), not per-project. The usage email's *"medusa-bonsai 80% (4 GB)"* is that project's own number;
  the cap it threatens is the **org total**.
- **Egress this billing period (2026-06-01 → 07-01, read 06-21 from `GET /projects/{id}.data_transfer_bytes`):**

  | Project | Egress | Share of org |
  |---|---:|---:|
  | **medusa-bonsai** | **4.136 GB** (4,135,864,293 B) | **96.3%** |
  | panfleto-miniflux | 0.159 GB (159,476,840 B) | 3.7% |
  | justread | 0.0002 GB (213,024 B) | ~0% |
  | **Org total** | **4.296 GB** | **85.9% of 5 GB** |

  → medusa-bonsai is essentially the entire number. **Moving the side-projects out frees only ~3.7%** — it's
  an isolation lever, **not** the egress fix (the doc's caveat was right).

### S1 — Attribution of medusa-bonsai's 4.136 GB (ranked, quantified)
1. **Backend steady-state reads — ~97–98% (~4.0 GB, ~190 MB/day). THE root cause.** `medusa-web` Cloud Run runs
   `minScale: 1` (always ≥1 instance) → a **permanent Neon connection pool + background loops** (Medusa
   scheduled jobs, event-bus polling, the `livenessProbe GET /health` every 30 s) keep the Neon **main** endpoint
   `active` ~**84%** of the period (`active_time` 1,531,062 s of 504 h; autosuspend default never reached). Every
   query result is egress. **Cross-cloud**: backend is GCP **us-east4**, Neon is AWS **us-east-1**; the VPC
   connector is `private-ranges-only`, so Neon traffic takes the **public** path (counts as public transfer).
   Storefront/bot/CI traffic adds to this at the FE→Cloud Run→Neon hop (every uncached Store-API read cascades to
   Neon). **Projection: ~190 MB/day × 30 ≈ 5.7 GB/mo → would exceed the 5 GB cap. Action needed.**
2. **Daily backup — ~1–2% (~tens of MB). HYPOTHESIS OVERTURNED.** The job *is* live (Cloud Run Job `db-backup`,
   Scheduler `db-backup-daily` ENABLED `0 9 * * *`, 10 runs this period since it went live 06-12 — so
   `BACKUPS.md`'s "not yet live" status line is **stale**). But the commerce DB is nearly empty of row data: the
   **neon dump is 179,822 bytes gzipped** (~176 KB; the 43.3 MiB logical size is mostly empty Medusa
   schema/indexes). Even uncompressed the per-run wire read is a few MB → **~tens of MB total, not gigabytes.**
   The doc's "DB ~130 MB × 30 ≈ 4 GB" math assumed a DB ~3× larger than reality and a backup running all month;
   neither holds.
3. **Staging branch — negligible.** The `staging` Neon endpoint is **idle/suspended** (2 active-hours all period,
   1,889 cpu-s); `medusa-web-staging` is scale-to-zero. Not a contributor.
4. **Side-project bleed — 3.7% (panfleto) + ~0 (justread).** Real but small. `panfleto-miniflux` polls feeds
   continuously (362 active-hours) so its egress will **grow**; that's the case for isolating it (S4), not for
   blaming it now.

### S2 — Egress levers (accept / reject)
- **A. Reduce read volume via caching — ACCEPT (biggest controllable, free lever).** Add ISR / CDN / route-level
  caching to the storefront + the Store-API reads so repeated catalog/PDP/bot/CI reads stop cascading to Neon.
  This is the read-side mirror of the LEARNINGS visibility-gate/cron-cadence wins.
- **B. Quiet the always-on backend — ACCEPT (investigate at grooming).** Audit Medusa scheduled-job + event-bus
  poll cadence, and **reconsider `minScale: 1`**. `minScale: 0` (or min=1 only during business hours) lets both
  the backend and the Neon compute idle when truly quiet — directly attacking the ~190 MB/day "no shoppers"
  bleed (and cutting Cloud Run cost). **Tradeoff for Daniel:** Medusa cold-start latency (~10–30 s) on the first
  storefront hit after idle. Reasonable to trial given current near-zero traffic.
- **C. Backup cadence (daily→weekly) — REJECT as an egress fix.** Backup is ~1–2%; quartering it saves a rounding
  error and costs RPO. Keep daily.
- **D. Private networking — REJECT (does not exist for this topology).** GCP Cloud Run ↔ AWS-hosted Neon is
  **cross-cloud**; Neon PrivateLink is AWS-VPC-only and cannot reach GCP. The only "in-region private" path would
  require co-locating the DB on GCP = a migration (**out of scope**).
- **E. Staging / idle branches — ACCEPT (minor/tidy).** Already scale-to-zero; keep. Optionally delete the idle
  `s2-drill-prerestore-20260611` + archived `dev`/`prewipe-backup` branches (storage tidiness, not egress).
- **F. Account split — ACCEPT as isolation, not as the fix.** See S4.

### S3 — Neon vs Supabase benchmark + recommendation
Current pricing, verified live 2026-06-21:

| Axis | Neon (Free) | Supabase (Free) |
|---|---|---|
| Monthly egress | **5 GB**, **per-org** (soft cap + email warnings) | **10 GB** = 5 GB DB + 5 GB cached, per-org |
| Next tier | **Launch** — 500 GB included, then **$0.10/GB** (~$19/mo) | **Pro** — 250 GB DB ($0.09/GB over) + 250 GB cached ($0.03/GB over) |
| Model | pure serverless Postgres; **instant cheap branching** | Postgres + auth + storage + realtime |
| Used here for | **commerce** (Medusa) | **non-commerce** (conversations/offers/favorites) |

- **Recommendation: KEEP Medusa on Neon.** The bet is paying off for *how we use it*: Neon's cheap branching is
  what made the S2 escrow drill (`s2-drill-prerestore`) and the `staging` branch cheap and real — they exist and
  are used. The egress problem is a **read-pattern mechanism, not an allowance shortfall**; moving DBs would only
  buy headroom, not fix the uncached-reads cause. And the natural escalation is **Neon Launch ($19/mo, 500 GB)**,
  which obliterates the 5 GB cap outright — so the true choice is "fix reads for free (levers A+B)" vs "pay $19/mo
  to paper over it." Fix reads first.
- **Re-open trigger (write it down):** reopen a commerce-DB migration spike **only if** — after pulling levers
  A+B — projected egress still exceeds 5 GB/mo for two consecutive months *and* we're unwilling to pay Launch,
  **or** Neon branching goes genuinely unused for 3 months (the feature we're paying the bet for). Absent those,
  stay on Neon.

### S4 — Account-isolation target + move/rollback outline
- **Neon — DO the split, and it's lower-risk than the doc assumed.** Target: `medusa-bonsai` keeps its own
  dedicated org (it already dominates the current one); move `panfleto-miniflux` + `justread` to a **separate**
  org. **Mechanism = Neon project transfer between orgs** (Console → project → *Transfer*, or API
  `POST /projects/{id}/transfer`) — **no dump/restore, and the endpoint host/DSN is unchanged on transfer**, so
  there is **no `DATABASE_URL`/`NEON_BACKUP_DSN` rotation** and the `deploy-invariants` guard stays green untouched.
  **Rollback:** transfer the project back (same operation, reversible). **Verify at execution:** Neon free-tier
  org-count / project-limit before the move (create the destination org first). Benefit: frees 3.7% now + protects
  medusa-bonsai's headroom from miniflux's growing poll traffic.
- **Supabase — ALREADY in the target state. No move.** medusa-bonsai's Supabase (`bonsaiClerk`, the **sole**
  project in the **sole** org `ptxoabqfllswvpbxadyj`) is already isolated; the side-projects are **not** on this
  Supabase account. The "dedicated Supabase per project" goal is satisfied for medusa-bonsai today — just record it.

### S5 — Analytics / Clarity go/no-go
- **Validated state: Clarity is NOT installed at all** — there is **no base loader** anywhere (`app/layout.tsx`,
  `lib/*` clean; the only reference is `/vende`'s `SellerAcquisitionVariantTag` firing `window.clarity?.('set',…)`
  **no-ops**, and `lib/print-qr.ts`'s comment *"analytics already wired site-wide"* is **aspirational/false**).
  The Clarity dashboard confirms it: **1 session / 1 page-view in 30 days.** So this is a genuine **install**, not
  the "extend partial wiring" the doc assumed.
- **Honest framing:** Clarity measures **frontend human visitors** and is **orthogonal to Neon egress** (which is
  the Cloud Run→Neon hop). It will **not** reduce the number. (Minor diagnostic value only: visitor/bot volume
  hints at how much storefront traffic cascades into uncached Neon reads, informing lever A.)
- **GO — but decoupled and de-prioritized behind the egress fix.** Smallest change: add the Clarity base loader
  **once** in `app/layout.tsx` (Next `<Script afterInteractive>`), gated to exclude white-label / embed / checkout
  / dashboard via the **existing layout channel detection** (the seasonal-theme reuse pattern), keep the UTM
  tagging, and fix the stale "wired site-wide" comment. **LOW, frontend-only.** Sequence it after S0/S1 levers
  since it touches no egress.

### Net recommendation (one paragraph for Daniel)
The Neon alert is **not traffic and not the backup** — it's the **always-on Medusa backend (`minScale:1`) reading
Neon over a cross-cloud public endpoint ~190 MB/day**, projecting to ~5.7 GB/mo against a 5 GB org cap. **Keep
commerce on Neon.** The free fix is two read-side levers: **(A) cache storefront/Store-API reads** so repeats
don't hit Neon, and **(B) trial `minScale:0` + audit backend job cadence** so it idles when quiet. Backup, staging,
and private-networking are non-levers (negligible / cross-cloud-impossible). Do the **Neon org split** for
isolation (cheap, reversible, no DSN change); **Supabase is already isolated**. Install **site-wide Clarity** as a
separate LOW frontend chore — useful for visibility, but it answers a different question than egress. If levers
A+B don't hold us under 5 GB, the escalation is **Neon Launch ($19/mo, 500 GB)**, not a migration.

### Follow-on chore epic (to groom on approval — 09 · Platform & Infra)
- **S-cache (LOW–MED, frontend):** ISR/CDN caching on storefront + Store-API reads.
- **S-backend-quiet (MED, backend/infra, Daniel-merge):** `minScale` trial + job-cadence audit; measure egress delta.
- **S-neon-split (MED, infra, Daniel-executes):** transfer `panfleto-miniflux` + `justread` to a new org (host stable).
- **S-clarity (LOW, frontend):** site-wide Clarity loader (channel-gated) + UTM + comment fix.
- **S-housekeeping (LOW):** delete idle drill/dev/prewipe branches; refresh stale `BACKUPS.md` status line.

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
