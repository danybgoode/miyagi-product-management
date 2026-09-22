---
epic: flag-provider-mandate
sprint: 1
title: Measure, repair the write path, activate
risk: high
phase: Locking architecture
stories_total: 4
stories:
  - id: S1.1
    title: Measure the live cutover config in both runtimes
    as_a: the product owner
    i_want: the actual serving configuration written down
    so_that: "\"where are flags managed\" has a measured answer instead of an inferred one"
    risk: low
    status: in-progress
  - id: S1.2
    title: Prove (or repair) the Golden admin write credential
    as_a: an operator
    i_want: "the toggle in `/admin/flags` to actually work"
    so_that: "a control surface isn't decorative"
    risk: high
    status: planned
  - id: S1.3
    title: Activate every flag in Golden, in every environment
    as_a: the product owner
    i_want: every flag to have a real activation in Golden
    so_that: "\"Never turned on here\" stops being the answer for 39 of 42 flags and the console tells the truth"
    risk: high
    status: planned
  - id: S1.4
    title: Prove the runtime reads the Golden activation, not the fallback
    as_a: the product owner
    i_want: evidence that Golden is deciding
    so_that: Sprint 2 can delete the fallback without changing behaviour
    risk: high
    status: planned
---
# Golden Frijoles is the only flag surface — Sprint 1: Measure, repair the write path, activate

**Status:** ⬜ not started

**Epic:** [Golden Frijoles is the only flag surface](README.md) · **Risk: HIGH — the product owner merges** (these flags gate checkout)

**This sprint changes no code paths.** It measures the live configuration, repairs the admin write
credential if it is still read-only, and creates the activation rows in Golden that have never
existed. Everything here is reversible by deactivating.

**Why it exists:** production runs `*=golden`, definitions sync, and `/admin/flags` already writes to
Golden — yet **39 of 42 flags in production have no activation row**, so the provider finds nothing to
serve and the evaluator falls through to the durable mirror, then `platform_flags`, then the
compile-time default. The console you manage in is not currently the thing deciding.

## S1.1 record — measured 2026-09-22 (the premise is partly wrong; sprint paused to reshape)

**Commands:** `gcloud run services describe {miyagi-web,medusa-web} --project miyagisanchez-prod
--region us-east4` (env), `curl` against `https://golden-beans-gamma.vercel.app/api/v1/flags/{admin,snapshot}`
with the two production secrets, and `gcloud logging read` over the `[golden-beans:flag-authority]`
control-plane records since 2026-09-15.

| Fact | miyagi-web (frontend) | medusa-web (backend) |
|---|---|---|
| `GOLDEN_BEANS_FLAG_CUTOVER` | `*=golden` | `*=golden` |
| `GOLDEN_BEANS_FLAG_PROVIDER_MODE` | unset | unset |
| `GOLDEN_BEANS_FLAG_ENVIRONMENT` | `production` | `production` |
| Decision `source` in live logs | `durable` ×94 (snapshot v47), `durable` ×1 (scoped lane, v5) | `golden_durable` ×242 (v47), `local` ×12 |
| Last `source: golden` record | 2026-08-27T21:20Z | — |

Vercel no longer serves either app (both are Cloud Run, per the deploy topology), so there is no
Vercel half to read.

**Findings — each one changes the plan:**

1. **The production read key is rejected.** `GET /api/v1/flags/snapshot` with
   `GOLDEN_BEANS_FLAG_READ_KEY` → **401 "Invalid flag read credential"**. Both services have therefore
   served **every** flag from the durable mirror since ~2026-08-27, not from live Golden. That is the
   real "Golden is not deciding" defect. A change made in Golden's console today would **never reach
   production**, because no instance can fetch a newer snapshot than v47.
2. **The mirror is current, by luck.** Golden's production admin snapshot is also **v47**, so the values
   served today match Golden's. The next Golden change is the one that silently fails to apply.
3. **"39 never-activated" does not describe the project production reads.** The admin credential's
   project (`GET /api/v1/flags/admin` → 200) holds **41 flags, all with a production value** (40 on,
   `shipping.envia_enabled` off). `golden-flag-read-key-routing.ts` records a *second*, owner-visible
   Golden project (a new catalog that started its own snapshot). The console showing 39 "never" is most
   likely **that** project. So the two windows really are two projects, which the epic's premise ruled out.
4. Backend `local ×12` records (`ml.sync_enabled`) — not yet explained; to trace in S1.4.

**Blocked for this session (needs the product owner):** the auto-mode classifier refused (a) the
production-database reads needed to derive per-flag effective values from `platform_flags` and the
Golden tables (D4), and (b) inspecting the secret itself. Reissuing the read key is a credential
mutation, and the lean-pass memory puts that outside a blanket "carry on".

