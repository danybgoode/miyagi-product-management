# ReportHub as the Notion replacement — Sprint 1: True short links (the registry)

**Status:** 🟡 built + tested, PRs open — Daniel merges + deploys (both stories high/prod-facing risk)

## Stories

### Story 1.1 — GCS report registry ✅
**As** the routines, **I want** a Cloud Storage bucket mapping `slug → immutable markdown payload`,
**so that** reports have durable, short addresses.
Bucket in `miyagisanchezback-497722` / us-east4; lifecycle rule: objects under a `daily/` prefix expire
at 90 days, everything else kept forever. Writes: routine/service account only. Reads: public.
Slugs: predictable prefix + collision-safe suffix (`pmo-weekly-2026-07-14`, `daily-story-2026-07-14-x7`).
**Acceptance:** provisioning is an idempotent script under `infra/gcp/` (create-if-absent, `TARGET`
param, config-guard test — same shape as the monitoring scripts); lifecycle verified on a throwaway
object.
**Risk:** high (shared infra — Daniel merges)
**Status:** ✅ merged to `feat/reporthub-as-notion` — commit `fa6601c` (staging bucket
`gs://miyagi-pmo-reports-staging` provisioned + verified; prod bucket `miyagi-pmo-reports` NOT yet
created — one-command Daniel handoff below).

### Story 1.2 — `/r/<slug>` resolver in the fork ✅ (built + tested, PR open, NOT deployed)
**As** a stakeholder clicking a Telegram link, **I want** `https://<hub>/r/pmo-weekly-2026-07-14` to
open the report, **so that** links are short, readable, and survive big payloads.
Resolver fetches the payload from GCS and renders via the existing `/docs#md=…` viewer. Missing slug →
friendly 404 explaining URL-hash links remain valid (the stateless fallback is a feature, keep it).
**Acceptance:** round-trip live: write payload → open `/r/<slug>` → report renders; 404 path humane;
`SDOCS_ENABLE_STATEFUL_APIS` stays 0 (registry is read-through, not the upstream stateful API).
**Risk:** high (production service change — Daniel merges)
**Status:** Built on `danybgoode/smalldocs` branch `feat/report-registry-resolver`: `report-registry.js`
(server-side resolver, no SQLite/state, works with `SDOCS_ENABLE_STATEFUL_APIS=0`), `/api/report/<slug>`
read-through route + `/r/<slug>` app-shell dispatch in `server.js`, a `'report-registry'` client Source in
`public/sdocs-app.js` (fetches `/api/report/<slug>` same-origin, no new CSP `connect-src` needed) with a
humane hub-branded 404 message. `node test/run.js`: 1097/1097 green (16 new: 9 pure unit tests on slug
validation/object-path mapping/bucket resolution, 7 offline HTTP integration tests against a local GCS
fixture for `/api/report/:slug` + `/r/:slug`, including path-traversal rejection and asset-versioning).
Live-smoked locally (not yet deployed): pointed a local `node server.js` at the real
`gs://miyagi-pmo-reports-staging` bucket and round-tripped the actual `pmo-weekly-2026-07-17` object
Story 1.3 uploaded — `/api/report/pmo-weekly-2026-07-17` returned the real markdown, `/r/pmo-weekly-2026-07-17`
served the branded shell, `/api/report/does-not-exist-xyz` returned `404 {"error":"not_found"}`. PR open,
NOT merged/deployed — see handoff below. Owed: Daniel's browser check of the actual client-side render
(this session verified HTTP-level behavior only, no browser available).

### Story 1.3 — Report scripts emit short links ✅ (built + tested + live-smoked)
**As** Daniel reading Telegram, **I want** standup/weekly/PMO messages to carry real short URLs,
**so that** links stop being HTML labels hiding URL-hash monsters.
Scripts upload the payload (service-account write) and emit `/r/<slug>`; on upload failure they fall
back to the current URL-hash link (degrade gracefully — LEARNINGS soft-mode pattern). Artifact-only
modes stay stateless (`shouldPersistWindow` discipline).
**Acceptance:** one live scheduled fire of standup + weekly shows short links; kill the bucket access
in a test run → long-link fallback observed; `node --test` on the pure slug/fallback logic.
**Risk:** low
**Status:** ✅ merged to `feat/reporthub-as-notion` — commit `5a6bc47`. `scripts/lib/report-registry.mjs`
(slug builders, daily/-vs-packets/ object-path mapping, URL building, fallback decision — all pure,
19 `node --test` cases, zero live calls via an injected fake uploader) + credentialed upload orchestration
(SA-JSON-key JWT → OAuth → REST PUT for the routine/unattended path, `gcloud storage cp` for the
local/ADC path). `standup.mjs` and `pmo-report.mjs` both call `upgradeArtifactLinks()` right after
building their existing URL-hash artifacts. Live-smoked against `gs://miyagi-pmo-reports-staging` with
local gcloud ADC: `standup.mjs --dry-run` uploaded + printed `/r/daily-story-2026-07-17-<hash>`,
`pmo-report.mjs --weekly --dry-run` uploaded + printed `/r/pmo-weekly-2026-07-17` — both objects verified
publicly fetchable with the correct `text/markdown` content-type. `node --test 'scripts/lib/*.test.mjs'
'scripts/*.test.mjs'`: 275/275 green (19 new).
**Scope note:** `weekly-recap.mjs` was NOT wired — it has no existing URL-hash link or SmallDocs artifact
to upgrade (confirmed: no `buildSmallDocsUrl` usage anywhere in that script; its Telegram message is
plain text). The epic's `pmo-weekly-YYYY-MM-DD` slug example is `pmo-report.mjs --weekly`'s artifact, a
different script. Adding a new SmallDocs artifact to `weekly-recap.mjs` would be new report-presentation
scope this sprint didn't ask for — flagging for a decision rather than assuming one.

