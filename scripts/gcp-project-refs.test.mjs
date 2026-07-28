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

test('guard: no file under scripts/lib/ references the decommissioned GCP project', () => {
  const files = readdirSync(LIB_DIR)
    .filter((f) => f.endsWith('.mjs'))
    .map((f) => {
      const abs = join(LIB_DIR, f);
      return { path: `scripts/lib/${f}`, content: readFileSync(abs, 'utf8') };
    });
  assert.ok(files.length > 0, 'expected to find .mjs files under scripts/lib/ — did the directory move?');

  const hits = findOldProjectReferences(files);
  assert.deepEqual(hits, [], hits.length ? `stale old-project reference(s):\n${formatHits(hits)}` : undefined);
});
