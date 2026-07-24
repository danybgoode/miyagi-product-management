# Founding merchant consent-safe previews — Retrospective

_Closed: 2026-07-24 — 4 sprints + 2 CRITICAL security fixes; shipped & live (flag ON, pre-launch)_

## What shipped

The approved-field promise made real: a Founding Merchant Partner can prepare a **private** shop preview,
share it only with the merchant over an opaque revocable link, capture the merchant's **explicit, versioned**
approval of the exact reviewed snapshot, and only then activate that snapshot publicly — with claim and
checkout behaviour unchanged.

- **S1 — private publication state + opaque link + cross-channel leak guard** (FE #292 `afcfc22`;
  hardening FE #293 `2bb91a0` / BE #108 `3d7751b`). Promoter-created products land as Medusa drafts behind
  a per-shop preview anchor; a permanent regression invariant proves private/draft rows cannot leak across
  marketplace, search, shop/PDP, agent, embed, sitemap, custom-domain or subdomain reads. The privacy guard
  is **not** flag-gated (privacy must never fail-open on a flag flip).
- **S2 — versioned approval, material-edit invalidation, idempotent activation** (FE #294 `626f0b1`).
  Approval is a snapshot captured at approval time; a material edit after approval invalidates it and forces
  re-approval; public activation replays the approved snapshot idempotently.
- **S3 — readiness checklist + PII-free Golden Beans lifecycle events + historical inventory report** (FE #295).
- **S4 — merchant-verified approval** (FE #302 `7b15d1b`): a one-time code to the merchant's contact is
  required to approve, so a promoter can no longer self-approve by clicking "Aprobar" (residual: the code
  goes to a promoter-populated `merchant_email` — a real independent-contact smoke is the future hardening).
- **Two CRITICAL post-merge security fixes** (#296, #297): the MCP `set_listing_status` publish bypass
  (an `autoGrantPartnerOnClose` manager grant + anchor-less `partner-auth` let a second write tool publish
  into a preview-private shop with no consent check) and the missing PDP preview guard.

Migrations applied and verified live (`to_regclass`); `promoter.private_preview_enabled` flipped **ON** by
Daniel (verified live 2026-07-24). Import cleanup: 183 → 29 shops (154 orphan scrape/test rows deleted).

## What went well

- **Guard the population, not the door.** The enduring lesson of the epic: S1 guarded the MCP `create_listing`
  door while claiming coverage "from any writer", and a sibling write tool (`set_listing_status`) stayed open
  and published without consent. The fix enumerated every write primitive mechanically and enforced the rule
  at the population with a spec that re-derives it.
- **Post-merge review still earned its keep.** Both CRITICAL bypasses were found *after* the feature merged,
  by the review layers re-examining the whole write surface rather than the original diff — exactly the value
  the mandatory cross-agent + fresh-reviewer stack exists to capture.
- **Snapshot-at-approval-time** kept activation correct: because activation replays a snapshot captured at
  approval, an intervening edit can't silently change what the merchant approved.

## What we learned

<!-- Promote durable, generalizable items to Roadmap/LEARNINGS.md. Dedupe. -->

Already promoted to `Roadmap/LEARNINGS.md` during the review rounds (kept here as pointers, not duplicated):

- **Guard the population, not the door you found** — enumerate write primitives mechanically; a confident
  comment is not evidence. (team memory: `guard-the-population-not-the-door-you-found`)
- **A snapshot derived from drafts is consumed by activation** — store the snapshot at approval time, or the
  approved action destroys its own precondition. (team memory: `snapshot-derived-from-drafts-is-consumed-by-activation`)
- **A fail-open flag default composes badly with privacy** — never gate a privacy guard on a fail-open flag;
  a flag flip is not merchant consent.

## Gaps / follow-ups

- **Disposable-shop smokes descoped as pre-launch ceremony** (Daniel, 2026-07-24): zero real tenants, so the
  full channel sweep and S1–S4 walkthroughs assume operations that don't exist. Re-run on demand once real
  merchants exist. The structural guarantees they'd spot-check are already enforced by regression specs.
- **S4 residual — merchant-email independence.** The verification code is sent to a promoter-populated
  `merchant_email`; a future hardening should capture/verify the merchant contact through a channel the
  promoter doesn't control (e.g. at claim time). The copy already says "no es una firma legal".
