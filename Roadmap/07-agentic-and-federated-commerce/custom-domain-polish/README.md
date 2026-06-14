---
status: shipped
slug: custom-domain-polish
---

# Epic — Own channel: custom-domain polish (custom-domain-polish)

**Macro-section:** 07 · Agentic & federated commerce
**Sibling channel:** [embeddable-widget](../embeddable-widget/) (same product domain: take the shop outside the marketplace).

## Why

"Own channel" is already **built and working** (~80%): the seller enters their domain, gets DNS guides per
registrar (GoDaddy / Namecheap / Cloudflare + automation via a Cloudflare token), the system checks DNS
every 8 s, and once ready it shows the shop live on two channels. The plumbing (`lib/vercel-domains.ts`,
`app/api/sell/shop/domain/*`, the domain rewrite in `middleware.ts`) is solid.

This epic **rebuilds nothing** — it polishes the seller's setup experience where it's vague or subtly wrong
today, per the acceptance list in `Roadmap/00-ideas/seeds/custom-domain-polish.md`.

## Scope (one sprint)

A single delivery, story by story — see [sprint-1.md](./sprint-1.md):

| Story | What it polishes | Risk |
|---|---|---|
| US-1 | Four explicit states (`pending_dns` / `unverified` / `error` / `active`) with copy + fix suggestion | LOW |
| US-2 | Show the real SSL certificate status (issuing vs active) | LOW |
| US-3 | Change domain without deleting (edit→replace flow) | LOW |
| US-4 | Clear message when the domain is already in use (Vercel-side conflict) | HIGH (provisioning) |
| US-5 | Proper subdomain support + apex-domain robustness (A record) | HIGH (provisioning/verification) |
| US-6 | Mobile pass (everything works on a phone) | LOW |
| US-7 | Confirmation when deleting a domain | LOW |
| Cleanup | `panuchas.com` on Vercel — **verified: does not exist** in any team project/record; nothing to delete | — |

## ✅ EPIC COMPLETE — SHIPPED to prod 2026-06-04 (PR #8, merge `07ddb9a`)

## Definition of Done (epic)

- [x] All 7 stories merged to `main` and verified (Daniel's browser smoke OK).
- [x] `sprint-1.md` with each story ✅ + commit ref.
- [x] `RETROSPECTIVE.md` written.
- [x] Product poster updated (`Roadmap/README.md`).
- [x] Team memory updated.
- [x] Branch `feat/custom-domain-polish` deleted after merge.

## Notes

- **Frontend only** (`apps/miyagisanchez`). Runs in parallel with `feat/sweepstakes` — don't touch its
  files (`app/g/[slug]`, `app/shop/manage/sweepstakes`, the Stripe/MP webhooks).
- **We don't touch `middleware.ts`** (shared risk) — the domain rewrite already works.
- Strings in **es-MX** to match the section's convention (the section is 100% Spanish, no i18n keys).
- Previews are behind SSO → smoke with the bypass token / prod-after-merge.
- Single PR, **HIGH risk** (touches provisioning/verification) → **Daniel merges**.
