# Shop Settings refactor — Sprint 3: Extract money/domain/agent sections

**Status:** ✅ BUILT — awaiting Daniel merge (HIGH) · branch `feat/shop-settings-refactor-s3` · PR pending
**Risk: HIGH — Daniel merges**

> **Built 2026-06-10.** Three slug-pages extracted (the `[section]` route is per-slug; each bundles
> several internal `<section>`s): **`pagos`** = proteccion+stripe+mercadopago+spei (S3.1–S3.4),
> **`canal`** = custom domain + apoyo + widget (S3.5), **`agentes`** = webhook+MCP token (S3.6).
> Plus the secret-strip lifted to a pure `lib/shop-settings/safe-metadata.ts` + a 6-case invariant spec.
> Gate green: `tsc` 0 · `npm run build` ✅ · Playwright `api` 451 pass / 4 skip (incl.
> `shop-settings-secret-strip.spec.ts`). Commits — A `lib/safe-metadata` + spec · B `Pagos` · C `Canal` ·
> D `Agentes` · + guard allowlist for Canal's accent hex.

> **HIGH risk — Daniel merges.** These sections drive money connect/disconnect, domain provisioning, and
> agent-token issuance. Same extraction pattern, but with an explicit **secret-strip invariant** and the
> money/domain/token paths smoke-tested by Daniel on a disposable/test shop (revoke test tokens after).
> Strictly behavior-preserving — every external request must fire identically.

## Stories

> Per-section shape: *As a seller, I want `<section>` to look and behave exactly as before, including
> every connect/disconnect/verify action, so that no money/domain/agent flow regresses.* **Risk:** HIGH.

### Story 3.1 — Stripe ✅
Stripe Connect onboarding + status. **Acceptance:** the onboarding/return flow and charges-enabled
status render and fire identically; no Stripe account fields leak to the client beyond what the monolith
already exposed. → `_sections/Pagos.tsx` `#stripe`; links are the same `<a href="/api/stripe/connect*">`.

### Story 3.2 — MercadoPago ✅
MP connect/disconnect + enabled toggle. **Acceptance:** `/api/mp/connect` POST/DELETE fire identically;
**MP `access_token`/`refresh_token` never reach the client** — the strip is now the pure
`lib/shop-settings/safe-metadata.ts stripShopSecrets` (still used by the monolith fallback) and asserted in
`e2e/shop-settings-secret-strip.spec.ts`. The extracted Pagos receives only `{connected,enabled,live_mode}`
— tokens are never even in its props.

### Story 3.3 — SPEI ✅
CLABE / bank-transfer config. **Acceptance:** CLABE saves and validates identically; shown/hidden state
unchanged. → `_sections/Pagos.tsx` `#spei` (CLABE + DiMo + efectivo); persists the `checkout` slice it owns.

### Story 3.4 — Compra Protegida ✅
Buyer-protection / escrow config. **Acceptance:** renders + persists identically. → `_sections/Pagos.tsx`
`#proteccion` (escrow_mode), persisted in the same `checkout` slice.

### Story 3.5 — Canal propio (custom domain) ✅
Custom-domain add/verify/remove + Cloudflare flow. **Acceptance:** `/api/sell/shop/domain` GET/POST/DELETE,
`/domain/detect`, and `/domain/cloudflare*` fire identically; verification status renders the same. →
`_sections/Canal.tsx` (also reuses `SupportWidgetSection` + `EmbedSnippetSection` for the apoyo/widget
sub-sections; slug editor → `/api/sell/shop/slug`; support slice → PATCH `/api/sell/shop`).

### Story 3.6 — Agentes / Conectar sistema (webhook + MCP) ✅
UCP webhook URL/secret, agent token issue/revoke, MCP config snippet. **Acceptance:** `/api/sell/agent-token`
POST/DELETE fire identically; **the hashed agent token (`ucp_agent_token_hash`) never reaches the client**
(strip preserved + asserted; Agentes receives only `agent_token_set`). → `_sections/Agentes.tsx`.

**MCP config-tool coupling — verified (was the scope-doc open risk).** The MCP `patch_store_configuration`
write path is **decoupled from this UI**: `app/api/ucp/mcp/route.ts → handlePatchStoreConfiguration →
applyStoreConfig → lib/apply-shop-settings.ts applyShopSettings`, which "Mirrors the write in
PATCH /api/sell/shop — deep-merges the settings" into the same `marketplace_shops.metadata.settings` tree.
It never touches the settings component, and webhook/token are `MANUAL_SECTIONS` the agent path ignores. The
extraction preserves every `settings.*` slice key (no rename), so that path is unaffected.

## Sprint QA
- **api spec(s):** a pure-logic spec asserting the **secret-strip invariant** (given a metadata blob with
  MP tokens + `ucp_agent_token_hash`, the client-facing payload omits them) → `e2e/shop-settings-secret-strip.spec.ts`.
  Plus each section's render `*.browser.spec.ts` (skips without `MS_TEST_*`).
- **browser smoke owed:** **yes, to Daniel — the money/domain/token paths** (Stripe onboarding, MP
  connect, CLABE save, domain add+verify, agent-token issue+revoke). An automated browser smoke can't
  fully cover these; use a disposable/test shop and revoke test tokens afterward.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)
**Use a disposable/test shop. All steps below are the money/auth/domain path — owed to Daniel.**

1. Go to https://miyagisanchez.com/shop/manage/settings/pagos
   → Stripe / MercadoPago / SPEI sections render identically to before.
2. Connect MercadoPago (sandbox), then disconnect. **(money path — Daniel)**
   → `/api/mp/connect` POST then DELETE behave exactly as before; no token visible in page source / network response.
3. Save a CLABE in SPEI, reload. **(money path — Daniel)**
   → CLABE persisted and validated identically.
4. Go to https://miyagisanchez.com/shop/manage/settings/canal and add a test domain, run verify, then remove it. **(domain path — Daniel)**
   → Add/verify/remove behave identically; status renders the same.
5. Go to https://miyagisanchez.com/shop/manage/settings/agentes — issue an agent token, copy it, then revoke it. **(token path — Daniel)**
   → Token issues and revokes identically; the hashed token never appears in the page source / network payload.
6. View page source / network on each of the above.
   → No MP `access_token`/`refresh_token` and no `ucp_agent_token_hash` present in any client payload.

If any step fails, note the step number + what you saw — that's the bug report.
