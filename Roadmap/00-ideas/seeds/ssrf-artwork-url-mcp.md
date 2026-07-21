---
title: "SSRF: create_checkout's artwork_url is an unauthenticated, fully-open server-side fetch"
slug: ssrf-artwork-url-mcp
status: shipped
area: "09"
type: bug
priority: null
risk: high
epic: null
build_order: null
updated: 2026-07-20
---

# Scope — SSRF: `create_checkout`'s `artwork_url`

> **✅ SHIPPED 2026-07-20 as the approved fast-follow.** Frontend PR
> [#291](https://github.com/danybgoode/miyagisanchezcommerce/pull/291), squash `0e07d32`, routes the
> caller-supplied URL through `lib/artwork-url-fetch.ts` → `pinnedFetch`, requires HTTPS, refuses redirects,
> enforces a streamed byte cap and collapses download failures to one generic message. Dedicated coverage lives
> in `e2e/artwork-url-fetch.spec.ts`, with the shared redirect rejection in `e2e/migrations-mapper.spec.ts`.
> This intentionally shipped without an epic scaffold because it was an urgent, bounded security fast-follow.

> **Found while building `09-platform-infra/ssrf-dns-pinning` Sprint 1**, whose "out of scope" says: *"Auditing
> for other untrusted-domain fetches. If you find a third, file a seed — don't absorb it."* This is that third
> site. It was surfaced by the builder and independently confirmed against the live code before filing.

## Outcome & signal

`POST /api/ucp/mcp` can no longer be used to make the server fetch an attacker-chosen internal address, and
can no longer return the fetched bytes to the caller.

**Signal Daniel can run:** call the public MCP endpoint's `create_checkout` with
`artwork_url: "http://169.254.169.254/latest/meta-data/"` against a configurator listing. Today it attempts
the request; after the fix it is refused before any DNS or network call.

## Why this outranks the epic that found it

`ssrf-dns-pinning` correctly frames itself as *hardening, not an incident* — its two call sites are https-only
(so TLS cert validation against the original hostname blocks a rebound IP), use `redirect: 'error'`, cap bytes,
and never return the raw body. **This site has none of those mitigations**, and unlike them it is reachable
with no credential at all.

| | analyzer / shopify-mcp-client | `artwork_url` |
|---|---|---|
| Auth | analyzer: public but rate-limited; connector: seller flow | **none** — `create_checkout` is in `MCP_BUYER_TOOLS`; `POST /api/ucp/mcp` applies only `checkRateLimit('mcp', getClientIp(req))` (**120 req/min per IP**) and no auth at all |
| Scheme check | https-only | **none** — `http://` accepted, so no TLS cert mitigation at all |
| Hostname shape / DNS validation | `isPublicDomainShape` + `assertPublicHost` | **none** |
| Redirects | `redirect: 'error'` | **default `follow`** — a public URL can 302 to `169.254.169.254` |
| Body cap | streamed running byte-counter | **advisory `content-length` only**, then an unbounded `arrayBuffer()` — the same bypassable-cap class a codex cross-review caught in the 2026-07-17 batch |
| Does the body reach the caller? | no — derived counts only | **yes** — bytes go to `ingestArtworkBytes`, and `ingest.url` (a URL to the stored copy) is returned |

**It is not blind.** Even when `ingestArtworkBytes` rejects the bytes, three distinguishable responses leak
upstream state to an anonymous caller:
- `Could not download artwork_url: HTTP ${status}` — status codes from internal endpoints;
- `Artwork exceeds the ${MAX_ARTWORK_SIZE_MB}MB limit` — the content-length of an internal resource;
- `Network error downloading artwork_url: ${String(e)}` — the **raw** error string, distinguishing
  connection-refused vs. timeout vs. DNS failure. That is an internal port scanner at 120 req/min per IP.

Bulk exfiltration is bounded by image validation, but the oracle alone reaches `169.254.169.254` on any host
where a metadata service answers. Preconditions (a public configurator listing with a `price_grid` and a
`file` custom field, plus a `variant_id`) are all discoverable through the same anonymous `get_listing` tool.

## Stage-2.5 bucket

**already-possible** — `lib/ssrf-guard.ts` + the pinned-fetch seam `lib/ssrf-fetch.ts` (landing in
`ssrf-dns-pinning`, PR #290) already provide everything needed. This is adoption at a third call site, not new
capability. **Sequence it after that PR merges** so it adopts the pinned helper rather than the old
resolve-then-fetch pattern.

## Scope

**In v1:**
- Reject non-`https:` `artwork_url` outright.
- Route the fetch through `pinnedFetch` (`lib/ssrf-fetch.ts`), so DNS is resolved once and validated against
  `isPrivateIpv4`/`isPrivateIpv6` before dialing — same discipline as the other two sites.
- `redirect: 'error'`.
- Replace the advisory `content-length` check with a real streamed byte cap (mirror the analyzer's running
  counter in `lib/shop-url-analyzer-fetch.ts`, including its boundary-chunk trim).
- Collapse the two error strings into one generic, non-oracular message.

**Out of v1:**
- Any change to `ingestArtworkBytes`'s format/size validation or to the checkout flow itself.
- Re-auditing the rest of the MCP route for other fetches — if a *fourth* turns up, file its own seed. (A
  bounded, deliberate sweep of every server-side `fetch()` of caller-supplied input is worth its own chore
  seed rather than being smuggled in here.)

## What already exists (reuse, don't rebuild)

- `lib/ssrf-fetch.ts` — `pinnedFetch`, `SsrfBlockedError`, `selectPinnedAddress` (from `ssrf-dns-pinning` S1).
- `lib/ssrf-guard.ts` — `isPublicDomainShape`, `isPrivateIpv4`, `isPrivateIpv6`. **Do not add a fourth guard module.**
- `lib/shop-url-analyzer-fetch.ts` — the reference implementation for the streamed byte cap + graceful-degrade
  error contract.
- `app/api/img/route.ts` — the allow-listed-host proxy pattern, and the origin of the `redirect: 'error'` rule.
- Existing unit specs over `ssrf-guard.ts` in `e2e/migrations-mapper.spec.ts` — **extend, don't fork.**

## UX heuristics & rails check
- **CI guards covering this surface:** none — no lint or spec asserts that a server-side `fetch()` of
  caller-supplied input is guarded. Worth considering a guard as part of this work.
- **Audits-lens findings that apply:** none found.
- **Design-language debt:** n/a — no UI surface.

## Kill-switch / runtime gate (Stage 6b)

Carve-out: defensive hardening of an existing read path, fail-safe by construction, no new runtime seam —
same reasoning recorded for `ssrf-dns-pinning`. Rollback is `git revert`. **But note the risk tier is HIGH**
regardless (it sits on the checkout path and is auth-adjacent), so this is a Daniel merge with a mandatory
fresh-reviewer pass.

## Acceptance criteria

1. An `artwork_url` with an `http://` scheme is refused before any network call.
2. An `artwork_url` whose host resolves to a loopback/private/link-local/reserved address is refused, with a
   generic message that doesn't reveal whether the host existed or what it answered.
3. A public URL that 302s to an internal address is refused, not followed.
4. A response that lies about `content-length` cannot push more than the cap into memory.
5. A legitimate public artwork URL still downloads, validates, and checks out exactly as before.

## Open risks / research

- **Exposure while this sits in the funnel.** Reachable unauthenticated, but requires a configurator listing
  with a `file` custom field, and stored bytes must survive `ingestArtworkBytes`'s format validation to be
  retrievable. The status/error oracle needs no such luck. Daniel's call on urgency — flagging honestly rather
  than either quietly sitting on it or treating it as a live incident.
- Confirm whether any legitimate caller passes an `http://` URL today before hard-rejecting the scheme.
