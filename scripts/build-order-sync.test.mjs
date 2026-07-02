// build-order-sync.test.mjs — pure-logic coverage for build-order-sync.mjs's two exported helpers
// (no gh/git I/O — those are exercised live per the sprint's verification walkthrough).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { branchName, buildPrBody, PR_TITLE } from './build-order-sync.mjs';

test('branchName is claude/-prefixed and date-stamped (YYYY-MM-DD)', () => {
  const name = branchName(new Date('2026-07-15T03:00:00Z'));
  assert.equal(name, 'claude/build-order-sync-2026-07-15');
});

test('branchName defaults to today when no date is passed', () => {
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(branchName(), `claude/build-order-sync-${today}`);
});

test('buildPrBody mentions the board path and the advisory-only framing', () => {
  const body = buildPrBody();
  assert.match(body, /BUILD-ORDER\.md/);
  assert.match(body, /Advisory only/);
  assert.match(body, /never touches the doc that caused the drift/);
});

test('PR_TITLE is a stable, descriptive chore(...) title', () => {
  assert.equal(PR_TITLE, 'chore(build-order): regenerate stale board');
});
