# db-backup job image — Backend Production Readiness, Sprint 2.
# postgres:17-alpine gives a PINNED pg_dump 17 (the source DBs are Postgres 17;
# a pg_dump older than the server aborts on a version mismatch — this is why the
# job ships its own client rather than relying on a host one). rclone uploads to
# Cloudflare R2 over the S3-compatible API. ~70 MB; small CVE surface for S4 scan.
FROM postgres:17-alpine

# rclone (S3/R2 upload) + bash + curl (Telegram alert) + coreutils (mktemp, wc).
RUN apk add --no-cache rclone bash curl coreutils

COPY db-backup.sh /usr/local/bin/db-backup.sh
RUN chmod +x /usr/local/bin/db-backup.sh

# Run as the unprivileged postgres user the base image already provides.
USER postgres
ENTRYPOINT ["/usr/local/bin/db-backup.sh"]
