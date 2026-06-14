---
status: shipped
slug: own-shop-experience
---

# Epic — Own channel: full shop experience (own-shop-experience)

**Macro-section:** 07 · Agentic & federated commerce
**Siblings:** [custom-domain-polish](../custom-domain-polish/) (seller setup — ✅ DONE),
[embeddable-widget](../embeddable-widget/) · **Source of truth:**
`Roadmap/00-ideas/seeds/own-shop-experience.md`

## Why

The custom-domain *plumbing* and the *seller setup flow* are already done (the polish epic shipped
2026-06-04). But the **buyer experience on a custom domain is still broken beyond the homepage.**

Root cause (`middleware.ts`): on a tenant domain, the middleware **overwrites any route** with
`url.pathname = /s/[slug]`. So `myshop.mx/l/<product>`, `/checkout`, `/account` — everything is rewritten
back to the shop homepage. Today a custom domain can only show the **homepage**; clicking any product is a
dead end. The white-label layout (`ChannelLayout`) is wired only to the shop page; the root layout knows
the `embed` channel but not `custom`. No `robots.txt` or `sitemap.xml` exist.

This epic makes the **full shop** (homepage → PDP → cart → return to checkout) render natively and
white-label under the tenant's domain, hardens per-shop isolation, and adds SEO continuity + 301 redirects
— so the platform becomes invisible (the epic's stated goal).

## Scope decisions (Daniel)

- **Pragmatic checkout isolation** — navigation/PDP/cart 100% white-label on the domain; at sign-in/payment
  the buyer uses the platform's secure flow (channel-tagged) and **returns** to the domain. **No Clerk
  satellite domains** (avoids per-domain auth infrastructure + high-risk auth changes).
- **Asset masking deferred (AC 1.3)** — R2/cloud image URLs are kept (clean third-party URLs, not
  platform-branded). Out of scope.

## The big architecture change

**The middleware stops blindly rewriting.** On a custom domain it resolves the shop **once** and then:
- `/` → rewrites to `/s/[slug]` (homepage, as today).
- The rest of the shop routes (`/l/[id]`, `/checkout`, `/account`, `/payment/*`, `/messages/*`) →
  **pass through** (`NextResponse.next`) with injected headers: `x-miyagi-channel: custom`,
  `x-miyagi-domain`, **`x-miyagi-shop-slug`**.
- The white-label layout is **centralized in the root layout** (`app/layout.tsx`) based on
  `x-miyagi-channel: custom` — the same pattern already used for `x-miyagi-embed`. It reads
  `x-miyagi-shop-slug`, fetches the branding with `getShop()` (`lib/listings.ts`, wrapped in `cache()`),
  and renders `ChannelLayout` once for ALL pages on the domain. The shop page stops self-wrapping.
- **Per-shop isolation:** the domain only serves its own shop. A foreign product or an unknown route →
  a clean white-label 404 / redirect to the domain's homepage — never another seller's content, never a
  raw error.

Links already use relative platform routes (`/l/${id}`, `/checkout?listingId=`), so they stay on the
tenant host once the middleware lets them through. No bulk link-rewriting needed.

## Sprints

| Sprint | Delivery | Risk | Status |
|---|---|---|---|
| [1](./sprint-1.md) | Full white-label shop routing (native PDP, chrome, isolation) | HIGH (middleware + layout) | ✅ MERGED — PR #10 (`8b5c118`) |
| [2](./sprint-2.md) | SEO continuity, legacy 301 redirects, fail-safe | MEDIUM | ✅ MERGED — PR #11 (`09c06d0`) |
| [3](./sprint-3.md) | Checkout return to the domain + comms (emails) | HIGH (money/email) | ⏭️ DESCOPED → future epic |

## Status

✅ **EPIC COMPLETE (S1+S2) — 2026-06-05.** The core promise — a 100% white-label browsing experience under
the custom domain — is **shipped to prod**. Sprint 3 (checkout return + domain-branded emails) was
**descoped** to a future epic: it requires **backend** work (propagate `channel`/origin through Medusa's
new `start-checkout` flow) and depends on the auth/payment "hop" to the platform that isn't built yet
(Clerk is platform-domain-only). Daniel's decision (2026-06-05). See `RETROSPECTIVE.md` and the future
epic's idea doc (`Roadmap/00-ideas/seeds/custom-domain-checkout.md`).

## QA / smoke-test

- **Deterministic gate (pre-merge):** `tsc --noEmit` + `npm run build` + Playwright (`npm run test:e2e`).
  One spec per testable story.
- **Testing constraint:** the middleware's `custom` branch is triggered by the `host` header. Vercel
  previews are `*.vercel.app` (platform host) and don't accept a foreign `Host`, so the white-label path
  **can't** be exercised by hostname on a preview. Plan: local smoke with `curl -H "Host: <test-domain>"`
  against `npm run dev` (with a test `marketplace_shops.custom_domain` row) + Playwright specs that exercise
  the path via the channel header. **Daniel owns the real-domain browser smoke post-merge.**

## Definition of Done (epic) — closed at S1+S2

- [x] S1+S2 stories merged to `main` and smoke-tested (gaps declared). S3 descoped.
- [x] `sprint-1.md` + `sprint-2.md` with stories ✅ + commit refs; `sprint-3.md` marked descoped.
- [x] `RETROSPECTIVE.md` written.
- [x] Product poster updated (`Roadmap/README.md`).
- [x] Team memory updated.
- [x] Branch `feat/own-shop-experience` deleted after the merges (S1 + S2).

## Notes

- **Frontend only** (`apps/miyagisanchez`). Runs in parallel with `feat/sweepstakes` — don't touch its
  files. We worked in an **isolated worktree** (`.claude/worktrees/feat+own-shop-experience`).
- **We DO touch `middleware.ts`** (unlike the polish epic): it's the heart of this epic.
- Strings in **es-MX** (the section is 100% Spanish, no i18n keys).
- Sprints 1 and 3 = HIGH risk → **Daniel merges**. Sprint 2 = MEDIUM.
