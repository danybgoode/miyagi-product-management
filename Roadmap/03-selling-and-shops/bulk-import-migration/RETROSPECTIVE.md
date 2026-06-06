# Retrospective — Bulk Import & Express Migration (Epic)

**Shipped:** 2026-06-03 · all 4 sprints / 17 stories live. Sprints 1–2 live-QA'd; Sprint 4 live-QA'd
end-to-end via the MCP endpoint; Sprint 3 verified by build + logic (and exercised transitively by the
S4 QA, which patched the same settings pipeline).

The pitch was *"Trae tu tienda completa en minutos"* — collapse the switching cost of moving a whole
shop (catalog + configuration) onto a new marketplace from days of admin to minutes, by leaning on the
UCP/MCP standards the platform already speaks.

## What shipped
- **S1 — Catálogo por archivo UCP.** Upload a UCP catalog file → validate (plain-language error cards)
  → staging preview → idempotent SKU/external-ID upsert → remote image URLs ingested to R2.
- **S2 — Pega y publica.** Paste raw text → Gemini Flash extracts products → inline-editable staging
  grid → import. The one LLM-on-our-infra sprint; prompt-injection isolated in tagged blocks.
- **S3 — Tienda como código.** One declarative config file dresses the whole shop: schema + Copilot
  prompt → atomic block-apply with a delta report → logo/banner ingested to R2 → settings checkmarks
  reflect what's now configured.
- **S4 — Configuración por agente vía MCP.** The seller's own agent reads and patches shop config over
  MCP, with per-shop token auth, strict validation, an audit log, and security alerts.

## What went well
- **Each sprint reused the previous sprint's engine.** S1 built the validate→ingest→apply core; S3's
  `applyStoreConfig` and S4's `patch_store_configuration` both run through it. S1's `ingestImageUrls`
  (R2, SSRF-guarded) powered S3's logo/banner ingestion unchanged. One import engine, four surfaces
  (file, paste, config file, agent) — no parallel implementations.
- **The "no LLM unless forced" sequencing paid off.** Three of four sprints needed no model on our
  infra — the tenant's own agent does the off-platform parsing. Only S2 took on token cost + an
  injection surface, and it was the one explicitly gated on a provider decision.
- **Security held at the write boundary.** S4 is the first *public* seller-write path. Secrets never
  leave the server (token stored only as a hash, kept out of the settings blob; the read tool strips
  payment/OAuth keys), OAuth-bound blocks are structurally non-patchable, and every value is
  re-validated before a DB write. The live smoke test confirmed all of it.
- **Ship-per-story against a real deploy.** Picked up a half-finished S3 US-3 from a prior session,
  verified, and shipped it cleanly; then ran S4 as three independent shippable increments.

## What we learned
- **The native settings editor persists the whole settings tree on every save.** This broke the
  obvious "is this block present?" completion check (it would false-positive after any save). S3 US-4
  had to switch to *value-based* checks — a section lights up only when it holds real data. Worth
  remembering for anything that reasons about "is X configured."
- **Smoke testing a headless write API needs a credential the browser holds.** S4's MCP tools can't be
  exercised by curl alone — the per-shop token is minted behind Clerk auth. The working pattern:
  generate the token via the signed-in browser, drive the API with curl, then revoke. Slightly awkward
  by hand; a strong argument for codifying these as Playwright specs (see below).

## Validated but with a caveat
- **S3 was not live-QA'd on its own** — at S3 ship time the browser session's account had no shop, so
  the checkmarks couldn't be rendered against real data. It was build/logic-verified, and the S4 QA
  later exercised the same `applyStoreConfig` pipeline end-to-end. A direct visual pass on the settings
  checkmarks is still owed.
- **S4 QA mutated a real shop.** The test left a `notifications` block on *VP Shops* set to system
  defaults (harmless, but it now shows a ✓). The patch API only sets values, so it couldn't be unset
  before the token was revoked. Future destructive-ish smoke tests should prefer a disposable shop.

## Deferred (noted in the epic, not this build)
- Two-way **export** / continuous sync back to other platforms.
- Direct **platform-to-platform connectors** (read another store's API for the seller).
- Bulk **edit** of a live catalog via the grid (import/upsert covers re-runs only).
- S4 image/asset ingestion runs **inline** (bounded to 2 assets), not as an async job — fine at this
  scale, revisit if config files start carrying many assets.

## Engineering debt noted
- Pre-existing lint debt in `ShopSettings.tsx` (`no-explicit-any`, a `Date.now()` purity warning, an
  `<a>`-vs-`Link`, a manual-memoization warning) — unrelated to this epic, surfaced when linting the
  file. Flagged for a dedicated cleanup pass; it does not block the build.
- **QA is still hand-driven.** Smoke tests are run by Claude driving Claude-in-Chrome + curl each time,
  which burns tokens and isn't repeatable. Next build should stand up a tiny Playwright harness so the
  critical flows re-run deterministically (see WAYS-OF-WORKING → Definition of Done).
