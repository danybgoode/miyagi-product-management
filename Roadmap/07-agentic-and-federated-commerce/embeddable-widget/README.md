---
status: shipped
slug: embeddable-widget
---

# Epic · Embeddable Widget

> ✅ **COMPLETE — shipped 2026-06-04 (all 3 sprints).** S1 foundations + S2 surfaces + S3 snippet
> generator/theming are merged to `main` and live on prod (PRs #4, #6, #7). API-level prod smoke green;
> Daniel owns the HIGH-risk US-3 browser smoke (real popup → live checkout) + the settings-UI visual check.
> See [RETROSPECTIVE.md](RETROSPECTIVE.md).

**Tagline:** *Drop your Miyagi shop — or one product, or a single buy-button — onto any website you already have.*

**For sellers with an existing audience somewhere else.** A seller already has a blog, a Wix/WordPress
site, a Linktree, a landing page. The marketplace, their own custom domain, and AI agents are three of the
four federated channels in `AGENTS.md`; the **embed widget** is the fourth — and the only one still claimed
in docs but never built. This epic builds it for real and corrects that drift.

## Why this came up
The product poster lists *"Embeddable widget — drop your shop onto any website"* as a headline of
07 · Agentic & Federated Commerce, and `lib/channel.ts` already reserves an `'embed'` channel
(`detectChannel` returns it for an `x-miyagi-channel: embed` header) — but **nothing in the app ever sets
that header or serves an embed surface.** Two READMEs inside 07 even mark the widget ✅ live. This is exactly
the kind of doc-drift the Agent Connection epic was built to kill; we close it by shipping the thing.

## What it is (decided with Daniel, 2026-06-04)
- **Rendering — hybrid.** A tiny `<script>` loader defines **Shadow-DOM custom elements** for the
  lightweight surfaces (`<miyagi-buy-button>`, `<miyagi-product>`) — style-isolated, no CSS bleed onto or
  from the host page — pulling from our **existing public UCP APIs**. The **whole-shop** embed is an
  `<iframe>` to a new `/embed/s/[slug]` route that reuses the existing white-label `ChannelLayout`.
- **Checkout — hosted popup.** The widget **never** renders a payment surface on the third-party origin. The
  buy CTA does `window.open()` to our **existing** hosted checkout on `miyagisanchez.com`, tagged
  `channel=embed`. Live payments stay 100% on our domain; the checkout code is untouched.
- **v1 surfaces — all three:** buy-button, product card, full shop — plus a seller snippet-generator
  settings page. They share one loader, one key, one hand-off.

## Reuse, don't rebuild
- **Public data already exists & is CORS-open (`*`):** `app/api/ucp/catalog` (search + `/[id]` detail) and
  `app/api/ucp/checkout-session` (payment options + hosted checkout URLs). No new commerce endpoints.
- **Channel plumbing:** `lib/channel.ts` (`'embed'`), the middleware custom-domain rewrite pattern, and
  `app/s/[slug]/ChannelLayout.tsx` (white-label shell) for the iframe.
- **Rate limiting:** `lib/ratelimit.ts` — one new `'embed'` bucket.
- **Seller settings surface:** `app/shop/manage/settings/ShopSettings.tsx` — the snippet generator slots in
  beside the existing "Conecta tu agente" helper.
- **Shop config in Supabase** (`marketplace_shops.metadata.settings`) holds the embed key + theme tokens
  (non-commerce → Supabase, per Rule 2).

## Sprints
- [sprint-1.md](sprint-1.md) — Foundations: per-shop embed key + `embed` channel + cross-origin hardening.
- [sprint-2.md](sprint-2.md) — The three surfaces: buy-button (+ hosted-popup checkout), product card, full-shop iframe.
- [sprint-3.md](sprint-3.md) — Seller snippet generator + theming/bilingual.

## Risk tiers (who may merge)
| Story | Tier | Merge |
|---|---|---|
| US-1 embed key · US-2 channel/CORS · US-5 full-shop iframe | MEDIUM | Daniel (cross-origin / attribution) |
| **US-3 buy-button → hosted checkout** | **HIGH** | **Daniel** (live-payment hand-off) |
| US-4 card · US-6 snippet UI · US-7 theming | LOW | reviewer may auto-merge once CI green |

## QA / smoke stage (named, per WAYS-OF-WORKING)
- **Deterministic gate (pre-merge, every story):** `tsc --noEmit` + `npm run build` + `npm run test:e2e`
  against the branch's Vercel preview **via the protection-bypass token** (now wired — see the CI gate).
  One Playwright spec per testable story: `embed.js` served with the right `Content-Type` + CORS;
  `/embed/s/[slug]` renders and carries `frame-ancestors`; catalog/checkout-session reachable cross-origin
  with a valid embed key and rejected without; channel tags as `embed`.
- **Live confirmation (split):** *Agent* — API/curl smoke + a static `public/embed-demo.html` opened from a
  different origin to exercise the loader. *Daniel* — browser smoke of the **HIGH-risk** path: real
  buy-button → hosted popup → live checkout (his sessions/tokens; disposable test listing, cancellable session).
- **Deploy topology:** designed **frontend-only** (Vercel on merge to `main`). If any backend change is
  needed it's us-east4 Cloud Build ~12 min with no per-branch preview (post-merge prod smoke only). Previews
  are SSO-gated → reachable pre-merge only via the bypass token.

## Definition of Done (epic close-out)
Standard checklist **plus** correcting the doc-drift: flip the Embeddable Widget line in `Roadmap/README.md`
and both `07-…/README.md` files from a falsely-✅ claim to the real shipped state, add a *Recent highlights*
entry, write `RETROSPECTIVE.md`, update team memory + `MEMORY.md`.

## Out of scope (v1)
Inline (on-host) checkout/payment capture · analytics for embed impressions/clicks · per-embed allow-listed
origins (v1 is publishable-key + rate-limit, open origins) · non-shop embeds (reviews, "make an offer"
widget). Candidates for a follow-up sprint once v1 is live.
