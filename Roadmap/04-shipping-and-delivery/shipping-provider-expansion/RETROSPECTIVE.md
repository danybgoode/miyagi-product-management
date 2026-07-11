# Shipping provider expansion — Envía comp-grant, BYO decision, Correos de México — Retrospective

_Closed: 2026-07-11_

## What shipped

- **Sprint 1 (spike, docs-only) — funding-model decision.** ✅ approved 2026-07-08. Written into
  `00-ideas/seeds/spike-envia-byo.md`: HYBRID model — admin comp-grant (Sprint 2) as the curated
  platform-funded tier, BYO Envía token as a future self-serve tier, arranged/manual fallback for
  everyone else. Stay on Envía (no aggregator switch); credentials would live on a dedicated
  Medusa-seller `envia_connection` model, never seller metadata.
- **Sprint 2 — Envía comp-grant.** ✅ MERGED 2026-07-11, backend
  [#78](https://github.com/danybgoode/medusa-bonsai-backend/pull/78) → squash `a06fe6f`, frontend
  [#210](https://github.com/danybgoode/miyagisanchezcommerce/pull/210) → squash `92c2a8c`. The
  platform admin can hand-pick individual shops onto live Envía (`metadata.envia_grant` on the
  Medusa seller) while the global `shipping.envia_enabled` flag stays OFF for everyone else — both
  the quote seam and every label seam (including the FE legacy ship route) enforce the grant.
- **Sprint 3 — Correos de México, manual economy provider (Impresos v1).** ✅ MERGED 2026-07-11,
  backend [#80](https://github.com/danybgoode/medusa-bonsai-backend/pull/80) → squash `77d0875`,
  frontend [#214](https://github.com/danybgoode/miyagisanchezcommerce/pull/214) → squash `a19f3cc`.
  A wholly new provider class — no external API, a pure versioned tariff table
  (`quoteCorreosForPieces`, 28 bands spec-locked to `references/correos-de-mexico-impresos.pdf`),
  a per-shop seller opt-in with an honest sin-rastreo explainer + live rate preview, a real
  checkout option («Correos de México — Económico · 4–10 días · sin rastreo») gated on
  `shipping.correos_enabled` + seller opt-in + weight ≤ table max, and fulfillment through the
  existing manual-carrier path (tracking optional). Independent of the Envía flag/grant — Correos
  still prices even when Envía itself is fully blocked.

Both flags (`shipping.envia_enabled`'s grant override, `shipping.correos_enabled`) are enablement
polarity, default OFF, and created disabled — both sprints ship dark, activated only by a
deliberate flag flip / grant.

## What went well

- **The pure-gate pattern (`enviaKillGate`, `correosGate`) scaled cleanly to a second, independent
  provider.** Mirroring the existing `envia-killswitch.ts` shape for `correos-gate.ts` (same
  discriminated-union decision object, same colocated unit-spec convention) made the new gate
  trivially reviewable and testable — 5 unit specs, zero ambiguity about the flag×opt-in logic.
- **Two-repo cross-review (Codex + the Claude `pr-reviewer`) caught real bugs before Daniel ever
  saw the PRs.** Codex's single-pass diff read caught the per-piece-vs-combined-cart-weight tariff
  bug on the first pass — a genuine money-path correctness issue that unit tests alone hadn't
  caught (the original tests happened to only exercise single-item carts). The Claude reviewer's
  independent re-derivation confirmed the fix was actually wired in (not a dead function) and
  caught a real documentation gap (the tariff PDF's repo location wasn't obvious from a
  backend-only read).
- **Deliberately narrowing S3.5's scope, in-conversation, instead of quietly overbuilding.** Plan
  mode surfaced that UCP `checkout-session` has zero buyer-side shipping exposure today — not just
  for Correos, for anything, Envía included. Rather than build that from scratch as a Correos-shaped
  side effect (real new agent money-path surface, its own risk tier), the scope was cut back to
  seller-config-schema parity + a spec that honestly documents the gap, and the real work was
  seeded (`00-ideas/seeds/ucp-buyer-shipping-exposure.md`) for its own future groom pass.

## What we learned

- **A tariff/rate table's unit ("per piece" vs "per shipment") is a load-bearing detail that a
  quick reading of a scope doc can miss even when the source PDF is right there.** The scope doc's
  own summary ("$6.00 MXN ≤20 g") doesn't disambiguate single-item vs. cart-total pricing, and the
  first implementation summed all cart items into one combined weight before quoting — which
  happened to pass every unit test (all single-item) and only surfaced via a cross-model review
  reading the actual PDF's column header ("peso en gramos por pieza"). **Generalizable:** when
  porting an external tariff/pricing table into a pure calculator, explicitly state and test the
  unit the table prices *by* (per item vs per order vs per kg-total) — a single-item-only test
  suite can't distinguish "quotes correctly" from "quotes correctly only when there's one item."
- **A sibling epic's CI-lint sweep landing on the exact file you're mid-edit on is a real,
  recurring failure mode — not a one-off.** This is a corollary to the existing "main moves under
  you" LEARNINGS entry, but with a twist: it wasn't a stale *test* mismatch (the usual case), it
  was a stale *source* file — `seller-portal-rails-foundation` S2.5 added `Envios.tsx` to a
  design-token CI lint's enforced-sweep set and converted its existing banners to a shared
  component, all after this branch was cut but before the PR was reviewed. The new code this
  sprint added to that same file (predating the sweep) then failed CI for using the exact
  raw-Tailwind pattern the file's *older* code had used just days before. `git merge origin/main`
  + adopting the same shared component the sweep introduced was the fix — same remedy as always,
  but worth naming the specific shape (a lint RULE change, not just a code change) since it's easy
  to misdiagnose as "my new code is broken" rather than "the file's own conventions moved."

## Gaps / follow-ups

- **Live money-path smokes owed to Daniel, both sprints** — Sprint 2's (grant a real tenant → buy
  with live rates → generate a real platform-paid label → revoke → confirm fallback, walkthrough in
  `sprint-2.md`) and Sprint 3's (flag flip → seller opt-in → Correos checkout → seller ships with
  empty tracking → honest buyer emails → opt-out/flag-off both hide it, walkthrough in
  `sprint-3.md`). Neither has been run yet.
- **Sprint 3's tariff PDF has no in-repo provenance from a backend-only checkout** (it lives in the
  monorepo-root repo, not `apps/backend`, per this project's nested-repo structure) — clarified in
  code comments, but a future backend-only contributor auditing the 28-band table still needs the
  full monorepo checkout to see the source. Acceptable given the project's existing repo-structure
  convention, not a new gap this epic introduced.
- **UCP buyer-side shipping/delivery-method exposure remains unbuilt** for both Envía and Correos —
  deliberately deferred, seeded at `00-ideas/seeds/ucp-buyer-shipping-exposure.md` for a future
  groom pass. An agent booking a shippable listing today sees only payment methods, not shipping
  choices.
- **BYO Envía (Sprint 1's self-serve tier) was never scheduled** — the spike's decision was
  "sequenced, not blocking" (S2/S3 shipped first); still un-slotted on the roadmap.
