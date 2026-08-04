# US owned-shop positioning and proof launch — Sprint 1: Lock and publish the observed proof

**Status:** ⬜ not started

## Outcome

A qualified operator can inspect one permission-safe version of the pilot evidence on `/us`, understand the
cohort boundary and what remained partner-led or external, then enter the existing three-shop application.
Incomplete, unavailable or unapproved evidence blocks the affected claim rather than producing launch copy.

## Entry check — do this before implementation

Read the shipped `#US-2` `/us`, flag and application contracts plus the shipped `#US-3` close decision and
private evidence index. Record the exact proof version, cohort denominator, continue/reshape decision,
publication permissions, support boundary and retained systems. A stopped pilot, missing real-order loop or
unavailable permission/evidence stops this sprint. Do not infer a replacement claim from the scope prose.

## Stories

### Story 1.1 — Version the public proof and case-study contract

**As a prospective operator, I want** every claim tied to an observed result and explicit limitation **so
that** I can distinguish evidence from launch copy.

**Acceptance:**

- One dependency-free public-safe artifact records proof version/date, cohort denominator, reviewer and a row
  status of observed, supported-but-not-observed, retained-external or unavailable.
- Every row records its partner-led/self-service mode, limitation, public wording and permission mode. Private
  evidence references may be used during review but cannot be serialized into public output.
- The case-study contract supports factual anonymized proof without a testimonial. Names, logos, quotes and
  screenshots render only when the current separate permission allows that exact use.
- The no-platform-fee founding relationship is disclosed. No typical, average, improvement, scale or universal
  parity claim is derived from the three-shop cohort unless the approved evidence deliberately supports it.
- A pure proof-policy spec refuses missing evidence/reviewer/limitation, unknown states, unapproved attribution,
  mixed self-service/partner-led wording and PII/secret-shaped public fields.
- The spec is observed red through a deliberate broken-matrix mutation before restoration.

**Risk:** low — read-only proof config, product copy and pure policy specs. Any new data store, permission model
or private-evidence API is out of scope and must be re-groomed.

**QA:** dependency-free proof-policy spec plus Daniel's row-by-row comparison with the private evidence index.
No browser smoke is owed for this story alone.

### Story 1.2 — Turn `/us` from hypothesis into proof-led invitation

**As a qualified operator, I want** to inspect the pilot result, limits and next-cohort offer **so that** I can
decide whether submitting three real shops is worth the trust cost.

**Acceptance:**

- With `partners.recruiting_v3_enabled` on, `https://miyagisanchez.com/us` renders the observed result, cohort
  denominator, factual case study, evidence matrix, support mode, retained systems, fit/not-fit criteria,
  material-connection disclosure and one primary application CTA.
- The CTA uses the shipped `#US-2` application. No parallel form, table, validation, review, identity, consent,
  grant or activation path is created.
- With the flag off, the earlier honest invitation remains. An unavailable application shows the approved
  unavailable/recovery state; it never becomes a dead CTA or generic success.
- `/us/l/<anything>` remains a structural 404. No catalog, marketplace, instant-demand, pricing, revenue or
  self-service claim appears.
- The page is substantive in server-rendered HTML, works without JavaScript, uses existing design tokens and is
  legible on mobile and desktop. Metadata and the existing agent/about discovery pointer use the same proof
  version and do not maintain paraphrased claims.
- Public HTML, metadata, analytics/debug output and social previews contain no private evidence reference,
  secret, customer PII or unapproved identity.

**Risk:** low — public non-commerce UI and metadata. If the shipped application contract requires DB/auth or a
new route, stop and re-groom instead of absorbing it.

**QA:** proof render/link spec, `#US-2` application API regression, recruiting-flag on/off negation, structural
catalog-404 regression, metadata/SSR privacy check, TypeScript, lint, build and anonymous desktop/mobile browser
smoke. Daniel approves every attributed element and the real social preview.

## Sprint QA

- **Pure/API specs:** proof-policy invalid/valid matrices; application handoff and unavailable state; analytics
  allowlist; metadata/SSR parity; `/us/l/*` structural 404.
- **Browser smoke owed:** anonymous desktop and mobile `/us`, JavaScript-disabled readability, flag off/on and
  application handoff. No money or auth step belongs to this sprint.
- **Mutation proof:** break one allowed proof row, one permission rule and one flag-state negation; observe each
  relevant spec fail before restoration.
- **Deterministic gate:** frontend TypeScript, lint, build and focused unit/API specs green; root build-order and
  documentation checks green before merge.
- **Owner smoke owed:** Daniel compares the rendered page and social preview with the approved private evidence
  index, permission record and disclosure before publication.

## Sprint 1 — Smoke walkthrough

Env: preview first · production after Daniel approves publication · https://miyagisanchez.com

1. With `partners.recruiting_v3_enabled` off, go to https://miyagisanchez.com/us.
   → You see the earlier honest US invitation; no incomplete pilot proof or dead application CTA appears.
2. On the approved preview with the flag on, open `/us` in a private desktop window.
   → You see the approved result and denominator, evidence statuses, support modes, limitations, disclosure,
   fit/not-fit criteria and one “Apply with three shops” action.
3. Open the same preview `/us` on a narrow mobile viewport with JavaScript disabled.
   → The substantive proof, limitations and application action remain readable in server-rendered HTML.
4. Click “Apply with three shops,” submit once with only two valid shop URLs, then correct it to three disposable
   public shop URLs and submit.
   → Two URLs are rejected by the shipped application; three valid URLs produce “application received,” not an
   acceptance, grant, merchant contact or commerce activation.
5. Open `/us/l/not-a-real-shop` on the same preview.
   → You receive the structural not-found response; no US catalog or shop page renders.
6. Inspect the page source, metadata, social preview and analytics/debug output for the approved proof version.
   → They agree on that version and contain no private evidence IDs, shop/contact data, free text or unapproved
   names, logos, screenshots or quotes.
7. Make the application dependency unavailable in the disposable preview and reload `/us`.
   → The approved unavailable/recovery state appears; the page does not claim success or send to a dead form.

If any step fails, record the step number, URL, flag state, proof version and what appeared. Do not paste private
evidence, applicant data or secrets into the sprint document.
