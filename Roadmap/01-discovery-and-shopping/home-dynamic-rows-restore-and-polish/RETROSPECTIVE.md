# Homepage dynamic rows — restore on prod + polish to spec — Retrospective

_Closed: 2026-07-20_

## What shipped

- **Sprint 1** — PR #243 / `a2061e9`: restored the signed-in personalization fetch by threading the real
  Medusa URL/key from the Server Component into the client island, and added an observable failure breadcrumb.
- **Sprint 2** — PR #251 / `5ac54d5`: signed-in ribbon gating, the existing favorite price snapshot surfaced
  as “Bajó $N,” and device-local recently viewed items merged into the resume rail.
- **Sprint 3** — PR #255 / `f77dda0`: the anonymous first visit gained the revised hero, “Recién llegado,”
  live category rows and the seller block while `/` remained static/ISR.

## What went well

- Re-reading the live bundle corrected the assumed CORS bug to the actual build-time environment failure.
- The price snapshot column already existed and was populated; validating that fact removed an unnecessary
  migration and kept Sprint 2 low risk.
- Client islands and next-free derivation seams preserved the static homepage while adding personalized behavior.
- A real production Chromium pass on 2026-07-20 confirmed the anonymous hierarchy and content render at HTTP 200.

## What we learned

- A `NEXT_PUBLIC_*` read inside a client island is frozen at build time; Cloud Run runtime variables cannot repair
  it. Thread runtime-resolved public configuration through Server Component props and make fail-open islands
  observable, or the exact class of failure can hide behind an intentionally empty error state.
- “Already possible” is a real delivery result: the existing favorite-price snapshot collapsed a planned schema
  story into a small read/render change once code and data were checked.

## Gaps / follow-ups

- Daniel still owes the signed-in production pass for the retoma rail, pending-offer alert, price-drop badge and
  recently-viewed merge; neither the scripted production harness nor the available browser session could
  authenticate against the production Clerk instance.
- The 2026-07-20 anonymous smoke captured one generic 400 console resource error and several listing cards whose
  source images rendered placeholders. The homepage layout is working; image/data health should be investigated
  separately if the symptoms persist rather than reopening this epic's shipped interaction work.
