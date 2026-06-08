# Shop Settings refactor — Sprint 3: Extract money/domain/agent sections

**Status:** ⬜ not started · **Risk: HIGH — Daniel merges**

> **HIGH risk — Daniel merges.** These sections drive money connect/disconnect, domain provisioning, and
> agent-token issuance. Same extraction pattern, but with an explicit **secret-strip invariant** and the
> money/domain/token paths smoke-tested by Daniel on a disposable/test shop (revoke test tokens after).
> Strictly behavior-preserving — every external request must fire identically.

## Stories

> Per-section shape: *As a seller, I want `<section>` to look and behave exactly as before, including
> every connect/disconnect/verify action, so that no money/domain/agent flow regresses.* **Risk:** HIGH.

### Story 3.1 — Stripe
Stripe Connect onboarding + status. **Acceptance:** the onboarding/return flow and charges-enabled
status render and fire identically; no Stripe account fields leak to the client beyond what the monolith
already exposed.

### Story 3.2 — MercadoPago
MP connect/disconnect + enabled toggle. **Acceptance:** `/api/mp/connect` POST/DELETE fire identically;
**MP `access_token`/`refresh_token` never reach the client** — the existing `safeMetadata` strip in
`[section]/page.tsx` is preserved and asserted.

### Story 3.3 — SPEI
CLABE / bank-transfer config. **Acceptance:** CLABE saves and validates identically; shown/hidden state
unchanged.

### Story 3.4 — Compra Protegida
Buyer-protection / escrow config. **Acceptance:** renders + persists identically.

### Story 3.5 — Canal propio (custom domain)
Custom-domain add/verify/remove + Cloudflare flow. **Acceptance:** `/api/sell/shop/domain` GET/POST/DELETE,
`/domain/detect`, and `/domain/cloudflare*` fire identically; verification status renders the same.

### Story 3.6 — Agentes / Conectar sistema (webhook + MCP)
UCP webhook URL/secret, agent token issue/revoke, MCP config snippet. **Acceptance:** `/api/sell/agent-token`
POST/DELETE fire identically; **the hashed agent token (`ucp_agent_token_hash`) never reaches the client**
(existing strip preserved + asserted); the MCP config-tool path still writes the same settings tree via
`/api/sell/shop` (**verify this coupling before merge** — open risk from the scope doc).

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
