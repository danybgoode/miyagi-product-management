# Sprint 5 — Structured JSON logging (phased)

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: LOW** · **Status: 📋 not started**

Zero structured logging exists in either app today — pure `console.*` calls with ad-hoc
bracket-tag string prefixes (backend: 91 call sites; frontend: ~384). Google Cloud Logging
auto-parses single-line JSON stdout into filterable `jsonPayload` fields — real, native GCP
behavior, no new dependency required. This repo has a documented precedent for going GCP-native
over adding a dependency (`backend-production-readiness` chose Error Reporting over adding
`@sentry` for the backend). The frontend's existing `@sentry/nextjs` (error tracking, not general
logging) is untouched — separate concern. This is the lowest-urgency, largest-surface item in the
epic — land last, and even then only start with the highest-value call sites.

---

## Story

### S5.1 — Shared structured-logger helper + first migration batch *(LOW risk)*
> **As** the platform, **I want** payment-adjacent log lines to land in Cloud Logging as
> structured, filterable fields, **so that** debugging a money-path incident doesn't mean
> grepping raw string logs.

- A tiny shared logger (no new dependency) emitting single-line JSON to stdout: severity,
  message, and the existing bracket-tag convention (`[profit-ledger]`, `[email]`, etc.) carried
  as a structured field rather than a string prefix.
- First migration batch: backend's payment-adjacent call sites (`[profit-ledger]`, `[email]`,
  and similar money-path logging) — not a blanket sweep of all 91+384 sites.
- **Acceptance:** a migrated log line appears in Cloud Logging as structured `jsonPayload`,
  filterable by its severity/tag fields, not just full-text-searchable.

---

## Sprint QA
- **Manual, per migrated batch**: confirm a log line lands as structured `jsonPayload` in Cloud
  Logging (Logs Explorer, filter by the new field). A hard lint/test guard against new bare
  `console.*` calls is premature until the pattern is fully adopted repo-wide — don't build that
  gate yet.

---

## Sprint 5 — Smoke walkthrough (do these in order)
1. Build the shared logger helper (backend first, since the first migration batch is backend
   call sites).
2. Migrate the payment-adjacent call sites named above.
3. Deploy, trigger one of the migrated code paths for real (or in a safe test scenario), confirm
   the resulting log line in Cloud Logging shows structured fields.
4. Merge. Note in this doc which call sites remain unmigrated — this sprint intentionally doesn't
   finish the full sweep; that's future, lower-priority work, not a gap to hide.

If any step fails, note the step number + what you saw — that's the bug report.
