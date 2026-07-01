# Seller agent connect — always-on personal MCP URL + Claude one-click, and a setup prompt that actually helps

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **03 · Selling & Shops** (the seller connects their own agent; Agent-native setup / "Conecta tu
agente" follow-up). Epic slug `seller-agent-connect-mcp-url`.
Class: **Feature** (a personal, always-accessible MCP URL + Claude deep-link — touches the **auth** surface) +
a **copy** improvement (the setup emit prompt). Two parts, one epic because both are "make the agent hand-off
actually work end-to-end for a seller."

> One ask, two parts. The token/URL part carries **auth risk** (HIGH); the prompt part is Low copy. Sliced so
> the copy fix can ship first and the auth work lands behind confirmation.

## Mirror-back
> On new-shop setup you want two things fixed: (1) the copy-paste **setup prompt** shouldn't just emit
> `{"miyagi_setup_version":"1"}` when the seller pastes nothing — it should give the agent Miyagi context
> (read a URL/spec first), and if the seller offers nothing, **interview them**, then produce a real setup file;
> and (2) on `/sell/setup` the seller shouldn't have to hunt for a "generate token" button — the **token should
> already exist and always be copyable**, we should offer a **full personal MCP URL** (because Claude's connector
> modal takes only a URL), and a **one-click link** to `https://claude.ai/customize/connectors?modal=add-custom-connector`
> so they just name it and paste. Right?

## Research — why the personal MCP URL is load-bearing (present-day facts, 2026-07-01)
**Claude.ai custom connectors do NOT accept a Bearer token or custom headers.** The "Add custom connector"
modal takes a **remote MCP server URL** and, under *Advanced settings*, only an **OAuth Client ID / Secret** —
there is no field for `Authorization: Bearer` or arbitrary headers (an open, still-unresolved feature request).
Today `ConnectAgentPanel` hands the seller a `claude_desktop_config.json` snippet with
`"headers": { "Authorization": "Bearer ms_agent_…" }` — which works for **Claude Desktop / CLI config files**
but **cannot be entered in the claude.ai connector UI at all**. So for a seller to connect via claude.ai, the
credential must travel **in the URL** (path/query) or via **OAuth**. Daniel's call: **token-in-URL for Claude**
(keep the header snippet for other clients); OAuth is a heavier future option, out of scope here.
Sources: Claude Help Center — custom connectors (remote MCP); Claude docs — connector authentication; GitHub
`anthropics/claude-ai-mcp` #112 ("Cannot configure Authorization: Bearer for custom remote MCP").

## Root cause / current state (read against code, 2026-07-01)

**Part A — the setup emit prompt under-delivers on empty input.** `buildSetupPrompt()` (`lib/setup-spec.ts`)
instructs the agent to convert *what the seller shares* into one JSON object and — critically — to *"return
ONLY the valid JSON object, no markdown, no text before or after."* It never tells the agent to (a) **read a
Miyagi context source** (e.g. `/api/ucp/setup-spec`, `/acerca`, `/vende`) to understand the platform, or (b)
**interview** the seller when they provide nothing. So with no seller input the agent has nothing to emit and
returns the bare skeleton `{"miyagi_setup_version":"1"}`. The prompt is otherwise solid (schema, language
directive, manual-steps list) — this is a **prompt-content** gap, not a mechanism bug.

**Part B — the token is show-once + button-gated; there is no personal URL.**
- `ConnectAgentPanel` (rendered on `/sell/setup` success and in seller settings) shows a **"Generar token de
  agente"** button; the plaintext token is returned **once** and only its **SHA-256 hash** is stored at
  `marketplace_shops.metadata.ucp_agent_token_hash` (`/api/sell/agent-token`, `lib/agent-auth.ts`). It cannot
  be retrieved again — so "already generated + always accessible to copy" is impossible with the current
  hash-only model.
- The copyable artifact is an MCP **config JSON with a header** — unusable in the claude.ai modal (see research).
- There is **no personal MCP URL** and **no claude.ai deep-link**.
- MCP auth today: `/api/ucp/mcp` reads `Authorization: Bearer ms_agent_…` and resolves the shop by matching the
  hash in shop metadata (seller tools are scoped to that one shop). Any URL-credential path must resolve to the
  **same** scope check.

## Design fork (the key decision) — how "always accessible" + "URL credential" coexist with security
The current model stores only a hash precisely so a leaked DB can't reveal tokens. "Always re-showable" needs
the credential to be **recoverable or re-presentable**. Three options:

- **(Recommended) Opaque per-shop connector slug in the URL path.** Mint a random, revocable **connector id**
  (not the bearer secret) e.g. `https://miyagisanchez.com/api/ucp/mcp/c/<slug>`; the server resolves `<slug>` →
  shop and grants the same seller scope. The slug is an *identifier* (rotatable, revocable, one-shop-scoped),
  so it can be stored retrievably and **always re-displayed** without exposing a password-equivalent secret.
  Keep the Bearer header path unchanged for Desktop/CLI clients. Rotating the slug instantly kills old URLs.
- **Encrypt the bearer token at rest** so the same `ms_agent_…` can be re-shown and embedded in the URL.
  Simpler conceptually, but now a reversible secret lives in the DB and in URLs (logs/referrers) — weaker.
- **OAuth on the MCP server.** The "correct" MCP path (Claude does the OAuth dance, no secret in URL). Most
  secure, most work; defer.

All three are **HIGH risk** (they change how an agent authenticates to seller-scoped, money-adjacent tools).
Recommendation: option 1, behind a kill-switch, with the slug scoped read/write exactly as the current token.

## What already exists (reuse, don't rebuild)
- `lib/setup-spec.ts` `buildSetupPrompt()` / `SETUP_LANGUAGE_DIRECTIVE` / `/api/ucp/setup-spec` + MCP
  `get_setup_spec` — the prompt + spec surface. Part A edits the **prompt body** only; the schema/validators
  (`validateSetup`, `/api/sell/shop`, `/settings-import`, `/import`) are untouched.
- `ConnectAgentPanel` + `/api/sell/agent-token` (POST/DELETE) + `lib/agent-auth.ts` — the token mint/store/
  revoke. Part B extends: auto-provision on load, render the personal URL, add the deep-link.
- `/api/ucp/mcp/route.ts` bearer-token resolution (shop scope) — the exact scope the URL path must reuse.
- `SetupClient.tsx` `LoopClose` (the "Tu agente como tu dependiente" + "Conecta tu agente" panel from Daniel's
  screenshot) — where the improved panel renders; also seller settings → "Agentes e integraciones".

## Medusa-first reframe (AGENTS five-rule check)
- **Rule 1 (Medusa commerce):** untouched — the connector URL still calls the **existing** seller MCP tools;
  no new commerce write path.
- **Rule 2 (Supabase):** the connector slug/token lives in `marketplace_shops.metadata` (non-commerce identity)
  — same place the hash lives today. No new commerce table.
- **Rule 3 (UCP/MCP first-class):** **reinforced** — this makes the seller MCP endpoint reachable from the
  dominant client (claude.ai), which today it effectively isn't. Manifest/tool set unchanged.
- **Rule 4 (Clerk untouched):** the seller still authorizes minting via their Clerk session; the connector slug
  is an *agent* credential scoped to one shop, not a user auth replacement. **Do not** let it authenticate a
  human session or widen scope beyond the current token.
- **Rule 5 (es-MX):** all seller-facing copy es-MX; the emit prompt already carries the language directive.

## In scope (v1)
- **Part A:** rewrite `buildSetupPrompt()` so the agent (1) reads a Miyagi context source first, (2) interviews
  the seller when input is thin, (3) confirms the objective, then (4) emits the setup file — while keeping the
  "final output is one valid JSON object" contract and the language directive. (Also surfaces the same on
  `/agent` and `/api/ucp/setup-spec`, which render `buildSetupPrompt()`.)
- **Part B:** a per-shop **personal MCP URL** (recommended: opaque connector slug in the path), **auto-created**
  so it exists without a button press and is **always copyable**; `ConnectAgentPanel` shows the URL + a
  **"Agregar a Claude"** button linking to `https://claude.ai/customize/connectors?modal=add-custom-connector`;
  the header/JSON snippet stays for Desktop/CLI; rotate + revoke controls; behind a kill-switch.

## Out of scope (v1)
- Full **OAuth** on the MCP server (future; noted in the fork).
- Changing the seller MCP **tool set** or scope (same tools, same one-shop scope).
- Payments / custom domain / Cal.com connection (stay manual, as today).
- Buyer-side MCP (no auth) — unchanged.
- The promoter funnel + SEO asks (separate scope docs).

## UX heuristics
- **Zero-hunt:** landing on `/sell/setup` success (or settings), the seller sees a ready-to-copy personal URL —
  no "generate" step to discover.
- **One-paste to Claude:** the "Agregar a Claude" button opens the connector modal; the seller names it and
  pastes the URL — nothing else.
- **Interview-by-default:** a seller who pastes nothing into their agent still ends up with a real shop, because
  the prompt makes the agent ask.
- **Revocable + legible security:** rotating the URL instantly invalidates the old one; copy explains the URL is
  a shop-scoped agent credential (treat like a password), and payments/domain stay manual.

## Acceptance criteria (Daniel-testable)
- **Part A:** paste the emit prompt into Claude/ChatGPT with **no** catalog → the agent asks interview
  questions (and/or reads the linked Miyagi context) and only then produces a valid setup file — it does **not**
  reply with a bare `{"miyagi_setup_version":"1"}`. With real input, output still round-trips through
  `validateSetup` unchanged.
- **Part B:** on `/sell/setup` (and settings) a personal MCP URL is **already present and copyable** with no
  button press; "Agregar a Claude" opens the connector modal; pasting the URL there connects and the seller's
  agent can call a seller tool (e.g. `get_store_configuration`) scoped to **their** shop only; rotating the URL
  breaks the old one; the Desktop/CLI header snippet still works.

## Slices → sprints (epic `03-selling-and-shops/seller-agent-connect-mcp-url`)

### Sprint 1 — Setup prompt that helps (skateboard, ships alone, Low)
| # | Story | Risk | QA |
|---|---|---|---|
| 1 | **As a** prospective seller, **I want** the setup prompt to read Miyagi context + interview me when I give little, **so that** my agent produces a real shop, not an empty skeleton. (rewrite `buildSetupPrompt`) | Low | `api` spec: prompt string contains the interview + context-read + "ask before emitting" instructions and still the JSON-only final-output contract + language directive; renders on `/agent` + `/api/ucp/setup-spec` |

### Sprint 2 — Always-on personal MCP URL + Claude one-click (the car, HIGH · Daniel merges)
| # | Story | Risk | QA |
|---|---|---|---|
| 2 | **As a** seller, **I want** a per-shop MCP connector URL that always exists, **so that** I never hunt for a token. (mint/auto-provision the opaque connector slug; server resolves slug → shop scope, reusing the current token scope check) | **High (auth)** | `api` spec: valid slug URL resolves to the shop's seller tools; invalid/rotated/revoked slug → 401; scope can't reach another shop |
| 3 | **As a** seller, **I want** to copy my URL and add it to Claude in one click, **so that** connecting is trivial. (`ConnectAgentPanel`: show URL always, "Agregar a Claude" → connector modal deep-link, keep header snippet, add rotate/revoke) | **High** (renders a live credential) | `api`/browser: panel shows a copyable URL with no button press; deep-link href correct; rotate invalidates old |
| 4 | **Chore/kill-switch + tests:** gate Part B behind a flag (default off → merge dark), lock the slug auth with `api` specs, write the Sprint smoke walkthrough. | High (flag polarity) | Deterministic gate green; flag asserted both states |

## QA stage
- **Deterministic gate (every story):** `tsc --noEmit` + `npm run build` + Playwright `api` suite.
- **Free coverage seams:** the emit-prompt string (pure) and the slug→scope resolver (extract a next-free seam
  in `lib/agent-auth.ts`) → `api` specs. Assert **both** flag states and the `flag → auth → config` ordering
  (LEARNINGS: promoter-program S3/S4).
- **Owed to Daniel (browser/authed):** the real claude.ai "add connector → paste URL → call a seller tool"
  round-trip (an automated smoke can't drive the claude.ai modal or judge the agent); the Part-A prompt quality
  is judged by pasting into a real agent.

## Risk tiers
Sprint 1 **Low** (copy only). Sprint 2 **High** across the board (a new **authentication path** to seller-scoped,
money-adjacent MCP tools) → **Daniel merges**, behind a kill-switch, seeded/verified per the flag run-order.

## Open questions for Daniel
1. **Auth design (the fork above):** opaque connector slug in the path (recommended), encrypt-the-bearer, or go
   straight to OAuth? Default: opaque slug.
2. **Auto-provision timing:** create the connector URL at **shop creation** (so it always exists) or lazily on
   first `/sell/setup`/settings view? Default: lazily on first view, then persistent.
3. **URL shape:** `/api/ucp/mcp/c/<slug>` (path) vs `?c=<slug>` (query). Default: path (cleaner, less
   log/referrer leakage than a query string).
4. **Deep-link target:** confirm `https://claude.ai/customize/connectors?modal=add-custom-connector` is the URL
   you want the button to open (vs the settings-connectors page). Default: your provided modal URL.
