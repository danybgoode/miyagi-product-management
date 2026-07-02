// babysit-pr.test.mjs — pure-logic coverage for decideBabysitActions (no gh/git I/O — those are
// exercised live, --dry-run, against a real open PR per the sprint's verification walkthrough).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideBabysitActions } from './babysit-pr.mjs';

test('clean PR (mergeable, no failing/pending checks) → allClean true, nothing to do', () => {
  const d = decideBabysitActions({
    mergeable: 'MERGEABLE',
    checks: [{ name: 'ci', conclusion: 'SUCCESS' }],
  });
  assert.equal(d.conflict, false);
  assert.deepEqual(d.failingChecks, []);
  assert.deepEqual(d.pendingChecks, []);
  assert.equal(d.allClean, true);
});

test('conflicting PR with otherwise-green checks → conflict true, allClean false', () => {
  const d = decideBabysitActions({
    mergeable: 'CONFLICTING',
    checks: [{ name: 'ci', conclusion: 'SUCCESS' }],
  });
  assert.equal(d.conflict, true);
  assert.equal(d.failingChecks.length, 0);
  assert.equal(d.allClean, false);
});

test('failing check on an otherwise-mergeable PR → surfaced, not clean', () => {
  const d = decideBabysitActions({
    mergeable: 'MERGEABLE',
    checks: [
      { name: 'ci', conclusion: 'FAILURE' },
      { name: 'lint', conclusion: 'SUCCESS' },
    ],
  });
  assert.equal(d.conflict, false);
  assert.equal(d.failingChecks.length, 1);
  assert.equal(d.failingChecks[0].name, 'ci');
  assert.equal(d.allClean, false);
});

test('a still-in-progress check is pending, not failing, and does not block allClean on its own', () => {
  const d = decideBabysitActions({
    mergeable: 'MERGEABLE',
    checks: [{ name: 'ci', status: 'IN_PROGRESS' }],
  });
  assert.equal(d.failingChecks.length, 0);
  assert.equal(d.pendingChecks.length, 1);
  assert.equal(d.allClean, true); // pending isn't a failure — nothing actionable to retry/surface yet
});

test('conflict AND a failing check both surface together', () => {
  const d = decideBabysitActions({
    mergeable: 'CONFLICTING',
    checks: [{ name: 'ci', conclusion: 'ERROR' }],
  });
  assert.equal(d.conflict, true);
  assert.equal(d.failingChecks.length, 1);
  assert.equal(d.allClean, false);
});

test('missing/undefined checks array degrades to empty, not a throw', () => {
  const d = decideBabysitActions({ mergeable: 'MERGEABLE', checks: undefined });
  assert.deepEqual(d.failingChecks, []);
  assert.deepEqual(d.pendingChecks, []);
  assert.equal(d.allClean, true);
});
