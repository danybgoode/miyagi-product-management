# Onboarding 0 — agent-native shop setup (raw, pre-scope)

> RAW capture (2026-06-07). Working name "**Onboarding 0**" (find a better name). Captured from
> Daniel's north-star during the #6 groom. Not scoped — a future groom run. The deepest, highest-
> leverage piece of the agent-native GTM.

## The promise
A seller's **own** AI agent does almost the entire setup. The platform's only job is the rails +
the ~20-second signup gate. "Their personal agent becomes their shop clerk."

## The loop (end to end)
1. **Discover.** The visitor asks their agent: *"¿qué es miyagisanchez.com?"* The agent fetches the
   site, explains it in the user's terms, and offers to set up the shop — *free, risk-free; if you
   don't like it, just leave it.*
2. **Build (agent-side).** The agent produces the **standardized setup JSON** (the existing
   Storefront-as-Code / bulk-import schema) — shop dressing + products — from whatever the user has
   (photos, an Instagram catalog, a paste, a description).
3. **Sign up (the only gate).** The agent hands the user a signup link with simple instructions:
   *"regístrate, ~20s con Google; caerás en la página de onboarding."*
4. **Apply.** On onboarding the user **pastes or uploads the JSON** (or downloads it from the agent,
   then uploads) → steps through → **shop + catalog near-fully created**.
5. **Close the loop.** The user returns to their agent with a **copied prompt** that instructs the
   agent to: guide MCP setup (on Claude) / discover UCP capabilities, then **polish + maintain** the
   shop ongoing. The agent is now the shop clerk — an intro to its own services and how to use them.
6. **Operate.** Sellers focus on **creative + strategy** (pricing optimization, promotions, research
   at scale, tactics → implementation); upload via predefined JSON **or** directly via MCP/UCP. The
   agent can propose a **division of labor** — specialized profiles (CEO / CMO / COO …).

## Why it's cheap for us
The agent does cataloging, copy, pricing, and maintenance. We run thin rails. High creative output
for sellers; minimal (or much-reduced) infra cost for us.

## What already exists (reuse, don't rebuild) — to confirm at groom
- **Bulk import / express migration** — file/paste → AI parse → staging → idempotent import (03).
- **Storefront-as-Code** config file (shop dressing) + **seller MCP tools** (read/patch config,
  manage + **create** listings) (03 · 07).
- **`/sell` onboarding wizard** — the paste/upload destination.
- **UCP/MCP discovery** — `/agent`, manifest, `.well-known/ucp` (07).
So Onboarding 0 is largely **packaging an existing pipeline into a guided agent loop** + the prompts
and the post-setup seller experience polish — not a from-scratch build. Confirm scope at groom.

## Open questions for its groom (later)
- The standardized JSON: exactly which schema (the current import/Storefront-as-Code one?) and does
  the agent need a published, versioned spec to emit it reliably?
- The "copied prompt" handoffs (setup → operate): canonical, versioned, bilingual prompt templates.
- Post-setup seller experience: clear follow-up instructions so the loop actually closes.
- Division-of-labor profiles (CEO/CMO/COO): real feature or just prompt guidance in v1?
- Better name than "Onboarding 0."
