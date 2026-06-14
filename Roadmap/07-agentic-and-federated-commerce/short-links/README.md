---
status: shipped
slug: short-links
---

# Epic — Short links (`mschz.org/shop` and `mschz.org/product`)

**Macro-section:** 07 · Agentic & federated commerce
**Siblings:** [custom-slugs](../custom-slugs/), [subdomains](../subdomains/), [custom-domain-polish](../custom-domain-polish/).

## Why

An **ultra-short, branded** domain to share in Instagram/TikTok bios, WhatsApp, SMS, and business cards.
`mschz.org/[x]` does a **301** to the shop's or product's canonical URL. It's the "share" layer on top of
everything already built (slugs, 90-day alias, canonical, custom domains).

## Decisions (Daniel, this session)
1. **Listings: both identifiers.** A **short code is minted** for every listing now (always works); a
   **customizable product slug** comes later (phaseable — the slug is checked before the code).
2. **Flat namespace, shop-first**: `mschz.org/[x]` → shop slug → shop alias → product slug → product code
   → branded 404.
3. **mschz.org** was removed from the Vercel project (validated that removing a custom domain works); in
   Cloudflare the apex still CNAMEs to `cname.vercel-dns.com` but **proxied** (returns CF IPs, 404).
   Re-add it to the project; set it **DNS-only** in Cloudflare so Vercel serves it + issues the cert.
4. The **project-scoped `VERCEL_API_TOKEN`** (in `.env.local`) suffices (project-domain op) — no account
   token; **revoke the temporary `vcp_8ev2…` token**.

**Redirect target = the canonical** (reuses existing logic): custom domain if live, else `/s/[slug]`
(shop) or `/l/[id]` (product). 301, case-insensitive.

## What's reused
- `lib/slug-redirect.ts` `getSlugRedirect`/`pickAliasTarget` — shops + retired slugs for free.
- `lib/custom-domain.ts` `getActiveCustomDomain` — canonical target when a custom domain is live.
- `marketplace_listings` (mirror, `lib/provisioning.ts`) with a `metadata` jsonb → store `short_code`
  (and later `short_slug`), **no migration**.
- The host-branch pattern in `middleware.ts` + the label rules from `lib/subdomain.ts`.
- `addDomainToProject` (`lib/vercel-domains.ts`) — re-add `mschz.org`.

## ✅ EPIC COMPLETE — LIVE 2026-06-06 (PR #30 core + PR #31 fast-follows)

`mschz.org/[x]` → 301 to the canonical. Smoke green: `/miyagiprints`→`/s/…`, `/MiyagiPrints`
(case-insensitive), `/iwnuyx`→`/l/[id]`, `/noexiste`→`/404`, `/`→home. Cloudflare DNS-only + Vercel cert.
**Fast-follows already shipped (PR #31):** product short-link UI (copy) + customizable product slug
(`short_slug`). See [RETROSPECTIVE.md](./RETROSPECTIVE.md).

## Scope (one sprint)

See [sprint-1.md](./sprint-1.md). Frontend only.

| Step/Story | What it ships | Risk |
|---|---|---|
| Step 0 | `mschz.org` in the Vercel project + DNS-only in Cloudflare | HIGH (prod domain) |
| US-1 | Short-link routing for shops (301 + branded 404) | HIGH (`middleware.ts`) |
| US-2 | Per-listing short codes + resolution → `/l/[id]` | MEDIUM |
| US-3 | UI: show/copy the short link (shop + product) | LOW |
| US-4 (phaseable) | Customizable product slug | LOW |

**Risk: MED-HIGH → Daniel merges.** Touches `middleware.ts` (shared) + a prod domain + listing-creation
plumbing. Announce the `middleware.ts` change. Isolated worktree; merge `main` before the PR.

## Definition of Done (epic)
- [x] `mschz.org` live + stories merged; smoke green (product UI fast-follows declared).
- [x] `sprint-1.md` ✅ + refs. · [x] `RETROSPECTIVE.md`. · [x] Poster. · [x] Memory + `MEMORY.md`. · [x] `LEARNINGS.md`. · [x] Branches/worktrees clean.
