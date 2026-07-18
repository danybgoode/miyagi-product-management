# Comparador de costos — the stacking-costs sales tool on the homepage — Retrospective

_Closed: 2026-07-18_

## What shipped
- **S1 — model + dataset + UI + teaser (PR #277, 2026-07-17).** Pure `lib/cost-comparator.ts`
  (Shopify/ML/WooCommerce/Tiendanube tiers + combos vs Miyagi's real SKU prices, 0% commission);
  42-figure dataset, every figure `{value, source, verifiedAt}` web-verified at build time, merged
  fail-open through the shipped `platform_copy_overrides` seam with a CI guard that reds on any
  unsourced figure; anonymous mobile-first `/comparador` with inline-editable figures +
  source-on-hover; homepage teaser card with `/` still statically prerendered; Clarity/UTM wired.
- **S2 — export + prefill + agent surface (PR #278, 2026-07-18).** "Exportar reporte" → styled
  es-MX markdown with chart fence, client-side smalldocs URL-hash (deflate-raw fallback path — no
  1MB brotli WASM); full-state prefill links (incl. manual overrides) + promoter sell-sheet
  leave-behind; MCP `compare_costs` (unflagged buyer tool, same precedent as `about_miyagi`)
  computing via the identical lib — parity spec asserts tool output equals the page's; `/agent`
  methodology section + UCP manifest capability.
- **S3 — shop-URL analyzer (PR #280, 2026-07-18; the conditional sprint — its parity-module
  condition was met).** Paste-a-URL platform detection (markup heuristics, no LLM), rough catalog
  inventory, calculator prefill (platform only — see learnings), migration-effort report rendered
  from the shared `lib/migration-parity.ts` (Shopify-detected shops only; parity notes name
  Shopify). SSRF-hardened server fetch: DNS-resolve-and-reject private ranges, https-only,
  `redirect:'error'`, 8s timeout, 2MB streamed cap; `comparator_analyze` rate limit (8/10min/IP).
- **Daniel's phone smokes: done and green (2026-07-18)** — teaser → comparison → override →
  export → prefill round-trip.

## What went well
- **The sourcing discipline held end-to-end and got sharper under review.** Codex caught that the
  page promised source-on-hover before the UI delivered it (S1) and that exported reports cited
  "verificado" sources for user-EDITED figures (S2) — both fixed toward more honesty, not softer
  copy: overridden lines now say "editado por el usuario" with the original + source.
- **One pure lib, three surfaces, zero drift by construction** — page, exported report, and MCP
  tool all compute through `lib/cost-comparator.ts`, locked by a parity spec.
- The review layers earned their keep every round: a real tier-param bleed bug (S2, fresh
  reviewer), the byte-cap boundary-chunk drop (S3, codex), and a refuted codex false-positive
  (the ENDPOINT link) that the fresh reviewer disproved before anyone changed correct code.

## What we learned
- **A dataset whose product claim is honesty needs the guard to police the CLAIM, not just the
  data:** the CI guard on `{source, verifiedAt}` per figure was necessary but not sufficient —
  the two real review catches were UI/report surfaces *presenting* sourced-ness the code didn't
  deliver. When honesty is the feature, spec the presentation layer's promises too.
- **Don't wire a prefill just because the data exists:** catalog size ≠ sales volume; wiring
  `catalogCount → volume` would have fabricated a business metric. The fix was making the copy
  match reality ("solo la plataforma"). Fabricating a plausible number is worse than an empty
  field — the same rule as the prose-draft editor pass.
- **A fully-open SSRF fetch surface deserves a named human merge** even at MED tier with every
  mitigation applied — the resolve-then-fetch TOCTOU is only *mitigated* (https + cert validation
  bound it), and saying "closed" in a PR body is an overclaim a reviewer will (correctly) refute.
  Follow-up: `seeds/ssrf-dns-pinning.md` (pins the vetted IP; also covers
  `lib/shopify-mcp-client.ts` and `lib/image-ingest.ts`).

## Gaps / follow-ups
- Runtime dataset editing lights up only when the prod `platform_copy_overrides` table lands
  (pre-existing gap, owed to Daniel from the admin-content epic; fail-open keeps the tool working).
- ML commission figures came from a third-party source (ML's help center 403s automated fetches)
  — worth a manual spot-check at the next dataset refresh.
- `ssrf-dns-pinning` seed (LOW) — the durable close of the analyzer's residual TOCTOU.
- Grower success signal (comparisons run + reports exported, via Clarity/UTM) — readable in
  Clarity going forward; no baseline yet.
