// routines.test.mjs — house-format guard for the Claude-Routines prompts under scripts/routines/.
// Each `*.prompt.md` must parse via loadPromptBody() (HTML-comment header + `---` body) into a
// non-empty prompt — the same contract scripts/cross-review.mjs / cross-panel.mjs rely on. Free
// coverage: caught by scripts-guard.yml's `node --test 'scripts/*.test.mjs'`, no glob change needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadPromptBody } from './lib/cross-agent-cli.mjs';

const ROUTINES = join(dirname(fileURLToPath(import.meta.url)), 'routines');
const PROMPTS = ['pr-review', 'roadmap-hygiene', 'smoke-triage', 'ops-nightly', 'weekly-recap', 'pmo-report'];

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
