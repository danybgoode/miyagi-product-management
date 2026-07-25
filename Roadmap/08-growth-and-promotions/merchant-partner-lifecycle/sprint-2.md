# Merchant Partner lifecycle — Sprint 2: Signed-human follow-up

**Status:** ✅ Shipped — [PR #310](https://github.com/danybgoode/miyagisanchezcommerce/pull/310) merged (squash `946aa98`); migration `20260725110000` applied + verified live 2026-07-25

## Stories

### Story 2.1 — Fact-bounded editable follow-up drafts

**As a** Merchant Partner, **I want** help drafting a relevant follow-up, **so that** I can respond quickly while
remaining responsible for what the merchant receives.

**Acceptance:** draft input is limited to allowlisted relationship/commerce facts; unsupported claims and secrets
are excluded; generated text is visibly editable and labeled as a draft; model/prompt version, input fact ids and
creator are auditable; failures leave manual composition available.

**Risk:** high — model output over merchant context and PII; Daniel merges.

### Story 2.2 — Idempotent steward reminders

**As a** Merchant Partner, **I want** reminders for overdue merchant work, **so that** I keep service promises
without repeatedly checking the queue.

**Acceptance:** existing notification fan-out sends to the steward/admin only; one logical reminder per SLA/task
window; retries are idempotent; quiet/failure state is visible; no merchant contact occurs; reminder links return
to an authorized portfolio record.

**Risk:** high — notification routing and duplicate-contact risk; Daniel merges.

### Story 2.3 — Explicit human send and provenance boundary

**As a** merchant, **I want** outreach to come from an accountable person, **so that** assistance never becomes
unreviewed automated messaging.

**Acceptance:** Miyagi never sends a generated draft automatically; partner must edit/review and explicitly copy
or confirm the chosen external channel; UI states recipient/channel and records human confirmation/provenance;
agent, retry, scheduler and reminder paths cannot bypass this boundary.

**Risk:** high — external communication and consent/reputation boundary; Daniel merges.

## Build contract (locked by the architect before the builder started)

Read `README.md` → D1–D9 first, then `sprint-1.md`'s build contract — Sprint 1's `lib/portfolio/` layer is
your foundation and you import it rather than reshaping it. Branch: `feat/merchant-partner-lifecycle-s2`,
cut **from `feat/merchant-partner-lifecycle`** (stacked, not from `main`).

### Story 2.1 — fact-bounded drafts

**The generator is a deterministic versioned template composer, not a model call. This is Daniel's explicit
decision (README D4), taken because this repo has no LLM client, no model dependency and no API key — verified
live. Do not add one. Do not "improve" this into an API call.**

1. **`lib/portfolio/draft-facts.ts`** — zero-import. The **positive** fact allowlist as an exported const
   array of fact ids, each with a resolver from a typed input shape. Allowed, and nothing else:
   `stage`, `stage_label`, `age_in_stage_days`, `next_action_title`, `next_action_due_at`,
   `preferred_channel`, `public_shop_url`, `preview_url`, `partner_display_name`, `business_name`.
   **Excluded, and a spec must prove it:** every raw contact value (`phone_e164`, `email_normalized`,
   `whatsapp_e164`, `instagram_handle`), `objections`, `fit_note`, interaction bodies, task `outcome` notes,
   `promoter_id`, `cohort`, any token/secret/env value. Build the fact set by CONSTRUCTING the allowed keys
   from the allowlist — never by deleting keys from a `RelationshipRow`. A spec feeds a fully-populated row in
   and asserts none of the excluded values appear anywhere in the composed text or the stored fact set.
2. **`lib/portfolio/draft-compose.ts`** — zero-import. `DRAFT_TEMPLATE_VERSION` (an integer, bumped on any
   copy change) and `composeDraft(facts, templateId) → { text, factIds }`. A small set of es-MX templates
   keyed by intent (`follow_up`, `preview_nudge`, `activation_reminder`, `retention_checkin`). A template
   referencing a fact the caller didn't supply must **omit that clause**, never emit a placeholder, never
   invent a value — "unsupported claims are excluded" is a compose-time guarantee.
3. **Migration** `supabase/migrations/20260725110000_partner_portfolio_s2.sql` (additive; the orchestrator
   applies it, not you):
   - `merchant_followup_drafts`: `id`, `relationship_id` (FK, cascade), `template_id`, `generator TEXT NOT
     NULL` (CHECK `IN ('template','model')` — the seam D4 leaves open), `generator_version INT NOT NULL`,
     `fact_ids TEXT[] NOT NULL`, `draft_text TEXT NOT NULL`, `edited_text TEXT`, `created_by TEXT NOT NULL`,
     `created_at`, plus the Story 2.3 confirmation columns: `confirmed_at`, `confirmed_by`,
     `confirmed_channel`, `confirmed_text`. RLS ON, no policies.
   - `merchant_followup_reminders`: `id`, `relationship_id` (FK, cascade), `kind TEXT NOT NULL`,
     `window_key TEXT NOT NULL`, `steward_clerk_user_id TEXT`, `sent_at`, `channels TEXT[]`, `last_error
     TEXT`, `created_at`, **`UNIQUE (relationship_id, kind, window_key)`**. RLS ON, no policies.
4. **Routes:** `POST /api/partner/relationship/[id]/draft` (generate — returns the draft + its provenance),
   `PATCH .../draft/[draftId]` (save the human's edit). Both go through `resolveRelationshipAccess` +
   `canWriteRelationship` and the `promoter.partner_portfolio_enabled` gate. A compose failure returns a
   degraded-but-usable response (the fact set + an empty draft) so **manual composition stays possible** —
   never a bare 500 that leaves the partner with nothing.
5. **UI:** the draft is visibly labeled a draft (never an interaction-log entry), the fact list that fed it is
   shown *before* generation ("esto es lo que Miyagi va a usar"), the textarea is editable, and provenance
   (`generator`, version, fact ids, creator, timestamp) is inspectable.

### Story 2.2 — idempotent steward reminders

- **`lib/portfolio/reminders.ts`** — zero-import: `reminderWindowKey(kind, dueAt | slaWindowStart)` (a stable
  string per logical window — a same-window re-run must produce the identical key), and the pure
  `selectReminderTargets(rows, now, policy)` deciding which portfolio rows are *due for* a reminder.
- **`lib/portfolio/reminders-server.ts`** — `server-only`. Claims under the UNIQUE constraint **first**, then
  delivers. A `23505` unique violation means "already reminded this window" → skip silently, no error. This
  ordering is the point: claim-then-send can at worst under-notify once; send-then-claim double-notifies.
- **Delivery is steward-directed ONLY.** `notify(stewardClerkUserId, …)` (`lib/notify.ts`, web push) plus the
  admin Telegram channel (`lib/telegram.ts`). **You must NOT import `lib/notifications/dispatch.ts`** — it
  resolves a *seller's* email via `getSellerEmail`, i.e. the merchant. A relationship with no steward routes
  to the escalation target, and if there is none, to the admin channel only. Never to the merchant.
- **`GET /api/cron/portfolio-reminders`** — its own route, `CRON_SECRET`-authorized exactly like
  `/api/cron/merchant-lifecycle-sweep` (open when `CRON_SECRET` is unset outside production, closed
  otherwise). Deliberately **not** folded into the lifecycle sweep, so a reminder failure cannot degrade the
  Golden Beans emission drain. Report a partial/incomplete run as **503** (retryable), never a 2xx —
  a 207 reads as success to Cloud Scheduler and neither retries nor alerts.
- **Quiet/failure state is visible:** the reminder row records `last_error`, and the portfolio row surfaces
  "recordatorio no entregado" when the latest reminder for the current window failed. A silently-dead
  reminder rail is the failure mode this bullet exists to prevent.
- The reminder deep-link lands on an **authorized** portfolio record — the link carries the relationship id
  and the target page re-runs the scope check; it never embeds contact data or a bypass token.

### Story 2.3 — the no-auto-send boundary

- `POST .../draft/[draftId]/confirm` records `confirmed_at`, `confirmed_by`, `confirmed_channel` (must be one
  of the merchant's *known* channels) and `confirmed_text` (exactly what the human approved). It sends
  nothing. The response returns the deep link for the **browser** to open.
- The `wa.me` / `mailto:` handoff happens **client-side**. The server never holds a path to the merchant.
- **`e2e/portfolio-no-auto-send.spec.ts` is the load-bearing spec of this sprint.** It must enumerate the
  repo's server-side transports **by reading the filesystem** (`lib/notify.ts`, `lib/email.ts`,
  `lib/telegram.ts`, `lib/notifications/dispatch.ts`, `lib/shop-notify.ts`, `lib/promoter-close-notify.ts`,
  and any future sibling matching the same shape) and assert that no module under `lib/portfolio/draft*` and
  no route under `app/api/**/draft*` imports any of them — transitively. Re-derive the population; do not
  hand-list it. A confident comment is not evidence.
- A second spec asserts the reminder path can never carry draft text: `selectReminderTargets`' output type has
  no draft field, and the reminder copy is built from `lib/portfolio/reminders.ts` alone.

### Deterministic gate

```
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
npm run build
npx playwright test --project=api e2e/portfolio-*.spec.ts
```

Every new spec observed red once. Report which, and why it failed.

### Escalate, don't guess

Same triggers as Sprint 1. In particular: if any acceptance criterion here seems to require sending a message
to a merchant from the server, stop — that is the one thing this sprint exists to make impossible.

## Sprint QA

- **api specs:** allowlisted draft facts, secret/PII boundaries, provenance, provider failure, reminder
  idempotency, steward-only routing and invariant that no generated text reaches a merchant automatically.
- **browser smoke owed:** yes, to Daniel — authenticated partner draft/edit/copy flow in a real preferred channel.
- **deterministic gate:** typecheck/build + model/notification contract specs + no-auto-send regression green.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Open an overdue disposable merchant from https://miyagisanchez.com/partner.
   → A draft action explains which allowlisted facts will be used.
2. Generate a draft, inspect provenance and edit the text.
   → It remains clearly unsent and identifies its input/version.
3. Trigger the same overdue reminder twice.
   → The steward receives one logical notification; the merchant receives none.
4. Simulate model and notification provider failure.
   → Manual follow-up remains possible and degraded state is visible.
5. Explicitly copy/confirm the edited message for the merchant's preferred channel.
   → Human confirmation is audited; no platform path auto-sends the draft.

If any step fails, note the step number + URL — that's the bug report.
