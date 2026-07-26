// prose-guard — the mechanical check that stands between a machine draft and a human reader.
//
// Both directions matter and they fail in opposite ways:
//   too LOOSE  → the measured hallucinations (invented beneficiary, unsupported fix claim, a
//                fabricated deadline, "it's live" about a flag-OFF epic) sail through, which is the
//                whole reason this file exists;
//   too STRICT → a legitimate report about a real fix for real merchants gets rejected, the retry
//                produces something worse, and whoever maintains this learns to bypass the guard.
//
// So every "must flag" case below is paired with a "must NOT flag" case. Ported from golden-beans
// with its suite, plus the flag-state-claim block that is ours (README D6).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkProse,
  findingsToRevisionNote,
  countWords,
  countSentences,
  flagTokens,
  BANNED_TOOL_NAMES,
} from './prose-guard.mjs';

const codes = (r) => r.findings.map((f) => f.code);

// A clean internal report: names the real beneficiary, claims no fix, no tool names, no liveness.
const CLEAN_INTERNAL =
  'Whoever ships next gets faster feedback. A whole class of mistake is now caught in seconds ' +
  'rather than after a deploy, and the checks run on every change without anyone remembering to.';

test('a clean internal report passes', () => {
  const r = checkProse(CLEAN_INTERNAL, { allowsFixClaim: false, allowsBeneficiary: false });
  assert.equal(r.ok, true, `unexpected findings: ${JSON.stringify(r.findings)}`);
});

// ── The two measured hallucinations ─────────────────────────────────────────────────────────

test('MEASURED FAILURE 1: an invented beneficiary is flagged on an internal change', () => {
  // Verbatim shape of the real run: internal test tooling described as benefiting tenants.
  const draft = 'Tenants now benefit from a faster test suite that validates core functions in milliseconds.';
  const r = checkProse(draft, { allowsBeneficiary: false });
  assert.ok(codes(r).includes('invented-beneficiary'));
  assert.equal(r.ok, false);
});

test('…but a REAL merchant-facing change may name merchants', () => {
  const draft = 'Merchants can hand a partner a portfolio and see what that partner did with it.';
  const r = checkProse(draft, { allowsBeneficiary: true });
  assert.ok(!codes(r).includes('invented-beneficiary'));
});

test('MEASURED FAILURE 2: an unsupported fix claim is flagged', () => {
  // Verbatim shape of the real run: a commit that only ADDED TESTS claiming it closed the bug.
  const draft =
    'The previous backslash bypass is blocked, eliminating a potential open-redirect attack for everyone.';
  const r = checkProse(draft, { allowsFixClaim: false, allowsBeneficiary: true });
  assert.ok(codes(r).includes('unsupported-fix-claim'));
});

test('…but a genuine fix may be reported as a fix', () => {
  const draft = 'A sign-in that failed for some people is fixed; they can reach their account again.';
  const r = checkProse(draft, { allowsFixClaim: true, allowsBeneficiary: true });
  assert.ok(!codes(r).includes('unsupported-fix-claim'), JSON.stringify(r.findings));
});

test('every fix-claim phrasing is caught, not just the word "fixed"', () => {
  for (const draft of [
    'This resolves the crash people were hitting.',
    'The leak is now closed.',
    'Sign-in no longer breaks on a slow connection.',
    'The vulnerability was removed.',
    'The flow is now secure.',
    'This prevents the duplicate charge.',
  ]) {
    const r = checkProse(draft, { allowsFixClaim: false, allowsBeneficiary: true, minWords: 1 });
    assert.ok(codes(r).includes('unsupported-fix-claim'), `missed a fix claim: ${draft}`);
  }
});

// ── Register and length ─────────────────────────────────────────────────────────────────────

test('marketing vocabulary is flagged', () => {
  const r = checkProse('This seamlessly leverages a robust pipeline to empower the whole org.', {
    allowsBeneficiary: true,
  });
  assert.ok(codes(r).includes('marketing-language'));
});

test('tool, framework and model names are flagged', () => {
  const r = checkProse('The Playwright suite now runs against Supabase, drafted by Gemini.', {
    allowsBeneficiary: true,
  });
  assert.ok(codes(r).includes('names-implementation'));
});

