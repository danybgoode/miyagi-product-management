---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: ssrf-dns-pinning
---

# Epic: SSRF hardening — DNS-pin the resolved IP instead of resolve-then-fetch

> **Area:** 09 · Platform & Infra · **Risk:** low · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/ssrf-dns-pinning.md`](../../00-ideas/seeds/ssrf-dns-pinning.md) · **Archetype:** Sweeper/Maintainer

## Why

Two places fetch an untrusted, caller-supplied domain server-side — the shop-URL analyzer and the
Shopify MCP client. Both **resolve the hostname, validate every address, then call `fetch()`** —
which resolves the hostname *again*, independently. Between those two resolves there is a TOCTOU
window: an attacker controlling DNS for the target domain can flip the record between them (classic
DNS rebinding) so the address we validated is not the address we dial.

**Framing this honestly, because the seed does:** the current code is **substantially mitigated, not
broken.** https-only means TLS validates the cert against the original hostname, so a rebound IP
presenting the wrong cert fails; plus `redirect: 'error'`, an 8s timeout, a byte cap, and — for the
analyzer — the raw body is never returned to the caller, only derived counts. This is **hardening,
not an incident**, and it should not jump ahead of live defects on the board.

What *is* a real problem: both files' doc comments claimed the gap was closed. The analyzer's was
corrected during the PR #280 review round; `shopify-mcp-client.ts`'s identical overclaim is still
there. Code that overstates its own guarantees is how the next reader builds on a false assumption.

## Medusa-first note

N/A — frontend `lib/` seam only. No model, route, table, or flag. Not a commerce path.

## What already exists (reuse, don't rebuild)

- `lib/ssrf-guard.ts` — `isPublicDomainShape`, `isPrivateIpv4`, `isPrivateIpv6`. **Already the
  shared seam.** The pinned-dispatch primitive belongs here or in a sibling `lib/ssrf-fetch.ts`.
  **Do not add a third guard module.**
- `lib/shop-url-analyzer-fetch.ts` — `assertPublicHost` + the `fetch()` in `analyzeShopUrl`
  (PR #280). Its comment is already accurate; keep it accurate when the pin lands.
- `lib/shopify-mcp-client.ts` — `assertPublicHost` + the `fetch()` in `callTool`. **Its comment
  still overclaims** — fixing that is part of this epic, not a nicety.
- Existing unit specs over `ssrf-guard.ts` — extend, don't fork.

## The design fork — settle it in plan mode before writing code

`undici` is **not a direct dependency** of `apps/miyagisanchez`; it resolves only *transitively*
from the workspace root. Node is v22.22.3, so global `fetch` is undici-backed but accepts a
`dispatcher` only via the `undici` package's own types. Two shapes:

- **(A) Add `undici` as a direct dependency**, use `Agent({ connect })` to force the validated IP
  while preserving the hostname for SNI. Smaller diff; both call sites keep the `fetch` API and
  their own timeout/redirect/byte-cap logic. **Recommended.**
- **(B) Drop to `node:https.request`** with a `lookup` override. No new dep, but both call sites get
  rewritten off `fetch` and their layered concerns ported.

State the choice and the reason in the PR. Relying on a hoisted transitive dep is not an option —
that's the coupling that breaks on an unrelated `npm` tree change.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Shared pinned-fetch helper on the `lib/` seam (pure logic, unit-tested) | low |
| 1 | 1.2 Adopt at both call sites + correct the `shopify-mcp-client.ts` overclaim | low |

## Deploy order

Frontend-only (`apps/miyagisanchez`), one PR, LOW tier — reviewer may merge on a green gate.
**Shared-surface caveat:** `lib/ssrf-guard.ts` is imported by sibling work, so **announce the change**
so parallel branches rebase (groom chore-path rule). No kill-switch — Stage 6b carve-out: defensive
hardening of existing reads, no new runtime seam, fail-safe by construction; rollback is `git revert`.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** N/A — carve-out recorded at grooming (Stage 6b): no runtime seam, fail-safe by construction
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
