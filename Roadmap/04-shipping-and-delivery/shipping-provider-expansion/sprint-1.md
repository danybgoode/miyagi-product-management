# Shipping provider expansion — Sprint 1: Spike — shipping funding model (written decision, NO code)

**Status:** ✅ **DONE 2026-07-08** — decision written (all seven sections + aggregator comparison in the seed file; summary in the scope doc, commit `24c073e`) and **Daniel approved** the HYBRID recommendation in-session. Story 1.1 ✅.

> **Spike discipline:** time-boxed investigation → a **written decision**. No branch, no build, no code.
> The decision lands in [`00-ideas/seeds/spike-envia-byo.md`](../../00-ideas/seeds/spike-envia-byo.md)
> (sections filled) + a summary in the scope doc. Daniel signs off before any BYO build is ever sliced.

## Stories

### Story 1.1 — Funding-model written decision
**As** the platform owner, **I want** a researched, written recommendation on how seller shipping gets
funded — **BYO** (sellers fund + connect their own carrier account) vs **platform-funded with markup** vs
**hybrid** (platform default + optional BYO) — **so that** the shipping-funding burden lands deliberately
and the next build slice is known before anyone writes code.

**Must cover (from the seed + this groom):**
1. Funding-model recommendation with the trade-offs (cash-flow, support burden, seller friction, margin).
2. **Aggregator comparison** — Envía BYO (feasibility already validated: per-account Bearer tokens,
   published Marketplace Multi-Seller use case) vs Skydropx, Pakke, Mienvío, EnvíoClick on: per-seller
   accounts, MXN pricing, MX coverage/carriers, API shape, webhook/tracking support.
3. Credential model + storage (Medusa seller metadata vs elsewhere; encryption at rest — the ML-sync
   AES-256-GCM precedent; rotation/revocation).
4. Client-refactor shape: `envia-client.ts` reads one `ENVIA_API_KEY` today → per-seller key threading
   through quote + label paths.
5. Onboarding/validation UX: token entry + test-validate; unconnected sellers ⇒ existing arranged/manual fallback.
6. Composition: `shipping.envia_enabled` stays the master OFF; the Sprint-2 comp-grant and any BYO are
   per-seller layers on top.
7. Agent surface (AGENTS #3): UCP/MCP quote + ship behavior per-seller under the chosen model.
8. Go/no-go + the thin first slice (NOT built here).

**Acceptance:** the seed file's decision sections are filled with sources + dates; scope doc updated;
Daniel signs off on the recommendation.
**Risk:** low (research/decide only).

## Sprint QA
- **api spec(s):** none — docs-only sprint, no deploy.
- **browser smoke owed:** none.
- **deterministic gate:** n/a (no code). The "gate" is Daniel's sign-off on the written decision.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: docs only — no deploy.

1. Open `Roadmap/00-ideas/seeds/spike-envia-byo.md`
   → Every "The decision the spike must land" section is filled in, with sources + a dated recommendation.
2. Open `Roadmap/00-ideas/2. readyforscope/shipping-provider-expansion.md`
   → The funding-model decision is summarized under Research, consistent with the seed.
3. Reply approve/reject on the recommendation.
   → Your sign-off (or requested changes) is recorded in the seed file.

If any step fails, note the step number + what you saw — that's the bug report.