## Stories

### Story 1.1 — Measure the live cutover config in both runtimes
**As the** product owner, **I want** the actual serving configuration written down,
**so that** "where are flags managed" has a measured answer instead of an inferred one.
**Acceptance:** per **D1**, the real values of `GOLDEN_BEANS_FLAG_CUTOVER` and
`GOLDEN_BEANS_FLAG_PROVIDER_MODE` are read from **both** the Vercel project and the Cloud Run service
(`miyagi-web`) and recorded in this file with the date and the command used. If they disagree between
runtimes, or with `LEARNINGS.md`'s `*=golden`, **that discrepancy is the finding** and the sprint
stops to reshape. `scripts/vercel-env.mjs` is the reliable reader for the Vercel half — the CLI
silently stores empty values and `vercel env pull` redacts them.
**Risk:** low

### Story 1.2 — Prove (or repair) the Golden admin write credential
**As an** operator, **I want** the toggle in `/admin/flags` to actually work,
**so that** a control surface isn't decorative.
**Acceptance:** per **D2**, `POST /api/v1/flags/admin` with Miyagi's `GOLDEN_BEANS_FLAG_ADMIN_KEY` is
exercised against a throwaway flag. If it returns 401 — as `LEARNINGS.md` recorded on 2026-07-31,
*"GET returns 200 while POST with the same bearer returns 401"* — the credential is reissued with
write scope from Golden's console and re-verified. The result either way is written here.
**Risk:** high — **if this is still 401, it is the root cause of the whole confusion** and every later
story depends on it.

### Story 1.3 — Activate every flag in Golden, in every environment
**As the** product owner, **I want** every flag to have a real activation in Golden,
**so that** "Never turned on here" stops being the answer for 39 of 42 flags and the console tells
the truth.
**Acceptance:** per **D4**, each flag's **current effective value is derived from the live fallback
chain, per environment, and recorded first** — then reproduced as its Golden activation. Not its
compile default: its *effective* value. Development, preview and production are each done and each
verified. Afterwards Golden's console shows ~0 in the "never" state for this project.
**A flag whose effective value cannot be determined is a stop, not a guess.**
**Risk:** high

### Story 1.4 — Prove the runtime reads the Golden activation, not the fallback
**As the** product owner, **I want** evidence that Golden is deciding,
**so that** Sprint 2 can delete the fallback without changing behaviour.
**Acceptance:** for a sample across polarities, flipping the flag **in Golden** changes live
behaviour within the snapshot TTL, and the `flag-authority` control-plane record reports
`source: 'golden'` rather than `'fallback'` or `'durable'`. The evidence — flags sampled, records
observed — is written into this file. **This is the gate on Sprint 2.2.**
**Risk:** high

## Sprint QA
- **api spec(s):** a parity spec asserting each flag's effective value is unchanged before vs. after
  activation, per environment; a spec asserting `flag-authority` reports `golden` for the sampled
  flags; the existing fail-open specs on the checkout guards must stay green throughout.
- **browser smoke owed:** **yes, to the product owner by name** — the money path, and the
  `/admin/flags` toggle round-trip.
- **deterministic gate:** `tsc --noEmit` + `npm run build` (both apps) + `medusa build` + unit +
  Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com · https://golden-beans-gamma.vercel.app

1. Open this file's Story 1.1 record.
   → The real cutover value is written down, with the date and both runtimes named.
2. Open https://golden-beans-gamma.vercel.app/app/flags/<miyagi-project>.
   → The "never turned on here" count is ~0, not 39. Every flag shows on or off in every environment.
3. Compare that list against https://miyagisanchez.com/admin/flags.
   → Same flags, same states. *(They are the same data — this step is confirming the two windows
     finally agree, which they could not while activations were missing.)*
4. In **Golden's** console, toggle a low-risk flag off.
   → Within the snapshot TTL the live site reflects it, and `/admin/flags` shows the new state too.
5. Toggle it back on from **`/admin/flags`**.
   → It round-trips. *(If this fails with a 401, Story 1.2 was not done.)*
6. Check the `flag-authority` control-plane records for the flag you toggled.
   → `source: 'golden'`. **Not `fallback`, not `durable`.**
7. (money/auth path — **owed to the product owner by name**) Complete a real test-mode checkout.
   → Order completes; the coordinated-delivery and payment-rail guards behave exactly as before.
8. Stop Golden from being reachable briefly (revoke the read key).
   → The site **stays up** and checkout does not error — the fallback is still present in Sprint 1 and
     this is the last time that is true. *(Restore immediately.)*

If any step fails, note the step number + what you saw — that's the bug report.

**Steps 2 and 6 are the sprint.** Everything else confirms nothing regressed while they happened.
