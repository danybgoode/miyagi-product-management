# Sprint 3 — Contrast verification + no-regression guard

Goal: prove every semantic foreground/background pair holds WCAG AA, and stop new raw-hex from
eroding the foundation after this epic closes.

Status: ✅ shipped — frontend PR #37 (`0c0607f test(tokens): enforce contrast and raw-color guard`).
Guard lives at `apps/miyagisanchez/e2e/design-token-foundation.spec.ts` (contrast over token pairs +
the no-regression raw-color scan with the email/print/OG/admin/sandbox allow-list), green in the
deterministic `api` gate.

Risk tier: **low** — verification + a test/lint guard; no commerce, no behavior change.

---

## US-4 — WCAG AA contrast verification

**As a** visitor, **I want** every semantic fg/bg pair to hold WCAG AA, **so that** text stays readable
regardless of the active theme.

- [x] A contrast check runs over the documented token pairs (`--fg`/`--bg`, `--fg-muted`/`--bg`,
      `--accent-foreground`/`--accent`, feedback-on-soft, etc.).
- [x] All pairs pass AA (4.5:1 body / 3:1 large); any failure is fixed in `globals.css` or flagged in
      the epic with rationale.
- [x] The check is reproducible (script or spec), not a one-off manual eyeball.

## US-5 — No-regression guard

**As a** maintainer, **I want** new raw-hex in customer-facing components caught automatically, **so that**
the tokenized foundation doesn't silently erode.

- [x] A lightweight guard fails on a newly-introduced raw color in the target dirs — either an ESLint
      rule or a pure-logic Playwright `api` spec scanning the customer-facing component dirs.
- [x] The guard **allow-lists** the legitimately-hardcoded contexts (email, print/PDF, OG image, admin,
      sandbox) so it doesn't false-positive on them.
- [x] Pure logic lives on a next-free `lib/` seam so the `api` runner can load it (LEARNINGS → Tooling).
- [x] The guard runs in the deterministic gate (green required before merge).

## Sprint 3 QA

- [x] Contrast check passes AA for all documented pairs (output captured in the epic/retro).
- [x] New-guard spec is in the `api` project and green; a deliberate raw-hex in a guarded dir makes it red
      (negative test demonstrated).
- [x] `tsc --noEmit` + `npm run build` + Playwright `api` suite green.

## Sprint 3 — Smoke walkthrough (do these in order)
> _Placeholder — fill exact commands at build time._

1. Run the contrast check (`npm run <contrast-script>` or the spec).
   → All documented token pairs report PASS at AA.
2. Run `npm run test:e2e` (the `api` gate).
   → The no-regression guard spec passes.
3. Add a throwaway `bg-[#ff0000]` to a guarded component, re-run the guard.
   → The guard goes red and names the file/line. Revert it.
4. Add the same throwaway hex to `lib/email.ts` (allow-listed), re-run.
   → The guard stays green (allow-list works). Revert it.

If any step behaves differently, note the step number + what you saw — that's the bug report.
