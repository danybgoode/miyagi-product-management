<!-- Advisory artifact from the doc-hygiene skill (scripts/doc-hygiene.mjs). Findings are proposals
     only — no LEARNINGS.md/README.md content was changed by this script. -->

# Doc hygiene report — 2026-08-03

🧹 **doc-hygiene skill.** Advisory only — review by hand; nothing here gates or auto-edits.

## Always-read set size

| Doc | Lines | KB |
|---|---|---|
| AGENTS.md | — | missing |
| WAYS-OF-WORKING.md | 560 | 51.3 |
| LEARNINGS.md | 2,733 | 261.1 |
| README.md (poster) | 1,117 | 230.3 |
| **Total** | **4,410** | **542.7** |

## LEARNINGS.md — flagged candidates

**Referenced paths not found in this checkout** (verify against the app repo before treating as stale — this checkout can be behind the app's own `main`):

- `LEARNINGS.md` line 323: `scripts/lib/*.test.mjs`
- `LEARNINGS.md` line 723: `lib/request-origin.ts`
- `LEARNINGS.md` line 740: `lib/slug.ts`
- `LEARNINGS.md` line 740: `lib/seller-mode.ts`
- `LEARNINGS.md` line 740: `lib/sell-shell-path.ts`
- `LEARNINGS.md` line 740: `lib/seller-shell-gate.ts`
- `LEARNINGS.md` line 754: `app/robots.ts`
- `LEARNINGS.md` line 754: `app/robots.txt/route.ts`
- `LEARNINGS.md` line 842: `scripts/standups.log`
- `LEARNINGS.md` line 1016: `lib/x.ts`
- `LEARNINGS.md` line 1047: `scripts/standups.log`
- `LEARNINGS.md` line 1047: `scripts/weekly-recaps.log`
- `LEARNINGS.md` line 1486: `lib/design-token-audit.ts`
- `LEARNINGS.md` line 1526: `lib/correos-tariff.ts`
- `LEARNINGS.md` line 1549: `lib/artwork-ingest.ts`
- `LEARNINGS.md` line 1558: `lib/personalization.ts`
- `LEARNINGS.md` line 1707: `app/api/ucp/mcp/c/[slug]/route.ts`
- `LEARNINGS.md` line 1811: `lib/url.ts`
- `LEARNINGS.md` line 1893: `lib/profit.ts`
- `LEARNINGS.md` line 1913: `app/api/ucp/mcp/route.ts`
- `LEARNINGS.md` line 1946: `lib/home-favorites.ts`
- `LEARNINGS.md` line 1998: `lib/design-token-audit.ts`
- `LEARNINGS.md` line 2040: `lib/*.ts`
- `LEARNINGS.md` line 2262: `lib/home-curation.ts`
- `LEARNINGS.md` line 2288: `lib/search-recents.ts`
- `LEARNINGS.md` line 2352: `lib/envia.ts`
- `LEARNINGS.md` line 2352: `lib/fetch-timeout.ts`
- `LEARNINGS.md` line 2352: `lib/envia.ts`
- `LEARNINGS.md` line 2363: `lib/checkout-hop.ts`
- `LEARNINGS.md` line 2382: `lib/telegram.ts`
- `LEARNINGS.md` line 2396: `app/layout.tsx`
- `LEARNINGS.md` line 2396: `lib/platform-theme.ts`
- `LEARNINGS.md` line 2419: `lib/trust-signals.ts`
- `LEARNINGS.md` line 2427: `lib/channel.ts`
- `LEARNINGS.md` line 2475: `lib/listing-lifecycle.ts`
- `LEARNINGS.md` line 2475: `app/shop/manage/page.tsx`
- `LEARNINGS.md` line 2485: `lib/flags.ts`
- `LEARNINGS.md` line 2504: `lib/notifications/{dispatch,preferences}.ts`
- `LEARNINGS.md` line 2541: `lib/setup-spec.ts`
- `LEARNINGS.md` line 2559: `lib/subdomain-switch.ts`
- `LEARNINGS.md` line 2575: `lib/conversations.ts`

## README.md (poster) — flagged candidates

**Referenced paths not found in this checkout** (verify against the app repo before treating as stale — this checkout can be behind the app's own `main`):

- `README.md (poster)` line 82: `lib/seller-nav.ts`
- `README.md (poster)` line 97: `lib/setup-guide.ts`
- `README.md (poster)` line 146: `lib/marketing-og.tsx`
- `README.md (poster)` line 384: `lib/order-mirror.ts`
- `README.md (poster)` line 423: `lib/ssrf-fetch.ts`
- `README.md (poster)` line 535: `lib/emoji-guard.ts`
- `README.md (poster)` line 702: `lib/setup-guide.ts`
- `README.md (poster)` line 702: `lib/analytics-events.ts`
- `README.md (poster)` line 745: `apps/zine/README.md`
- `README.md (poster)` line 767: `lib/design-token-audit.ts`
- `README.md (poster)` line 768: `lib/vercel-domains.ts`
- `README.md (poster)` line 768: `lib/cloudflare-domains.ts`
- `README.md (poster)` line 771: `lib/rental-pricing.ts`
- `README.md (poster)` line 771: `lib/rental-pricing.ts`
- `README.md (poster)` line 773: `lib/price-grid.ts`
- `README.md (poster)` line 887: `lib/agent-auth.ts`
- `README.md (poster)` line 887: `app/api/ucp/mcp/route.ts`
- `README.md (poster)` line 899: `scripts/standups.log`
- `README.md (poster)` line 899: `scripts/weekly-recaps.log`
- `README.md (poster)` line 954: `lib/envia.ts`
- `README.md (poster)` line 973: `lib/agent-prompt.ts`
- `README.md (poster)` line 991: `lib/domain-coupon.ts`
- `README.md (poster)` line 1014: `lib/home-curation.ts`
- `README.md (poster)` line 1015: `lib/home-curation.ts`
- `README.md (poster)` line 1017: `lib/admin/sections.ts`
- `README.md (poster)` line 1018: `lib/seller-nav.ts`
- `README.md (poster)` line 1018: `lib/seller-pending-summary.ts`
- `README.md (poster)` line 1019: `lib/print-qr.ts`
- `README.md (poster)` line 1019: `lib/analytics-gating.ts`
- `README.md (poster)` line 1023: `lib/search-recents.ts`
- `README.md (poster)` line 1025: `lib/url.ts`
- `README.md (poster)` line 1028: `lib/neighborhood-rank.ts`
- `README.md (poster)` line 1031: `lib/domain-entitlement.ts`
- `README.md (poster)` line 1033: `lib/listing-lifecycle.ts`
- `README.md (poster)` line 1036: `app/l/[id]/Gallery.tsx`
- `README.md (poster)` line 1036: `lib/gallery.ts`
- `README.md (poster)` line 1037: `lib/trust-inputs.ts`
- `README.md (poster)` line 1054: `lib/transaction-ledger.ts`
- `README.md (poster)` line 1054: `lib/trust-signals.ts`
- `README.md (poster)` line 1071: `lib/manual-payment-state.ts`
- `README.md (poster)` line 1071: `lib/refund-state.ts`
- `README.md (poster)` line 1071: `lib/pickup-appointment.ts`
- `README.md (poster)` line 1071: `lib/envia.ts`
- `README.md (poster)` line 1090: `lib/setup-spec.ts`
- `README.md (poster)` line 1090: `lib/setup-apply.ts`
- `README.md (poster)` line 1091: `lib/about-content.ts`
- `README.md (poster)` line 1091: `lib/about-agent.ts`
- `README.md (poster)` line 1092: `lib/listing-query.ts`
- `README.md (poster)` line 1103: `lib/event-ticket-state.ts`

**Mentions an archived epic** (check whether the lesson is superseded):

- `README.md (poster)` line 1022: mentions archived epic `neon-egress-and-db-isolation`

---
Advisory only — never auto-edits. Review, then hand-merge any accepted change.
