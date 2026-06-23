# Sprint 3 — Tenant directory (read-only)

**Epic:** [Admin consolidation + tenant management](README.md) · **Repo:** `apps/miyagisanchez`
**Goal:** a read-only `/admin/tenants` directory to list, search, and inspect shops/sellers. Highest-signal,
lowest-risk tenant slice. Depends only on **S1** (shell + auth) — can run **in parallel with S2** (a second
agent), with a single scribe for `lib/admin/sections.ts`.

## Stories

### S3.1 — `/admin/tenants` directory + inspector · LOW (read-only)
**As a** platform admin, **I want** to find and inspect any shop, **so that** I can see its state at a glance
before any action (and as the foundation S4's entitlement action plugs into).
- New `/admin/tenants` page (registered in the nav): a searchable list of shops.
- **READ-MODEL only** — **Medusa seller IDs are canonical**; `marketplace_shops` fields are display/enrichment.
  Join Medusa marketplace sellers ⋈ `marketplace_shops` mirror. Per shop show: name/slug, **claim status**
  (`lib/claim.ts isShopClaimed`), **custom domain** (+ status), **entitlement**
  (`lib/domain-entitlement` derivation: flag_off / grandfathered / comp / subscription / none), and a
  **listing count**.
- Pure `lib/admin/tenant-directory.ts` shaping the joined row (so the read model + spec share one shaper);
  the async DB/Medusa reads live in a server sibling.
- **No mutations this sprint.**
- **Acceptance:** the directory lists shops, search narrows by name/slug; opening one shows identity, claim,
  domain, entitlement, and listing count — all read, nothing writable.
- **QA:** pure spec for the row shaper (claim/entitlement/domain derivation from fixture input); an api spec that
  the directory route requires an admin session (S1 guard) and returns shaped rows.

## Sprint QA
- Deterministic gate: `lib/admin/tenant-directory` pure spec + the admin-gated route spec. Read-only, no money
  path. The live directory eyeball (real shop data) is owed to Daniel (admin session) but many assertions are
  pure/fixture-driven and run in CI.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: branch preview → production. **Admin Clerk session — owed to Daniel.**

1. As an admin, open `/admin/tenants`.
   → A list of shops renders, each with name/slug, claim status, domain, entitlement reason, and a listing count.
2. Type a known shop name/slug in the search.
   → The list narrows to matching shops.
3. Open one shop's inspector.
   → It shows that shop's identity, claim status, custom domain (+ status), entitlement reason, and listing
     count. There are **no** edit/mutate controls yet (that's S4).

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S3.1 — `/admin/tenants` directory + inspector (read-only; Medusa IDs canonical)
