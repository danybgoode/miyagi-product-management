# GCP account migration — Sprint 3: the cutover

**Status:** ✅ executed 2026-07-19 (~18:20 UTC) — Daniel opened the window and approved across the
board; the DNS flip and new-DB swap each got an additional explicit named confirmation in-session.
**Held open for Daniel's owed steps: real-money checkout (walkthrough step 6), Stripe/MP dashboard
webhook-delivery check (step 7), signed-in session check (step 4), next-morning cron check (step 11).**

**Story 3.1 record:** final export 179s (`--offload`, zero prod load) → new-instance DB swap
(terminate rehearsal-pool backends via server-side SQL import → drop → create → import) 42s.
**Total data window ≈ 3.7 min, matching the S1 measurement.** Row counts final-vs-rehearsal dump:
**identical on all 154 tables** — zero writes occurred between rehearsal and cutover, nothing lost.
`medusa-web` bounced (`00002-fjj`) and verified serving the final data before the flip. Flip via
`cloudflare-cutover-flip.mjs --apply`: all 4 records (apex/wildcard/www/api) → `136.69.97.223`,
pre-flip snapshot committed alongside this doc as **`cutover-dns-snapshot.json`** (moved out of the
ephemeral session scratchpad 2026-07-20 — it is the machine-readable input to
`cloudflare-cutover-flip.mjs --rollback`, so a `/tmp` sweep must not be able to delete it; contains
record ids + the old ALB IP only, no credentials).

> ⚠️ **The rollback is no longer loss-free, and gets less so every day** (assessed 2026-07-20).
> A DNS-only rollback returns traffic to the old project's Cloud SQL, which is frozen at the
> 18:20Z cutover — **everything written to the new DB since is not there.** Measured at T+15h:
> 370 writes, all non-money (209 listing-view counters, 160 cart-scan rows, 1 autoconfirm cron),
> so today's exposure is genuinely low. **But the moment a real order lands, DNS-only rollback
> becomes a money-losing action.** From then on the rollback procedure is: export new → import
> old → *then* flip DNS (≈4 min, the same measured path as the cutover), not a bare flip.
Post-flip: homepage/www/PDP 200, `api.miyagisanchez.com/health` 200 **through the ALB** (first time
— previously the domain-mapping CNAME), UCP catalog 20 items, and the new project's `miyagi-web`
logs show the real hostname traffic. Old project untouched and intact = rollback.

**Story 3.2 record:** **webhooks needed ZERO repointing** — verified via Stripe API: both live
endpoints are domain-based (`miyagisanchez.com/api/webhooks/stripe`,
`api.miyagisanchez.com/hooks/payment/pp_stripe-connect_stripe-connect`) and the domains moved with
the flip; signing secrets were copied unrotated, same endpoint objects. ML redirect URI domain-based
likewise. MP uses backend-generated per-preference notification URLs — Daniel eyeballs the MP
dashboard at his money smoke. Automation swapped atomically: new triggers ENABLED (2) / old
DISABLED (3, staging included); new schedulers RESUMED (6) / old PAUSED (6). Docs sweep done same
change: 46 old-project-id references across 32 infra/runbook files + billing/identity references →
`miyagisanchez-prod` / `lolis-profile` / `019B4F-8DBBBA-3EE80C` (the one remaining leroytramafat
mention deliberately documents the rollback). Suite 147/147.

**Deviations from the walkthrough:** none in substance; the "write-quiet state" proved unnecessary
(zero traffic writes in the window, proven by identical dumps rather than assumed).

> **Approved runbook change (Daniel, 2026-07-19): `api.miyagisanchez.com` moves onto the ALB.**
> Today `api.` is a **DNS-only CNAME → `ghs.googlehosted.com`** (Cloud Run domain mapping in the
> old project — a single-project claim that cannot pre-exist in the new one). The new project's
> ALB already carries the approved host rule `api.miyagisanchez.com → medusa-web-backend`
> (provision-alb-frontend.sh §6b, provisioned dark). At the flip, `api.` becomes a **proxied A
> record → the NEW ALB IP `136.69.97.223`** — same edge pattern as the apex. The old domain
> mapping is left in place, orphaned (delete at S4).
>
> **Flip-tool gap to close before the window:** `cloudflare-cutover-flip.mjs` flips apex +
> wildcard only. Live zone truth (read 2026-07-19): apex, `*.`, AND an explicit **`www`** A record
> all sit at the old ALB IP `136.68.90.56` proxied; `api.` is the DNS-only CNAME above. The S3
> flip must cover **four** records — apex, wildcard, www (content swap), and api (CNAME→A +
> proxied flip) — extend the script (its snapshot/rollback shape already fits) rather than
> hand-editing DNS. Old ALB IP `136.68.90.56` is the rollback content for all four.
> New-project measured sync window (S1.2): **export 178s + import 19s ≈ 3.5 min** write-quiet.

