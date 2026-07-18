---
title: "SSRF hardening — DNS-pin the resolved IP instead of resolve-then-fetch"
slug: ssrf-dns-pinning
status: raw
area: "09"
type: chore
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-18
---

# Scope seed — close the resolve-then-fetch TOCTOU on user-supplied-domain fetches

## Where this came from
Surfaced during PR review on `cost-comparator-homepage` Sprint 3
(`lib/shop-url-analyzer-fetch.ts`, the shop-URL analyzer's SSRF-hardened fetch). The fresh
reviewer approved the PR but flagged that the PR body/sprint doc overclaimed the SSRF mitigation
as "closing" the DNS-rebinding gap — it substantially mitigates but does not fully close it.

## The gap
Both `lib/shop-url-analyzer-fetch.ts` (new, Sprint 3) and `lib/shopify-mcp-client.ts`
(pre-existing, `platform-migrations` epic) use the same **resolve-then-fetch** pattern to guard a
server-side fetch of an untrusted, caller-supplied domain:

1. `dns.promises.lookup(host, { all: true })` — resolve every address, reject if any is
   loopback/private/link-local/reserved (`lib/ssrf-guard.ts`'s `isPrivateIpv4`/`isPrivateIpv6`).
2. A few lines later, `fetch(url)` — Node/undici resolves the hostname **again**, independently.

Between step 1 and step 2 there is an inherent **TOCTOU window**: if an attacker controls DNS for
the target domain and can flip the A/AAAA record between the two resolves (classic DNS rebinding),
the validated-safe resolve in step 1 and the actually-dialed address in step 2 can differ. This is
NOT closed by the current code — it's substantially mitigated (a real attacker needs to win a race
against a fast lookup-then-fetch, and several other layers narrow the blast radius further:
https-only enforces TLS certificate validation against the original SNI/hostname so a fetch can't
silently succeed against a rebound IP presenting the wrong cert; `redirect: 'error'`; an 8s
timeout; a byte cap; and — specific to the shop-URL analyzer — the raw fetched body is never
returned to the caller, only derived counts/booleans), but it is not a hard close, and both files'
doc comments currently overstate it as one (fixed to accurate language on `shop-url-analyzer-
fetch.ts` and the PR/sprint doc in the same review round; `shopify-mcp-client.ts`'s identical
claim was left as-is — out of scope for that PR, tracked here instead).

## The actual fix
**DNS-pin the resolved IP**: resolve once, then dial that exact IP for the real request instead of
letting a second independent resolve happen. In Node/undici this is normally done with a custom
`Agent`/`dispatcher` whose `connect` override forces the already-validated IP (while keeping the
original hostname for the TLS SNI/cert check) — e.g. `undici.Agent({ connect: (opts, cb) => ... })`
or `lookup` override on the connector, so the fetch physically cannot re-resolve to a different
address than the one that was checked.

Apply to **both** callers of this pattern:
- `lib/shop-url-analyzer-fetch.ts` (`assertPublicHost` + the `fetch()` call in `analyzeShopUrl`)
- `lib/shopify-mcp-client.ts` (`assertPublicHost` + the `fetch()` call in `callTool`)

Ideally factor the pinned-fetch wrapper into one shared helper (`lib/ssrf-guard.ts` or a new
`lib/ssrf-fetch.ts`) both files call, rather than duplicating the `undici.Agent` setup twice.

## Not scoped yet
No design taken on the shared-helper shape, whether it needs `server-only`, or how it interacts
with each caller's own timeout/redirect/byte-cap logic (both would need to keep their own
call-site-specific concerns layered on top of a shared pinned-dispatch primitive). Size and slice
at a future grooming pass.

## Cite
Reviewed and requested in the `cost-comparator-homepage` Sprint 3 review round (PR #280,
`miyagisanchezcommerce`, 2026-07-18) — see `Roadmap/08-growth-and-promotions/cost-comparator-
homepage/sprint-3.md` for the corrected (non-overclaiming) language this seed's gap description
matches.
