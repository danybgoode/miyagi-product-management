_Closed: 2026-07-24_

## What shipped

The full epic in **one HIGH-tier PR** (frontend only, [`miyagisanchezcommerce` #306](https://github.com/danybgoode/miyagisanchezcommerce/pull/306)), dark behind `growth.founding_merchants_enabled` (enablement, born OFF):

- **S1 — campaign surface** (commits `c5bfc99`): `/vende/fundadoras`, a phone-first founding-cohort page through the shared design system — one 25-shop promise, one CTA, honest es-MX copy (no unverified traction, free-service, or publish-without-consent claim). OG image, JSON-LD, canonical/OG metadata describing the real offer. Editable through the existing CMS-override namespace. Server-derived **closed / open / full** state; capacity counted from canonical `merchant_relationships` (`cohort='fundadoras'`, not disqualified), limit 25, never a client counter; a capacity-read failure **fails closed** (treated as full).
- **S2 — attributed application** (commit `c0cc552`): `POST /api/vende/fundadoras/apply`, a rate-limited, honeypot-guarded, pure-validated public write into the **one canonical `merchant_relationships` row** (the already-merged `founding-merchant-activation-ops` seam) — no second leads table, no Medusa seller created by applying. Flag + capacity re-enforced server-side (a stale page or direct call cannot bypass closed/full). Idempotency-key replay = one write; phone/email dedupe enriches **fill-only** (never overwrites a set value). **Separate consent** — contact required, preview-permission + marketing optional and default false — as append-only `merchant_relationship_consents` rows with a `text_version`; omission never fabricates a grant. **PII-free funnel events** — opaque client subject id for view/cta/start/validation_failed via an anonymous track route; `accepted` emitted server-side only, keyed on the opaque relationship id, payload allowlisted by construction.
- **One additive migration** (`20260724120000_fundadoras_acquisition.sql`): attribution (`utm`, `applied_at`), a partial-unique idempotency key, the `merchant_relationship_consents` ledger, and the OFF flag. Applied by hand by the orchestrator (not the build).

Both review layers ran and each caught a real issue, fixed pre-merge: Antigravity cross-review (`550212e`) and the fresh `pr-reviewer` pass (`a39d77a`).

## What went well

- **The seam paid off.** Because `founding-merchant-activation-ops` had already landed the canonical relationship record + consent ledger conventions, this epic was genuinely a *thin* public intake on top — the architect front-loaded the schema + a full build brief, and the remaining work was mechanical.
- **Salvaging a dead builder's tree beat re-spawning.** The Sonnet build agent hit the shared session limit almost immediately (only the pure lib + flag/ratelimit edits had landed, uncommitted). Per LEARNINGS "salvage the tree", the orchestrator re-derived actual worktree state and finished the build directly rather than cold-starting another agent that could hit the same wall — zero rework, the partial tree was faithful to the brief.
- **Both review axes earned their keep on a HIGH PR.** The different-*family* pass (Antigravity, after codex was weekly-capped) caught the idempotency-key clobber; the different-*agent* pass (fresh pr-reviewer) caught the shared rate-limit bucket and the accepted-event re-emit. Neither was redundant.

## What we learned

- **Fail-open flag defaults compose badly with an anonymous public write — re-enforce the gate at the write, and fail the capacity read closed.** The apply route re-reads flag + capacity *after* validation, independent of whatever state the page rendered, and a `null` capacity read collapses to `full`. A stale page or a direct API call can never seat past a closed/full cohort.
- **"Once per X" telemetry needs a durable per-X marker, not a request-scoped flag.** The accepted event first fired on every dedupe-enrich (suppressed only on exact idempotency-key replay), double-counting a returning applicant. The fix keys "first application" on the row's own `applied_at` being newly set — a fill-only field that already existed for exactly this "did this happen before?" question. (Promote-worthy → LEARNINGS.)
- **A public form's cheap funnel pings must not share the real write's rate-limit budget.** View/start/validation_failed pings against the application's 5/hour bucket could 429 the actual application behind a shared IP. Separate, looser bucket for observability events. (Promote-worthy → LEARNINGS.)
- **Capacity as read-count-then-write is best-effort, not atomic** — fine for a slow, human-reviewed 25-seat pre-launch cohort with 0 live tenants; a launch that needed a hard cap would need a DB-level constraint.

## Gaps / follow-ups

**Owed to Daniel (all HIGH, prod, coupled — in this order):**
1. **Apply the migration** to the shared prod Supabase (additive, flag-OFF-safe): `supabase db query --linked --file supabase/migrations/20260724120000_fundadoras_acquisition.sql` then `supabase migration repair --status applied 20260724120000 --linked`. Verify live (`to_regclass('public.merchant_relationship_consents')`, the two new columns on `merchant_relationships`, and the flag row present + OFF). The orchestrator did **not** apply it autonomously — a prod-DB write surfaced for a human green-light.
2. **Merge PR #306** (HIGH tier — Daniel merges; both review layers clean, CI green).
3. **Sprint-2 smoke** (disposable data): submit an application with UTM + a promoter code → inspect the resulting admin relationship + consent rows (source/cohort/consent `text_version` auditable, no shop created) → force cohort full + direct API submit refused with no `accepted` event → confirm the Golden Beans accepted event carries no form values.
4. **Flip `growth.founding_merchants_enabled` ON — this is the go-live** for the public campaign, only after the smoke passes.

**Known limitation:** capacity is not atomically capped (see above) — acceptable pre-launch.