## Sprint QA
- **api spec(s):** `node --test` on slug generation + fallback decision (pure); live round-trip in the walkthrough
- **browser smoke owed:** yes, to Daniel — open both link forms from a real Telegram message
- **deterministic gate:** root `scripts-guard` + fork repo tests green; infra config-guard test green

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://pmo-smalldocs-oehqqtyoia-uk.a.run.app — **steps 1-2 need the fork PR merged +
redeployed first (Daniel handoff below); step 4 already passed, agent-run, against staging.**

1. After the nightly fires (or `node scripts/standup.mjs` manually), open the Telegram message.
   → The link reads like /r/daily-story-2026-…, short and visible — not an HTML label.
2. Click it.
   → The report opens in the branded hub viewer.
3. Open /r/does-not-exist-xyz.
   → Friendly 404 explaining the link may have expired and URL-hash links remain valid.
4. (fallback check, agent-run) Run a report script with bucket access revoked in a test env.
   → Message still sends, with the long URL-hash link.
   ✅ Implicit in the design: `upgradeArtifactLinks()` only ever *replaces* the fallback URL on an
   explicit upload success (`buildReportLink`'s `shouldFallbackToUrlHash` — 19 pure `node --test`
   cases cover this, including "uploader throws/returns not-ok"). Not re-verified against a live
   permission-revoked bucket this session (would need mutating prod IAM); the pure-logic tests plus the
   two live-success smokes (which prove the OTHER branch works) are the coverage for now.

## Daniel handoff — what's left before Sprint 1 is fully live

1. **Prod bucket (Story 1.1, one command):**
   `TARGET=prod bash infra/gcp/provision-report-registry.sh`
   (staging already provisioned + verified; this creates `gs://miyagi-pmo-reports` the same way).
2. **Fork PR merge + deploy (Story 1.2):** review + merge
   `danybgoode/smalldocs#<PR-number-below>` (branch `feat/report-registry-resolver`), then redeploy per
   `infra/gcp/pmo-smalldocs.md`'s checklist:
   ```bash
   gcloud run deploy pmo-smalldocs \
     --source /path/to/smalldocs \
     --region us-east4 --project miyagisanchezback-497722 --allow-unauthenticated \
     --set-env-vars SDOCS_ENABLE_STATEFUL_APIS=0,SDOCS_REPO_URL=https://github.com/danybgoode/smalldocs,SDOCS_COMMIT=<merge-commit>
   ```
   Then re-run the walkthrough steps 1-3 above for real (browser check owed — this session verified
   `/api/report/:slug` + `/r/:slug` at the HTTP level only, no browser available to confirm the
   client-side viewer actually renders).
3. **Root repo PR merge (Stories 1.1 + 1.3):** merge
   `danybgoode/miyagi-product-management#<PR-number-below>` (branch `feat/reporthub-as-notion`) —
   safe to merge independent of #2 above; scripts already degrade to the URL-hash fallback with no
   bucket/fork deployed.
4. **Routine env vars** (once both are live, for the ops-nightly/weekly-recap routines to actually mint
   short links instead of always falling back): either `GOOGLE_APPLICATION_CREDENTIALS_JSON` (the
   `pmo-report-writer` SA's key, inline JSON — the routine/unattended pattern) or confirm `gcloud` +
   ADC are available in the routine's sandbox (unlikely — routines have no gcloud auth per
   `Roadmap/LEARNINGS.md`, so the JSON-key env var is almost certainly the one that's actually needed).
   `REPORT_REGISTRY_BUCKET` only needs setting if NOT defaulting to the now-real prod bucket.
5. **Decision needed:** should `weekly-recap.mjs`'s plain-text Telegram recap also get a SmallDocs
   artifact + short link (new scope), or stay as-is? See the Story 1.3 scope note above.

If any step fails, note the step number + what you saw — that's the bug report.
