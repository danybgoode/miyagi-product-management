// Vibe must be able to inspect surrounding code without gaining any write-capable tool.
// These tests pin that guarantee at the argv boundary where it is enforced.

import test from 'node:test';
import assert from 'node:assert/strict';
import { runVibe, VIBE_READ_ONLY_TOOLS, VIBE_MAX_TURNS } from './cross-agent-cli.mjs';

function argvFor(prompt = 'review this') {
  let captured = null;
  const spawn = (_bin, args) => {
    captured = args;
    return { status: 0, stdout: 'findings', stderr: '' };
  };
  runVibe(prompt, {}, { spawn });
  return captured;
}

test('Vibe reads are auto-approved through an exact read-only tool allow-list', () => {
  const args = argvFor();
  assert.ok(args.includes('--auto-approve'), 'otherwise every file read is denied');

  const enabled = args
    .map((arg, index) => (arg === '--enabled-tools' ? args[index + 1] : null))
    .filter(Boolean);
  assert.deepEqual(enabled.sort(), [...VIBE_READ_ONLY_TOOLS].sort());
  assert.deepEqual([...VIBE_READ_ONLY_TOOLS].sort(), ['grep', 'read_file']);
  for (const writeTool of ['bash', 'edit', 'write_file', 'task']) assert.ok(!enabled.includes(writeTool));
});

test('plan mode and a workable turn budget remain mandatory', () => {
  const args = argvFor();
  assert.equal(args[args.indexOf('--agent') + 1], 'plan');
  assert.ok(Number(VIBE_MAX_TURNS) >= 8, `expected a workable budget, got ${VIBE_MAX_TURNS}`);
  assert.equal(args[args.indexOf('--max-turns') + 1], String(VIBE_MAX_TURNS));
});

test('turn-limit failure names our budget rather than misreporting quota', () => {
  const spawn = () => ({
    status: 1,
    stdout: '',
    stderr: '<vibe_stop_event>Turn limit of 4 reached</vibe_stop_event>',
  });
  const original = process.stderr.write.bind(process.stderr);
  let warned = '';
  process.stderr.write = (chunk) => {
    warned += chunk;
    return true;
  };
  try {
    assert.equal(runVibe('review this', { soft: true }, { spawn }), null);
  } finally {
    process.stderr.write = original;
  }
  assert.match(warned, /turns, not quota/i);
  assert.match(warned, /VIBE_MAX_TURNS/);
});
