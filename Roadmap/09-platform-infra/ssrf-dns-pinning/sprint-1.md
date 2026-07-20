# SSRF DNS-pinning — Sprint 1: the shared pinned-fetch seam + both call sites

**Status:** 🟦 In review — [PR #290](https://github.com/danybgoode/miyagisanchezcommerce/pull/290) (LOW)

> **Design fork settled: (A)** — `undici` added as a direct dependency of `apps/miyagisanchez`; `fetch`
> AND `Agent` imported from it (not the global fetch + a duck-typed dispatcher), so the dispatcher type
> matches the fetch consuming it and the Node-22 runtime's own bundled undici version is irrelevant. The
> `server-only` open question was decided **no** (same reason as `ssrf-guard.ts`: the Playwright `api`
> runner must import it, and `server-only` throws outside a Next build).
>
> **Review round (2026-07-20):** mandatory cross-agent (Antigravity — codex CLI behind its model
> requirement) + an independent `pr-reviewer` pass (run on 3 named LOW-tier judgment triggers:
> security-shaped · shared `lib/` seam · new dependency). Both independently caught a **body-stream
> blocker** (a `finally { agent.destroy() }` that killed the socket at headers, before either caller
> read the body — >64 KB threw `terminated`); the pr-reviewer also caught IPv6-first pinning dropping
> failover on IPv4-only Cloud Run egress, and an unguarded test-only bypass. All fixed + regression-
> specced (a mutation-verified >256 KB delayed-body spec). A cross-review re-run then caught unconsumed
> bodies holding the pinned socket on early-return paths (fixed) and a false-positive `autoSelectFamily`
> finding (answered with source + an empirical probe). Full disposition on the PR.

## Stories

### Story 1.1 — The shared pinned-fetch helper ✅ `329327f`
**As a** builder, **I want** one primitive that resolves a hostname once and then physically dials
that exact address, **so that** a second independent resolve can't substitute a different IP.
**Files:** `lib/ssrf-guard.ts` (or a new `lib/ssrf-fetch.ts` beside it — one or the other, **not a
third guard module**).
**Acceptance:** resolve once → validate every returned address against the existing
`isPrivateIpv4`/`isPrivateIpv6` predicates → dial the validated IP with the **original hostname
preserved for TLS SNI/cert validation**. Pure `lib/` seam, unit-testable with no network.
**QA:** unit specs —
1. Given a `lookup` returning a **public** IP first and a **private** IP on a second call, the fetch
   still dials the first (validated) address. *This is the assertion that proves the TOCTOU is
   structurally closed rather than merely narrowed — it is the point of the whole epic.*
2. The guard still **rejects** when the single resolve returns any loopback/private/link-local/
   reserved address (existing behaviour, must not regress).
3. TLS validates against the **original hostname** — a cert valid for the rebound IP's host does not
   satisfy the connection.
**Risk:** LOW.

### Story 1.2 — Adopt at both call sites + correct the overclaim ✅ `bca6e63` (review fixes: `f78bc9a`, `2cf29e8`, `2a83bfa`)
**As a** reader of this code, **I want** the doc comments to describe what the code actually
guarantees, **so that** nobody builds on a mitigation they think is a closure.
**Files:** `lib/shop-url-analyzer-fetch.ts` (`assertPublicHost` + the `fetch()` in `analyzeShopUrl`)
· `lib/shopify-mcp-client.ts` (`assertPublicHost` + the `fetch()` in `callTool`).
**Acceptance:** both adopt the Story 1.1 helper. Each **keeps its own** timeout, redirect (`error`),
and byte-cap behaviour layered on top — the helper provides pinned dispatch, not policy. The
shop-URL analyzer still returns its derived counts/booleans; the Shopify MCP client's `callTool`
still works against a real store. `shopify-mcp-client.ts`'s doc comment is corrected in the **same
commit** — it currently claims a closure it doesn't have. `shop-url-analyzer-fetch.ts`'s comment may
now legitimately claim the close; update it to match reality rather than leaving it understated.
**No doc comment in either file claims more than the code delivers.**
**Risk:** LOW.

## Out of scope (stated so it can't creep)
- Any change to either caller's timeout / redirect / byte-cap policy, or to what either returns.
- `server-only` enforcement on the new helper — raise it as a question in plan mode, decide, move on.
- Auditing for *other* untrusted-domain fetches. **If you find a third, file a seed — don't absorb it.**

## Sprint QA
- **api spec(s):** unit specs on the `lib/` seam (above). No browser spec is meaningfully owed — this
  has no visible surface.
- **Red-first:** every new spec observed failing once before the implementation, or via a deliberate
  break-the-implementation mutation.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api`, green before merge.
- **browser smoke owed:** **none, to anyone.** Say so plainly in the PR rather than inventing a
  walkthrough for a pure-logic change.
- **Deployed-image check (the real risk here):** verify the pinned fetch works in the **Cloud Run
  standalone output**, not just `npm run dev`. The NEXT_PUBLIC build-time inlining audit is the
  standing reminder that build-context divergence is a live class in this repo.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (post-merge — the substance is unit-tested pre-merge)

1. Run the unit suite locally: `npm run test:unit` (or the Playwright `api` project).
   → The three Story 1.1 specs pass, including the rebind-substitution case.
2. Open the cost-comparator homepage and submit a **real public shop URL** (e.g. any live Shopify
   storefront) for analysis.
   → It returns its normal derived result — counts/booleans — in roughly the usual time. *(This is
   the "did pinning break legitimate traffic" check.)*
3. Submit a URL that resolves to a **private** address, e.g. `http://localhost:3000` or a
   `192.168.x.x` host.
   → Rejected, same as before — the guard still fails closed.
4. Exercise the Shopify MCP client path against a real store (the import/analyze flow that calls
   `callTool`).
   → Works normally; no timeout regression, no connection-reuse slowdown.
5. `grep` both files' doc comments.
   → Neither claims more than the code now delivers; `shopify-mcp-client.ts`'s old
   "closes the DNS-rebinding gap" wording is gone or now accurate.

If any step fails, note the step number + what you saw — that's the bug report.