test('OUR stack names are flagged too — the ones a draft here actually reaches for', () => {
  // golden-beans never sees these words; every one of them appears in our sprint docs constantly,
  // which is exactly why a draft derived from those docs leaks them.
  for (const draft of [
    'The Medusa module now owns the write path for the whole catalog.',
    'Clerk sessions survive the redirect, so nobody is signed out twice.',
    'The service runs on Cloud Run in a single region with a warm instance.',
    'The Mercado Libre sync pulls orders every ten minutes without a manual step.',
    'The MercadoLibre sync pulls orders every ten minutes without a manual step.',
  ]) {
    const r = checkProse(draft, { allowsBeneficiary: true, minWords: 1 });
    assert.ok(codes(r).includes('names-implementation'), `missed a stack name: ${draft}`);
  }
});

test('the finding names the offending tool in readable form, not as a regex fragment', () => {
  const r = checkProse('The Mercado Libre bridge and the Node.js runner both changed.', {
    allowsBeneficiary: true,
    minWords: 1,
  });
  const note = r.findings.find((f) => f.code === 'names-implementation').note;
  assert.match(note, /mercado libre/);
  assert.match(note, /node\.js/);
  assert.ok(!note.includes('?'), `regex metacharacters leaked into a human note: ${note}`);
});

test('ordinary words that merely LOOK like tool names are not flagged', () => {
  // The guard must not fire on "next" the adverb or "react" the verb — a false positive here
  // rejects a perfectly good sentence and teaches people to distrust the check.
  const r = checkProse(
    'Whoever ships next sees the change immediately, and the page does not react to a stale value.',
    { allowsBeneficiary: false }
  );
  assert.ok(!codes(r).includes('names-implementation'), JSON.stringify(r.findings));
});

test('the deliberate omissions stay omitted — this list is the contract, not an accident', () => {
  // Pinned so a future "helpful" addition of bare `react`/`next`/`stripe` has to argue with a test
  // rather than slip in. The reasoning lives in prose-guard.mjs beside the list.
  for (const bare of ['react', 'next', 'stripe']) {
    assert.ok(!BANNED_TOOL_NAMES.includes(bare), `${bare} must stay out of BANNED_TOOL_NAMES`);
  }
});

test('an unfinished last sentence is flagged', () => {
  const r = checkProse('The checks now run on every change and future work adds', {
    allowsBeneficiary: false,
  });
  assert.ok(codes(r).includes('unfinished'));
});

test('a complete sentence ending in a quote or bracket is NOT flagged as unfinished', () => {
  // The golden-beans original only tested "…it)." — the period is last there, so the optional
  // closing-delimiter group in endsCleanly was never exercised and the spec passed for the wrong
  // reason (proved by mutation: dropping the group left it green). These endings actually need it.
  for (const draft of [
    'The empty state now explains itself (and says how to get out of it).',
    'The empty state now says "add your first product."',
    'The whole check runs on every change (nobody has to remember it.)',
    "Whoever ships next sees it, and the reason sits beside the rule that needs it.'",
  ]) {
    const r = checkProse(draft, { allowsBeneficiary: false, minWords: 1 });
    assert.ok(!codes(r).includes('unfinished'), `false 'unfinished' on: ${draft}`);
  }
});

test('length is bounded in both directions', () => {
  const long = 'word '.repeat(80).trim() + '.';
  assert.ok(codes(checkProse(long, { allowsBeneficiary: false })).includes('too-long'));
  assert.ok(codes(checkProse('Done.', { allowsBeneficiary: false })).includes('too-short'));
});

test('an empty draft is a finding, not a pass', () => {
  for (const empty of ['', '   ', null, undefined]) {
    const r = checkProse(empty, {});
    assert.equal(r.ok, false);
    assert.deepEqual(codes(r), ['empty']);
  }
});

// ── The retry note ──────────────────────────────────────────────────────────────────────────

