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
- Deterministic gate (green): `e2e/admin-tenant-directory.spec.ts` (pure shaper — claim/entitlement/domain
  derivation + search, 29 cases) + `e2e/admin-tenants-api.spec.ts` (the admin-gated route returns 401 to
  anonymous, incl. retired URL/header secret) + the updated `e2e/admin-sections.spec.ts` (the new `tenants` nav
  entry). `tsc --noEmit` + `npm run build` pass; `/admin/tenants` builds dynamic (`ƒ`). Read-only, no money path.
- **Stated gaps (honest):** list-level entitlement omits the per-seller subscription lookup (too heavy to fan
  out across a directory), so the reason `subscription` doesn't surface in the list — **moot today** because
  `domain.paywall_enabled` defaults OFF, so every shop derives `flag_off`; S4 adds per-slug detail when its
  grant action needs live subscription state. Listing count comes from the `marketplace_listings` mirror
  (display/enrichment), not a live Medusa count. The live directory eyeball (real shop data) needs an admin
  Clerk session → **owed to Daniel**.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: branch preview → production. **Admin Clerk session — owed to Daniel** (the `api` suite covers the
anonymous-401 gate; the authed 200-with-rows render is the human step).

1. As a signed-in admin, open `/admin/tenants` (it appears as **"Tiendas"** in the admin left-nav).
   → A list of shops renders, each row showing name + `/slug`, a claim badge (Reclamada / Sin reclamar), a
     domain badge (Sin dominio / Pendiente / Verificado), an entitlement badge, and an "N anuncios" count.
2. Type a known shop name, slug, custom domain, or `sel_…` seller id into the search box.
   → The list narrows to matching shops; the count line shows "X tiendas (de N)".
3. Click one shop row to open its inline inspector.
   → It shows that shop's **canonical Medusa seller id** (`sel_…`, or "Sin vendedor Medusa" for an un-imported
     gem), slug, claim status, custom domain (+ status), domain plan/entitlement reason, listing count, and
     creation date. There are **no** edit/mutate controls (that's S4).
4. As an anonymous (signed-out) user, request `GET /api/admin/tenants`.
   → HTTP 401 (the route is Clerk-only; a `?secret=` or `x-admin-secret` is also rejected). *(Covered by the
     `api` suite; listed here for completeness.)*

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [x] S3.1 — `/admin/tenants` directory + inspector (read-only; Medusa IDs canonical) — branch
      `feat/admin-consolidation-s3`
