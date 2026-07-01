# Seller agent connect — Sprint 2: always-on personal MCP URL + Claude one-click (the car)

**Status:** 📋 planned (approved 2026-07-01) · same branch or `feat/seller-agent-connect-mcp-url-s2` off latest `main`
**Risk:** **HIGH (auth)** across the board — a new authentication path to seller-scoped, money-adjacent MCP
tools. Behind a kill-switch (default off → merge dark). **Daniel merges.**

> **Design decision (default, confirm at kickoff):** the personal MCP URL carries an **opaque, revocable
> per-shop connector slug** in the **path** — `https://miyagisanchez.com/api/ucp/mcp/c/<slug>` — that the
> server resolves to the shop and grants the **same** seller scope as today's Bearer token. The slug is an
> identifier (rotatable/revocable, one-shop-scoped), so it can be stored retrievably and **always re-shown**
> without exposing a password-equivalent secret. (Alternatives considered + rejected for v1: encrypt-the-bearer;
> full OAuth — see scope doc.)

## Story 2.1 — Personal MCP URL that always exists and resolves to the shop scope
**As a** seller, **I want** a per-shop MCP connector URL that's always present, **so that** I never hunt for a
token.
**Changes:**
- Mint/auto-provision an opaque connector slug for the shop, stored in `marketplace_shops.metadata` alongside
  the existing token hash; provide rotate + revoke.
- Add a URL-credential path on the MCP server (`/api/ucp/mcp/c/<slug>`) that resolves `<slug>` → shop and
  grants **exactly** the current seller-tool scope (reuse the `app/api/ucp/mcp/route.ts` resolver; do not widen
  scope or add tools). Keep the `Authorization: Bearer` header path working unchanged.
- Extract the slug→scope resolution into a next-free `lib/` seam for unit coverage.
**Acceptance:** a valid slug URL lets the seller's agent call a seller tool (e.g. `get_store_configuration`)
scoped to **their** shop only; an invalid/rotated/revoked slug → 401; the slug can never reach another shop's
tools; the Bearer header path is unaffected.
**Risk:** **high (auth)** · **QA:** `api` specs: valid→scope, invalid/rotated/revoked→401, cross-shop→denied;
assert the **flag → auth → config** ordering (LEARNINGS) and **both** flag states.

## Story 2.2 — Always-shown copyable URL + "Agregar a Claude" one-click
**As a** seller, **I want** to copy my URL and add it to Claude in one click, **so that** connecting is trivial.
**Changes (`components/ConnectAgentPanel.tsx`):**
- On load, ensure the connector URL exists (auto-provision if absent) and **always render it copyable** — no
  "Generar token" gate to discover.
- Add an **"Agregar a Claude"** button linking to
  `https://claude.ai/customize/connectors?modal=add-custom-connector` (confirm target at kickoff).
- Keep the Claude Desktop / CLI **header snippet** (with the Bearer token) for non-claude.ai clients, clearly
  labeled "para Claude Desktop u otros clientes".
- Add **rotar** + **revocar**; copy explains the URL is a shop-scoped agent credential (treat like a password)
  and that payments/domain/Cal.com stay manual.
**Acceptance:** landing on `/sell/setup` success (and settings) shows a copyable personal URL with **no** button
press; "Agregar a Claude" opens the connector modal; pasting the URL there connects; rotating breaks the old
URL; the header snippet still works for Desktop.
**Risk:** **high** (renders a live credential) · **QA:** `api`/browser: panel shows a copyable URL with no
click; deep-link href correct; rotate invalidates the old URL (ties to 2.1's spec).

## Story 2.3 — Kill-switch + auth specs + smoke walkthrough
**As a** builder, **I want** Part B behind a flag with the auth path locked by specs, **so that** it merges dark
and can't regress.
**Changes:** gate the URL-credential path + the panel's URL/deep-link behind a kill-switch (default **false**,
created **disabled**); write the auth `api` specs (both flag states); write the smoke walkthrough below.
**Acceptance:** flag off → URL path 404s / panel shows the legacy token flow; flag on → the new flow; specs
green both ways.
**Risk:** high (flag polarity) · **QA:** deterministic gate green; flag asserted both states.

## Sprint QA
- **api specs:** slug→scope resolver (2.1), panel URL presence + deep-link (2.2), flag both-states (2.3).
- **Free coverage seam:** the slug→scope resolver (pure `lib/` seam).
- **owed to Daniel (authed/browser):** the real claude.ai "add connector → paste URL → call a seller tool"
  round-trip (an automated smoke can't drive the claude.ai modal or judge the agent); prod money/auth infra
  seeded with **real** creds per the flag run-order (LEARNINGS).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the branch preview URL while testing pre-merge) · flag **on**

1. As a seller, open `https://miyagisanchez.com/sell/setup` (post-setup) or shop settings → "Conecta tu agente".
   → You see a **personal MCP URL already filled in and copyable** — no "Generar token" step first.
2. Click **Copiar** on the URL, then **"Agregar a Claude"**.
   → claude.ai opens the "add custom connector" modal; paste the URL, give it a name, save. **[auth — owed to Daniel]**
3. In Claude, ask your agent to read your shop config (it calls `get_store_configuration`).
   → It returns **your** shop's config only — never another shop's. **[auth/scope — owed to Daniel]**
4. Back in the panel, click **Rotar**, then retry the old URL in Claude.
   → The old URL now fails (401); the new one works. **[auth — owed to Daniel]**
5. Confirm the Claude **Desktop** header snippet still connects a desktop client (regression).

Steps 2–4 are the **auth path** — owed to Daniel by name (an automated browser smoke can't cover the claude.ai
modal or judge scope). If any step fails, note the step number + what you saw.