test('findings become a concrete, numbered revision instruction', () => {
  // A guard that only says "rejected" produces another guess; one that says what is wrong produces
  // a correction. So the note must carry every finding's text.
  const r = checkProse('Tenants are delighted that the bug is fixed.', {
    allowsFixClaim: false,
    allowsBeneficiary: false,
  });
  const note = findingsToRevisionNote(r.findings);
  for (const f of r.findings) assert.ok(note.includes(f.note), `note omitted: ${f.code}`);
  assert.match(note, /^\d+\./m, 'findings must be numbered');
  assert.match(note, /Output only the corrected report/);
});

test('counters are honest about words and sentences', () => {
  assert.equal(countWords('one two three'), 3);
  assert.equal(countWords('  '), 0);
  assert.equal(countSentences('One. Two! Three?'), 3);
  assert.equal(countSentences('no terminator'), 0);
});

// ── MEASURED FAILURE 3: invented commitments (2026-07-25, golden-beans' standup rail) ────────

test('MEASURED FAILURE 3: a fabricated deadline is flagged, with no way to unlock it', () => {
  // Verbatim from the real draft. Git history contains no deadlines, so this is invented by
  // construction — and it is the most corrosive of the three, because it makes people chase work
  // nobody agreed to and it reads as perfectly ordinary standup language.
  const draft =
    'Nothing is currently blocked, though design sign-off on the Sprint 2 layout is owed before tomorrow.';
  const r = checkProse(draft, { allowsFixClaim: true, allowsBeneficiary: true, minWords: 1 });
  assert.ok(codes(r).includes('invented-commitment'));
  // Unconditional: no evidence flag may legitimately permit a fabricated date.
  const permissive = checkProse(draft, {
    allowsFixClaim: true,
    allowsBeneficiary: true,
    liveFlags: ['everything.enabled'],
    minWords: 1,
    maxWords: 500,
  });
  assert.ok(codes(permissive).includes('invented-commitment'), 'no flag may unlock a fabricated deadline');
});

test('every fabricated-deadline phrasing is caught', () => {
  for (const draft of [
    'The review is due by Friday.',
    'This will ship next week.',
    'Approval is pending and needed by end of week.',
    'The migration is scheduled for tomorrow.',
    'It will be ready by Monday.',
  ]) {
    const r = checkProse(draft, { allowsFixClaim: true, allowsBeneficiary: true, minWords: 1 });
    assert.ok(codes(r).includes('invented-commitment'), `missed a fabricated commitment: ${draft}`);
  }
});

test('an honest owed-item WITHOUT a date is not flagged', () => {
  // The correct way to report an obligation: name it, name who holds it, attach no invented date.
  const draft =
    'Daniel still needs to add a repository secret before the automatic push turns on, and to read the three views himself.';
  const r = checkProse(draft, { allowsFixClaim: false, allowsBeneficiary: false });
  assert.ok(!codes(r).includes('invented-commitment'), JSON.stringify(r.findings));
});

// ── flag-state-claim — OUR rule (README D6) ─────────────────────────────────────────────────
// Ours is a flag-gated shop: five epics in two weeks shipped dark behind a default-OFF flag. A
// report calling one of them "live" is the highest-risk falsehood this guard can catch, because it
// is the sentence that would stop Daniel doing the flip the epic is waiting on.

test('D6: a flag-OFF epic CANNOT be reported as live', () => {
  // partner_portfolio_enabled shipped OFF on 2026-07-25 and is still OFF. This is the sentence.
  const draft =
    'The partner portfolio is live, so anyone handed a shop can now see what they are responsible for.';
  const r = checkProse(draft, { allowsBeneficiary: true, liveFlags: [], minWords: 1 });
  assert.ok(codes(r).includes('flag-state-claim'), JSON.stringify(r.findings));
  assert.equal(r.ok, false);
});

test('D6: the finding quotes the offending sentence back, so the retry knows what to rewrite', () => {
  const draft = 'The rail landed cleanly. The partner portfolio is live for everyone it was built for.';
  const r = checkProse(draft, { allowsBeneficiary: true, liveFlags: [], minWords: 1 });
  const note = r.findings.find((f) => f.code === 'flag-state-claim').note;
  assert.match(note, /The partner portfolio is live/);
  assert.ok(!note.includes('The rail landed cleanly'), 'only the offending clause should be quoted');
});

