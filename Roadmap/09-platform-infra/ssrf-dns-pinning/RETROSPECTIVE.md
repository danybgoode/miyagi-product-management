# ssrf-dns-pinning — Retrospective

_Closed: 2026-07-20_

## What shipped
Structural closure of the DNS-rebinding TOCTOU at the two server-side untrusted-domain fetches (the
comparador shop-URL analyzer and the Shopify MCP connector). One PR, LOW tier, merged `d50f92f` (frontend PR
`#290`).

- **S1.1 — the pinned-fetch seam** (`329327f`). New `lib/ssrf-fetch.ts`: `pinnedFetch` resolves the hostname
  **once**, validates every returned address against the existing `isPrivateIpv4`/`isPrivateIpv6` classifiers,
  then physically dials that validated set via a per-request undici `Agent` whose `connect.lookup` is stubbed
  to answer with it — no second, independent resolve is possible. The URL hostname is untouched, so TLS
  SNI/cert validation still runs against the original hostname. **Design fork settled (A):** `undici` added as
  a direct dep (`fetch` + `Agent` imported from it), not the global fetch + a duck-typed dispatcher.
  `server-only`-free by decision (the Playwright `api` runner must import it).
- **S1.2 — adopt at both call sites + correct the overclaim** (`bca6e63`, review fixes `f78bc9a` / `2cf29e8`
  / `2a83bfa`). Both sites deleted their duplicated `assertPublicHost` and adopted `pinnedFetch`, each keeping
  its own timeout / redirect / byte-cap / fail-closed policy. `shopify-mcp-client.ts`'s doc comment (which
  overclaimed a closure it didn't have — the epic's stated reason to exist) corrected to match reality.

## What went well
- **The two review layers were non-redundant on a LOW PR — and the fresh `pr-reviewer` pass was invoked on
  three *named* judgment triggers** (security-shaped · shared `lib/` seam · new dependency), exactly the case
  the new review policy carves out. Both layers independently caught the same production-breaking blocker; the
  `pr-reviewer` pass added two more (IPv6-first failover loss, an unguarded test bypass) and proved the
  positive TLS behaviour by hand.
- **The blocker was empirically reproduced, not argued.** `await agent.destroy()` in a `finally` killed the
  socket at headers, before either caller read the body. Confirmed with a local repro (`>64 KB → terminated`)
  and a **mutation test** (reintroduce the destroy → the new large-body spec goes red; fix → green). The
  original 6 specs all passed against the broken code because none read a body.
- **Verify-by-running paid off twice.** The "undici is bundled into the standalone output" claim was
  re-checked by inspecting the built chunk (no external `require("undici")`, Agent internals inlined) rather
  than a grep-for-filename; and the false-positive `autoSelectFamily` finding was settled by reading undici's
  source **and** an empirical probe, not by taking either reviewer's word.
- **The batch found a bigger fish.** Auditing the two in-scope sites surfaced a *third*, unauthenticated,
  fully-open SSRF (`artwork_url`) — filed as a seed per the sprint's own "find a third, file a seed" rule, not
  absorbed. (See Gaps.)

## What we learned
Promoted to `Roadmap/LEARNINGS.md`:
- **DNS-pinning belongs in the dispatcher, not the URL: resolve once, validate the whole set, and hand a
  per-request undici `Agent` a `connect.lookup` that only ever answers with that validated set — leaving
  `url.hostname` intact so TLS SNI still validates the cert against the real host.** Pin the *set*, not
  `results[0]`, and set `autoSelectFamily: true` + `hints: ADDRCONFIG`, or you silently drop dual-stack
  failover on IPv4-only egress (Cloud Run).
- **`undici.fetch()` resolves at HEADERS, not at body-complete — so tearing the dispatcher down in a
  `finally` truncates the body, and a status-only spec can't see it.** Destroy the Agent only on the throw
  path (no Response was handed back to drain); on the success path let the per-request socket self-close
  (`keepAliveTimeout: 1` + `Connection: close`). Any spec guarding this MUST read a body larger than one TCP
  flush (>256 KB), or it is a false negative — the bug is a race.
- **A regression spec that only asserts status is vacuous against a stream-lifetime bug; assert the drained
  body, and prove the spec non-vacuous with a mutation.** (Sharpens the red-green DoD for async I/O.)

## Gaps / follow-ups
- **Owed to Daniel — the post-merge smoke** (sprint-1.md steps 2-4): submit a real public Shopify URL to the
  comparador (legit traffic still works), submit a private-address URL (still rejected), exercise the Shopify
  import path. Unit-tested pre-merge; the live behaviour is his to confirm.
- **Story 1.1 QA item 3 (TLS-cert-against-original-hostname) has no automated spec** — it needs a self-signed
  cert pair and this repo has no cert tooling as a dep; judged disproportionate for a LOW sprint. The
  *behaviour* was proven correct by hand in review (pinning `www.google.com`'s IP under hostname
  `example.com` → `ERR_TLS_CERT_ALTNAME_INVALID`). Stated, not implied covered.
- **The third site — `Roadmap/00-ideas/seeds/ssrf-artwork-url-mcp.md`** (`app/api/ucp/mcp/route.ts` `artwork_url`):
  unauthenticated (buyer tool, 120 rpm/IP), `http://` accepted, redirects followed, fetched bytes returned,
  plus an error-string oracle. **risk:high** → Daniel merge. A fast-follow adopting this epic's `pinnedFetch`
  seam is in flight this session (`fix/ssrf-artwork-url`).