> 🔴 **The only user-visible sprint in this epic. Daniel picks the window and merges.**
>
> **Preconditions — all must be true before this sprint starts:**
> - Sprints 0–2 complete; `infra/gcp/test/*` green against the new project.
> - The **measured** sync duration from Story 1.2 is written down. That number is the window.
> - The old project is fully intact and stays running throughout. **It is the rollback.**
> - Daniel is available for the real-money checkout (step 6 below) — not "will check later."

## Stories

### Story 3.1 — Final DB sync + origin flip
**As** a buyer, **I want** the site to keep working across the move, **so that** I never know it
happened.
**Acceptance:** final Cloud SQL sync into the new instance (old project put into a brief write-quiet
state per the runbook, per the measured window); Cloudflare origin flipped to the new Cloud Run
services **via `infra/gcp/cloudflare-cutover-flip.mjs`** — the built and tested tool from the
2026-07-10 cutover. **Never hand-edit DNS.** `cloudflare-cutover-flip.test.mjs` green.
Row counts on key commerce tables match pre- and post-cutover.
**Risk:** **HIGH — Daniel merges.**

### Story 3.2 — Repoint the integrations; flip the automation
**As** the team, **I want** every external caller and every cron pointing at exactly one project,
**so that** nothing double-fires and no webhook lands nowhere.
**Acceptance, in this order:**
1. Stripe webhook endpoint → new origin. Mercado Pago webhook → new origin. Mercado Libre
   `ML_REDIRECT_URI` → new origin.
2. New Cloud Build triggers **enabled**; old triggers **disabled** — in the same change.
3. New schedulers **resumed**; old schedulers **paused** — in the same change.
4. `infra/gcp/README.md` and `tasks/backend-recovery-runbook.md` updated to name the new project.
**Verify in the providers' own dashboards** that webhooks are delivering 200s — our logs showing no
errors is not the same as Stripe showing successful delivery.
**Risk:** **HIGH — Daniel merges.**

## Rollback

Re-run `cloudflare-cutover-flip.mjs` against the **old** origin, re-enable the old triggers, resume
the old schedulers, repoint the three webhooks back. The old project is untouched and still running,
so this is minutes, not hours. **This is why Sprint 4 is a separate, deferred sprint** — do not
decommission anything in this one.

## Sprint QA
- **Deterministic:** `infra/gcp/test/*` all green against the new project before the flip.
- **No backend preview** — post-flip prod smoke is the confirmation (WAYS-OF-WORKING §5). The agent
  owns the API-level checks; Daniel owns the money path.
- **Owed to Daniel, by name:** the real-money checkout (step 6), the go/no-go on the window, and
  both merges. An agent must not ship a real-money path to production on its own.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com — **now served by the new project**

1. Open `https://miyagisanchez.com`.
   → Homepage renders, listings load.
2. Run `curl -sI https://miyagisanchez.com` and `curl -s https://api.miyagisanchez.com/health`.
   → Both 200. Confirm via `gcloud run services list --project=<new-project-id>` that traffic is
   being served by the **new** services.
3. Open a listing PDP, then a shop page `https://miyagisanchez.com/s/<a-shop>`.
   → Both render with real data.
4. Sign in as an existing user.
   → **Session works without re-authenticating from scratch** — this is the check that proves the
   secrets were copied, not rotated.
5. Run `curl -s https://miyagisanchez.com/api/ucp/catalog | jq '.items | length'`.
   → Non-zero, and row counts match the pre-cutover record.
6. **(money path — Daniel)** Add an item to cart → checkout → pay with a real card → confirm the
   order confirmation email arrives and the seller's order screen shows the order.
   → Completes end to end. **This is the step that cannot be automated and cannot be skipped.**
7. In the **Stripe** dashboard, check recent webhook deliveries.
   → 200s against the new origin. Repeat in the **Mercado Pago** dashboard.
8. Run `gcloud scheduler jobs list` against **both** projects.
   → New: all four ENABLED. Old: all four PAUSED. Exactly one project is running crons.
9. Run `gcloud builds triggers list` against **both** projects.
   → New: enabled. Old: disabled.
10. Push a trivial docs commit to `main` in one repo.
    → Exactly **one** build fires, on the new project. Confirm with
    `gcloud builds list --region=us-east4 --project=<new-project-id>`.
11. Next morning: confirm the daily cron jobs ran once (not twice) and the daily prod smoke is green.

If any step fails, note the step number + what you saw — that's the bug report. **If steps 6, 7, or
8 fail, roll back rather than debugging forward** — those are money and double-fire paths.