test('D6: a capability the pack proves is ON may be reported as live', () => {
  // The corroborating half. Without this the rule would be "never say live", which is not the rule.
  const draft = 'The activation crm is live, and the emission rail behind it now runs on every change.';
  const r = checkProse(draft, {
    allowsBeneficiary: true,
    liveFlags: ['promoter.activation_crm_enabled'],
    minWords: 1,
  });
  assert.ok(!codes(r).includes('flag-state-claim'), JSON.stringify(r.findings));
});

test('D6: one live capability does not launder a DIFFERENT liveness claim', () => {
  // The laundering case: something genuinely on, plus something that is not, in one paragraph.
  const draft =
    'The activation crm is live. The partner portfolio is live too, ready for whoever gets handed one.';
  const r = checkProse(draft, {
    allowsBeneficiary: true,
    liveFlags: ['promoter.activation_crm_enabled'],
    minWords: 1,
    maxWords: 200,
  });
  const note = r.findings.find((f) => f.code === 'flag-state-claim')?.note;
  assert.ok(note, 'the uncorroborated claim must still be caught');
  assert.match(note, /partner portfolio/);
});

test('D6: the honest dark-shipping sentence is NOT flagged', () => {
  // D5 asks for exactly this sentence ("the rail exists; nothing fires yet"). A guard that rejects
  // the truth it exists to protect would be worse than no guard.
  for (const draft of [
    'The rail is built and nothing is live yet, because the flag it sits behind has never been flipped.',
    'Everything landed dark; no part of it is enabled for anyone until Daniel flips the switch himself.',
    'The portfolio is not live and will stay dark until someone reads it end to end.',
  ]) {
    const r = checkProse(draft, { allowsBeneficiary: true, liveFlags: [], minWords: 1 });
    assert.ok(!codes(r).includes('flag-state-claim'), `false positive on an honest sentence: ${draft}`);
  }
});

test('D6: a negation in a LATER clause does not excuse the claim', () => {
  // The reason the negator window is scoped to the words before the claim rather than the whole
  // sentence — a sentence-wide check excused exactly this shape.
  const draft = 'The partner portfolio is live for every shop, and no smoke test has been run against it.';
  const r = checkProse(draft, { allowsBeneficiary: true, liveFlags: [], minWords: 1 });
  assert.ok(codes(r).includes('flag-state-claim'), JSON.stringify(r.findings));
});

test('D6: every liveness phrasing is caught, not just "is live"', () => {
  for (const draft of [
    'The portfolio is live.',
    'The reminder cron is now enabled.',
    'The scorecard went live this morning.',
    'The intake form is rolled out to everyone.',
    'The emission rail is running in production.',
    'The consent preview is now available.',
  ]) {
    const r = checkProse(draft, { allowsBeneficiary: true, liveFlags: [], minWords: 1 });
    assert.ok(codes(r).includes('flag-state-claim'), `missed a liveness claim: ${draft}`);
  }
});

test('D6: "can now" stays legal — it is the register the persona is built to produce', () => {
  // The deliberate omission, pinned. D5 tells the writer to lead with what someone can DO now;
  // banning that phrasing would reject the sentences the whole epic exists to buy.
  const draft = 'A shop owner can now hand a partner one shop instead of the whole account.';
  const r = checkProse(draft, { allowsBeneficiary: true, liveFlags: [], minWords: 1 });
  assert.ok(!codes(r).includes('flag-state-claim'), JSON.stringify(r.findings));
});

test('flagTokens: a flag key reduces to the words a report would actually say', () => {
  assert.deepEqual(flagTokens('promoter.partner_portfolio_enabled'), ['partner', 'portfolio']);
  assert.deepEqual(flagTokens('growth.founding_merchants_enabled'), ['founding', 'merchants']);
  // Short segments are dropped — a two-letter token would match half the alphabet's worth of prose.
  assert.deepEqual(flagTokens('mcp.ui_enabled'), []);
  assert.deepEqual(flagTokens(''), []);
});

test('flagTokens: a plain capability name works, for a change with no flag at all', () => {
  // The escape valve, and it is shaped like evidence rather than like a boolean.
  assert.deepEqual(flagTokens('standup prose rail'), ['standup', 'prose', 'rail']);
});
