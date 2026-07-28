# Handoff — investigate: 70 of 72 `api_key` → `sales_channel` link rows are unusable

> **RESOLVED AND APPLIED 2026-07-27.** Diagnosis confirmed live; remediation shipped in backend PRs
> **#119** (`f0ae096`) and **#120** (`199dcae`) and **applied in production**: 71 keys revoked + 71
> deleted, **72 → 1 key, 70 → 0 dangling links**, storefront unchanged. Keep this file for the
> reasoning; the prompt below is spent. See **[Resolution](#resolution-2026-07-27)** at the bottom.

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

---

## Resolution 2026-07-27

**The headline hypothesis in this prompt was wrong, and saying so was the useful outcome.**

Question 1 was framed as *"is something creating publishable keys repeatedly?"*, with the suggested fix
being the locked find-or-create from `ml-order-materialize.ts`. It is not a race and never was.
`initial-data-seed.ts` is the only publishable-key creation site in the backend, and its own comment
records the incident: repeated runs against a populated DB "previously created 70+ duplicate stores /
publishable keys / sales channels". Commit `e951b5f` closed that with a store-exists guard. **The
source was already fixed; only the residue remained.** No lock was needed.

Question 2's hypothesis — dangling rows pointing at the 15 channels deleted that day — was directionally
right but understated. The mechanism, verified in the installed core-flows source rather than inferred:
`/internal/prune-sales-channels` called `salesChannelService.deleteSalesChannels()`, the raw module
service, which deletes only the `sales_channel` row. `deleteSalesChannelsWorkflow` additionally runs
`removeRemoteLinkStep`, and that is what clears `publishable_api_key_sales_channel`. So the prune added
15 dangling rows to the ~55 already left by earlier cleanups.

Question 3: **latent, storefront unaffected**, as suspected. Live `GET` confirmed 72 keys,
`publishable_keys_skipped_links: 70`, `publishable_keys_error: null`, and exactly **one** resolving key
(`apk_01KRVSGHN5KMCJSAMMYHRBD42W` → `sc_01KSK1J0V81P4EPY9G0JAPX353`). A key with no channel link returns
no products and the catalog returns products, so that key is the storefront's.

### Two findings the count surfaced that this prompt did not anticipate

1. `store_default_sales_channel_id` (`sc_01KRVSGTDJ…`, "Default Sales Channel") **diverges from**
   `env_MEDUSA_SALES_CHANNEL_ID` (`sc_01KSK1J0V8…`, the storefront). The vestigial Default channel
   survives every prune only because it is the store default.
2. The diagnostic **collapsed two states into one**: a key with a dangling link and a key with no link
   at all both rendered `sales_channels: []`. Live, 71 keys showed `[]` while only 70 links were
   skipped. Fixed with a per-key `skipped_links`.

### Shipped — backend PR #119 (`f0ae096`)

- **New `POST /internal/prune-api-keys`** — `dry_run` defaults true and is fully read-only. Deletes
  orphan keys via `deleteApiKeysWorkflow`, whose `removeRemoteLinkStep` is keyed on
  `publishable_key_id` with no join to `sales_channel`, so dangling rows go with their keys. Refuses on
  an empty read, any row with no id, no key qualifying to keep, or a configured storefront token
  matching nothing — while keeping "could not check" distinct from "there is none".
- **`prune-sales-channels`** now deletes through `deleteSalesChannelsWorkflow`.
- **`backfill-sales-channel`** reports a per-key `skipped_links`.

Do **not** use `src/scripts/cleanup-default-data.ts` for this. Its `KEEP_KEY_PREFIX =
'pk_bac9d8ced544'` is a *token* prefix that was never verified to resolve to the one working key; if it
does not, that script deletes the storefront's credential. The new endpoint keeps by *live link*, which
is verifiable from the diagnostic output. (The dry run has since shown the kept key's `token_prefix` is
`pk_bac9d8ced` — so that constant did point at the right key. It was right by luck, not by check.)

### The bug the first attempt found — revoke before delete

**PR #119 shipped an endpoint that could not do its job.** Its apply returned `HTTP 400` for all 71
keys — `Cannot delete api keys that are not revoked` — and deleted nothing. The module guard held and
the route surfaced the error, so there was no partial state.

The more serious half: **the dry run had already predicted `delete: 71`**, an outcome the apply could
not deliver. *A dry run that promises what the apply cannot do is a false green.*

`@medusajs/api-key/.../api-key-module-service.js` → `deleteApiKeys_` rejects
`revoked_at IS NULL OR revoked_at > now()`. It **compares** — a future-dated `revoked_at` still counts
as unrevoked, so "has a `revoked_at`" is a permissive fork of the rule. PR #120 added an `isRevoked()`
that mirrors the predicate, a `requires_revoke` count so the dry run says what must happen first, and a
`revokeApiKeysWorkflow` pass over the delete set before `deleteApiKeysWorkflow`.

### Applied 2026-07-27 — verified

| | before | after |
|---|---|---|
| publishable keys | 72 | **1** |
| dangling link rows | 70 | **0** |
| `publishable_keys_error` | null | null |

Storefront smoke against a baseline recorded before the apply: home `200`, **16/16** identical `/l/`
listings (0 missing), sample PDP `200`. Re-running the endpoint is a no-op (`delete_count: 0`), and
`prune-sales-channels --dry-run` now reports `would_delete: 0` over the 2 remaining channels.

**Still open (not a defect, worth knowing):** `store_default_sales_channel_id` still points at the
vestigial "Default Sales Channel", not the storefront channel that `MEDUSA_SALES_CHANNEL_ID` names.
