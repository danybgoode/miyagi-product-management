# Sprint 1 — Foundations: embed key + `embed` channel + cross-origin hardening

Goal: lay the plumbing the three surfaces will share — a per-shop embed key, requests that identify
themselves as the `embed` channel, and public read endpoints that are safe to call from any third-party
origin. No visible widget yet; this is the load-bearing groundwork.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **US-1 + US-2 ✅ built (commits 2dda782, e568360) —
on branch `feat/embeddable-widget`, pending CI + Daniel merge.**

---

## US-1 — Per-shop embed key ✅  · Risk: MEDIUM
**As a** seller, **I want** a publishable embed key for my shop, **so that** my widget's traffic is
attributable to me and can be rate-limited without exposing anything secret.
- [x] Mint an `emb_pk_…` key at top-level `marketplace_shops.metadata.embed_key` (out of
      `metadata.settings` so a config patch can't clobber it). `lib/embed-auth.ts` + Clerk-gated
      `GET/POST/DELETE /api/sell/embed-key` (get-or-create / rotate / revoke).
- [x] It is **publishable, not secret** (stored plaintext, freely re-readable): it scopes + attributes a
      widget to a shop and gates rate limits; it never authorizes a payment or a write.
- [x] Public CORS-open resolver `GET /api/embed/shop?key=` returns the shop's public identity; an
      unknown/missing key → `404 {valid:false}` (treated as anonymous). Channel stamping lands in US-2.

**Acceptance (plain language):** a seller can generate a key; a request carrying it is recognized as that
shop's embed; a request without/with a bad key is treated as anonymous (and, where required, refused).

---

## US-2 — `embed` channel + cross-origin hardening ✅  · Risk: MEDIUM
**As the** platform, **I want** embed requests recognized as the `embed` channel and safe to serve to any
website, **so that** sellers' sales are tagged correctly and the open endpoints aren't abused.
- [x] `detectChannel()` now resolves `embed` from the `x-miyagi-channel` header **and** from a
      `?channel=embed` query param / `mi_channel` cookie — because the hosted-checkout hand-off is a
      `window.open()` navigation that can't carry a header. Middleware persists `?channel=embed` to a
      short-lived `mi_channel` cookie so the channel survives the multi-step checkout.
- [x] Catalog + catalog/[id] + checkout-session stay `Access-Control-Allow-Origin: *` (confirmed); the new
      `/api/embed/shop` resolver is CORS-open too.
- [x] New `'embed'` bucket in `lib/ratelimit.ts` (240/IP/min). `isEmbedRequest()` applies it **only** to
      widget traffic on the shared endpoints (so the marketplace + AI agents stay unthrottled);
      `/api/embed/shop` is always limited.

**Acceptance:** a checkout started from an embed shows `channel=embed` in its metadata; hammering the catalog
from one IP via the widget hits a sane rate limit; cross-origin reads from a non-Miyagi page succeed.

---

### QA (this sprint)
- **Deterministic gate:** `tsc` + `build` + Playwright spec asserting (a) catalog/checkout-session answer a
  cross-origin (non-Miyagi `Origin`) request, (b) a checkout-session carries `channel=embed` when the embed
  header is set, (c) the rate-limit bucket returns 429 past its ceiling. Run against the branch preview via
  the bypass token.
- **Live confirmation:** agent curls the endpoints from a foreign `Origin`; Daniel spot-checks that a test
  shop shows an `embed`-tagged event. No money path touched in this sprint.
