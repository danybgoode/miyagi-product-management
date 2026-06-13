# Sprint 3 — Structured attributes primitive + scannable specs table

> Epic: [PDP redesign](README.md) · **Risk: MED–HIGH** (backend; HIGH only if a custom module + migration is
> chosen over metadata). **Backend deploys first** (Cloud Run, ~12 min, no preview). **Daniel merges the backend
> PR.** **Status: 🚧 planned.** Goal: give listings a structured, per-category set of specs (talla, material,
> etc.) and render them as a scannable table on the PDP (finding #7).

## Pre-build decision (plan mode — don't assume)
Medusa v2 has **no native typed custom-attributes**. Two paths:
- **Metadata-driven schema (recommended):** per-category key→label schema; values on product `metadata` (same
  pattern as live `metadata.repuve`); no migration; **risk MED**.
- **Custom module + module link + `additional_data`:** typed/queryable; needs a migration; **risk HIGH**.
Pick metadata-first unless we need to filter/query on the attributes. The choice sets this sprint's risk tier and
who merges. Record the decision in the PR.

## Stories

### S3.1 (BE, Medusa) — Per-category attribute schema + Store API + UCP read
**As** the platform, **I want** listings to carry structured per-category attributes, **so that** the PDP (and
agents) can present specs consistently.
- Define the schema (the recommended metadata path: a per-category field set), expose the attributes on the
  Store API listing read, and surface them in `GET /api/ucp/catalog` (AGENTS rule #3 — agents see specs too).
- **Acceptance:** a product's structured attributes round-trip through the Store API and appear in the UCP catalog payload.
- **QA:** api spec on the route; **post-merge prod smoke** (no preview for Cloud Run) + a route-deployed probe.
  **Risk: MED–HIGH — Daniel merges.**

### S3.2 (FE) — Seller capture of structured attributes
**As** a seller, **I want** to fill in my listing's specs by category, **so that** buyers see accurate details.
- Listing create/edit captures the category's attribute set (driven by S3.1's schema); persists via the existing
  listing-write path.
- **Acceptance:** a seller sets talla/material/etc. on a listing and the values persist + read back.
- **QA:** api/browser smoke (seller session **owed to Daniel**). **Risk: MED.**

### S3.3 (FE) — Scannable specs table on the PDP
**As** a buyer, **I want** a quick scannable specs table, **so that** I can confirm the item's details at a glance.
- Render the attributes as a Vinted-style table just above the description (fits the S1.2 reorder slot). Absent
  attributes → the table simply doesn't render.
- **Acceptance:** specs render for a listing that has them; a listing with none shows no empty table.
- **QA:** browser smoke. **Risk: LOW.**

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api` (both repos).
- **Deploy order:** merge BE (S3.1) first; FE (S3.2/S3.3) degrades gracefully until the schema is live.
- Backend has no per-branch preview — API-level prod smoke + route-deployed probe by the agent; the seller-session
  capture smoke is **owed to Daniel**.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com + Medusa Store API (or preview/staging while pre-merge)

1. (API) Call the Store API listing read (or `GET /api/ucp/catalog`) for a listing that has structured attributes.
   → The response includes the structured attributes for that category.
2. (seller — **owed to Daniel**) Sign in as a seller, edit a listing, fill in its category specs (e.g. talla, material), save.
   → The values persist and show on re-open.
3. Open that listing's PDP, e.g. https://miyagisanchez.com/l/<test-listing-id>.
   → A scannable specs table appears just above the description, listing those attributes.
4. Open a listing with **no** specs filled in.
   → No empty specs table renders; the rest of the page is unaffected.

If any step fails, note the step number + what you saw — that's the bug report.
