---
title: "SSRF hardening — DNS-pin the resolved IP instead of resolve-then-fetch"
slug: ssrf-dns-pinning
status: ready
area: "09"
type: chore                          # security hardening of existing reads; no user-facing change
priority: null
risk: low                            # shared lib seam, but both callers are non-money, auth-gated reads
epic: null
build_order: null
updated: 2026-07-19
---

# Scope — close the resolve-then-fetch TOCTOU on user-supplied-domain fetches

Promoted from [`00-ideas/seeds/ssrf-dns-pinning.md`](../seeds/ssrf-dns-pinning.md) (filed
2026-07-18 during the `cost-comparator-homepage` Sprint 3 review round, PR #280). The seed's gap
analysis is accurate and is not restated here — this doc adds the design fork, the slice, and the
acceptance checks the seed explicitly deferred ("no design taken on the shared-helper shape").

## Mirror-back

> You want the two places we fetch an untrusted, user-supplied domain to **physically dial the IP
> we already validated**, rather than validating one resolve and then letting Node resolve again
> — so a DNS-rebinding attacker has no race to win. Right?

## Stage-2.5 bucket

**Genuinely new work — small.** There is no configuration or messaging path to this; it is a code
correctness change in one shared seam. But note the honest framing from the seed: the current code
is **substantially mitigated, not broken**. https-only + TLS SNI validation, `redirect: 'error'`, an
8s timeout, a byte cap, and (for the analyzer) never returning the raw body all narrow this
considerably. **This is hardening, not an incident** — it should not jump the queue ahead of the
null-slot sweep or the orphan sweep, both of which are live defects.

## The design fork — resolve this before slicing

The seed proposes `undici.Agent({ connect })`. Research on 2026-07-19 found a wrinkle:

- **`undici` is not a direct dependency** of `apps/miyagisanchez`. It resolves today only
  *transitively* from the workspace root (`node_modules/undici` present; nothing in
  `package.json`). Importing it directly would be relying on a hoisted transitive dep — exactly
  the kind of implicit coupling that breaks on an unrelated `npm` tree change.
- Node is **v22.22.3**, so global `fetch` is undici-backed, but `fetch` accepts a `dispatcher` only
  via the `undici` package's own types.

So there are two viable shapes and the builder should pick one **explicitly, in plan mode**:

- **(A) Add `undici` as a direct dependency** and use `Agent({ connect })` to force the validated
  IP while preserving the hostname for SNI. Keeps the `fetch` API at both call sites; costs one
  explicit dep (already in the tree, so no real install weight).
- **(B) Drop to `node:https.request`** with the `lookup` option returning the pre-validated
  address. No new dependency, but both call sites must be rewritten off `fetch`, and each has its
  own timeout / redirect / byte-cap logic layered on top that would need porting.

Recommendation: **(A)** — smaller diff, keeps both callers' existing concerns intact, and the dep
is already resolvable. But this is the builder's call with the diff in front of them; state the
choice and the reason in the PR.

## What already exists (reuse, don't rebuild)

- `lib/ssrf-guard.ts` — `isPublicDomainShape`, `isPrivateIpv4`, `isPrivateIpv6`. **Already the
  shared seam.** The pinned-dispatch primitive belongs here or in a sibling `lib/ssrf-fetch.ts`;
  do not add a third guard module.
- `lib/shop-url-analyzer-fetch.ts` — `assertPublicHost` + the `fetch()` in `analyzeShopUrl`
  (Sprint 3, PR #280). Its doc comment was already corrected to non-overclaiming language in the
  review round; **keep it accurate when the pin lands** — it may then legitimately claim the close.
- `lib/shopify-mcp-client.ts` — `assertPublicHost` + the `fetch()` in `callTool`
  (`platform-migrations` epic). Its identical doc comment **still overclaims** — the seed notes it
  was left as-is, out of scope for PR #280. Fix it here.
- Whatever unit specs already cover `ssrf-guard.ts` — extend rather than fork.

## Scope

**In v1 (one sprint, two stories):**

- **Story 1 (LOW):** the shared pinned-fetch helper. One resolve, validate every returned address,
  then dial that exact IP with the original hostname preserved for TLS SNI/cert validation. Pure
  `lib/` seam → unit-testable without a network, which is free coverage per WAYS-OF-WORKING.
- **Story 2 (LOW):** adopt it at **both** call sites, each keeping its own timeout, redirect, and
  byte-cap behaviour layered on top. Correct the `shopify-mcp-client.ts` doc comment's overclaim in
  the same commit.

**Out of v1:**

- Any change to the callers' timeout / redirect / byte-cap policy, or to what either function
  returns.
- `server-only` enforcement on the new helper — note it as a question, decide in plan mode; don't
  let it grow the slice.
- Auditing for *other* untrusted-domain fetches beyond these two. If the builder finds a third
  while working, **file a seed, don't absorb it.**

## Acceptance criteria

- A unit spec proves the pinned path: given a `lookup` that returns a public IP on the first call
  and a **private** IP on a second call, the fetch still dials the first (validated) address — i.e.
  the rebind is structurally impossible, not merely unlikely.
- A unit spec proves the guard still **rejects** when the single resolve returns any
  loopback/private/link-local/reserved address (existing behaviour, must not regress).
- TLS still validates against the **original hostname** — a cert for the rebound IP's host does not
  satisfy the connection.
- Both call sites behave identically for legitimate public URLs: the shop-URL analyzer still returns
  its derived counts/booleans; the Shopify MCP client's `callTool` still works against a real store.
- Every new spec observed **red** once before the implementation (or via a deliberate mutation).
- No doc comment in either file claims more than the code now delivers.

## QA / smoke stage

- Frontend repo → the deterministic gate covers it (`tsc` + `next build` + Playwright against the
  Vercel preview). The substance here is **unit specs on the `lib/` seam** — no browser smoke is
  meaningfully owed.
- **Owed to Daniel:** nothing. This is a pure-logic change with no visible surface. Say so in the
  PR rather than inventing a walkthrough.

## Risk tier

**LOW** — both stories. Shared `lib/` seam, but no money, auth, or fulfillment path; reviewer may
merge on a green gate. Note the shared-surface caveat from the groom chore path: `lib/ssrf-guard.ts`
is imported by sibling work, so **announce the change** so parallel branches rebase.

## Open risks / research

- Does the workspace's Next build tree-shake or polyfill `undici` differently in the Cloud Run
  standalone output than in local dev? Verify the pinned fetch actually works **in the deployed
  image**, not just in `npm run dev` — the NEXT_PUBLIC build-time inlining audit is a standing
  reminder that build-context divergence is a real class here.
- Confirm the pin doesn't break HTTP-level connection reuse in a way that materially slows the
  Shopify MCP client's repeated `callTool` invocations.
