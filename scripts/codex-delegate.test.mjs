// codex-delegate.test.mjs — the ROUTING POLICY is the thing worth pinning. Which model gets a money
// path, and whether an audit can write, are decisions that should change only deliberately.

import test from 'node:test';
import assert from 'node:assert/strict';
import { planDelegation, buildDelegatePrompt, buildCodexArgs, TASKS, CODEX_MODELS } from './codex-delegate.mjs';

// ---- routing by risk and boundedness (not "cheaper model builds") ----

test('frontier handles money, security and architecture — the 2026-07-19 trial finding', () => {
  for (const t of ['security-audit', 'money-path', 'architecture']) {
    assert.equal(planDelegation({ task: t }).model, CODEX_MODELS.frontier, `${t} must route frontier`);
  }
});

test('the workhorse handles bounded, reversible work', () => {
  for (const t of ['build', 'audit', 'test', 'ci']) {
    assert.equal(planDelegation({ task: t }).model, CODEX_MODELS.workhorse, `${t} must route workhorse`);
  }
});

// ---- the sandbox is the safety boundary ----

test('every non-build task is READ-ONLY, so an audit cannot quietly fix what it finds', () => {
  for (const t of ['security-audit', 'architecture', 'audit']) {
    assert.equal(planDelegation({ task: t }).sandbox, 'read-only', `${t} must be read-only`);
  }
});

test('danger-full-access is unreachable from any task profile', () => {
  for (const t of Object.keys(TASKS)) {
    assert.notEqual(planDelegation({ task: t }).sandbox, 'danger-full-access');
  }
});

test('every task profile declares a sandbox and an effort — no silent defaults', () => {
  for (const [name, spec] of Object.entries(TASKS)) {
    assert.ok(['read-only', 'workspace-write'].includes(spec.sandbox), `${name} sandbox`);
    assert.ok(['low', 'medium', 'high'].includes(spec.effort), `${name} effort`);
    assert.ok(spec.why && spec.why.length > 20, `${name} must say WHY it routes where it does`);
  }
});

// ---- model overrides are allowed but must be probed ----
//
// A typo'd slug fails deep inside codex as an opaque 400, minutes later. Catching it at dispatch
// costs nothing, and the roster is only trustworthy because it was probed rather than assumed.

test('an override to a probed slug is accepted', () => {
  assert.equal(planDelegation({ task: 'build', modelOverride: CODEX_MODELS.frontier }).model, CODEX_MODELS.frontier);
});

test('the roster contains only slugs probed as accepted (gpt-5-codex is NOT one)', () => {
  const slugs = Object.values(CODEX_MODELS);
  assert.ok(slugs.includes('gpt-5.6-sol'));
  assert.ok(slugs.includes('gpt-5.6-terra'));
  // The CLI reports itself as this; the API rejects it. Self-reports are not evidence.
  assert.ok(!slugs.includes('gpt-5-codex'));
});

// ---- the delegated contract ----
//
// A foreign-family subagent has none of this repo's context or habits, so the boundaries ride in
// every prompt. Two of them are process rules it could not possibly infer.

test('the prompt forbids push, PR, merge and migration — every time', () => {
  const plan = planDelegation({ task: 'build' });
  const p = buildDelegatePrompt({ task: 'build', body: 'do a thing', plan });
  for (const forbidden of ['git push', 'pull request', 'merge', 'migration']) {
    assert.match(p, new RegExp(forbidden, 'i'), `prompt must forbid ${forbidden}`);
  }
});

test('the prompt tells a read-only task it cannot write, in those words', () => {
  const plan = planDelegation({ task: 'audit' });
  const p = buildDelegatePrompt({ task: 'audit', body: 'find things', plan });
  assert.match(p, /READ-ONLY/);
  assert.match(p, /Do not modify, create or delete any file/);
});

test('the prompt makes "this premise is false" an explicit success outcome', () => {
  // This is the instruction that made the first real dispatch stop instead of building on a wrong
  // spec count — the most valuable behaviour in the whole contract.
  const plan = planDelegation({ task: 'ci' });
  const p = buildDelegatePrompt({ task: 'ci', body: 'x', plan });
  assert.match(p, /false premise/i);
  assert.match(p, /stop and say so/i);
});

test('the prompt asks what was NOT verified, not just what was', () => {
  const plan = planDelegation({ task: 'build' });
  const p = buildDelegatePrompt({ task: 'build', body: 'x', plan });
  assert.match(p, /did NOT verify/);
});

test('the task body is carried through verbatim', () => {
  const plan = planDelegation({ task: 'build' });
  const p = buildDelegatePrompt({ task: 'build', body: 'UNIQUE-BODY-MARKER', plan });
  assert.match(p, /UNIQUE-BODY-MARKER/);
});

// ---- argv assembly ----

test('buildCodexArgs passes model, sandbox and effort explicitly rather than inheriting config', () => {
  const args = buildCodexArgs({ model: 'gpt-5.6-terra', sandbox: 'read-only', effort: 'high', prompt: 'P' });
  assert.deepEqual(args.slice(0, 6), ['exec', '-m', 'gpt-5.6-terra', '--sandbox', 'read-only', '-c']);
  assert.match(args[6], /model_reasoning_effort="high"/);
  assert.equal(args[args.length - 1], 'P');
});

test('buildCodexArgs never emits danger-full-access', () => {
  for (const t of Object.keys(TASKS)) {
    const plan = planDelegation({ task: t });
    assert.ok(!buildCodexArgs({ ...plan, prompt: 'x' }).includes('danger-full-access'));
  }
});
