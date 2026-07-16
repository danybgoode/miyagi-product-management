# MCP parity core — Sprint 4: Risky config blocks (support, checkout)

**Status:** ✅ MERGED — frontend PR [#267](https://github.com/danybgoode/miyagisanchezcommerce/pull/267)
(2026-07-16) + backend PR [medusa-bonsai-backend#97](https://github.com/danybgoode/medusa-bonsai-backend/pull/97)
(the `/internal/support-product` door). **Ships dark**:
`mcp.support_config.enabled` + `mcp.checkout_config.enabled` both seeded OFF live (verified); a patch carrying
either block is refused whole while its flag is OFF. Fresh Sonnet 5 review: approve — verified
the provision-before-write abort semantics, the secret-free snapshot projections (the stored
`settings.checkout` holds a real CLABE that never reaches an agent), and that the Clerk-authed
file-import route gaining these blocks ungated is parity with the portal (same session trust),
not an escalation. Codex catches (appliedAny honesty, shop-lookup diagnostics, currency copy)
fixed pre-merge.

Kept separate from Sprint 1's `launchpad`
block specifically because these two are HIGH, not LOW — one has a real provisioning side effect,
the other currently has almost no validation to inherit and needs some authored fresh.

## Stories

### Story 4.1 — `support` block in `patch_store_configuration`
**As a** shop agent, **I want** to configure the support widget via config, **so that** enabling
guest contributions is agent-operable.
**Acceptance:** `validateConfig` recognizes a `support` block validated by the existing
`normalizeSupportSettings` — exactly 3 `preset_amount_cents`, `custom_min_cents≥100`,
`custom_max_cents≤500000`, `min≤max`, presets within range, 3-letter uppercase currency. **The
tool's response explicitly surfaces that enabling it live-provisions a real Medusa product**
(`POST /store/sellers/me/support-product`) — this is a side effect, not pure config, and the
agent caller must be told a real product was created, not just that "config was applied."
**Reuses:** `normalizeSupportSettings` (`lib/support-widget.ts:28`) verbatim.
**Risk:** HIGH (live-provisions a commerce product). **Kill-switch:**
`mcp.support_config.enabled`, default OFF.

### Story 4.2 — `checkout` block in `patch_store_configuration`
**As a** shop agent, **I want** to set escrow mode and checkout CTAs via config, **so that**
checkout presentation is agent-operable.
**Acceptance:** `validateConfig` recognizes a `checkout` block. Because this block currently has
**~zero validation even in the human portal route**, this story *authors* new validation (the one
place in this epic that isn't pure reuse): `escrow_mode` constrained to the enum
`'off'|'optional'|'required'`; `whatsapp_cta`/`show_phone`/`cash_pickup.enabled` validated/coerced
as booleans. `bank_transfer` (real payment info) stays **excluded/manual**, same class as Stripe/
CLABE, via the existing `MANUAL_SECTIONS` mechanism. `contact_email` stays **server-derived only**
(from `show_email` + the Clerk user's primary email) — never client-settable, matching the
existing portal-route behavior exactly.
**Reuses:** the existing deep-merge apply path in `app/api/sell/shop/route.ts`;
`MANUAL_SECTIONS` precedent in `lib/settings-import.ts` for the excluded `bank_transfer`.
**Risk:** HIGH (escrow/checkout-adjacent; new validation on a previously-unvalidated block).
**Kill-switch:** `mcp.checkout_config.enabled`, default OFF.

## Sprint QA
- **api spec(s):** one per story — 4.1 covers the full `normalizeSupportSettings` validation
  matrix + confirms the product-provisioning side effect actually happens and is reported; 4.2
  covers the new `escrow_mode` enum + boolean coercions + confirms `bank_transfer`/`contact_email`
  are correctly rejected/ignored when an agent tries to set them directly.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **browser smoke owed:** **yes, to Daniel, both stories** —
  - 4.1: enable support via the tool on a test shop, confirm the provisioned support product
    actually appears and is purchasable.
  - 4.2: flip `escrow_mode` via the tool, confirm checkout behavior actually changes (e.g. escrow
    becomes required/optional/off as set) on a real test checkout.

## Sprint 4 — Smoke walkthrough (do these in order, once each flag is flipped ON in a test shop)
Env: production (or preview, flag forced on for the test shop only)

1. Call `patch_store_configuration` with a `support` block enabling the widget + valid preset
   amounts.
   → Tool response explicitly states a support product was provisioned; the product is visible
   on the shop and purchasable for a preset or custom amount within range.
2. Call `patch_store_configuration` with an invalid `support` block (e.g. 2 presets instead of 3).
   → Tool returns `isError:true` naming the exact violation; no product is provisioned.
3. Call `patch_store_configuration` with a `checkout` block setting `escrow_mode: "required"`.
   → A subsequent test checkout on that shop shows escrow as required, not optional/off.
4. Attempt to set `bank_transfer` or `contact_email` directly via the `checkout` block.
   → Both are ignored/rejected exactly as the portal route already behaves — no live bank/contact
   info changes as a side effect of an agent call.

If any step fails, note the step number + what you saw — that's the bug report.
