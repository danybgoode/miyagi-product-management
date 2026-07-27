// review-route.test.mjs — the review POLICY is the asset. It should change only deliberately, so it
// is pinned here rather than living in prose that drifts. All pure: no CLI, no network.

import test from 'node:test';
import assert from 'node:assert/strict';
import { planReview, renderPlan, CROSS_FAMILY_PREFERENCE, BUILDERS } from './review-route.mjs';

const ALL = CROSS_FAMILY_PREFERENCE;

// ---- Rule 1: a family never reviews its own diff ----
//
// This is the rule that only became necessary once Codex started BUILDING. Before that the default
// `--agent codex` was always cross-family; now it would silently be a same-family pass wearing a
// cross-family label.

test('a family never reviews its own diff — for every builder', () => {
  for (const builder of BUILDERS) {
    const plan = planReview({ builder, tier: 'low', available: ALL });
    assert.notEqual(plan.crossFamily, builder, `${builder} must not review its own diff`);
  }
});

test('codex builds → agy reviews (NOT codex)', () => {
  assert.equal(planReview({ builder: 'codex', tier: 'low', available: ALL }).crossFamily, 'agy');
});

test('agy builds → codex reviews', () => {
  assert.equal(planReview({ builder: 'agy', tier: 'low', available: ALL }).crossFamily, 'codex');
});

test('claude builds → codex reviews (the established default still holds)', () => {
  assert.equal(planReview({ builder: 'claude', tier: 'low', available: ALL }).crossFamily, 'codex');
});

// ---- Rule 2: preference order, and devin stays last ----

test('codex is preferred over agy when both are eligible', () => {
  assert.equal(planReview({ builder: 'claude', tier: 'low', available: ['agy', 'codex'] }).crossFamily, 'codex');
});

test('devin is only reached when both stronger families are unavailable or built it', () => {
  // devin carries prose duty and its review findings were mostly false positives on the sample tried.
  assert.equal(planReview({ builder: 'codex', tier: 'low', available: ['devin'] }).crossFamily, 'devin');
  assert.equal(planReview({ builder: 'claude', tier: 'low', available: ALL }).crossFamily, 'codex');
});

// ---- Rule 3: the fresh reviewer is about CONTEXT independence, not family ----

test('HIGH tier always gets the fresh reviewer — even when a different family built it', () => {
  // The two axes are not interchangeable: a Codex build reviewed by agy still has nobody who read the
  // diff fresh with this repo's full context. HIGH is where that has caught real money-path bugs.
  for (const builder of BUILDERS) {
    assert.equal(planReview({ builder, tier: 'high', available: ALL }).freshReviewer, true, builder);
  }
});

test('LOW tier gets NO fresh reviewer — this is the Claude-token saving', () => {
  for (const builder of BUILDERS) {
    assert.equal(planReview({ builder, tier: 'low', available: ALL }).freshReviewer, false, builder);
  }
});

test('--fresh forces the reviewer on a LOW-tier PR (the documented judgment call)', () => {
  assert.equal(planReview({ builder: 'codex', tier: 'low', available: ALL, forceFresh: true }).freshReviewer, true);
});

test('the fresh reviewer runs on the STRONGEST model — review is inverted', () => {
  assert.equal(planReview({ builder: 'codex', tier: 'high', available: ALL }).freshReviewerModel, 'opus');
});

// ---- A missing layer must be LOUD, never silently substituted ----

test('no eligible family → crossFamily is null and the plan SAYS the layer is dark', () => {
  // The dangerous failure is a missing layer that reads like a clean one.
  const plan = planReview({ builder: 'codex', tier: 'low', available: ['codex'] });
  assert.equal(plan.crossFamily, null);
  assert.match(plan.reasons.join(' '), /DARK/);
  assert.match(plan.reasons.join(' '), /say so in the PR/i);
});

test('an unavailable preferred family falls through rather than being substituted silently', () => {
  const plan = planReview({ builder: 'claude', tier: 'low', available: ['agy'] });
  assert.equal(plan.crossFamily, 'agy');
});

// ---- validation ----

test('an unknown builder or tier is rejected', () => {
  assert.throws(() => planReview({ builder: 'gpt4', tier: 'low' }));
  assert.throws(() => planReview({ builder: 'codex', tier: 'medium' }));
});

// ---- the rendered plan is what a human acts on ----

test('renderPlan prints the exact cross-review command with the right --agent flag', () => {
  const plan = planReview({ builder: 'codex', tier: 'low', available: ALL });
  const out = renderPlan(plan, 312, 'danybgoode/miyagisanchezcommerce');
  // agy's CLI flag is the long name — getting this wrong sends the review to the wrong family.
  assert.match(out, /--agent antigravity/);
  assert.match(out, /cross-review\.mjs 312/);
  assert.match(out, /--repo danybgoode\/miyagisanchezcommerce/);
});

test('renderPlan names the fresh-reviewer step only when it is required', () => {
  const high = renderPlan(planReview({ builder: 'codex', tier: 'high', available: ALL }), 1);
  const low = renderPlan(planReview({ builder: 'codex', tier: 'low', available: ALL }), 1);
  assert.match(high, /pr-reviewer subagent/);
  assert.doesNotMatch(low, /pr-reviewer subagent/);
});

test('renderPlan always explains WHY, so the choice is auditable rather than magic', () => {
  const out = renderPlan(planReview({ builder: 'codex', tier: 'low', available: ALL }), 1);
  assert.match(out, /never reviews its own diff/);
});
