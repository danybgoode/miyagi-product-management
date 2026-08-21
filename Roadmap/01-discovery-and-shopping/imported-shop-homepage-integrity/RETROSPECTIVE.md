# Imported-shop homepage integrity — Retrospective

_Closed: 2026-08-21_

## What shipped

- Six claimable vintage shops now have 17 sourced, first-party R2 photos; generic shop-level listings
  remain “Precio a consultar” instead of receiving invented product prices.
- Frontend [#415](https://github.com/danybgoode/miyagisanchezcommerce/pull/415) (`0eb9985`) makes
  `/admin/seleccion` union every explicit pin into the recent candidate pool, including pagination
  beyond 100 pins. The approved five pins are now the complete production set, ranked 1–5.
- The live smoke exposed six remaining protocol-relative Shopify hotlinks across four retained pins.
  Those photos were copied through the existing supply route into R2, preserving the proxy allow-list;
  the final `/mx` browser smoke was 200 with zero console errors.

## What went well

The architecture lock held: existing upload, listing-image, metadata, and cache rails were sufficient.
The first cleanup attempt validated the full approval snapshot before writing, so an admin-label/title
mismatch stopped with zero mutations. Runtime behavior tests plus one deliberate red mutation caught
the freshness blind spot without coupling the spec to source text.

## What we learned

An explicit subset must be authoritative in every control-plane reader as well as in its public
consumer. Also, a broken-image report needs a network trace: this one separated expected lazy-loading
blank space from reproducible proxy 400s and led to a data repair, not a weakened SSRF allow-list.
The first point sharpens the existing explicit-subset union item in `Roadmap/LEARNINGS.md`.

## Gaps / follow-ups

Five of the six claimable-shop records do not yet have Supabase mirror rows, so their authenticated
image writes correctly updated Medusa (the storefront source of truth) but reported the optional mirror
as unavailable. Storefront/admin behavior is complete; if those shops later need mirror-only workflows,
their missing mirror rows should be reconciled separately.
