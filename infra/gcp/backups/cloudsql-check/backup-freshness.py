#!/usr/bin/env python3
# backup-freshness.py — the PURE predicate behind the Cloud SQL backup-failure alert
# (DevOps reliability cleanup, Sprint 2 / Story 2b).
#
# Reads the JSON output of `gcloud sql backups list --instance=<i> --format=json` on
# STDIN and decides whether backup health is OK. It is intentionally a tiny, side-effect-
# free script (no gcloud, no network, no Telegram) so it is the deterministic unit under
# test — infra's gate is a pure test (see infra/gcp/test/cloudsql-backup-check.test.js,
# which spawns THIS file with fixtures). The bash wrapper (check-cloudsql-backup.sh) does
# the gcloud fetch + the Telegram alert() and reads this script's exit code.
#
# Health rule (failure-only — no success heartbeat): HEALTHY iff there is a SUCCESSFUL
# AUTOMATED backup whose effective time is within MAX_AGE_HOURS (~26h). This phrasing is
# robust to a backup that is mid-run at check time (a brand-new RUNNING backup does not
# mask a good SUCCESSFUL one from earlier in the window), while still catching the two
# real failure modes: no automated backup at all, or the latest run not succeeding.
#
#   Stdin : the gcloud `--format=json` array (or [] / empty).
#   Env   : MAX_AGE_HOURS  freshness window in hours (default 26)
#           NOW            UNIX epoch seconds override for tests (default: real UTC now)
#   Stdout: a one-line human reason (always printed — the wrapper relays it to Telegram)
#   Exit  : 0 healthy · 1 unhealthy (missing / not SUCCESSFUL / stale) · 2 bad input

import json
import os
import sys
from datetime import datetime, timezone


def _parse_time(value):
    """Parse a gcloud ISO-8601 timestamp ('...Z' or with an offset) → aware datetime, or None."""
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _effective_time(backup):
    """The most representative time of a backup: completion, else start/window/enqueue."""
    for key in ("endTime", "startTime", "windowStartTime", "enqueuedTime"):
        t = _parse_time(backup.get(key))
        if t is not None:
            return t
    return None


def evaluate(backups, now, max_age_hours):
    """Pure decision over a parsed gcloud backups list. Returns (healthy: bool, reason: str)."""
    if not isinstance(backups, list):
        return False, "unexpected gcloud output (not a JSON array of backups)"

    automated = [b for b in backups if isinstance(b, dict) and b.get("type") == "AUTOMATED"]
    if not automated:
        return False, "no AUTOMATED Cloud SQL backups found"

    successful = []
    for b in automated:
        if b.get("status") == "SUCCESSFUL":
            t = _effective_time(b)
            if t is not None:
                successful.append((t, b))

    if not successful:
        # Surface the latest automated status so the alert says WHY (FAILED, RUNNING, …).
        latest = max(automated, key=lambda b: _effective_time(b) or datetime.min.replace(tzinfo=timezone.utc))
        return False, "no SUCCESSFUL automated backup (latest automated status=%s)" % latest.get("status", "UNKNOWN")

    newest_time, newest = max(successful, key=lambda pair: pair[0])
    age_hours = (now - newest_time).total_seconds() / 3600.0
    bid = newest.get("id", "?")
    if age_hours > max_age_hours:
        return False, "latest SUCCESSFUL automated backup is %.1fh old (> %gh) — id %s" % (age_hours, max_age_hours, bid)
    return True, "latest SUCCESSFUL automated backup %.1fh ago (id %s)" % (age_hours, bid)


def main():
    raw = sys.stdin.read().strip()
    try:
        backups = json.loads(raw) if raw else []
    except json.JSONDecodeError as exc:
        print("could not parse gcloud backups JSON: %s" % exc)
        return 2

    max_age_hours = float(os.environ.get("MAX_AGE_HOURS", "26"))
    now_env = os.environ.get("NOW")
    now = (
        datetime.fromtimestamp(float(now_env), tz=timezone.utc)
        if now_env
        else datetime.now(timezone.utc)
    )

    healthy, reason = evaluate(backups, now, max_age_hours)
    print(reason)
    return 0 if healthy else 1


if __name__ == "__main__":
    sys.exit(main())
