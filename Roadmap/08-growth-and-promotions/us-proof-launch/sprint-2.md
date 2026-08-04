# US owned-shop positioning and proof launch — Sprint 2: Run one organic launch cycle and decide

**Status:** ⬜ not started

## Outcome

Daniel has one approved, proof-linked packet for a bounded human-sent organic wave and a privacy-safe 30-day
scorecard. The launch ends in a recorded continue, reshape or stop decision based on a screening-passed
three-shop application rather than pageviews or generic interest.

## Entry check — do this before implementation or sending

Sprint 1 must be merged, live and approved with one current public proof version. Re-read the shipped `#US-2`
event/application schema and the live proof artifact before changing attribution. Daniel must approve every
recipient and community placement separately. Builders create materials and deterministic measurement rails;
they do not send, post, scrape, enrich, follow up or buy media.

## Stories

### Story 2.1 — Produce the permission-safe founder launch packet

**As the product owner, I want** proof-linked messages for a bounded, human-sent cohort **so that** I can test
the proposition without an automated campaign or unsupported claim drift.

**Acceptance:**

- The research outreach source becomes five complete, send-ready variants: operator, merchant, warm
  introduction, community/partner introduction and founder post.
- Every proof statement and quote maps to the current public proof version. All brackets/placeholders are
  resolved; no recipient belief, consent, dissatisfaction, revenue or client authority is inferred.
- Messages preserve the approved operator job, no-cutover promise, three-shop first behavior, fit/not-fit
  boundary, material-connection disclosure and human sender identity.
- One fixed UTM pattern uses only proof version, coarse source and message variant. Contact, company, community
  and shop identifiers never appear in URLs or analytics.
- Daniel approves 12–15 individually selected contacts and at most two permissioned community/partner
  placements. He sends from a named human, stops after at most two follow-ups and stops immediately on opt-out.
- No product code sends messages or stores a prospect list; no builder uses an external sending or enrichment
  tool in this story.

**Risk:** low — launch copy and human-owned distribution plan. Actual sends/posts and recipient permissions
remain product-owner actions outside the builder rail.

**QA:** proof-version/link sweep, unresolved-placeholder guard, claim allowlist comparison, URL/analytics privacy
check and Daniel's review of the actual recipient/permission sheet.

### Story 2.2 — Measure qualified commitment and close the 30-day decision

**As the product owner, I want** the organic wave measured through a screening-passed three-shop application
**so that** I know whether to continue, reshape or stop before buying traffic.

**Acceptance:**

- The shipped `#US-2` funnel accepts only fixed proof version, operator track/stage, coarse source and message
  variant values. Shop URLs, contact/company fields, free text, evidence and merchant data are rejected or
  dropped from analytics.
- The scorecard covers visit → application start → valid three-shop submission → screening pass → merchant
  introductions scheduled. It reports known-present, known-absent and unavailable separately.
- An unavailable analytics or application source never becomes zero, “no applications” or a successful empty
  run. Sensitive disqualification/objection detail remains outside analytics and is summarized only after
  owner review.
- At day 30 Daniel records bounded sends/placements, screening-passed applications, disqualification and
  objection themes, support load and a continue/reshape/stop decision.
- The cycle succeeds only when at least one screening-passed operator application contains three real shop
  URLs and traces to the bounded organic wave. Pageviews, starts, unqualified submissions and direct-merchant
  interest are supporting evidence, not substitutes.
- Paid acquisition remains blocked unless the signal passes and Daniel approves a separately shaped bet.

**Risk:** low — fixed analytics fields and decision documentation. Any new lead/CRM table, applicant PII in
analytics or automated campaign is out of scope and must be re-groomed.

**QA:** event allowlist/privacy spec, three-state scorecard fixtures, deliberate-red mutation and Daniel's
comparison with the application queue. No additional browser smoke beyond checking source attribution through
the existing application flow.

## Sprint QA

- **Pure/API specs:** message placeholder/proof-link guard; fixed UTM vocabulary; event allowlist rejects PII
  and unknown values; three-state scorecard handles present, absent and unavailable sources.
- **Browser smoke owed:** one anonymous proof-linked visit through the existing `/us` application confirms the
  fixed source/proof version without exposing applicant data. No money/auth smoke belongs to this sprint.
- **Mutation proof:** deliberately allow one sensitive field and collapse unavailable to zero; observe the
  privacy and scorecard specs fail before restoration.
- **Deterministic gate:** frontend TypeScript, lint, build and focused unit/API specs green; root build-order and
  documentation checks green before merge.
- **Owner smoke owed:** Daniel reviews real recipients/permissions, sends/posts every message himself, verifies
  the application queue against the scorecard and owns the day-30 decision.

## Sprint 2 — Smoke walkthrough

Env: production · https://miyagisanchez.com

1. Open each of the five approved launch-message variants beside the live https://miyagisanchez.com/us proof.
   → Every claim matches the current proof version, every placeholder is resolved and the disclosure, fit
   boundary and human sender are clear.
2. Open every message link before sending.
   → It resolves to `/us`; its tags contain only the approved proof version, coarse source and message variant,
   with no contact, company, shop, community or free-text identifier.
3. From one disposable approved link, start and submit the shipped operator application with three disposable
   public shop URLs.
   → The application completes normally and analytics records only the fixed source/proof/stage values; the
   three URLs and applicant details do not appear in analytics/debug output.
4. Render the scorecard with a present application source, a known-empty source and an unavailable source.
   → It labels the three states separately; unavailable never appears as zero or “no applications.”
5. Daniel compares the approved recipient/permission sheet with the 12–15 contacts and at most two placements.
   → Every recipient/placement is intentional and permission-safe; nothing has been auto-sent or enriched.
6. **Daniel only:** send/post the bounded wave, stopping after two follow-ups or immediately on opt-out.
   → The real sends remain human-owned and use only the approved proof-linked variants.
7. At day 30, compare the scorecard with the application queue and record continue, reshape or stop.
   → The record names whether a screening-passed three-shop application occurred, gaps/unavailable evidence,
   objections and support load; paid acquisition remains blocked without a passing signal and new approval.

If any step fails, record the step number, proof version, coarse source/message variant and observed state. Keep
recipient and applicant PII in its approved private source, not this sprint document or analytics.
