// cross-review.lens.test.mjs — the security lens and the model attribution.
//
// These functions became testable only because this sprint added the isMain guard: cross-review.mjs
// used to call main() unconditionally, so importing it ran a review.

import test from 'node:test';
import assert from 'node:assert/strict';
import { promptPathFor, resolveReviewModel, buildComment, LENSES } from './cross-review.mjs';

// ---- prompt selection ----

test('no lens keeps the default prompt — the mandatory rail is untouched', () => {
  assert.ok(promptPathFor(null).endsWith('cross-review.prompt.md'));
});

test('--lens security selects the security prompt', () => {
  assert.ok(promptPathFor('security').endsWith('cross-review.security.prompt.md'));
});

test('an unknown lens is rejected rather than silently falling back to the default', () => {
  // Silently defaulting would run a GENERAL review while the operator believed a security pass ran —
  // the worst possible outcome for a security tool.
  assert.throws(() => promptPathFor('sekurity'));
});

test('LENSES is the single source of valid values', () => {
  assert.deepEqual(LENSES, ['security']);
});

// ---- model attribution ----
//
// CODEX_MODEL defaults to null, so the reviewer model is machine-local config no artifact recorded.
// If that config drifts, review strength changes family and nothing notices.

test('CODEX_MODEL wins when set', () => {
  assert.equal(resolveReviewModel('codex', false, { env: { CODEX_MODEL: 'gpt-5.6-sol' } }), 'gpt-5.6-sol');
});

test('otherwise the codex config default is read, with its reasoning effort', () => {
  const cfg = 'model = "gpt-5.6-terra"\nmodel_reasoning_effort = "high"\n';
  assert.equal(resolveReviewModel('codex', false, { env: {}, readCfg: () => cfg }), 'gpt-5.6-terra (effort: high)');
});

test('an unreadable config yields null — the caller prints "unrecorded", never a guess', () => {
  // A wrong attribution is worse than a missing one: it makes an unauditable review look audited.
  assert.equal(resolveReviewModel('codex', false, { env: {}, readCfg: () => null }), null);
});

test('a fallback run is attributed to agy, not to codex', () => {
  // The whole point of recording this: nobody should read an Antigravity review as a Codex one.
  assert.match(resolveReviewModel('codex', true, { env: {} }), /agy|pair/);
});

test('a Vibe run is never attributed to the Codex model', () => {
  assert.equal(
    resolveReviewModel('vibe', false, { env: { CODEX_MODEL: 'gpt-5.6-sol', VIBE_ACTIVE_MODEL: 'devstral-medium' } }),
    'devstral-medium'
  );
  assert.equal(
    resolveReviewModel('vibe', false, { env: { CODEX_MODEL: 'gpt-5.6-sol' } }),
    'vibe configured default'
  );
});

// ---- the comment ----

test('a security-lens comment is labelled as one and states its limits inline', () => {
  const body = buildComment('Codex', 'no findings', false, { lens: 'security', model: 'gpt-5.6-terra' });
  assert.match(body, /security lens/i);
  assert.match(body, /not\*\* static analysis/i);
  assert.match(body, /not a security guarantee/i);
});

test('the comment names the model that actually ran', () => {
  assert.match(buildComment('Codex', 'x', false, { model: 'gpt-5.6-terra (effort: high)' }), /gpt-5\.6-terra \(effort: high\)/);
});

test('an unresolved model says so rather than printing a plausible default', () => {
  assert.match(buildComment('Codex', 'x', false, { model: null }), /unrecorded/);
});

test('a non-lens comment carries no security disclaimer and keeps the original title', () => {
  const body = buildComment('Codex', 'x', false, { model: 'm' });
  assert.match(body, /### 🔎 Cross-agent review/);
  assert.doesNotMatch(body, /security guarantee/);
});

test('a fallback is still unmistakable in the header, lens or not', () => {
  assert.match(buildComment('Codex', 'x', true, { lens: 'security', model: 'm' }), /Codex unavailable/);
});
