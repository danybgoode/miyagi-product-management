# Sprint 4 — Tenant action: entitlement grant/revoke

**Epic:** [Admin consolidation + tenant management](README.md) · **Repo:** `apps/miyagisanchez` (+ a backend
read in S4.0) · **Goal:** turn the read-only tenant inspector (S3) into one that can **grant/revoke the
custom-domain comp entitlement** — wrapping the existing `lib/domain-entitlement` logic, audited, HIGH-risk.
Depends on **S3**. **S4.0 pre-flight gates S4.1.**

## Handoff from S3 (read before starting) — S3 shipped 2026-06-23, app PR #110 `4d4fba8`
The read-only directory + inspector that S4 mutates now exists. Concrete plug points:
- **The inspector to add controls to:** `app/(shell)/admin/tenants/AdminTenantsClient.tsx` — the inline
  expanded panel (the `<dl>` with the "Plan de dominio" `<Field>`). Add the Grant/Revoke controls there.
- **The read model S4 must keep in sync:** `lib/admin/tenant-directory.ts` (pure `shapeTenantRow`/`filterTenants`
  + es-MX labels) and its server sibling `lib/admin/tenant-directory-server.ts` (`listTenants()`). After a
  grant/revoke, the inspector must reflect the new `entitlementReason` — easiest is to refetch
  `GET /api/admin/tenants` (already exists, `withAdmin`) or have the mutation route return the reshaped row.
- **Entitlement is already derived in one place** — `shapeTenantRow` calls `readDomainGrant` +
  `deriveDomainEntitlement` from `lib/domain-entitlement`. S4's write must compose the **same**
  `custom_domain_grant` shape (`{ type:'comp', granted_at, note }`), never invent a parallel one.
- **The `subscription` gap S4 should close:** the **list** deliberately skips the per-seller subscription
  lookup (N backend calls), so when the paywall is ON a shop's list-level reason is `none` and the row is
  flagged `subscriptionUnchecked` (UI: "Sin plan (suscripción sin verificar)"). **S4's natural addition is a
  per-slug detail read** (`GET /api/admin/tenants/[slug]`) that calls `resolveDomainEntitlement(metadata,
  { sellerClerkId })` from `lib/domain-entitlement-server.ts` — that resolves the true reason incl.
  `subscription` for the one inspected shop, cheaply. Build it when S4 needs live entitlement for the action.
- **Audit is automatic:** `withAdmin` writes an `admin_audit_log` row on any successful **mutation** (S2.1) via
  `after()` — so the new `POST` route gets audited for free; just honor the `if (!res.ok) throw` best-effort
  discipline on any downstream write.
- **No scribe coordination needed:** S2 (#109) is already merged, so S3 edited `lib/admin/sections.ts`
  directly; S4 can too (no parallel session contends the registry).
- **Strict read-model still holds for reads:** the directory enumerates the `marketplace_shops` mirror but
  treats `metadata.medusa_seller_id` as canonical identity. S4's grant writes to
  `marketplace_shops.metadata.custom_domain_grant` — **gate this on S4.0's finding** that the comp-grant is
  genuinely non-commerce platform metadata (don't make Supabase the authority for a commerce capability).

## Stories

### S4.0 — Pre-flight: confirm the entitlement ownership · investigation (no code)
**As the** builder, **I want** to confirm where seller entitlement should live, **so that** I don't make
Supabase metadata the authority for a commerce capability (cross-panel purist concern, rules 1/2).
- Read `apps/backend/src/**` (marketplace **seller** module) for any existing seller **status / entitlement /
  plan** primitive. Read the `marketplace_shops` schema/migration + `lib/domain-entitlement.ts`.
- **Decide + record in this file:** is the custom-domain comp-grant genuinely **non-commerce platform metadata**
  (→ keep it on `marketplace_shops.metadata.custom_domain_grant`, the established design), or does Medusa already
  model seller entitlement (→ prefer that)? Default expectation: non-commerce (it's a domain comp, not an
  order/payment concept) — **but confirm, don't assume.**
- **Acceptance:** a written 1-paragraph finding in this sprint doc; S4.1 proceeds on its conclusion.

### S4.1 — Grant / revoke entitlement from the inspector · HIGH
**As a** platform admin, **I want** to grant or revoke a shop's custom-domain comp from the UI, **so that** I
stop hand-editing metadata and the action is attributed + audited.
- New mutating server route (e.g. `POST /api/admin/tenants/[id]/entitlement`) gated by `withAdmin`: writes/clears
  `marketplace_shops.metadata.custom_domain_grant` (`{ type:'comp', granted_at, note }`) — **wraps**
  `lib/domain-entitlement` shapes, never re-derives them. Writes an `admin_audit_log` row (S2.1).
- Grant/revoke controls on the S3 tenant inspector; the inspector reflects the new entitlement reason after the action.
- **UCP/MCP check:** if the grant changes what an agent can discover/transact for that shop, update the
  manifest/MCP read accordingly (rule 3).
- **Acceptance:** granting a comp flips the shop's entitlement to `comp`; revoking returns it to its underlying
  reason (`none`/`flag_off`); both write audit rows; the `if (!res.ok)` best-effort-write discipline is honored.
- **QA:** pure spec that the grant/revoke payload composes the right `custom_domain_grant` shape (reuse
  `readDomainGrant`/`deriveDomainEntitlement` invariants); an api spec the route requires admin + writes audit.
  **The live money-adjacent grant smoke is owed to Daniel.** **HIGH — Daniel-merged.**

## Sprint QA
- Deterministic gate: entitlement-payload pure spec (round-trips through `lib/domain-entitlement`) + the
  admin-gated route spec (401 without admin; audit row on success). **HIGH — Daniel-merged**; live grant/revoke
  against a real shop owed to Daniel (entitlement/money path; agent can't fully cover it).

## Sprint 4 — Smoke walkthrough (do these in order)
Env: branch preview → production. **Admin Clerk session + a test shop — owed to Daniel (money/entitlement).**

1. (S4.0) Read the finding paragraph in this doc.
   → It states whether the comp-grant stays on `marketplace_shops.metadata` or moved to a Medusa primitive.
2. As an admin, open a test shop in `/admin/tenants` and **Grant comp**.
   → The inspector's entitlement reason becomes **comp**; that shop can now connect/keep a custom domain even
     with the paywall on.
3. Open `/admin/audit`.
   → A "grant entitlement" row appears with your admin email, the target shop, and a timestamp.
4. **Revoke** the comp on the same shop.
   → Entitlement returns to its underlying reason (`none` when the paywall is on, no other grant); an audit row records the revoke.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S4.0 — pre-flight finding recorded (entitlement ownership)
- [ ] S4.1 — grant/revoke entitlement action (wraps `domain-entitlement`, audited) · HIGH
