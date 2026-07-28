// gcp-project-refs.test.mjs — guard: no file under scripts/lib/ may reference the decommissioned GCP
// project (`miyagisanchezback-497722`, number 91083034475, Cloud Run infix `oehqqtyoia`). That project
// is being deleted in gcp-account-migration Sprint 4 (see `infra/gcp/README.md`); any surviving
// reference in scripts/lib/ is a link or config that goes dead on deletion, not merely stale prose.
// Pure fs reads only — no network, no gcloud, no live services — so this runs in the standard
// `node --test "scripts/**/*.test.mjs"` gate with everything else.
//
// Per AGENTS.md ("a guard that rejects correct output is worse than one that misses a fault — always
// allow the negation of what you ban"), the negation is covered too: clean content must NOT be flagged.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findOldProjectReferences,
  formatHits,
  OLD_PROJECT_ID,
  OLD_PROJECT_NUMBER,
  OLD_CLOUD_RUN_INFIX,
  NEW_PROJECT_NUMBER,
} from './gcp-project-refs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(__dirname, 'lib');

// ---- pure function unit coverage ----

test('findOldProjectReferences: flags the old Cloud Run URL infix', () => {
  const hits = findOldProjectReferences([
    { path: 'fixture.mjs', content: `export const URL = 'https://pmo-smalldocs-${OLD_CLOUD_RUN_INFIX}-uk.a.run.app';` },
  ]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].path, 'fixture.mjs');
  assert.match(hits[0].name, /Cloud Run URL infix/);
  assert.match(hits[0].replacement, new RegExp(NEW_PROJECT_NUMBER));
});

test('findOldProjectReferences: flags the old project id and old project number independently', () => {
  const hits = findOldProjectReferences([
    { path: 'a.mjs', content: `PROJECT=${OLD_PROJECT_ID}` },
    { path: 'b.mjs', content: `# number ${OLD_PROJECT_NUMBER}` },
  ]);
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((h) => h.path), ['a.mjs', 'b.mjs']);
});

test('findOldProjectReferences: a single file with two stale identifiers yields two hits', () => {
  const hits = findOldProjectReferences([
    { path: 'both.mjs', content: `${OLD_PROJECT_ID} / ${OLD_CLOUD_RUN_INFIX}` },
  ]);
  assert.equal(hits.length, 2);
});

// Negation, per AGENTS.md: content that merely mentions the NEW project, or nothing GCP-related at
// all, must never be flagged.
test('findOldProjectReferences: clean content (new project, or unrelated) produces no hits', () => {
  const hits = findOldProjectReferences([
    { path: 'clean-new.mjs', content: `export const PROJECT = 'miyagisanchez-prod'; // ${NEW_PROJECT_NUMBER}` },
    { path: 'clean-unrelated.mjs', content: 'export const ANSWER = 42;' },
  ]);
  assert.deepEqual(hits, []);
});

test('formatHits: names the offending file and states the replacement', () => {
  const msg = formatHits([{ path: 'x.mjs', name: 'old project id "old"', replacement: '"new"' }]);
  assert.match(msg, /x\.mjs/);
  assert.match(msg, /replace with "new"/);
});

// ---- the actual guard: every real file under scripts/lib/, read off disk ----

// Walk RECURSIVELY and do not filter by extension. Both narrowings were real holes flagged by the
// cross-agent review of PR #112: a stale URL in `scripts/lib/nested/thing.mjs`, or in a `.json`/`.md`
// sitting beside the code, is exactly as dead as one in a top-level `.mjs` — and a guard that reports
// green over files it never opened is the "exits green having run nothing" failure AGENTS.md bans.
// A file we could not READ is a third state — not "clean". Swallowing the read error would let the
// guard go green over an unchecked file while `files.length > 0` still held, which is the
// "confident empty result" AGENTS.md bans (and is precisely the hole the round-1 version of this
// function shipped). So: return the unreadable paths alongside the readable ones and let the caller
// fail on them by name. Known-clean, known-stale, and could-not-check are three different facts.
function collectFiles(dir, relPrefix) {
  const files = [];
  const unreadable = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    const rel = `${relPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      const nested = collectFiles(abs, rel);
      files.push(...nested.files);
      unreadable.push(...nested.unreadable);
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      files.push({ path: rel, content: readFileSync(abs, 'utf8') });
    } catch (err) {
      unreadable.push(`${rel} (${err.code || err.message})`);
    }
  }
  return { files, unreadable };
}

test('guard: no file under scripts/lib/ references the decommissioned GCP project', () => {
  const { files, unreadable } = collectFiles(LIB_DIR, 'scripts/lib');
  assert.deepEqual(
    unreadable,
    [],
    `could not read ${unreadable.length} file(s) under scripts/lib/, so the guard cannot claim they are clean:\n  ${unreadable.join('\n  ')}`,
  );
  assert.ok(files.length > 0, 'expected to find files under scripts/lib/ — did the directory move?');

  const hits = findOldProjectReferences(files);
  assert.deepEqual(hits, [], hits.length ? `stale old-project reference(s):\n${formatHits(hits)}` : undefined);
});
