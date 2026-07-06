# Retrospective — Mercado Libre sync (connect, import, publish & two-way stock sync)

**Macro-section:** 03 · Selling & Shops · **Risk:** HIGH (inventory mutation + external marketplace writes + a
live-Stripe money path) · **Closed:** 2026-07-01 (S6 live) · **6 sprints**, ~15 stories, be #44–#54 · fe #139–#154.

> *Close-out note:* this retrospective was written **2026-07-06**, five days after the last sprint merged — the
> epic shipped without its Definition-of-Done close (retro, poster, status frontmatter), which is itself the
> first learning below. The 2026-07-06 grooming audit found the epic still labeled `status: ready` ("not
> started") while fully live.

## What shipped
A seller connects their Mercado Libre account and Miyagi keeps the two sides in sync — Medusa-native
throughout (rule #1), with the despachobonsai implementation used strictly as an OAuth/API-shape reference:

- **S1 — Connect + linkage (the spine):** a Medusa module (`apps/backend/src/modules/mercadolibre/`) owning
  OAuth connect/disconnect with AES-256-GCM-encrypted tokens + auto-refresh
  (`getAccessTokenForSeller(sellerId)` as the load-bearing token primitive), a strict **1:1 product↔ML-item
  linkage** (409 on conflict), secret-gated `/internal/ml/*` routes, and the `/shop/manage/mercadolibre`
  status surface. Flag `ml.connect_enabled` ON in prod from day one.
- **S2 — Import ML→Miyagi:** ML as a **source adapter into the existing supply pipeline** (`lib/supply.ts`,
  `supply_batches`/`supply_items`) — not new ingestion. Per-item degrade with a hard `ML_FETCH_FAILED` when an
  outage would masquerade as "nothing to import"; linkage-aware dedupe; import always attaches to the
  connected seller, never an unclaimed shop.
- **S3 — Publish Miyagi→ML:** an explicit seller "Sincronizar" action over a reusable reconcile seam
  (`publishOrSyncProduct` + pure `decidePublishAction`) that S4's subscriber later calls unchanged. The
  backend **never guesses a category** (422 without one; low-confidence prediction → seller choice). Publish
  state rides `product_ml_link.metadata` — no migration.
- **S4 — Two-way stock sync (the oversell-safe core):** shipped fully dark behind a fail-closed
  `ml.sync_enabled` kill-switch; hardened over **4 codex cross-review rounds**.
- **S5 — Resilience + paid-SKU gating:** re-auth recovery (`ML_REAUTH_REQUIRED` + `needs_reauth` health state
  instead of a silent 502 behind a green "Conectado"), an append-only `ml_sync_event` activity log
  (token-redacting, best-effort — never breaks a sync), and the `ml_sync` entitlement seam cloned from the
  subdomain SKU, **fail-safe** (paywall flag OFF ⇒ every connected seller entitled).
- **S6 — Obtainable + discoverable (the money path):** $299/yr one-time grant + $30/mo subscription on prod
  Stripe, self-serve checkout from seller nav, promoter paid-close route, and the admin grant generalized to a
  `sku` param. Live on prod 2026-07-01 (revision `medusa-web-00129-t5x`), plus the #54 hotfix below.

## What went well
- **Sprint-per-flag dark shipping worked exactly as designed.** Six sprints merged to prod over three days
  with zero user-visible risk: each feature behind its own enablement flag (connect ON, the rest dark until
  smoked), the stock-sync core additionally behind a fail-closed kill-switch. Merge cadence never waited on
  live-smoke availability.
- **Reuse-before-rebuild held under pressure.** Import rode the existing supply pipeline; the paid SKU cloned
  the subdomain entitlement/checkout/webhook seam nearly verbatim (S6 was a fast-follow *because* the clone
  was faithful); the reconcile seam built in S3 was consumed unchanged by S4.
- **Cross-agent review earned its keep on the money/sync core** — S4 took four codex rounds and the applied
  should-fixes were real (seller-scoping links before update/close, pre-publish validation, token redaction in
  the event log, logging outside the Redis lock).

## What we learned (already promoted to LEARNINGS.md while the epic ran)
- **Medusa `update{Models}({id,…})` returns a single object, not an array** — the S6 prod seed 500'd on the
  UPDATE path only (`const [plan] = …` destructured a non-iterable; CREATE worked, so first-time seeds passed
  and re-seeds exploded), invisible to `tsc` behind `(svc as any)`. Hotfix #54; `setup-subdomain-plan` carried
  the same latent shape and was flagged. → LEARNINGS *Tooling gotchas*.
- **A flag named in code is invisible until it's CREATED in the flag store** — `ml.import_enabled` (S2) was
  never created in Flagsmith, so S2 was unflippable until S3's close caught it. → LEARNINGS (in-house flags
  section; the Flagsmith→Supabase migration inherited the rule).
- **Backend migrations self-apply on deploy** — the S5 `ml_sync_event` migration note ("needs a manual Cloud
  Run Job") was wrong: `docker-entrypoint.sh` runs `medusa db:migrate` on every boot. Confirmed via
  ml-orders-native S1 and corrected in team memory.
- **New this close-out: an epic isn't done when the last sprint merges.** This epic ran the build discipline
  perfectly and then skipped its own close — no retro, no poster line, `status: ready` frontmatter — and the
  mislabel was structurally invisible to the drift check until the grooming audit (which then hardened the
  tooling: unrecognized status values now hard-fail `roadmap-to-notion.mjs`). The close-out checklist is part
  of the epic, not an optional epilogue.

## Gaps / owed
- **Daniel's live purchase smokes** (flagged per sprint, still open): buy yearly + monthly, cancel→lapse,
  promoter paid-close, admin comp-grant. The `champions-not` test shop carries a comp `ml_sync_grant`.
- **Dark flags awaiting flip + live ML-sandbox smokes** where still applicable (import/publish/sync were
  shipped dark by design; `ml.*` flag states are managed in the in-house `platform_flags` since 2026-07-01).
- **S5 US-15 deferred:** the durable `product_ml_sync` idempotency table (HIGH) that retires S4's two bounded
  metadata-clobber residuals — deliberately its own PR, not yet built.
- **S6 deferred:** the promoter-close **UI** SKU-picker (`PromoterCloseClient` is domain-only; the route
  mechanism ships and works).

## Follow-ups
- [ml-orders-native](../ml-orders-native/) (ML sales → real Medusa orders) is the direct successor epic —
  S1+S2 merged, S3 in draft as of this writing.
- [profit-analyzer](../profit-analyzer/) is scaffolded and explicitly gated on ml-orders-native shipping.
