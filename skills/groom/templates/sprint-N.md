# {{TITLE}} — Sprint {{N}}: {{SPRINT_TITLE}}

**Status:** ⬜ not started

## Stories
<!-- One block per story. Thinnest shippable slice first. -->

### Story {{N}}.1 — <title>
**As a** <role>, **I want** <capability>, **so that** <outcome>.
**Acceptance:** <plain-language checks Daniel can run>
**Risk:** {{RISK}}

## Sprint QA
- **api spec(s):** <which testable story → which `e2e/*.spec.ts`>
- **browser smoke owed:** <no · or: yes, to Daniel — name the money/auth step>
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint {{N}} — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. <action with a real clickable URL>
   → <observable expected result>

<!-- Flag money/auth/checkout steps by name — those are owed to Daniel (an automated browser smoke can't fully cover them). -->

If any step fails, note the step number + what you saw — that's the bug report.
