# PMO smalldocs Cloud Run service

Sprint: `Roadmap/09-platform-infra/pmo-operational-reports/sprint-2.md`

## Service

- Service: `pmo-smalldocs`
- Project: `miyagisanchezback-497722`
- Region: `us-east4`
- URL: `https://pmo-smalldocs-oehqqtyoia-uk.a.run.app`
- Fork: `https://github.com/danybgoode/smalldocs`
- Deployed fork commit: `60a7707`

## Operating mode

This instance is for internal PMO operational reports only. It is not offered as a hosted or managed
service to third parties.

Stateful APIs are disabled:

- `SDOCS_ENABLE_STATEFUL_APIS=0`
- `SDOCS_REPO_URL=https://github.com/danybgoode/smalldocs`
- `SDOCS_COMMIT=60a7707`

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
