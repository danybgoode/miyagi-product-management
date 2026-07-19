---
title: "SSRF hardening — DNS-pin the resolved IP instead of resolve-then-fetch"
slug: ssrf-dns-pinning
status: scaffolded
area: "09"
type: chore
priority: null
risk: low
epic: "09-platform-infra/ssrf-dns-pinning"
build_order: null
updated: 2026-07-19
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

## The design fork — resolve this before slicing

The gap analysis above proposes `undici.Agent({ connect })`. Research on 2026-07-19 found a wrinkle:

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
