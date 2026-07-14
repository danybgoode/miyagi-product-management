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

## Smoke

```bash
curl -sI https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/
curl -s https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/trust/manifest
curl -s https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/api/short/example
```

Expected:

- `/` returns `HTTP 200`.
- `/trust` renders the SmallDocs Trust page and license/notices remain intact.
- `/trust/manifest` reports the fork repo and deployed commit.
- `/api/short/example` returns `{"error":"stateful_apis_disabled"}` with `HTTP 404`.

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
