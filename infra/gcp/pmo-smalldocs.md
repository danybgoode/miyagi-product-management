# PMO smalldocs Cloud Run service

Sprint: `Roadmap/09-platform-infra/pmo-operational-reports/sprint-2.md`

## Service

- Service: `pmo-smalldocs`
- Project: `miyagisanchezback-497722`
- Region: `us-east4`
- URL: `https://pmo-smalldocs-oehqqtyoia-uk.a.run.app`
- Canonical Cloud Run URL: `https://pmo-smalldocs-91083034475.us-east4.run.app`
- Fork: `https://github.com/danybgoode/smalldocs`
- Deployed fork commit: `eee8803b784f0577d15227e29d0d56fff317f1a8`
- Latest deployed revision: `pmo-smalldocs-00003-zkb` (2026-07-14)

## Operating mode

This instance is for internal PMO operational reports only. It is not offered as a hosted or managed
service to third parties.

Stateful APIs are disabled:

- `SDOCS_ENABLE_STATEFUL_APIS=0`
- `SDOCS_REPO_URL=https://github.com/danybgoode/smalldocs`
- `SDOCS_COMMIT=eee8803b784f0577d15227e29d0d56fff317f1a8`

The intended report-sharing path is URL-hash documents. Short-link/SQLite persistence is deliberately
deferred for this PMO instance.

## Deploy

The fork has a Cloud Run Dockerfile. Deploy from a clean checkout of `danybgoode/smalldocs`:

```bash
gcloud run deploy pmo-smalldocs \
  --source /path/to/smalldocs \
  --region us-east4 \
  --project miyagisanchezback-497722 \
  --allow-unauthenticated \
  --set-env-vars SDOCS_ENABLE_STATEFUL_APIS=0,SDOCS_REPO_URL=https://github.com/danybgoode/smalldocs,SDOCS_COMMIT=<fork-commit>
```

## Branding fast-follow

Branding belongs in the fork (`https://github.com/danybgoode/smalldocs`), not in the root report
scripts. The root repo should continue to generate URL-hash documents and point at the service URL above.
The Report Hub branding shipped in SmallDocs PR #1 and is live on the deployed revision above. Planning
doc: `Roadmap/09-platform-infra/pmo-operational-reports/smalldocs-report-hub-plan.md`.
Hosted Roadmap navigation shipped in SmallDocs PR #2 and is live on `/reports`; the local-loopback
SmallDocs `/library` and `/connect` flows remain intact for private local markdown.

Fork-side scope:

- Name/title: brand the shell as Miyagi/PMO SmallDocs (page title, visible app chrome, export metadata
  where the fork supports it).
- Visual system: Miyagi/PMO colors, favicon/app icon, default slide/document theme, and a footer that
  reads as ours without removing upstream notices.
- Mobile/story decks: honor `styles.slideAspectRatio` from report templates; current PMO/standup story
  decks declare `16:9`.
- Trust/compliance: keep the ELv2 license notices and `/trust` surfaces intact. Do not strip upstream
  notices or introduce stateful short-link APIs for this internal instance.

Redeploy checklist after fork changes:

1. Deploy the fork commit to `pmo-smalldocs` with `SDOCS_COMMIT=<fork-commit>`.
2. Update the deployed commit value in this runbook.
3. Smoke `/`, `/trust`, `/trust/manifest`, and `/api/short/example`.
4. Generate one PMO weekly link and one daily standup link from the root scripts; confirm the branded
   shell/theme renders and the `16:9` story decks still open in presentation mode.

## Report registry resolver (`/r/<slug>`, reporthub-as-notion S1.2)

Read-through proxy from a short `/r/<slug>` link to the GCS report registry provisioned by
`infra/gcp/provision-report-registry.sh` (Sprint 1, Story 1.1). NOT part of the stateful short-link
system (`short-links/db.js`, gated behind `SDOCS_ENABLE_STATEFUL_APIS`) — it holds no state of its own
(no SQLite) and stays available with `SDOCS_ENABLE_STATEFUL_APIS=0`, this instance's permanent setting.

- Fork source: `report-registry.js` (server-side, the resolver logic) + the `'report-registry'` Source
  registered in `public/sdocs-app.js` (client-side load/render + the friendly-404 copy) + the
  `/api/report/:slug` route and the `/r/<slug>` app-shell dispatch entry in `server.js`.
