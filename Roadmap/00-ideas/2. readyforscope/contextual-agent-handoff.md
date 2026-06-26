# Navigation polish — contextual AI-agent handoff + AI/theme icon disambiguation

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **07 · Agentic & Federated Commerce** (the contextual handoff is the core value).
Slug: `contextual-agent-handoff`.
Class: **Feature** (contextual agent handoff) + a small **Chore** (icon disambiguation), kept in one
small epic because both are "navigation polish" touching the same chrome. The icon story could alternatively
live under `09 · Platform & Infra` — flagged for Daniel at approval.

> One ask, two parts. Resisted merging unrelated ideas — these share the navbar surface and ship together cheaply.

## Mirror-back
> You want the **"Compra con tu agente IA"** card (opened from the AI icon in the top navbar) to:
> 1. be **fully Spanish** (today the prompt body is English with a Spanish closing line), and
> 2. become **contextual** — the pre-filled prompt changes by page so the user can always copy something
>    specific and useful. On a product page it carries that product (URL + title/price) with a ready prompt
>    like "estoy viendo este producto… ¿puedes revisarlo y…?"; on catalog/search it carries the active
>    search; on a shop it carries the shop; on account/orders it offers order help.
> And separately: the **seasonal/designer theme** feature currently borrows the **same sparks icon** as the
> AI feature. You want them visually distinct — the **theme toggle moves to `iconoir-flask`**, the AI handoff
> **keeps sparks** (the industry-standard AI glyph). Right?

## Daniel's grooming calls (2026-06-25)
- **Icon:** theme toggle → `flask`; AI button keeps `sparks`. (Daniel floated `flask` or `flask-solid` —
  builder confirms which exists in the pinned iconoir at build time.)
- **Sections covered (v1):** PDP, Catalog/search, Shop, **and** Account/orders. Homepage/everything else
  keeps a generic prompt.
- **Prompt data:** URL **+ key human-readable details** (title, price, shop name) — not just the bare URL,
  and not a full structured payload.
- **Language:** **es-MX only**. Modern agents handle Spanish instructions fine, so there is no "reason for
  English"; the bilingual closing line goes away.

## Stage-2.5 bucket
| Slice | Bucket | Why |
|---|---|---|
| Spanish-only prompt | **Light / copy** | One string today; just translate it. |
| Theme toggle icon → flask | **Light / config** | One class string in `PlatformThemeToggle.tsx`. |
| Pathname-aware prompt (URL only) | **Genuinely new, but small** | The card already builds a prompt + deep-links to Claude; this swaps a constant for a route-derived template. Pure client. |
| URL + human-readable details | **Genuinely new, small** | Needs pages to pass title/price/shop to the card — a thin client context provider + per-page setter. |
| Account/orders handoff in navbar card | **Light (reuse)** | The `AgentHandoff` component already does contextual order/refund prompts — reuse its prompt shape. |

**No net-new backend.** The agent already reads listings/shops over UCP/MCP, so a contextual prompt only
has to hand it the **canonical URL**; the human-readable details are a nicety for the person copying, not a
data dependency. This keeps the whole epic client-side and Low-risk.

## What already exists (reuse, don't rebuild) — verified against the repo 2026-06-25
| Capability | Where | Reuse for |
|---|---|---|
| The card itself — sheet UI, copy-to-clipboard, `claude.ai/new?q=…` deep-link, 3 variants (`icon`/`affordance`/`search`) | `app/components/AIAgentButton.tsx` | The whole UI; only the prompt source changes from a constant to a builder |
| The single hardcoded `AGENT_PROMPT` (English body + Spanish closing) | `AIAgentButton.tsx` L6–14 | Translate + become the "generic/default" template |
| **Contextual prompt pattern already in production** — takes a `prompt` prop, copies + opens Claude, on order/refund screens | `app/components/AgentHandoff.tsx` | The proven model for per-page prompts; account/orders story reuses its prompt shape |
| The mount points (server, static-able chrome) | `app/components/PlatformShell.tsx` L116/126/237 | Where the card lives; provider must be a client island since shell reads no request state |
| Theme toggle using the same sparks icon (`const icon = 'iconoir-sparks'`) | `app/components/PlatformThemeToggle.tsx` L46/85 | The one-line icon swap to `flask` |
| iconoir loaded from CDN `@main` | `app/layout.tsx` L106 | `iconoir-flask` confirmed valid (see research) |
| Route shapes for context detection | `app/(shell)/l/[id]` (PDP), `/l` (catalog), `/s/[slug]` (shop), `(site)/page.tsx` (home) | `usePathname()`/`useSearchParams()` route → template mapping |
| Marketplace briefing the prompt points agents at | `app/(shell)/agent/page.tsx` + `/api/ucp/*` | Keep the "read the briefing + UCP" preamble so a cold agent still works |

