# Retrospective — Subdomains (`shopname.miyagisanchez.com`)

**LIVE 2026-06-06.** Every shop now serves white-label at `<slug>.miyagisanchez.com` via a real
wildcard cert. Code: PR #27 (feature) + PR #28 (cleanup). The mid-tier of shop addressing, sitting on
top of the white-label/own-shop machinery and the custom-slugs work.

## What shipped
- `lib/subdomain.ts` `shopSlugFromHost` + a `middleware.ts` branch that resolves `<slug>.miyagisanchez.com`
  → tags white-label headers (`x-miyagi-channel: subdomain`) → rewrites `/`→`/s/[slug]`, passthrough the
  rest; retired slug → 301; reserved/`www`/preview/multi-label → never a shop.
- `subdomain` sale-attribution channel; white-label root layout extended to it.
- Buy/sign-in hop worked for free (keys on the `x-miyagi-domain` header) — only attribution needed a fix.
- Settings surfaces the subdomain URL + copy.
- **Infra:** apex `miyagisanchez.com` moved to **Vercel nameservers** → wildcard cert for `*.miyagisanchez.com`.

## What went well
- **Massive reuse.** The feature code was small because white-label render, the custom-domain middleware
  pattern, the 90-day alias redirect, and channel tagging all already existed. The subdomain *is* the slug.
- **The export-first instinct paid off.** Insisting on the real GoDaddy zone (not a `dig` reconstruction)
  caught records `dig` never showed — Resend DKIM, AmazonSES `send` MX/SPF — that would have broken app
  email on cutover.
- **Verified the risky cutover safely.** Querying Vercel's nameservers directly (`dig @ns1.vercel-dns.com`)
  confirmed the zone was correct *before* trusting global propagation; auth (clerk/accounts) never blipped.

## What we learned / gotchas (promoted to LEARNINGS)
- **Per-host domain registration doesn't scale — Vercel projects cap at 50 domains.** Our backfill proved
  it (164 shops, 47 registered, cap consumed, would also block premium custom domains). A wildcard is the
  only scalable answer, and **a wildcard cert requires the domain on Vercel nameservers** (DNS-01).
- **Enabling "Vercel DNS" does NOT auto-import existing records** — the zone starts empty. Flipping NS
  before staging records would have instantly broken Clerk auth + email. Stage first, flip second.
- **Vercel API tokens are scoped.** The env token was *project-scoped* (manages project domains) and 403'd
  on *account-level* DNS records; an **account-scoped token + `teamId` query param** was required.
- **A domain added as a project domain while on external NS can get stuck `misconfigured`** after the NS
  flip — remove + re-add it once on Vercel NS to kick off fresh DNS-01 issuance. Cert issuance is async
  (minutes); poll, don't assume failure.
- **Auto-mode correctly gates bulk destructive prod ops** (mass domain delete, prod-DNS writes) — get
  explicit user authorization rather than working around it.

## Gaps / deferred
- **Return-to-subdomain after payment** — buyer completes on the platform success page (same domain family,
  no open-redirect surface). Pure polish.
- **Live browser smoke owed to Daniel:** sign-in/buy hop from a subdomain in a real session; auth login
  confirmation post-NS-migration (DNS verified; a human login check is the belt-and-suspenders).
- The 90-day retired-slug **301 on a subdomain** is spec-covered (`pickAliasTarget`) but unverified live
  (no retired slug exists yet to curl).
- **Revoke the temporary account-scoped Vercel token** once everything's confirmed (used only transiently).

## Deferred sibling (next)
`mschz.org/shopname` short links — `mschz.org` is already on the Vercel project.
