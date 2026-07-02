# Sprint 2 · Become a promoter — self-serve application flow

> Epic: [Promoter Funnel v2](README.md) · Risk: LOW/MED · Status: 📋 planned
> New Supabase state (applications — non-commerce, rule #2). Hand-minting keeps working unchanged.

## US-2.1 — Public application form + admin notification
**As** someone who wants to be a promoter, **I want** to apply from `/vende/promotor` (name,
WhatsApp, ciudad/zona, breve motivación) without an account, **so that** I don't need to know Daniel
personally.
**Build note:** store applications in Supabase (status: `pending | approved | rejected`);
rate-limited (`lib/ratelimit.ts`), honeypot/min-field validation; notify admin via `lib/telegram.ts`
+ email (`lib/email.ts`). The landing's primary CTA (S1.3) points here. es-MX.
**Acceptance:** submitting the form stores a pending application and fires Daniel's Telegram + email
within seconds; duplicate/spam submissions are rate-limited; one `api` spec on validation + one on
the route (anonymous POST).

## US-2.2 — Admin approve/reject → code minted + sent
**As** Daniel, **I want** pending applications in `/admin/promoter` with approve/reject, where
approve mints the applicant's PRM- code (existing mint) and sends it to them (email + a wa.me link I
can tap) with finish-signup steps, **so that** the pipeline runs itself.
**Build note:** extend `PromoterAdminClient` with an applications list; approve → existing code-mint
path in `lib/promoter.ts` → applicant email with the code + steps (create account → enter code →
open panel); reject → polite es-MX email. Keep hand-minting for in-person recruits untouched.
**Acceptance:** end-to-end: apply → Telegram ping → approve in admin → applicant receives code →
enters code → enrolled promoter reaches `/promotor/cerrar`. Reject sends the polite email. `api`
spec on the approve transition (pure seam).

## Sprint QA
- Deterministic gate green; specs per story above.
- Authed admin approve/reject browser smoke **owed to Daniel** (admin session).

## Sprint 2 — Smoke walkthrough (do these in order)
*(placeholder — fill with real URLs at build time)*
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/vende/promotor → tap "Aplica para ser promotor" → fill + submit.
   → Confirmation state; Daniel's Telegram pings with the application.
2. Open https://miyagisanchez.com/admin/promoter → the application shows pending → Aprobar.
   → Applicant email arrives with the PRM- code + steps.
3. As the applicant: create account → enter the code where indicated.
   → https://miyagisanchez.com/promotor/cerrar opens as an enrolled promoter.
4. Submit a second application → Rechazar → polite rejection email arrives.

If any step fails, note the step number + what you saw — that's the bug report.