## Medusa-first reframe (AGENTS five-rule check)
- **Rule 1 (Medusa owns commerce):** untouched — no products/orders/payments code; we only read the URL.
- **Rule 2 (Supabase):** untouched — no new tables.
- **Rule 3 (UCP/MCP first-class):** **reinforced** — the contextual prompt hands the agent a canonical URL
  it resolves via the existing UCP/MCP endpoints. No new agent surface, no manifest change.
- **Rule 4 (Clerk):** untouched.
- **Rule 5 (es-MX default + bilingual allow-list):** the AI prompt is **not** on the bilingual allow-list;
  making it es-MX-only satisfies es-MX copy-completeness. Do **not** add it to the allow-list.

## In scope (v1)
- Spanish-only prompt copy across the card.
- Theme toggle icon → `flask` (`flask-solid` if preferred and present); AI keeps `sparks`.
- A pure prompt-builder seam (`lib/agent-prompt.ts`) mapping `{ pageType, url, title?, price?, shopName?,
  searchTerms?, orderRef? }` → the es-MX prompt string. (Free unit coverage.)
- Route-aware page-type detection in the card via `usePathname()`/`useSearchParams()`.
- A thin client `AgentContext` provider + per-page setter so PDP/shop can pass title/price/shop name.
- Contextual prompts for: **PDP, Catalog/search, Shop, Account/orders**; generic prompt everywhere else.

