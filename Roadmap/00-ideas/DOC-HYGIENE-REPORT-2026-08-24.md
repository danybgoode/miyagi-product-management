<!-- Advisory artifact from the doc-hygiene skill (scripts/doc-hygiene.mjs). Findings are proposals
     only — no LEARNINGS.md/README.md content was changed by this script. -->

# Doc hygiene report — 2026-08-24

🧹 **doc-hygiene skill.** Advisory only — review by hand; nothing here gates or auto-edits.

## Always-read set size

| Doc | Lines | KB |
|---|---|---|
| AGENTS.md | — | missing |
| WAYS-OF-WORKING.md | 561 | 48.6 |
| LEARNINGS.md | 3,335 | 317.9 |
| README.md (poster) | 1,218 | 245.0 |
| **Total** | **5,114** | **611.6** |

## LEARNINGS.md — flagged candidates

**Referenced paths not found in this checkout** (verify against the app repo before treating as stale — this checkout can be behind the app's own `main`):

- `LEARNINGS.md` line 327: `scripts/lib/*.test.mjs`
- `LEARNINGS.md` line 807: `lib/request-origin.ts`
- `LEARNINGS.md` line 824: `lib/slug.ts`
- `LEARNINGS.md` line 824: `lib/seller-mode.ts`
- `LEARNINGS.md` line 824: `lib/sell-shell-path.ts`
- `LEARNINGS.md` line 824: `lib/seller-shell-gate.ts`
- `LEARNINGS.md` line 838: `app/robots.ts`
- `LEARNINGS.md` line 838: `app/robots.txt/route.ts`
- `LEARNINGS.md` line 926: `scripts/standups.log`
- `LEARNINGS.md` line 1100: `lib/x.ts`
- `LEARNINGS.md` line 1131: `scripts/standups.log`
- `LEARNINGS.md` line 1131: `scripts/weekly-recaps.log`
- `LEARNINGS.md` line 1712: `lib/agent-prompt.ts`
- `LEARNINGS.md` line 1712: `lib/email.ts`
- `LEARNINGS.md` line 1763: `app/(shell)/shop/manage/analytics/AnalyticsClient.tsx`
- `LEARNINGS.md` line 1763: `lib/copy-overrides-routes.ts`
- `LEARNINGS.md` line 1836: `lib/cart.ts`
- `LEARNINGS.md` line 1844: `scripts/audit-select-columns.mjs`
- `LEARNINGS.md` line 1876: `lib/clerk-issuer.ts`
- `LEARNINGS.md` line 2017: `lib/design-token-audit.ts`
- `LEARNINGS.md` line 2057: `lib/correos-tariff.ts`
- `LEARNINGS.md` line 2080: `lib/artwork-ingest.ts`
- `LEARNINGS.md` line 2089: `lib/personalization.ts`
- `LEARNINGS.md` line 2238: `app/api/ucp/mcp/c/[slug]/route.ts`
- `LEARNINGS.md` line 2346: `lib/url.ts`
- `LEARNINGS.md` line 2433: `lib/profit.ts`
- `LEARNINGS.md` line 2453: `app/api/ucp/mcp/route.ts`
- `LEARNINGS.md` line 2486: `lib/home-favorites.ts`
- `LEARNINGS.md` line 2538: `lib/design-token-audit.ts`
- `LEARNINGS.md` line 2580: `lib/*.ts`
- `LEARNINGS.md` line 2685: `apps/backend/src/api/store/_utils/clerk-auth.ts`
- `LEARNINGS.md` line 2701: `lib/clerk-issuer.ts`
- `LEARNINGS.md` line 2847: `lib/home-curation.ts`
- `LEARNINGS.md` line 2873: `lib/search-recents.ts`
- `LEARNINGS.md` line 2937: `lib/envia.ts`
- `LEARNINGS.md` line 2937: `lib/fetch-timeout.ts`
- `LEARNINGS.md` line 2937: `lib/envia.ts`
- `LEARNINGS.md` line 2948: `lib/checkout-hop.ts`
- `LEARNINGS.md` line 2967: `lib/telegram.ts`
- `LEARNINGS.md` line 2981: `app/layout.tsx`
- `LEARNINGS.md` line 2981: `lib/platform-theme.ts`
- `LEARNINGS.md` line 3004: `lib/trust-signals.ts`
- `LEARNINGS.md` line 3012: `lib/channel.ts`
- `LEARNINGS.md` line 3060: `lib/listing-lifecycle.ts`
- `LEARNINGS.md` line 3060: `app/shop/manage/page.tsx`
- `LEARNINGS.md` line 3070: `lib/flags.ts`
- `LEARNINGS.md` line 3089: `lib/notifications/{dispatch,preferences}.ts`
- `LEARNINGS.md` line 3126: `lib/setup-spec.ts`
- `LEARNINGS.md` line 3144: `lib/subdomain-switch.ts`
- `LEARNINGS.md` line 3160: `lib/conversations.ts`
- `LEARNINGS.md` line 3308: `apps/miyagisanchez/lib/admin/identity.ts`

## README.md (poster) — flagged candidates

**Referenced paths not found in this checkout** (verify against the app repo before treating as stale — this checkout can be behind the app's own `main`):

- `README.md (poster)` line 82: `lib/seller-nav.ts`
- `README.md (poster)` line 97: `lib/setup-guide.ts`
- `README.md (poster)` line 158: `lib/marketing-og.tsx`
- `README.md (poster)` line 485: `lib/order-mirror.ts`
- `README.md (poster)` line 524: `lib/ssrf-fetch.ts`
- `README.md (poster)` line 636: `lib/emoji-guard.ts`
- `README.md (poster)` line 803: `lib/setup-guide.ts`
- `README.md (poster)` line 803: `lib/analytics-events.ts`
- `README.md (poster)` line 846: `apps/zine/README.md`
- `README.md (poster)` line 868: `lib/design-token-audit.ts`
- `README.md (poster)` line 869: `lib/vercel-domains.ts`
- `README.md (poster)` line 869: `lib/cloudflare-domains.ts`
- `README.md (poster)` line 872: `lib/rental-pricing.ts`
- `README.md (poster)` line 872: `lib/rental-pricing.ts`
- `README.md (poster)` line 874: `lib/price-grid.ts`
- `README.md (poster)` line 988: `lib/agent-auth.ts`
- `README.md (poster)` line 988: `app/api/ucp/mcp/route.ts`
- `README.md (poster)` line 1000: `scripts/standups.log`
- `README.md (poster)` line 1000: `scripts/weekly-recaps.log`
- `README.md (poster)` line 1055: `lib/envia.ts`
- `README.md (poster)` line 1074: `lib/agent-prompt.ts`
- `README.md (poster)` line 1092: `lib/domain-coupon.ts`
- `README.md (poster)` line 1115: `lib/home-curation.ts`
- `README.md (poster)` line 1116: `lib/home-curation.ts`
- `README.md (poster)` line 1118: `lib/admin/sections.ts`
- `README.md (poster)` line 1119: `lib/seller-nav.ts`
- `README.md (poster)` line 1119: `lib/seller-pending-summary.ts`
- `README.md (poster)` line 1120: `lib/print-qr.ts`
- `README.md (poster)` line 1120: `lib/analytics-gating.ts`
- `README.md (poster)` line 1124: `lib/search-recents.ts`
- `README.md (poster)` line 1126: `lib/url.ts`
- `README.md (poster)` line 1129: `lib/neighborhood-rank.ts`
- `README.md (poster)` line 1132: `lib/domain-entitlement.ts`
- `README.md (poster)` line 1134: `lib/listing-lifecycle.ts`
- `README.md (poster)` line 1137: `app/l/[id]/Gallery.tsx`
- `README.md (poster)` line 1137: `lib/gallery.ts`
- `README.md (poster)` line 1138: `lib/trust-inputs.ts`
- `README.md (poster)` line 1155: `lib/transaction-ledger.ts`
- `README.md (poster)` line 1155: `lib/trust-signals.ts`
- `README.md (poster)` line 1172: `lib/manual-payment-state.ts`
- `README.md (poster)` line 1172: `lib/refund-state.ts`
- `README.md (poster)` line 1172: `lib/pickup-appointment.ts`
- `README.md (poster)` line 1172: `lib/envia.ts`
- `README.md (poster)` line 1191: `lib/setup-spec.ts`
- `README.md (poster)` line 1191: `lib/setup-apply.ts`
- `README.md (poster)` line 1192: `lib/about-content.ts`
- `README.md (poster)` line 1192: `lib/about-agent.ts`
- `README.md (poster)` line 1193: `lib/listing-query.ts`
- `README.md (poster)` line 1204: `lib/event-ticket-state.ts`

**Mentions an archived epic** (check whether the lesson is superseded):

- `README.md (poster)` line 1123: mentions archived epic `neon-egress-and-db-isolation`

---
Advisory only — never auto-edits. Review, then hand-merge any accepted change.
