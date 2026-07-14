import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArgs } from './pmo-report-hub-data.mjs';

test('parseArgs supports explicit output and compact mode', () => {
  const args = parseArgs(['--out', '/tmp/reports-data.json', '--compact']);
  assert.equal(args.out, '/tmp/reports-data.json');
  assert.equal(args.pretty, false);
});

test('parseArgs exposes help without running the generator', () => {
  const args = parseArgs(['--help']);
  assert.equal(args.help, true);
});
