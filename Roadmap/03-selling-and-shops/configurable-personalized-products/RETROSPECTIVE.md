# Retrospective — Configurable & Personalized Products

*Epic complete — all 3 sprints shipped to prod 2026-06-05.*

## What shipped
- **S1 — Merchant config** (PR #16, prod 2026-06-05): sellers attach Short/Long/Select custom
  fields to a listing; stored on Medusa product metadata.
- **S2 — Buyer capture + cart/checkout parity** (PR #18, prod 2026-06-05): buy-box fields + char
  counter + required interception; echo in cart drawer + checkout review; payload lands on the
  Medusa cart line item as `metadata.personalization`.
- **S3 — Fulfillment / emails / agents** (backend PR #4 `ed3a6c6` + frontend PR #19 `2ba94bd`, prod
  2026-06-05): order screens + confirmation emails render the personalization; UCP exposes the
  fields + validates an agent-submitted payload.

## Owed
- **Live browser smoke (Daniel):** place a manual/SPEI order on a personalized listing → confirm the
  block on both order pages + both confirmation emails. Agent verified API/build/Playwright; the
  authed browser money-path can't be agent-driven today (see the LEARNINGS browser-smoke note).

## Went well
- **Medusa-first paid off:** zero new tables and zero backend changes for S1–S2 — definitions ride
  product metadata, payloads ride line-item metadata, both native. The backend already merged
  arbitrary product metadata, so the seller-config persistence needed only a frontend passthrough.
- One shared `lib/personalization.ts` (sanitise / validate / build / format) kept every stage
  consistent and gave cheap, deterministic Playwright coverage without auth or a live payment.
- Gating the buy-box island on `customFields.length > 0` kept the high-risk checkout path
  byte-for-byte unchanged for the 99% non-personalized case.

## Learnings / friction
- **Another agent pushed a feature ("seasonal platform theme engine", `b979976`) straight to `main`
  — no PR, bypassing gitflow.** Side effects hit this epic twice:
  1. A sibling worktree `apps/miyagisanchez-seasonal-theme` reuses the `miyagisanchez` package name,
     which breaks `npm`/`npx` workspace resolution at the monorepo root. Workaround: invoke the
     root-installed binaries directly (`node node_modules/typescript/bin/tsc -p tsconfig.json`,
     `node_modules/.bin/{next,playwright}`).
  2. Its `e2e/platform-theme.spec.ts` landed on `main` while my branch's preview predated the
     feature → CI ("Playwright vs preview") failed on a test for a feature my preview didn't have.
     Fix was the standard "merge latest `main` into the branch before PR" — but it cost a debug loop.
  - **Action items:** (a) agents working in parallel should announce direct-to-`main` pushes; (b) keep
    gitflow even for "small" engine features; (c) the duplicate-package-name worktree should be
    renamed or excluded from the root `workspaces` glob so tooling isn't broken for everyone.

## Known v1 gaps (by design)
- Text fields only (no file upload); no price-impact options; no edit-from-cart.
- Digital products (separate direct-checkout `BuyButton`) don't capture personalization.
- Signed-out buyers on a **custom domain** lose pre-auth input across the cross-origin sign-in hop
  (platform same-origin is preserved via sessionStorage).
