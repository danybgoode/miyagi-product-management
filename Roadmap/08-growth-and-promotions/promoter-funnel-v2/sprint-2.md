# Sprint 2 · Become a promoter — self-serve application flow

> Epic: [Promoter Funnel v2](README.md) · Risk: LOW/MED · Status: ✅ merged 2026-07-03
> New Supabase state (applications — non-commerce, rule #2). Hand-minting keeps working unchanged.
> PR: [#163](https://github.com/danybgoode/miyagisanchezcommerce/pull/163) squash-merged to `main`
> as `de56db3`.

## US-2.1 — Public application form + admin notification ✅
**As** someone who wants to be a promoter, **I want** to apply from `/vende/promotor` (name, email,
WhatsApp, ciudad/zona, breve motivación) without an account, **so that** I don't need to know Daniel
personally.
**Build note:** store applications in Supabase (status: `pending | approved | rejected`);
rate-limited (`lib/ratelimit.ts`), honeypot/min-field validation; notify admin via `lib/telegram.ts`
+ email (`lib/email.ts`). The landing's primary CTA (S1.3) points here. es-MX.
**Field-list correction (confirmed with Daniel during planning):** the epic doc's original field
list omitted email, but sending the approved code requires one — added as a required field.
**Acceptance:** submitting the form stores a pending application and fires Daniel's Telegram + email
within seconds; duplicate/spam submissions are rate-limited; one `api` spec on validation + one on
the route (anonymous POST). **Commit:** `52fa5ff`.

## US-2.2 — Admin approve/reject → code minted + sent ✅
**As** Daniel, **I want** pending applications in `/admin/promoter` with approve/reject, where
approve mints the applicant's PRM- code (existing mint) and sends it to them (email + a wa.me link I
can tap) with finish-signup steps, **so that** the pipeline runs itself.
**Build note:** extended `PromoterAdminClient` with a Solicitudes list; approve → existing code-mint
path in `lib/promoter.ts` (`createPromoter`, unchanged) → applicant email with the code + steps
(create account → enter code → open panel); reject → polite es-MX email. Both transitions gated by
a new pure `decideApplicationTransition` seam (mirrors `resolvePromoterDiscount`'s pattern) so the
pending-only / no-double-mint guard is unit-testable without touching Supabase. Hand-minting for
in-person recruits (`POST /api/admin/promoter`) untouched.
**Acceptance:** end-to-end: apply → Telegram ping → approve in admin → applicant receives code →
enters code (reuses the existing `BindStep` at `/promotor/cerrar`, unchanged) → enrolled promoter
reaches the close workspace. Reject sends the polite email. `api` spec on the approve/reject
transition (pure seam). **Commit:** `8fc2472`.

## Sprint QA
- Deterministic gate green: `tsc --noEmit` + `next build` clean; `npm run test:e2e` (api project)
  17/17 green in `e2e/promoter-applications.spec.ts`.
- Manual local smoke: a real submission through `/api/promoter/apply` wrote a correct row to the
  shared Supabase project (verified via SQL, then cleaned up — no test data left behind); SSR HTML
  confirmed the real form renders at the `#promotor-aplica` anchor.
- Deliberately NOT in the CI spec: a genuinely valid submission against the live route, to avoid
  leaving permanent rows in the shared dev/preview/prod Supabase on every CI run (same discipline as
  `e2e/sweepstakes.spec.ts`).
- **Authed admin approve/reject browser smoke owed to Daniel** (admin session) — the builder
  deliberately did not attempt to bypass this by calling the approve/reject lib functions directly;
  the permission system correctly blocked that as circumventing the auth boundary Daniel owns.
- **Found but out of scope:** `e2e/promoter-close.spec.ts:133` fails — a pre-existing gap from
  Sprint 1 (confirmed byte-identical at the squash-merge commit `8513fee`, before any Sprint 2 work):
  the S1.3 apply-teaser hides the `/promotor/cerrar` CTA for unbound visitors even when that route is
  reachable, which the test's older invariant doesn't account for. Flagged as a separate follow-up
  task (in progress in a sibling session as of this writing), not fixed in this PR.
- **Cross-agent review (Antigravity — codex was token-revoked, script fell back automatically):**
  caught a real race in `approvePromoterApplication` (minted the code BEFORE the atomic
  `pending`-status claim, so two concurrent approves could both mint and orphan a code) — fixed to
  claim-first, mint-second, with a release-back-to-pending compensating action on mint failure. Also
  fixed a hardcoded prod `SITE` URL (now `NEXT_PUBLIC_SITE_URL`-derived) and hardened the honeypot's
  DOM name/label away from common autofill tokens. A second, fresh Claude reviewer independently
  confirmed the fixes (commit `3e9bc00`) before merge.
- PR: [#163](https://github.com/danybgoode/miyagisanchezcommerce/pull/163) squash-merged → `de56db3`.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (merged 2026-07-03; allow ~time for the Vercel prod
deploy from `de56db3` to finish before running this).

1. Open `<env>/vende/promotor` → tap "Aplica para ser promotor" (or scroll to the form at the
   bottom) → fill name, email, WhatsApp, ciudad/zona, motivación → submit.
   → A confirmation message replaces the form; Daniel's Telegram pings with the application.
2. Open `<env>/admin/promoter` → the **Solicitudes** section shows the application as "Pendiente" →
   tap **Aprobar**.
   → Applicant email arrives with the PRM- code + finish-signup steps.
3. As the applicant: create an account → go to `<env>/promotor/cerrar` → enter the code in "Vincula
   tu código".
   → The close workspace opens as an enrolled promoter.
4. Submit a second application → in `/admin/promoter` tap **Rechazar**.
   → A polite es-MX rejection email arrives; no code is minted.

If any step fails, note the step number + what you saw — that's the bug report.
