# Retrospective — custom-domain-polish

**Closed:** 2026-06-04 · **PR:** #8 (merge `07ddb9a`, feature `1db76f7`) · **Risk:** HIGH (merged by Daniel)

## What shipped
Polish of the "Own channel" flow (the seller's custom domain) — 7 stories in one sprint:
- **US-1** four explicit states (`active`/`provisioning`/`error`/`unverified`/`pending_dns`) with fix
  suggestions in the header pill and the step-2 row.
- **US-2** real SSL status (Vercel `verified` vs our DNS check); refresh on mount.
- **US-3** non-destructive replace — the server releases the old Vercel domain after saving the new one.
- **US-4** Vercel conflict → clear `409` (`DomainConflictError`).
- **US-5** `lib/domain-utils.ts` (`.com.mx`-aware apex; `dnsRecordFor`); verifier accepts the apex A record
  `76.76.21.21` (covers Cloudflare CNAME-flattening); CF automation on the correct host.
- **US-6** mobile pass · **US-7** delete confirmation.
- `panuchas.com` cleanup = no-op (verified absent across the whole Vercel team).

## What went well
- **Auditing before building** avoided rewriting a flow already ~80% done; the work was copy, derived
  states, and two provisioning fixes, not new UI.
- **Isolated worktree** off `main` allowed working in parallel with the `feat/sweepstakes` session without
  touching its uncommitted changes in the primary checkout. `middleware.ts` (a shared file) was untouched.
- **Deterministic gate** (tsc + build + 29 Playwright vs the preview with a bypass token) passed first try;
  the new `custom-domain-detect` spec was designed deterministic (no dependency on an external registrar).

## What we learned / findings
- The old verifier only accepted CNAME → an apex on GoDaddy/Namecheap (which reject a root CNAME) stayed
  stuck forever. Changed to an **apex A record** + a `resolve4` check, which also covers Cloudflare's
  CNAME-flattening. **The only behavior change** beyond copy — flagged to Daniel.
- Domain replace **orphaned** the old domain in Vercel (a latent bug): the POST overwrote the DB without
  releasing the old one. Now the server releases it (best-effort) after saving the new one.
- For a Mexican marketplace, the "apex = 2 labels" assumption breaks on `.com.mx`; `domain-utils` carries a
  mini suffix list (not the full PSL) for the real-world cases.

## Gaps / pending
- **Bounded suffix list** (not the full PSL): covers `.com.mx` + a few common ccTLDs. If domains with
  out-of-list two-level suffixes appear, an apex could be treated as a subdomain. Widen the list or adopt
  the PSL if the need arises.
- The per-registrar guides (GoDaddy/Namecheap) still use apex-based prose; for subdomains a caveat note was
  added instead of templating each step. Good enough, but templating them would be cleaner.
- The storefront UX once the domain is live is **another task** ("Own shop experience"), out of scope.

## Process notes
- Frontend-only (`apps/miyagisanchez` → Vercel). es-MX strings to match the section (no i18n keys).
- Vercel's anycast IP (`76.76.21.21`) and the CNAME target are hardcoded in `lib/domain-utils.ts` — if
  Vercel changes them, update there (one place, shared by UI + routes).