## Out of scope (v1)
- Any backend / Medusa / UCP-manifest change.
- Adding the prompt to the bilingual allow-list (stays es-MX only).
- Full structured payloads (attributes/variants/stock) in the prompt — the agent fetches those.
- Redesigning the card sheet UI, the three variants, or the navbar layout.
- Deep links to ChatGPT/Gemini (copy-to-clipboard already serves them; only Claude has a `?q=` deep-link today).
- Changing `AgentHandoff` on order/refund screens (reuse its shape, don't refactor it).

## UX heuristics
- **Always copy-ready:** opening the card on any page yields a prompt that's immediately useful — never a
  blank or generic stub on a page where we have context.
- **One recognizable AI glyph:** sparks = AI, everywhere; flask = theme/designer. No icon means two things.
- **Graceful default:** if page context is missing (race, unknown route), fall back to the generic prompt —
  never show a broken/empty prompt.
- **Agent still onboarded:** every prompt keeps the short "read the marketplace briefing + UCP" preamble so a
  cold agent works on first paste.

### Prompt phrasing to validate (PDP) — Daniel wanted options
Recommended (es-MX), to confirm in smoke:
> "Estoy viendo este producto en Miyagi Sánchez: «{title}» ({price}) — {url}. ¿Puedes revisarlo y darme más
> información, comparar opciones y decirme si vale la pena? Si quiero, ayúdame a hacer una oferta o completar
> la compra. (Lee primero la ficha del marketplace y UCP para poder buscar y comprar por la API.)"

Alternatives to A/B in the walkthrough: (a) terse "¿Me das más info de este producto? {url}"; (b) task-led
"Acabo de ver {url}, revisa precio, reputación del vendedor y disponibilidad." Catalog carries `{searchTerms}`;
shop carries `{shopName} — {url}`; account/orders carries `{orderRef}` + "ayúdame con este pedido".

## Acceptance criteria (Daniel-testable)
- Opening the card anywhere shows a **Spanish** prompt; copy + "Abrir en Claude" still work.
- The **theme toggle shows a flask**; the **AI button shows sparks**; no other sparks usages regressed.
- On a **PDP**, the copied prompt contains that product's **URL + title (+ price)**.
- On **/l with a search/filter**, the prompt contains the active **search terms**.
- On a **shop**, the prompt contains the **shop name + URL**.
- On an **order/account** page, the prompt offers **order-specific** help.
- On the **homepage / any other page**, a sensible **generic** Spanish prompt appears (no empties).

## Slices → sprints (all Low-risk: client-only UI/copy, no commerce/auth/money/migrations)

### Sprint 1 — Icon split + Spanish + URL-only contextual (skateboard, ships alone)
| # | Story | Risk | QA |
|---|---|---|---|
| 1 | **As a** user, **I want** the theme feature and the AI feature to use different icons, **so that** I can tell them apart. (theme→`flask`, AI keeps `sparks`) | Low | Visual smoke (Daniel) + grep no stray sparks regressions |
| 2 | **As a** Spanish-speaking shopper, **I want** the agent prompt in Spanish, **so that** it reads naturally. (translate + extract `lib/agent-prompt.ts` builder) | Low | Unit spec on the builder (generic case) |
| 3 | **As a** shopper, **I want** the prompt to match the page I'm on (URL-only), **so that** I can hand the agent something specific. (route→template via `usePathname`/`useSearchParams`; PDP/catalog/shop/account/default) | Low | Unit spec: route+searchParams → expected prompt; API/Playwright where assertable |

### Sprint 2 — Rich human-readable context (the car)
| # | Story | Risk | QA |
|---|---|---|---|
| 4 | **As a** shopper, **I want** the prompt to name the actual product/shop, **so that** it's readable. (thin `AgentContext` provider + per-page client setter; card consumes) | Low | Unit spec: builder with title/price/shopName |
| 5 | **As a** shopper on a PDP/shop, **I want** title+price / shop name embedded, **so that** the copied prompt is self-explanatory. (PDP + shop pages set context) | Low | Browser smoke (Daniel): real PDP prompt reads «title» (price) + URL |
| 6 | **As a** buyer on my orders, **I want** the navbar card to offer order-specific help, **so that** I can resolve issues fast. (reuse `AgentHandoff` prompt shape; order ref from route) | Low | Browser smoke (Daniel) on an order page |
| 7 | **Chore/test:** lock the builder with unit/API specs + write the Sprint smoke walkthrough. | Low | Deterministic gate green |

## QA stage
- **Deterministic gate (every story):** `tsc --noEmit` + `npm run build` + Playwright `api` suite.
- **Free coverage seam:** `lib/agent-prompt.ts` is pure → unit/`api` specs assert route+context → prompt
  string. This is the bulk of the coverage and replaces most hand-testing.
- **Owed to Daniel (browser smoke):** the actual copy→paste→agent round-trip and PDP-phrasing validation
  (Story 5/6) — an automated browser smoke can render-assert the card but can't judge the agent's reply.

## Open risks / notes
- **Static shell vs. dynamic context:** `PlatformShell` is server/static-able and reads no request state, so
  rich per-page context (Sprint 2) must flow through a **client** `AgentContext` island mounted in the
  layout — not through the shell. Sprint 1 (URL-only) sidesteps this entirely via client hooks.
- **`flask` vs `flask-solid`:** `iconoir-flask` confirmed present; `flask-solid` to be confirmed against the
  pinned `@main` build (builder picks whichever renders; default `flask`).
- **Catalog data to pass:** v1 passes **search terms/active filters** (already in `searchParams`), not a
  product list — the agent fetches results via UCP. Revisit only if Daniel wants richer catalog context.
- **No kill-switch needed:** all Low-risk, no money/auth/commerce path (WAYS risk-tier rule).
- **Icon-epic placement:** filed under 07-Agentic for cohesion; the icon story alone is 09-Platform-infra
  flavored — confirm at approval.

## Research citations
- iconoir CSS-package usage; class is `iconoir-` + icon name → `iconoir-flask` valid (iconoir docs / GitHub,
  fetched 2026-06-25). https://iconoir.com/docs/packages/css · https://github.com/iconoir-icons/iconoir