- Bucket: `REPORT_REGISTRY_BUCKET` env var, defaults to `miyagi-pmo-reports` (prod). Point at
  `miyagi-pmo-reports-staging` for a staging deploy/smoke.
- **Slug → object path mapping (must match `scripts/lib/report-registry.mjs` in
  danybgoode/miyagi-product-management EXACTLY — a change on either side needs the same-wave change on
  the other):**
  - `daily-story-YYYY-MM-DD-<hash6>` → `daily/daily-story-YYYY-MM-DD-<hash6>.md` (90d TTL)
  - `pmo-weekly-YYYY-MM-DD` / `pmo-monthly-YYYY-MM-DD` / `pmo-sheet-YYYY-MM-DD` →
    `packets/<slug>.md` (kept forever)
  - Any other slug not starting with `daily-` also lands under `packets/` (the `daily/` prefix is the
    only thing the bucket's lifecycle rule keys off).
- Missing/expired slug → `GET /api/report/<slug>` returns `404 {"error":"not_found"}`; the client Source
  renders a friendly message explaining dailies expire at 90 days and the sender's original URL-hash
  link (`#md=...`) still works. Any other upstream failure (network, non-200 from GCS) → `502
  {"error":"upstream_error"}`, same friendly copy client-side. An invalid slug (path traversal, bad
  chars) → `400 {"error":"invalid_slug"}`.
- Test-only env var: `REPORT_REGISTRY_STORAGE_BASE_URL` overrides the GCS host so `test/test-http.js` can
  run the `/api/report/:slug` + `/r/:slug` coverage against a local fixture, fully offline. Never set
  this in a deployed environment.

## Smoke

```bash
curl -sI https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/
curl -s https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/trust/manifest
curl -s https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/api/short/example
# report registry resolver (S1.2) — once the fork PR is merged + deployed:
curl -s https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/api/report/does-not-exist-xyz   # -> 404 not_found
curl -sI https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/r/pmo-weekly-<a-real-YYYY-MM-DD> # -> 200 HTML
```

Expected:

- `/` returns `HTTP 200`.
- `/trust` renders the SmallDocs Trust page and license/notices remain intact.
- `/trust/manifest` reports the fork repo and deployed commit.
- `/api/short/example` returns `{"error":"stateful_apis_disabled"}` with `HTTP 404`.
- `/api/report/does-not-exist-xyz` returns `{"error":"not_found"}` with `HTTP 404`.
- `/r/<a real slug>` returns `HTTP 200` HTML and the branded viewer renders the report (browser check).

**Report registry resolver — status as of 2026-07-17: built, unit+integration tested (`node
test/run.js`, 1097/1097 green including 16 new tests), and live-smoked locally against the real
`gs://miyagi-pmo-reports-staging` bucket (`/api/report/pmo-weekly-2026-07-17` round-tripped the object
`scripts/pmo-report.mjs --weekly --dry-run` uploaded). NOT YET deployed to `pmo-smalldocs` — PR open on
the fork (danybgoode/smalldocs, branch `feat/report-registry-resolver`), owed: Daniel merges + redeploys
per the checklist above, then re-run this smoke against the live URL and a browser check of the rendered
viewer.**

## Smoke results

Run date: 2026-07-14 · Deploy: `pmo-smalldocs-00003-zkb` · Commit:
`eee8803b784f0577d15227e29d0d56fff317f1a8`

1. `gcloud run deploy pmo-smalldocs --source ...` completed and routed 100% traffic to the revision above.
2. Both the documented URL and canonical Cloud Run URL returned `HTTP 200` for `/` and `/reports`.
3. `/trust` returned `HTTP 200`; `/trust/manifest` reported the fork repo and commit `eee8803...`.
4. `/api/short/example` returned `{"error":"stateful_apis_disabled"}`, confirming the PMO instance stayed
   stateless.
5. `/public/reports-data.json` returned schema version 1 with 429 Roadmap rows and 421 report-directory
   items.
6. Browser smoke passed on desktop and phone for `/reports` on both URLs: 5 executive views, 160 visible
   capped cards, search filtering, `/docs#md=...` reader handoff, no horizontal overflow, and 44px mobile
   segmented-control touch target.
