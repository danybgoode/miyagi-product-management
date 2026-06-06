# Sprint 1 — Catálogo por archivo UCP (external agent)

Goal: a seller's own AI agent maps their messy catalog into a clean UCP file; they upload it once and
their whole inventory goes live. **This sprint builds the reusable import core** (validate → upsert →
async images → staging preview) that Sprints 2–4 lean on. **No LLM runs on our infra.**

Status: ✅ shipped · 🚧 in progress · 📋 planned. **COMPLETE — all 5 stories built, deployed, and
live-QA passed 2026-06-03 (Daniel ran a real import end-to-end; works).**

---

## US-1 — "AI Catalog Copilot": copyable prompt + UCP template ✅
**As a** migrating seller, **I want** a one-click prompt I can paste into my own AI agent, **so that**
it produces a file in exactly the format Miyagi expects — with zero guessing.
- [x] A prominent "Copilot de catálogo" panel in the seller dashboard with a **copy** button.
- [x] The prompt injects the **target UCP catalog schema** (required fields: id/sku, título, precio,
      moneda, inventario, variantes, URLs de imagen) so output is deterministic.
- [x] Large-dataset guardrail in the prompt: if the raw data exceeds the agent's context, instruct the
      seller to synthesize it down (e.g. via NotebookLM) first.
- [x] Shows an example file the seller can eyeball.

## US-2 — Upload & validate with plain-language errors ✅
**As a** seller, **I want** to upload the file my agent made and instantly see if anything's wrong in
words I understand, **so that** I can fix it without engineering help.
- [x] Accepts a clean UCP file (CSV **or** JSON) from the dashboard.
- [x] Validates against the UCP catalog spec; on error, shows a **plain-language card** per problem
      ("Línea 24: falta el campo obligatorio 'moneda'") — never a stack trace.
- [x] The error text is copy-pasteable straight back into the seller's agent to auto-correct.
- [x] Valid file proceeds; invalid file blocks import but keeps the rows that *are* valid visible.

## US-3 — Staging preview before commit ✅
**As a** seller, **I want** to see what will be published before I commit, **so that** I trust the
import.
- [x] An interactive grid previews parsed products (Título, Precio, SKU, Inventario, Imágenes).
- [x] Clear count of "se crearán N / se actualizarán M" before confirming.
- [x] "Confirmar e importar" commits; nothing is published until then.

## US-4 — Idempotent upsert + async processing ✅
**As a** seller with a big catalog, **I want** the import to run reliably and be safe to re-run, **so
that** a re-upload updates my items instead of duplicating them.
- [x] Matches on **SKU / external ID**: existing → update in place; new → create. No duplicates.
- [x] *Shipped as **chunked client-driven processing** (batches of 25 with a live "Procesando N/Total"
      bar) rather than a 202 + Medusa job — same non-blocking UX with no new infra; a true background
      job is the documented scale-up path.* Heavy imports run as a **Medusa background job** — upload returns immediately (`202`), with a
      **live status badge** ("Procesando 120/400…") and a done/failed final state.
- [x] Per-row outcome report at the end (created / updated / skipped + reason).

## US-5 — Async image-URL ingestion ✅
**As a** seller, **I want** the photos my agent found to just appear on my listings, **so that** I
don't re-upload images by hand.
- [x] Accepts absolute image URLs in the file.
- [x] Fetches, optimizes, and stores each into the marketplace asset pipeline **asynchronously**
      (doesn't block the import from finishing).
- [x] *Ingestion runs **inline during create** (bounded 6/product, 6s timeout, SSRF guard) — robust
      under serverless where post-response background work isn't guaranteed; image swap is **create-only**
      (the seller PATCH endpoint takes no images), noted for a future backend story.*
- [x] A broken/unreachable image URL fails that one image gracefully (reported per-row), not the whole
      product.

---

### Definition of done (sprint)
A seller can paste the Copilot prompt into their own agent, upload the resulting UCP file, fix any
errors from plain-language cards, preview the staging grid, and publish a multi-item catalog with
images — re-running the upload safely updates rather than duplicates.

### Out of scope (this sprint)
On-site / in-app parsing (S2) · settings import (S3) · MCP tools (S4) · bulk *edit* of pre-existing
listings beyond upsert-on-re-run.
