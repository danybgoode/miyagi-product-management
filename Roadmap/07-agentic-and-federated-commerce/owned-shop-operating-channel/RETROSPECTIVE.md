# Retrospective — Owned-shop operating channel

_Closed: 2026-07-31_

## What shipped

A second Sales Channel per market that carries **buyability**, leaving the marketplace channel to mean
**publication** and nothing else. A merchant can now say *"sell this on my own shop, don't list it in the
Mexico marketplace"* — the capability the parent epic deliberately removed rather than half-build.

Five PRs across two repos, all merged and deployed:

| PR | What |
|---|---|
| backend 128 | S1 — the `operating_channel` env seam (three states), the destructive-cleanup allow-list, the idempotent backfill |
| backend 129 | Provisioning moved from a `medusa exec` script to an internal route (the script could never reach prod) |
| backend 130 | S2 — the publishable-key **move**, dual-channel create, the checkout-admission seam |
| frontend 330 | S2.3 — `lib/cart.ts` admits on buyability behind the flag |
| backend 131 | S3 — `publish_to_market: null` re-enabled, publish/unpublish, the two-fact read surface |
| frontend 331 | S3 — seller "Mercado" column, publish/unpublish action, "Solo mi tienda" at create |

**Applied in production:** channel `sc_01KYWNQ0C0PFFM0K0V2EMC24AP` ("Miyagi Operating MX") created and
protected; its stock-location link made; **98 products backfilled** (77 published + 21 draft); the
storefront publishable key **moved** from the marketplace channel to the operating channel, 1 link row
before and after, verified.

## What went well

**The locking pass paid for itself three times before a builder started.** It disproved three scaffold
premises, two of which would have caused a production outage. The most valuable hour of the epic was
spent reading Medusa's own source in `node_modules` rather than trusting the scope doc.

**D6 turned a hypothesis into a measured number.** The scaffold scanned `published` only; the locking
pass argued drafts must be included. Production said **98 = 77 published + 21 draft** — 21 products that
would each have become unbuyable the day their seller published them, surfacing weeks after close.

**Backfill-first held.** Provision → protect → link stock locations → backfill → *then* move the key.
Every step verified before the next depended on it; zero errors, zero rollbacks.

**The delegation contract worked in both directions.** Builders stopped and corrected the architect
twice — once refusing to write a spec that would have encoded a false mechanism, once checking a
suspected premise violation and correctly withdrawing it after finding their own checkout stale.

## What we learned

**A confidently-wrong mechanism in a locked decision is worse than an open question.** Two of the
architect's own locked decisions were wrong and were corrected by review:

- **D3's mechanism** — the claim that `req.errors` is "read nowhere in the Medusa dist" came from a grep
  that missed `req_?.errors` (the reader aliases the request). The real behaviour is a **loud 400 on
  every cart**, not a silent misroute. The *decision* survived; the reasoning under it did not.
- **D7's overclaim** — the admission seam was called "the anti-IDOR boundary on the money path". It is
  an **offer** gate: `POST /store/carts/:id/line-items` enforces no channel membership at all. Verified
  in `carts/middlewares.js` and `add-to-cart.js`.

Both were corrected in place with the evidence and a visible banner, not quietly softened.

**Four instances of one failure shape.** Every one was "the operation partly happened and the report
does not say so":

1. the backfill returned 200 with `stock_locations.applied: false` buried in the payload
2. the key move returned 200 `applied: true` alongside `verified: false`
3. the admission route turned an ownership-read **outage** into a 404 **refusal**
4. publication validation ran *after* the title/price writes, so a refusal returned 423 having already
   persisted the title

The existing 2xx-partial-run rule named none of these by shape. Promoted to `LEARNINGS.md` as a broader
rule about validating before applying and reporting what actually happened.

**A `medusa exec` script cannot reach this production database — at all.** `medusa-pg` has
`ipv4Enabled: false` and a private IP; a real attempt died after four 60s retries holding correct
credentials. `cleanup-default-data.ts`'s header already admitted it "has never been run against
production" — that line was evidence, and it was read as a footnote. Every production mutation here has
to be an internal HTTP route.

