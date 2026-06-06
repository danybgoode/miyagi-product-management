# Epic — Pretty URL: customizable shop slug (custom-slugs)

**Macro-section:** 07 · Agentic & federated commerce
**Sibling channels:** [custom-domain-polish](../custom-domain-polish/) (custom domain, premium tier),
[own-shop-experience](../own-shop-experience/) (white-label render on a custom domain).

## Why

The shop already lives at a canonical URL — `miyagisanchez.com/s/[slug]` — but the slug is
**auto-generated** from the name at shop creation and the seller **can't pick or change it**. For the
seller who doesn't want a custom domain (yet), a clean, self-chosen slug is the **free** way to share a
professional link on social and business cards, with no ugly IDs.

This is the cheapest tier of the shop addressing scheme:

| Tier | Address | Cost | Status |
|---|---|---|---|
| **Free (this epic)** | `miyagisanchez.com/s/my-shop` | $0 | 🚧 this epic |
| Subdomain (deferred) | `my-shop.miyagisanchez.com` | $0 | ⏸ infra ready (apex on Vercel NS) |
| Custom domain (premium) | `myshop.com` | domain | ✅ already exists |
| Short link (deferred) | `mschz.org/my-shop` | — | ⏸ `mschz.org` already owned |

**Medusa-first:** the slug is already authoritative on Medusa's `seller` model (`slug unique()`),
mirrored to Supabase for routing. **Zero new tables.** Old slugs (for the 301) live in the seller's
`metadata.previous_slugs` (no schema change), mirrored to Supabase for the fast lookup.

Acceptance source: `Roadmap/00-ideas/2. readyforscope/urlStuff.md` ("Custom slugs" section).

## What already exists (reuse, don't rebuild)

- `POST /store/sellers/me` **already accepts an optional `slug`** (slugifies + de-dupes) → picking a slug
  at creation is frontend-only.
- `slug = model.text().unique()` on the seller model → DB-level uniqueness.
- `GET /store/sellers/[slug]` already exists → reuse for the availability check.
- `PATCH /store/sellers/me` already merges `metadata` → `previous_slugs` with no schema change.
- `ensureSupabaseShopMirror` (`lib/provisioning.ts`) already mirrors seller→`marketplace_shops`.
- The cached+tagged lookup pattern from `lib/custom-domain.ts` → mirror it for the alias redirect.
- Page-level `permanentRedirect` (from own-shop-experience) for the 301.

## ✅ EPIC COMPLETE — SHIPPED to prod 2026-06-06 (backend PR #6 + frontend PR #26)

Seller-session browser smoke owed to Daniel (rename shop → new URL serves, old one 301s).

## Scope (one sprint)

See [sprint-1.md](./sprint-1.md). One small backend change + 5 frontend stories.

| Story | What it ships | Risk |
|---|---|---|
| Backend | `PATCH /store/sellers/me` accepts `slug` (format + reserved + uniqueness → 409) | MED-HIGH (routing key) |
| US-1 | `lib/slug.ts` (slugify/validate/reserved) + availability API | LOW |
| US-2 | Pick the slug at shop creation (auto-suggested, live availability) | LOW |
| US-3 | Edit the slug in settings (Medusa + `previous_slugs` 90d + mirror) | MEDIUM |
| US-4 | 301 redirect from old slug to new for 90 days | LOW |
| US-5 | Shop URL visible in settings + copy + upsell to custom domain | LOW |

**Deploy order:** backend first (Cloud Build ~12 min, no preview) — the frontend degrades gracefully until
it's live. Risk: Daniel merges both PRs.

## Definition of Done (epic)

- [x] Backend + all 5 stories merged to `main`; seller browser smoke owed to Daniel (declared).
- [x] `sprint-1.md` with each story ✅ + commit ref.
- [x] `RETROSPECTIVE.md` written.
- [x] Product poster updated (`Roadmap/README.md`).
- [x] Team memory + `MEMORY.md` updated.
- [x] `Roadmap/LEARNINGS.md` updated with the durable lessons.
- [x] Branches deleted; PRs merged.
