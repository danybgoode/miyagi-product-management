# cloudsql-backup-check job image — DevOps reliability cleanup, Sprint 2 / Story 2b.
# Needs gcloud (to `sql backups list`) + python3 (the pure freshness predicate) + bash +
# curl (the Telegram alert). The Cloud SDK image already bundles all four, so this image
# is just the CLI base + the two scripts — no extra packages.
FROM gcr.io/google.com/cloudsdktool/google-cloud-cli:slim

# Fail the build early if the base ever drops python3 (the predicate runtime).
RUN command -v python3 >/dev/null || (echo "python3 missing from base image" && exit 1)

WORKDIR /app
COPY check-cloudsql-backup.sh backup-freshness.py /app/
RUN chmod +x /app/check-cloudsql-backup.sh /app/backup-freshness.py

ENTRYPOINT ["/app/check-cloudsql-backup.sh"]