**A literal NUL byte silently kills the cross-agent review layer.** `spawnSync` refuses an argv string
containing one, so the review *crashed* rather than reporting — and a tailed runner nearly made that
read as a clean pass on a HIGH-tier money-path PR. Fixed once in the file git flagged as binary, and
missed the source file whose NULs sat past git's 8 KB sniff window: the guard-the-population trap,
inside a single PR. Now a guard spec.

**Review axes are not equal on this codebase, and the data is stark.** Across the epic:

| Axis | Real findings |
|---|---|
| `gemini-3.6-flash-high` / `gemini-3.1-pro-high` | **0** in 4 passes |
| `claude-opus-4-6-thinking` (fresh-agent axis) | 3 should-fix |
| **`codex` / gpt-5.6-terra** | **3 blocking + 2 should-fix** in 5 passes |

Codex found a blocking defect on **every** backend PR it saw, including one inside the orchestrator's own
round-1 fixes. The two Gemini tiers returned byte-identical single-nit findings on the same diff — a
generation upgrade that changed nothing observable.

**Mutation-checking caught a bad spec of my own.** A directional assertion matched `/stock-location|D5/`
and still passed with the guard disabled, because the underlying error string contained that phrase. A
spec that cannot fail for the right reason is not evidence.

## Gaps / follow-ups

- **OWED — the flag go-live, and it needs a step nobody scoped.** `catalog.owned_shop_only_enabled` is
  registered in both repos' `flag-catalog`, so `isEnabled()` reads it correctly — and it is **invisible
  and un-flippable** in `/admin/flags`. Investigated after Daniel could not find it:
  - production runs `GOLDEN_BEANS_FLAG_CUTOVER = *=golden`, so the **Golden Beans control plane is
    authoritative for every flag**;
  - `/admin/flags` renders **only** the Golden snapshot ("*intentionally no platform_flags fallback
    here*"), so a flag Golden has never heard of cannot appear;
  - the UI can only **toggle**, never create, and no sync script in either repo pushes definitions;
  - Miyagi's `GOLDEN_BEANS_FLAG_ADMIN_KEY` is **read-only for administration** — `GET` 200, `POST` 401
    *"Invalid flag administration credential"* on the same bearer.

  **Daniel creates the definition in Golden Beans** (key `catalog.owned_shop_only_enabled`, polarity
  `enablement`, criticality `high`, environment `production`, current `snapshotVersion 46`); it then
  appears in `/admin/flags` and is toggleable like every other flag. This is the true go-live and it is
  what makes the money smokes below possible at all.

  **The transferable lesson — this is the Flagsmith trap recurring in the Golden Beans era.**
  `LEARNINGS.md` already records "a flag defined in code is INVISIBLE in the dashboard until someone
  creates it via the API". The mechanism changed; the shape did not. **Creating the Golden definition
  belongs in the epic's task list**, or the kill-switch you planned is a lever with no dial.
- **OWED — money-path smokes (Daniel).** S2: buy an operating-channel-only product end to end, plus one
  ordinary marketplace purchase as regression. S3: publish → unpublish → buy again. Automated specs
  cannot cover live payment rails.
- **OWED — the cart-write authorization boundary.** `POST /store/carts/:id/line-items` enforces no
  channel membership. Pre-existing and unwidened by this epic, and unreachable today (one market, all 26
  sellers `mx`), but real. Needs its own scoped sprint — see the epic README's "Owed after this epic".
- **`scripts/flags.mjs` is stale** — it targets Flagsmith, decommissioned when flags moved in-house to
  Supabase `platform_flags`. Anyone reaching for it to flip an epic flag gets nothing. Delete or rewrite.
- **`MEDUSA_PUBLISHABLE_KEY` is not set on the backend service**, so the key-move route could not
  positively token-match and fell back to arithmetic (exactly one key exists). Sound here, but the
  stronger check should be available before the next credential-touching operation.
- **`agy-doctor` misclassifies a transient upstream error as a broken contract** — it maps any non-zero
  probe exit to "contract broken", collapsing "briefly busy" into "the CLI changed". Needs a third probe
  state. It blocked the review layer until hand-verified.
