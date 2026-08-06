// routines.test.mjs — house-format guard for the Claude-Routines prompts under scripts/routines/.
// Each `*.prompt.md` must parse via loadPromptBody() (HTML-comment header + `---` body) into a
// non-empty prompt — the same contract scripts/cross-review.mjs / cross-panel.mjs rely on. Free
// coverage: caught by scripts-guard.yml's `node --test 'scripts/*.test.mjs'`, no glob change needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadPromptBody } from './lib/cross-agent-cli.mjs';

const ROUTINES = join(dirname(fileURLToPath(import.meta.url)), 'routines');

// DERIVED, not hand-listed. This was a literal array of six names until 2026-08-05, which meant a
// seventh prompt could land unguarded and the suite would still pass — a guard that hand-picks its
// own population decays silently while staying green (LEARNINGS: "guard the population, not the
// door you found"). Reading the directory makes the guard's roots the same set the repo actually
// has, so adding a prompt cannot skip it.
const PROMPTS = readdirSync(ROUTINES)
  .filter((f) => f.endsWith('.prompt.md'))
  .map((f) => f.replace(/\.prompt\.md$/, ''))
  .sort();

test('the derived prompt population is non-empty and includes every committed routine', () => {
  // The negation of the bug above: if the glob ever silently matched nothing, every per-prompt test
  // below would vacuously pass and the whole file would be green having checked nothing (AGENTS.md
  // rule 5). Assert the population itself.
  assert.ok(PROMPTS.length >= 7, `expected at least 7 routine prompts, found ${PROMPTS.length}`);
  for (const expected of ['pr-review', 'roadmap-hygiene', 'smoke-triage', 'ops-nightly', 'weekly-recap', 'pmo-report', 'prod-smoke']) {
    assert.ok(PROMPTS.includes(expected), `${expected}.prompt.md is missing from scripts/routines/`);
  }
});

for (const name of PROMPTS) {
  test(`${name}.prompt.md parses to a non-empty body in the house format`, () => {
    const body = loadPromptBody(join(ROUTINES, `${name}.prompt.md`));
    assert.ok(body.length > 0, `${name} body is empty`);
    // The HTML-comment header must be stripped — the body is what the routine runs.
    assert.ok(!body.includes('<!--'), `${name} body still contains the HTML-comment header`);
  });
}

test('every prompt carries the advisory-only discipline', () => {
  for (const name of PROMPTS) {
    const body = loadPromptBody(join(ROUTINES, `${name}.prompt.md`)).toLowerCase();
    assert.ok(body.includes('advisory only'), `${name} is missing the advisory-only banner`);
  }
});
