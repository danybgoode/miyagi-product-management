---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: flag-provider-mandate
build_order: 5
title: "Golden Frijoles is the only flag surface — activate, retire the second lane, label the mirror"
area: 09-platform-infra
risk: high
type: chore
phase: Shipped
sprints_total: 2
stories_total: 7
---

# Epic: Golden Frijoles is the only flag surface — activate, retire the second lane, label the mirror

> **Area:** 09-platform-infra · **Risk:** high · **Class:** Chore · **Archetype:** Sweeper · **Scope seed:** [`00-ideas/seeds/flag-provider-mandate.md`](../../00-ideas/seeds/flag-provider-mandate.md)
> **Appetite:** M (one wave — architect session + builder fan-out + one review round) · **Bet:** [`bets/wave-2026-09-16.md`](../../bets/wave-2026-09-16.md)

> **Rescoped 2026-09-17.** This epic was originally written as *"build a cutover to Golden"*. **That
> was wrong** — the cutover is fully built and production already runs on it. The template/plugin half
> moved to [`dobby-foundation` → `golden-flags-by-default`](https://github.com/danybgoode/dobby-foundation/tree/main/Roadmap/09-platform-infra/golden-flags-by-default),
> where a distributable product belongs. What is left here is Miyagi's own work: **finish it, then
> delete the second lane.**

## Why — the actual current state, measured

The product owner sees **two flag lists** and is, in their words, *"0% sure where to manage
anything."* Reading the code, the two lists are **the same data in two windows, not two providers**:

- **`/admin/flags` already reads and writes Golden.** `app/api/admin/flags/route.ts` calls
  `setGoldenAdminFlag`; its own comment says it *"never writes `platform_flags` directly"*, and when
  Golden is unreachable the page shows nothing rather than falling back to a local value.
- **Production already serves from Golden.** `LEARNINGS.md` records
  `GOLDEN_BEANS_FLAG_CUTOVER = *=golden` (2026-07-31, `owned-shop-operating-channel`).
- **Definitions already sync.** `apps/miyagisanchez/scripts/sync-flag-catalog.ts` and
  `apps/backend/src/lib/flag-definition-sync.ts` exist.

**So what is actually broken is one thing: the flags were never *activated* in Golden.** Golden's own
console measured production at **39 never-activated / 3 on / 0 off**, and `off` is **zero in every
environment** — nobody has ever deliberately switched anything off anywhere.

That is the whole mystery. *"Never turned on here"* does not mean off; it means **no activation row
has ever existed**, which is a different fact from a deliberate kill (which keeps the row, nulls the
version, and writes an audit entry with an actor and a reason). And with `*=golden` and no activation
row, `createFlagProvider` finds nothing to serve, so the evaluator walks its fallback chain —
durable mirror → `platform_flags` → compile-time default. **The behaviour you get is the fallback's,
not Golden's, while the console you manage in is Golden's.** Two windows, one of which is not
currently deciding anything.

A second hazard sits underneath: `parseFlagCutover` resolves **any** malformed or unset manifest to
`local`, silently. One typo in an env var moves the entire commerce path back to `platform_flags`
with no error anywhere.

After this epic: Golden holds the activations, Golden decides, there is no second lane to fall back
to, and `/admin/flags` is an honestly-labelled read-only mirror.

## Platform-first note

**Nothing new gets built.** Every mechanism exists — the provider, the mirror, the sync script, the
admin route, the three-mode evaluator. This epic **activates what is there and then deletes the
half that is no longer wanted.** The largest risk is ordering, not construction.

## What already exists (reuse, don't rebuild)

- `apps/miyagisanchez/lib/golden-flag-{provider,mirror,mirror-store,admin,read-key-routing}.ts`
- `apps/miyagisanchez/lib/flag-provider-evaluator.ts` — the three-mode orchestration
- `apps/miyagisanchez/lib/{flag-cutover,flag-provider-mode}.ts` — **the things to delete at the end**
- `apps/miyagisanchez/scripts/sync-flag-catalog.ts` + `apps/backend/src/lib/flag-definition-sync.ts`
- `apps/miyagisanchez/app/(shell)/admin/flags/` + `app/api/admin/flags/route.ts`
- `apps/*/lib/flag-catalog.ts` — the typed inventory both repos share
- `golden-beans` `/app/flags/<project>` — the surface that becomes the single place to manage

## Architecture decisions to lock before any builder starts

- **D1 — measure before touching anything.** Read the live env in **both** runtimes (Vercel for the
  frontend's remaining surfaces, Cloud Run for `miyagi-web`) and record the actual
  `GOLDEN_BEANS_FLAG_CUTOVER` / `GOLDEN_BEANS_FLAG_PROVIDER_MODE` values in this file. LEARNINGS says
  `*=golden`; **a doc is not a measurement.**
- **D2 — can the admin credential actually write?** LEARNINGS (2026-07-31) records
  `GOLDEN_BEANS_FLAG_ADMIN_KEY` as read-only for administration: `GET /api/v1/flags/admin` → 200,
  `POST` with the same bearer → 401. If that still holds, **the toggle in `/admin/flags` is
  decorative** and Story 1.2 is the real unblock. Verify; don't assume it was fixed.
- **D3 — activation order is the safety property.** Activate in Golden **before** removing any
  fallback. A flag with no activation row, once the fallback is gone, resolves to its compile default
  — which for a `killswitch` is ON and for an `enablement` is OFF. Removing the lane first would flip
  live behaviour silently.
- **D4 — polarity must survive activation.** Each flag's Golden activation has to reproduce its
  current effective value, not its default. Derive the current value from the live fallback chain per
  environment and assert it, per flag, before and after.
- **D5 — `/admin/flags` becomes read-only, labelled, and linked out.** The product owner's call. It
  stops being a writer so there is exactly one place to manage; it keeps existing so the operational
  view inside Miyagi survives.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Measure the live cutover config in both runtimes and record it | low |
| 1 | 1.2 Prove (or repair) the Golden admin write credential | high |
| 1 | 1.3 Activate every flag in Golden, in every environment, preserving effective values | high |
| 1 | 1.4 Prove the runtime is reading the Golden activation, not the fallback | high |
| 2 | 2.1 `/admin/flags` becomes a labelled read-only mirror that links out to Golden | low |
| 2 | 2.2 Delete `local`/`shadow`, `flag-cutover.ts`, `flag-provider-mode.ts` and the observers | high |
| 2 | 2.3 Park `platform_flags`, delete `scripts/flags.mjs` | high |

## Deploy order

1. **Sprint 1 changes no code paths** — it measures, repairs a credential, and creates activation rows
   in Golden. Reversible by deactivating.
2. **Sprint 2.2 only after 1.4 is green.** Deleting the fallback while a flag has no Golden activation
   is how checkout changes behaviour silently.
3. **2.3 parks the table, it does not drop it.** `platform_flags` stays unread for one wave as the
   rollback, then a follow-up chore drops it.

Branches stack: `feat/flag-provider-mandate` → `-s2`.

## Outcome — shipped 2026-09-23

**The premise was half right.** Activations *were* missing, but in the project the product owner
manages (`miyagisanchez`). Production was reading a different, legacy catalog, and its read key had
**expired** (Golden mints 30-day keys). So from ~2026-08-27 every decision came from the durable
mirror, while both consoles looked healthy. The product owner chose `miyagisanchez` as the one
project. All 42 flags were activated there at their live values, the key was switched, and the
second lane was deleted in both apps. `/admin/flags` is now a read-only mirror. Records:
[sprint-1.md](sprint-1.md) · [sprint-2.md](sprint-2.md) · [RETROSPECTIVE.md](RETROSPECTIVE.md).

**Found and fixed on the way:** the backend had not deployed since 2026-09-04 (an interactive
`db:migrate` link prompt with no TTY). Fixed in [#195](https://github.com/danybgoode/medusa-bonsai-backend/pull/195).

## Definition of Done (epic) — ✅ closed 2026-09-23
- [x] All sprints merged to `main` + smoke-tested (gaps stated). Frontend #423 `c2754c6`
      (`miyagi-web-00143-rr7`), backend #194 `cf6cb3b` (`medusa-web-00086-9wd`), root `66ebed8`.
      Agent-run live checks are in sprint-2.md. The product-owner-only smokes are listed under Gaps in
      the retro.
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Poster (`Roadmap/README.md`) updated · team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md`, including the correction to the
      2026-07-31 "no sync script" line.
- [x] **Kill-switch: carve-out.** The safety property was the ordering (activate in Golden →
      verify `source: golden` → seed the new mirror lane → only then delete the fallback), plus
      parking `platform_flags` rather than dropping it.
- [x] **"Never turned on here" is ~0 in every environment:** `gf flags ls` shows 0 "never" cells in
      development, preview and production (was 39).
- [x] **One place to manage:** `/admin/flags` cannot write (POST/PUT/DELETE → 405, live); Golden's
      console (and `gf`) is the only writer.
- [x] **No env var can silently change the answer:** `local`/`shadow` are gone, and the source sweeps
      in both apps fail if `GOLDEN_BEANS_FLAG_CUTOVER`/`…PROVIDER_MODE` is read again.
- [x] Feature branches deleted; frontmatter `status: shipped` (run `node scripts/build-order.mjs`)
