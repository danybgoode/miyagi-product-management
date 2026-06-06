# Sprint 1 — Automatic subdomains

Frontend only. Build → verify → commit per story.

---

## Step 0 — DNS + per-shop registration (Option B)

**Reality:** miyagisanchez.com is on **GoDaddy NS** (not Vercel) → can't auto-issue a wildcard cert.
Daniel's decision: **Option B**.
- **Daniel (manual, once):** add a `*` CNAME → `cname.vercel-dns.com` (DNS-only) in GoDaddy.
- **Agent:** `registerShopSubdomain(slug)` (wraps `addDomainToProject(`${slug}.miyagisanchez.com`)`,
  idempotent, best-effort/non-blocking) called at **shop creation** (`/api/sell/shop`, `/api/sell/create`)
  and on **slug change** (`/api/sell/shop/slug`); + a **backfill** for existing shops.
- The existing specific subdomains (`clerk`, `accounts`, `www`, `api`) take precedence over `*`; no NS
  migration, no risk to email/auth.
- The inert `*.miyagisanchez.com` wildcard added during exploration was **removed**.

**Acceptance:** with GoDaddy's `*` in place, `slug.miyagisanchez.com` resolves to Vercel with a valid cert
(registered per shop). **Go-live depends on the GoDaddy `*` record.**

- [x] **DONE — LIVE.** Pivoted to **Option A (Vercel NS)**: Option B (per-shop registration) hit the
  project's **50-domain cap** (164 shops). Apex moved to `ns1/ns2.vercel-dns.com`; 12 records
  (clerk/accounts/email/etc.) staged in Vercel DNS via API (account-scoped token + teamId); wildcard cert
  `*.miyagisanchez.com` issued. Per-host code removed in PR #28. Runbook: `tasks/subdomains-ns-migration.md`.

---

## US-1 — Subdomain routing + white-label + channel

**As** a seller, **I want** my shop to live at `my-slug.miyagisanchez.com`, **so that** it feels like an
independent business.

- New pure `lib/subdomain.ts`: `ROOT_DOMAIN`, `shopSlugFromHost(host)` → slug for
  `<label>.miyagisanchez.com`; `null` for apex, `www`, `*.vercel.app`, multi-label hosts, and **reserved
  labels** (`RESERVED_SLUGS` ∪ infra: `www, api, app, admin, …`). Pure spec.
- `middleware.ts`: a new branch **before** the custom-domain one. If `shopSlugFromHost(host)` returns a slug:
  - look the shop up in the Supabase mirror (`marketplace_shops` by `slug`).
  - found → tag `x-miyagi-channel: 'subdomain'` + `-domain` (host) + `-shop-slug`; rewrite
    `/`→`/s/[slug]`; passthrough the rest (same boundary rules: `/s/*` and `/l` → home).
  - not found → `getSlugRedirect(label)`; live alias ⇒ 301 to `https://[current].miyagisanchez.com/`;
    otherwise 404. Reserved label ⇒ redirect to the apex.
- `lib/channel.ts`: add `'subdomain'` to `ChannelSource`; header `subdomain` → `'subdomain'`.
- `app/layout.tsx`: white-label `isChannel` accepts `'custom'` **or** `'subdomain'`.

**Acceptance:** `my-slug.miyagisanchez.com` serves the white-label shop; a retired slug 301-redirects to its
current subdomain; a reserved label goes to the apex.

- [x] Done — `28b3d49` (PR #27).

---

## US-2 — Platform hop for auth/checkout

**As** a buyer on a subdomain, **I want** sign-in and checkout to work, **so that** I can complete the
purchase without errors.

- Verify that sign-in / checkout / account from the subdomain go to the **platform apex** (Clerk is
  platform-only; a relative `/sign-in` on the subdomain would break the same as on custom domains).
- Reuse the custom-domain hop; **extend it if it depends on "non-platform host"** rather than the channel
  header, so it also fires on `*.miyagisanchez.com`. Main integration risk.

**Acceptance:** from a subdomain, tapping buy/sign-in leads to the secure platform flow (reused hop);
sales attributed `subdomain`.

- [x] Done — `3e764f1` (PR #27). Return-to-subdomain post-payment = deferred polish.

---

## US-3 — Discovery in settings

**As** a seller, **I want** to see and copy my subdomain, **so that** I can share it.

- In the "Your free URL" block of Canal Propio (from custom-slugs), also show
  **`[slug].miyagisanchez.com`** with a copy button + a "your shop also lives here" line.
- Updates on slug change (same `shopSlug` state).

**Acceptance:** the subdomain URL shows and copies; reflects the current slug.

- [x] Done — `b315ba7` (PR #27).

---

## Sprint QA
- **Green deterministic gate** (tsc + build + Playwright api): `subdomain.spec.ts` (`shopSlugFromHost`),
  `detectChannel`→`'subdomain'`, and platform-host regression (apex unchanged, trust headers still stripped).
- **Hostname routing is NOT testable on Vercel previews** (preview host = `*.vercel.app` = platform) — CI
  covers pure logic + regression.
- **Real post-merge smoke (agent):** with the wildcard live, `curl https://miyagiprints.miyagisanchez.com/`
  → 200 white-label; retired-slug subdomain → 301; reserved label → apex.
- **Owed to Daniel (browser):** chrome white-label render + sign-in/checkout hop from a subdomain.
