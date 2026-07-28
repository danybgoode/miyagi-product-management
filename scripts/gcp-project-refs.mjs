// gcp-project-refs.mjs — pure detector for stale references to the OLD (pre gcp-account-migration)
// GCP project. Production cut over from `miyagisanchezback-497722` (number 91083034475, Cloud Run
// URL infix `oehqqtyoia`) to `miyagisanchez-prod` (number 121711078446) on 2026-07-19; the old
// project is being deleted in Sprint 4 (see `infra/gcp/README.md`). Any scripts/lib/ source or test
// still carrying one of the old identifiers is a link/config that goes dead the moment the old
// project is gone — this file is the pure half of that guard (see gcp-project-refs.test.mjs for the
// I/O shell that reads scripts/lib/ off disk and the guard test that calls this against it).
//
// Deliberately lives OUTSIDE scripts/lib/ (unlike most scripts/lib/*.mjs modules): the constants below
// necessarily spell out the old identifiers as literal strings, so if this file sat inside scripts/lib/
// it would trip its own guard. Keeping it a sibling of scripts/lib/ (same trick as
// apps/backend/infra/gcp/test/deploy-cicd-telegram-notifier.test.js, whose test/ dir sits outside the
// script directory it scans) sidesteps that without obfuscating the strings.

export const OLD_PROJECT_ID = 'miyagisanchezback-497722';
export const OLD_PROJECT_NUMBER = '91083034475';
export const OLD_CLOUD_RUN_INFIX = 'oehqqtyoia';

export const NEW_PROJECT_ID = 'miyagisanchez-prod';
export const NEW_PROJECT_NUMBER = '121711078446';

const PATTERNS = [
  {
    name: `old Cloud Run URL infix "${OLD_CLOUD_RUN_INFIX}"`,
    needle: OLD_CLOUD_RUN_INFIX,
    replacement: `the new project's canonical Cloud Run URL form, "-${NEW_PROJECT_NUMBER}.us-east4.run.app" (or that service's current -uk.a.run.app alias, if it has one)`,
  },
  {
    name: `old project id "${OLD_PROJECT_ID}"`,
    needle: OLD_PROJECT_ID,
    replacement: `"${NEW_PROJECT_ID}"`,
  },
  {
    name: `old project number "${OLD_PROJECT_NUMBER}"`,
    needle: OLD_PROJECT_NUMBER,
    replacement: `"${NEW_PROJECT_NUMBER}"`,
  },
];

/**
 * Pure: given [{ path, content }], return one { path, name, replacement } entry per offending
 * pattern found in that file's content (a file with two different stale identifiers yields two
 * entries). No fs/network access — callers supply the file contents.
 */
export function findOldProjectReferences(files) {
  const hits = [];
  for (const { path, content } of files) {
    for (const { name, needle, replacement } of PATTERNS) {
      if (content.includes(needle)) {
        hits.push({ path, name, replacement });
      }
    }
  }
  return hits;
}

/** Format hits into a human-readable, per-file failure message naming the fix. */
export function formatHits(hits) {
  return hits
    .map((h) => `  ${h.path}: contains the ${h.name} — replace with ${h.replacement}`)
    .join('\n');
}
