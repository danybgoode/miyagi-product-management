# Handoff — investigate: 70 of 72 `api_key` → `sales_channel` link rows are unusable

_Written 2026-07-27. Paste the block below into a fresh session._

---

## The prompt

> Investigate a production data anomaly in the Medusa backend: **70 of 72 publishable-`api_key` →
> `sales_channel` link rows come back unusable** (null-ish, no `id`).
>
> **How to see it.** The internal diagnostic reports it directly:
>
> ```bash
> S=$(gcloud secrets versions access latest --secret=MEDUSA_INTERNAL_SECRET)
> curl -s -H "x-internal-secret: $S" \
>   https://medusa-web-zsl7ltapsq-uk.a.run.app/internal/backfill-sales-channel | jq
> ```
>
> Look at `publishable_keys_skipped_links` (was **70**), `publishable_keys` (**72** entries), and
> `publishable_keys_error` (should now be `null`).
>
> **What is already known — do not re-derive:**
> - Until 2026-07-27 this endpoint returned `unknown_error` in production. The `api_key` half was
>   throwing `Cannot read properties of undefined (reading 'id')` and taking the whole request down.
>   PR #115 contained it; PR #116 made the skipped rows **counted and reported** instead of silently
>   dropped. So the crash is fixed — **the underlying link-graph problem is not.**
> - The query is `query.graph({ entity: 'api_key', fields: ['id','type','title','sales_channels.*'],
>   filters: { type: 'publishable' } })` in
>   `apps/backend/src/api/internal/backfill-sales-channel/route.ts`.
> - Sales channels themselves are healthy: exactly **2** exist (`Default Sales Channel`,
>   `Miyagi Sánchez Storefront`), no duplicates. 15 duplicates were pruned on 2026-07-27.
> - All **98** products are linked to `sc_01KSK1J0V81P4EPY9G0JAPX353` (the storefront channel).
> - **72 publishable keys is itself suspicious** for a pre-launch marketplace with one storefront.
>   Worth asking whether key creation is also duplicating — the same find-or-create shape that
>   produced the 16 duplicate sales channels.
>
> **The questions, in priority order:**
> 1. Are the 72 `api_key` rows themselves legitimate, or is something creating publishable keys
>    repeatedly? Compare against how many the storefront actually needs (it pins one via
>    `MEDUSA_SALES_CHANNEL_ID`).
> 2. Why do the link rows resolve to null-ish entries? Candidates: rows in the link table pointing at
>    the **15 sales channels deleted on 2026-07-27** (dangling links — check `deleted_at` semantics,
>    Medusa v2 soft-deletes), a `query.graph` link-expansion quirk, or genuinely orphaned link rows.
>    **The deletion is the obvious first hypothesis and the timing fits — check it first.**
> 3. Does any of this affect the storefront? It currently works (catalog 200, homepage 200), so treat
>    this as latent unless proven otherwise.
>
> **Constraints:**
> - Commerce data lives in **Medusa's own Postgres**, not Supabase. The Supabase MCP will not see
>   `api_key` or `sales_channel` — use the internal endpoints or a direct Cloud SQL read.
> - **Read-only until you have a diagnosis.** Deleting or recreating keys is a production commerce
>   mutation and needs Daniel's explicit go-ahead, named specifically.
> - GitHub Actions quota is exhausted — run the gate locally and state
>   `"CI quota exhausted, local gate green: <details>"` in any PR body.
> - Read `apps/backend/AGENTS.md` first; it is auto-loaded and carries the traps.
>
> Start by running `node scripts/session-resume.mjs` from the repo root.

---

## Why this is worth a session

It is the last unexplained thing from the delivery-rail-hardening run, and it has the shape of a
**real duplication bug** rather than cosmetic noise — 72 keys and 70 broken links, in a pre-launch
system with one storefront and two sales channels. If key creation duplicates the way channel creation
did, the fix is the same one already applied to the ML resolver: a distributed lock around
find-or-create.

The timing also makes the strongest hypothesis testable in minutes: **15 sales channels were deleted
hours before this count was taken.** If the link rows point at those, the count should correlate.

## Related

- `Roadmap/LEARNINGS.md` → *a read-then-write race matters exactly when the write CREATES something*
- Team memory: `prod-duplicate-sales-channels` (the prune, and what it did and did not fix)
- `apps/backend/src/lib/ml-order-materialize.ts` — the locked find-or-create pattern to copy if key
  creation turns out to have the same defect
