# Sprint 4 — browser-smoke fixtures stop rotting

**Status:** 🟦 In review · PR [#370](https://github.com/danybgoode/miyagisanchezcommerce/pull/370)

## The nightly went red, and it was not the gallery

A nightly routine opened #370 diagnosing three failing PDP-gallery specs as stale fixture secrets.
That diagnosis was **correct** and its remedy — better error text — was **not enough**.

**The validated root cause.** At 03:45 UTC on 2026-08-15 an admin deleted two shops through
`/admin/tenants` — `prueba` ("Porque no existe") and `ricas-tortas` ("No se qué es") — using the
tenant-lifecycle delete that had shipped the day before. Both rows are in `admin_audit_log`; this is
read from the record, not inferred. The two gallery fixture secrets pointed at listings on those
shops. Five hours and thirty-eight minutes later the nightly reported it as a gallery regression.

The feature worked correctly. The smoke was collateral. Confirmed against production: both ids 404,
a control listing 200s.

## Story 4.1 — the fixture is discovered, not pinned

> **As** the team, **I want** browser-smoke fixtures to survive routine data changes, **so that** a
> deleted test shop does not read as a product regression at 09:23 UTC.
>
> **Acceptance:** `pdp-gallery.browser.spec.ts` passes against production with all three fixture
> secrets unset.

Fixtures now come from `/api/ucp/catalog` by photo count, with the secrets demoted to optional pins.
That API is authoritative by construction: a listing not in it has no PDP to test.

**Found by running it against production, not by review:** taking the *first* multi-photo match
picked a ten-image PDP, and `page.goto` (which waits for `load`, which waits for every image) blew
the 30s timeout under four parallel workers. The picker now takes the cheapest qualifying listing,
tie-broken by id so the choice is reproducible run to run. The file went from 31s to 8s.

## ⚠️ Owed — a product-owner call

**The zero-photo spec cannot run.** All 66 listings in the live catalog have at least one photo, so
it reports `FIXTURE UNAVAILABLE — no public listing with zero photos exists…` and skips. That is a
gap in the test **data**, stated in the skip reason, in `e2e/README.md` and in the spec header rather
than passing quietly.

It needs either one public no-photo listing to exist, or the spec retired. Nothing in this sprint
decides that.
