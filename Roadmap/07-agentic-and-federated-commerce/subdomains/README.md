# Epic — Multi-tenant subdomains (`yourshop.miyagisanchez.com`)

**Macro-section:** 07 · Agentic & federated commerce
**Sibling channels:** [custom-slugs](../custom-slugs/) (free tier), [custom-domain-polish](../custom-domain-polish/) + [own-shop-experience](../own-shop-experience/) (premium tier, custom domain).

## Why

Shop addressing tiers:

| Tier | Address | Status |
|---|---|---|
| Free | `miyagisanchez.com/s/my-shop` | ✅ shipped 2026-06-06 |
| **Mid (this epic)** | `my-shop.miyagisanchez.com` | 🚧 |
| Premium | `myshop.com` (custom domain) | ✅ already exists |

The subdomain makes the shop **feel like an independent business** without the seller buying a domain.
**The subdomain IS the slug** — so it reuses almost everything already built.

## Decisions (Daniel, this session)
1. **Automatic for every shop** — subdomain = slug, live instantly via the wildcard (no opt-in, no new DB field).
2. **`/s/[slug]` stays canonical** — the subdomain serves the shop but points canonical to `/s/[slug]` (no SEO disruption; the subdomain is a clean alias). *The existing canonical logic already emits `/s/[slug]` for shops without a custom domain → no change.*
3. **Anonymous + platform hop** — no Clerk session on the subdomain; sign-in/checkout/account hop to `miyagisanchez.com` (same as custom domains today).
4. **The `*.miyagisanchez.com` wildcard** is provisioned by the agent via the Vercel API (apex already on Vercel NS → the cert issues itself).

**Key finding:** the AC's OWASP concern about "session leakage between sibling subdomains" is **nearly N/A**
— every `*.miyagisanchez.com` host is served by **our own Next app**, not tenant code, so there's no
cross-tenant code execution that could leak a session. With decision #3 (anonymous + hop) no Clerk session
is even created on the subdomain.

## What's reused (don't rebuild)
- The custom-domain branch in `middleware.ts` — the subdomain branch mirrors it.
- White-label render in `app/layout.tsx` (the `x-miyagi-channel` key) — extended to `'subdomain'`.
- `lib/slug.ts` `RESERVED_SLUGS` — guard for reserved subdomains.
- `lib/slug-redirect.ts` — the old→new slug 301 (90 days) applies as-is (subdomain = slug).
- `lib/vercel-domains.ts` `addDomainToProject` — registers the wildcard.
- `lib/channel.ts` + the URL block in settings (from custom-slugs) — attribution + discovery.

## ✅ EPIC COMPLETE — LIVE 2026-06-06 (PR #27 feature + PR #28 cleanup)

`<slug>.miyagisanchez.com` serves white-label with a real wildcard cert (apex moved to Vercel NS).
Smoke green: `miyagiprints.miyagisanchez.com` → 200 white-label, cert `*.miyagisanchez.com`,
reserved/unknown → 404, auth (clerk/accounts) + email intact. See [RETROSPECTIVE.md](./RETROSPECTIVE.md).

## Scope (one sprint)

See [sprint-1.md](./sprint-1.md). Frontend only.

| Step/Story | What it ships | Risk |
|---|---|---|
| Step 0 | Provision the `*.miyagisanchez.com` wildcard in Vercel | HIGH (prod domain) |
| US-1 | Subdomain routing + white-label + `subdomain` channel + alias 301 | HIGH (`middleware.ts`) |
| US-2 | Platform hop for auth/checkout from the subdomain | HIGH (auth) |
| US-3 | Subdomain discovery in settings (show + copy) | LOW |

**Risk: HIGH → Daniel merges.** Touches `middleware.ts` (shared, every request), a prod wildcard domain,
and the auth hop. Announce the `middleware.ts` change (cross-cutting). Isolated worktree; merge `main`
before the PR.

## Definition of Done (epic)
- [x] Wildcard live + stories merged to `main`; smoke green (gaps declared in the retro).
- [x] `sprint-1.md` ✅ + commit refs.
- [x] `RETROSPECTIVE.md`.
- [x] Poster `Roadmap/README.md` updated.
- [x] Memory + `MEMORY.md`.
- [x] `Roadmap/LEARNINGS.md` with the durable lessons.
- [x] Branches/worktrees clean.
