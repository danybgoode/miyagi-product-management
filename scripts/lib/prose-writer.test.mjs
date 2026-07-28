// prose-writer — the routing + guard-and-retry orchestration.
//
// Every writer here is injected, so these tests never touch a network, a CLI or a temp file. What
// they pin is the POLICY: who is tried in what order, what happens to a rejected draft, and — most
// importantly — that a draft which never satisfies the guard is still returned to the caller WITH
// its findings rather than silently swallowed or silently passed off as clean.
//
// The block at the bottom pins the SIGNATURE ADAPTATION, which is the one thing this port could get
// wrong invisibly: our cross-agent-cli runners return a string-or-null, not `{ ok, text }`. Reading
// a falsy return as success would make every capped writer look like a clean draft.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planWriters,
  writeProse,
  buildWriterPrompt,
  loadLessons,
  draftWithDevin,
  draftWithAgy,
  draftWithAnthropic,
  buildAnthropicRequest,
  parseAnthropicResponse,
  PROSE_MODEL,
  ANTHROPIC_MODEL,
} from './prose-writer.mjs';

const CLEAN =
  'Whoever ships next gets faster feedback, and a whole class of mistake is caught before it lands.';
const DIRTY = 'Tenants are delighted that the bug is fixed.';

const okWriter = (text) => () => ({ ok: true, text });
const failWriter = (error, retryable = false) => () => ({ ok: false, text: '', error, retryable });
const silent = () => {};

// ── The router ──────────────────────────────────────────────────────────────────────────────

test('planWriters: DEVIN leads, agy follows — the division of labour, expressed as policy', () => {
  // Devin is the dedicated prose writer so agy's and codex's quota stays free for review and
  // building. This assertion IS the policy: if it changes, every report in the repo changes writer.
  assert.deepEqual(planWriters({ devinAvailable: true, agyAvailable: true }), ['devin', 'agy']);
});

test('planWriters: devin carries it alone when agy is missing (a real, separate quota pool)', () => {
  assert.deepEqual(planWriters({ devinAvailable: true, agyAvailable: false }), ['devin']);
});

test('planWriters: agy carries it alone when devin is missing', () => {
  assert.deepEqual(planWriters({ devinAvailable: false, agyAvailable: true }), ['agy']);
});

test('planWriters: an explicit preference wins, and yields nothing when unavailable', () => {
  assert.deepEqual(planWriters({ devinAvailable: true, agyAvailable: true, preferred: 'agy' }), ['agy']);
  assert.deepEqual(planWriters({ devinAvailable: false, agyAvailable: true, preferred: 'devin' }), []);
});

// ── Guard-and-retry ─────────────────────────────────────────────────────────────────────────

test('a clean first draft is returned immediately, with one attempt', () => {
  const r = writeProse(
    { prompt: 'p', evidence: {} },
    { devin: okWriter(CLEAN), agy: failWriter('should not be reached'), has: () => true, warn: silent }
  );
  assert.equal(r.ok, true);
  assert.equal(r.writer, 'devin');
  assert.equal(r.attempts, 1);
});

test('a rejected draft is RETRIED with the findings, not discarded', () => {
  // The core behaviour: the guard's job is to trigger a correction, not merely to say no.
  const prompts = [];
  const writer = (prompt) => {
    prompts.push(prompt);
    return { ok: true, text: prompts.length === 1 ? DIRTY : CLEAN };
  };
  // BOTH writers stubbed, always. golden-beans' version of this test stubbed only `devin` and
  // relied on devin running first, so the day the router order flipped it reached the REAL agy CLI
  // and hung for two minutes. A unit test that can invoke a network CLI when a policy constant
  // changes is a trap for whoever changes the constant.
  const r = writeProse(
    { prompt: 'BASE', evidence: {} },
    { agy: writer, devin: writer, has: () => true, warn: silent }
  );

  assert.equal(r.ok, true);
  assert.equal(r.attempts, 2);
  assert.equal(r.text, CLEAN);
  // The retry prompt must carry the rejected draft AND the numbered findings, or the writer is
  // just guessing again.
  //
  // Matched on the HEADING, not on the bare phrase. golden-beans' original asserted
  // /Your previous draft/, which the revision note's own opening line ("Your previous draft was
  // rejected by an automated check…") satisfies all by itself — so the spec passed even with the
  // heading deleted, and the draft could have gone missing unnoticed. Proved by mutation.
  assert.match(prompts[1], /^## Your previous draft$/m, 'the rejected draft must be labelled');
  assert.match(prompts[1], /Tenants are delighted/, 'and actually included');
  assert.match(prompts[1], /^\d+\./m, 'with the findings numbered');
  assert.ok(
    prompts[1].indexOf('Tenants are delighted') < prompts[1].search(/^1\./m),
    'the draft comes first, then what is wrong with it'
  );
});

test('the LATEST draft is kept as the fallback, never the first', () => {
  // golden-beans' cross-review caught exactly this: an `if (!best)` pinned the pass-0 draft, so a
  // revision that also tripped a rule was thrown away and the UNREVISED text was returned — making
  // the whole retry pass pure cost. The revision is better informed even when still imperfect.
  const drafts = ['Tenants are delighted that the bug is fixed.', 'Customers are delighted, honestly.'];
  let i = 0;
  const writer = () => ({ ok: true, text: drafts[Math.min(i++, drafts.length - 1)] });
  const r = writeProse(
    { prompt: 'p', evidence: {} },
    { devin: writer, agy: failWriter('unavailable'), has: (c) => c === 'devin', warn: silent }
  );
  assert.equal(r.ok, false);
  assert.equal(r.text, drafts[1], 'the revision must win, not the original');
  assert.equal(r.attempts, 2);
});

test('a writer that FAILS is skipped without burning its retry on a revision note', () => {
  // A broken CLI is not fixed by being told its prose was bad; move to the next writer instead.
  let firstCalls = 0;
  const failing = () => {
    firstCalls++;
    return { ok: false, text: '', error: 'the lead writer exploded', retryable: false };
  };
  const r = writeProse(
    { prompt: 'p', evidence: {} },
    { devin: failing, agy: okWriter(CLEAN), has: () => true, warn: silent }
  );
  assert.equal(firstCalls, 1, 'a non-retryable failed writer must not be called again');
  assert.equal(r.ok, true);
  assert.equal(r.writer, 'agy', 'the fallback picked it up');
});

test('a RETRYABLE failure buys exactly one more attempt before demoting the writer', () => {
  // Measured transient (2026-07-25): devin exited 0 with empty stdout on a 9 KB prompt and the
  // identical prompt succeeded moments later. Falling straight through would cost the better writer
  // for a hiccup — but a genuine outage must still demote, so it is ONE retry, not a loop.
  let calls = 0;
  const flaky = () => {
    calls++;
    return calls === 1
      ? { ok: false, text: '', error: 'devin returned no output', retryable: true }
      : { ok: true, text: CLEAN };
  };
  const r = writeProse(
    { prompt: 'p', evidence: {} },
    { devin: flaky, agy: failWriter('must not be reached'), has: () => true, warn: silent }
  );
  assert.equal(calls, 2);
  assert.equal(r.ok, true);
  assert.equal(r.writer, 'devin', 'the transient must not have cost us the lead writer');
  assert.equal(r.attempts, 2);
});

test('a persistent retryable failure still demotes — the retry is resilience, not denial', () => {
  let calls = 0;
  const dead = () => {
    calls++;
    return { ok: false, text: '', error: 'devin returned no output', retryable: true };
  };
  const r = writeProse(
    { prompt: 'p', evidence: {} },
    { devin: dead, agy: okWriter(CLEAN), has: () => true, warn: silent }
  );
  assert.equal(calls, 2, 'exactly one retry, then move on');
  assert.equal(r.writer, 'agy');
});

test('runs agy alone when devin is not installed at all', () => {
  const r = writeProse(
    { prompt: 'p', evidence: {} },
    { devin: failWriter('never called'), agy: okWriter(CLEAN), has: (c) => c === 'agy', warn: silent }
  );
  assert.equal(r.ok, true);
  assert.equal(r.writer, 'agy');
});

test('a draft that never satisfies the guard is STILL RETURNED, flagged, never silently passed', () => {
  // The most important case. Returning nothing would make the caller fail closed with no output to
  // learn from; returning it as `ok` would launder a known-bad draft into the channel. So: return
  // it, with ok:false and the findings attached, and let the caller surface them (D3).
  const r = writeProse(
    { prompt: 'p', evidence: {} },
    { devin: okWriter(DIRTY), agy: okWriter(DIRTY), has: () => true, warn: silent }
  );
  assert.equal(r.ok, false);
  assert.equal(r.text, DIRTY, 'the draft must be handed back for a human to fix');
  assert.ok(r.guard.findings.length > 0, 'and it must carry the reasons');
  assert.ok(r.guard.findings.some((f) => f.code === 'invented-beneficiary'));
});

test('the evidence pack reaches the guard — a flag-OFF claim is caught through the rail', () => {
  // The whole point of threading `evidence` through: D6's rule is only as good as the pack the
  // writer rail hands it.
  const draft = 'The partner portfolio is live, and every shop owner can see it right now.';
  const r = writeProse(
    { prompt: 'p', evidence: { allowsBeneficiary: true, liveFlags: [], minWords: 1 } },
    { devin: okWriter(draft), agy: okWriter(draft), has: () => true, warn: silent }
  );
  assert.equal(r.ok, false);
  assert.ok(r.guard.findings.some((f) => f.code === 'flag-state-claim'), JSON.stringify(r.guard));
});

test('no writer available is an honest failure, not an empty success', () => {
  const r = writeProse({ prompt: 'p', evidence: {} }, { has: () => false, warn: silent });
  assert.equal(r.ok, false);
  assert.equal(r.text, '');
  assert.equal(r.attempts, 0);
  assert.match(r.error, /no prose writer available/);
});

// ── Prompt assembly + lessons ───────────────────────────────────────────────────────────────

test('buildWriterPrompt orders style → lessons → task, and omits an empty lessons block', () => {
  const withLessons = buildWriterPrompt({ style: 'STYLE', lessons: 'LESSON', task: 'TASK' });
  assert.ok(withLessons.indexOf('STYLE') < withLessons.indexOf('LESSON'));
  assert.ok(withLessons.indexOf('LESSON') < withLessons.indexOf('TASK'));
  assert.match(withLessons, /Lessons from previous drafts/);

  const without = buildWriterPrompt({ style: 'STYLE', lessons: '', task: 'TASK' });
  assert.ok(!without.includes('Lessons from previous drafts'), 'an empty lessons block must be omitted');
});

test('loadLessons strips the notes-to-humans header above the first ---', () => {
  const raw = '<!-- how to use this file -->\n---\nNever invent a beneficiary.';
  const out = loadLessons({ read: () => raw, exists: () => true, path: 'x' });
  assert.equal(out, 'Never invent a beneficiary.');
  assert.ok(!out.includes('how to use this file'));
});

test('loadLessons degrades to empty when the file is absent — never kills a report', () => {
  // Deliberately NOT loadPromptBody, which die()s. A missing lessons file is a legitimate state.
  const out = loadLessons({
    exists: () => false,
    read: () => {
      throw new Error('must not read a missing lessons file');
    },
    path: 'x',
  });
  assert.equal(out, '');
});

// ── The signature adaptation (our runners return string-or-null, not { ok, text }) ───────────

test('draftWithDevin: a string return is a draft; a NULL return is a failure, not an empty success', () => {
  // Getting this backwards makes every capped/unauthenticated writer look like a clean draft, and
  // the guard would then be checking an empty string. `soft: true` must be passed or the runner
  // die()s the whole process instead of returning.
  const opts = [];
  const ok = draftWithDevin('p', { run: (_p, o) => (opts.push(o), '  drafted  ') });
  assert.deepEqual(opts, [{ soft: true }], 'soft mode is mandatory — otherwise the runner exits the process');
  assert.equal(ok.ok, true);
  assert.equal(ok.text, 'drafted', 'the text is trimmed');

  const bad = draftWithDevin('p', { run: () => null });
  assert.equal(bad.ok, false);
  assert.equal(bad.text, '');
  assert.equal(bad.retryable, true, 'a devin failure is worth exactly one retry');
});

test('draftWithAgy: runs the SINGLE prose model, in soft mode', () => {
  let seen;
  const r = draftWithAgy('p', { run: (_p, o) => ((seen = o), 'drafted') });
  assert.deepEqual(seen.models, [PROSE_MODEL], 'one model — a second one would silently change the voice');
  assert.equal(seen.soft, true);
  assert.equal(r.ok, true);
  assert.equal(r.model, PROSE_MODEL, 'the model is reported so the banner can name what actually wrote it');
});

test('PROSE_MODEL is the GPT-OSS model, and emphatically NOT a Gemini one', () => {
  // `gemini-3.5-flash-high` was prose-draft.mjs's default until this sprint, and it is the exact
  // constant golden-beans found had silently destroyed the register of every report. Pinned here so
  // restoring "a Gemini fallback for resilience" has to argue with a test. Resilience lives at the
  // WRITER level (devin → agy, two separate quota pools), not inside the agy path.
  assert.equal(PROSE_MODEL, 'gpt-oss-120b-medium');
  assert.ok(!/gemini/i.test(PROSE_MODEL));
});

test('draftWithAgy: an oversized prompt fails NON-retryably and never reaches the CLI', () => {
  // A second identical attempt cannot shrink the prompt — retrying is pure latency, and it delays
  // the fall-through to devin, which rides --prompt-file and has no cap at all.
  const r = draftWithAgy('x'.repeat(50), {
    limit: 10,
    run: () => {
      throw new Error('must not spawn agy with an oversized prompt');
    },
  });
  assert.equal(r.ok, false);
  assert.equal(r.retryable, false);
  assert.match(r.error, /argv cap/);
});

// ── The HEADLESS backend (2026-07) ───────────────────────────────────────────────────────────
//
// These pin the two things this backend can get wrong invisibly. First, the RESPONSE SHAPE: with
// thinking on, `content[0]` is a thinking block whose text is empty, so index-based reads hand the
// guard an empty string and call it a clean draft. Second, WHAT COUNTS AS A FAILURE: a refusal and
// an API error both arrive as a parseable JSON body, and reading either as success is the same
// "empty success" bug the signature-adaptation block above exists to prevent.

test('planWriters: anthropic is LAST — the CLIs win locally, the API carries CI alone', () => {
  // The whole point of one ordered list: no mode flag, no env sniffing at the call site.
  assert.deepEqual(
    planWriters({ devinAvailable: true, agyAvailable: true, anthropicAvailable: true }),
    ['devin', 'agy', 'anthropic']
  );
  assert.deepEqual(
    planWriters({ devinAvailable: false, agyAvailable: false, anthropicAvailable: true }),
    ['anthropic'],
    'in a runner neither CLI exists and the API is the only writer standing'
  );
});

test('writeProse: falls through to anthropic when BOTH CLIs are capped', () => {
  // The measured case, not a hypothetical: the merge-report log shows devin returning "high
  // demand for this model" repeatedly, and agy shares a pool with the review rail.
  const r = writeProse(
    { prompt: 'p', evidence: {} },
    {
      devin: failWriter('capped'),
      agy: failWriter('capped'),
      anthropic: okWriter(CLEAN),
      has: () => true,
      apiKey: 'sk-ant-test',
      warn: silent,
    }
  );
  assert.equal(r.ok, true);
  assert.equal(r.writer, 'anthropic');
});

test('writeProse: a missing API key means UNAVAILABLE, not a failed attempt', () => {
  // "I could not check" and "I tried and it broke" are different facts. Claiming availability
  // without a key would spend an attempt plus a retry on a guaranteed 401.
  assert.deepEqual(
    planWriters({ devinAvailable: false, agyAvailable: false, anthropicAvailable: false }),
    [],
    'no key on a laptop is the normal state, and it must read as absent'
  );
  const r = writeProse(
    { prompt: 'p', evidence: {} },
    {
      anthropic: () => assert.fail('must not call the API without a key'),
      // curl is present, the CLIs are not — the runner case, minus the key.
      has: (cmd) => cmd === 'curl',
      apiKey: undefined,
      warn: silent,
    }
  );
  assert.equal(r.ok, false);
  assert.equal(r.error, 'no prose writer available');
});

test('buildAnthropicRequest: generous max_tokens, because thinking shares the budget', () => {
  // Thinking is ON BY DEFAULT on Opus 5 and max_tokens caps thinking + visible text TOGETHER.
  // Sizing this to the ~60-word output would spend the whole budget on thinking and return a
  // truncated draft or none at all.
  const body = buildAnthropicRequest({ prompt: 'write it' });
  assert.equal(body.model, ANTHROPIC_MODEL);
  assert.ok(body.max_tokens >= 4096, 'must leave thinking headroom, not just room for the prose');
  assert.deepEqual(body.messages, [{ role: 'user', content: 'write it' }]);
});

test('parseAnthropicResponse: collects text blocks BY TYPE, never by index', () => {
  // The regression this exists for: with thinking on, content[0] is a thinking block whose text is
  // empty by default, so `content[0].text` yields '' and the guard checks an empty string.
  const r = parseAnthropicResponse(
    JSON.stringify({
      model: 'claude-opus-5',
      stop_reason: 'end_turn',
      content: [
        { type: 'thinking', thinking: '' },
        { type: 'text', text: 'The rail now writes ' },
        { type: 'text', text: 'without a laptop.' },
      ],
    })
  );
  assert.equal(r.ok, true);
  assert.equal(r.text, 'The rail now writes without a laptop.');
  assert.equal(r.model, 'claude-opus-5', 'the model is reported so the banner names what actually wrote it');
});

test('parseAnthropicResponse: a REFUSAL is a failure, not an empty success', () => {
  // Refusals return HTTP 200, so anything checking only curl's exit code reads this as a good
  // response that happens to have no words in it.
  const r = parseAnthropicResponse(
    JSON.stringify({ stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [] })
  );
  assert.equal(r.ok, false);
  assert.equal(r.retryable, false, 'the same prompt will be refused again');
  assert.match(r.error, /declined/);
});

test('parseAnthropicResponse: retryable is DERIVED from the error type, never assumed', () => {
  const overloaded = parseAnthropicResponse(
    JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'busy' } })
  );
  assert.equal(overloaded.ok, false);
  assert.equal(overloaded.retryable, true, 'transient — worth the one retry the rail already gives');

  const auth = parseAnthropicResponse(
    JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'bad key' } })
  );
  assert.equal(auth.ok, false);
  assert.equal(auth.retryable, false, 'a bad key is not fixed by asking again — fall through instead');
});

test('parseAnthropicResponse: an empty or non-JSON body fails, never returns an empty draft', () => {
  for (const body of ['', '   ', '<html>502 Bad Gateway</html>']) {
    const r = parseAnthropicResponse(body);
    assert.equal(r.ok, false, `must not read ${JSON.stringify(body)} as a draft`);
    assert.equal(r.text, '');
    assert.equal(r.retryable, true);
  }
});

test('parseAnthropicResponse: a structurally-valid response with no prose is a failure', () => {
  // The budget-accident case: thinking consumed max_tokens and no text block was ever emitted.
  const r = parseAnthropicResponse(
    JSON.stringify({ stop_reason: 'max_tokens', content: [{ type: 'thinking', thinking: '' }] })
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /max_tokens/);
});

test('draftWithAnthropic: the API key never appears in argv', () => {
  // argv is world-readable via `ps`. The key rides a 0600 config file instead — and note curl does
  // NOT expand $VAR inside a header value, so an env var is not an option on this path.
  let argv;
  const r = draftWithAnthropic('p', {
    apiKey: 'sk-ant-supersecret',
    run: (_cmd, args) => {
      argv = args;
      return { stdout: JSON.stringify({ content: [{ type: 'text', text: CLEAN }] }) };
    },
  });
  assert.equal(r.ok, true);
  assert.ok(!argv.some((a) => a.includes('sk-ant-supersecret')), 'the key must not be in argv');
  assert.deepEqual(argv[0], '--config');
});

test('draftWithAnthropic: no key is an honest, NON-retryable failure and never spawns curl', () => {
  const r = draftWithAnthropic('p', {
    apiKey: '',
    run: () => assert.fail('must not spawn curl without a key'),
  });
  assert.equal(r.ok, false);
  assert.equal(r.retryable, false);
  assert.match(r.error, /ANTHROPIC_API_KEY/);
});

test('draftWithAnthropic: a key with a newline is rejected before it can break the config file', () => {
  // `jq -r` appending a trailing newline to a piped secret has bitten this repo before. A key that
  // breaks out of the config file's quoting must fail loudly, not send a mangled request.
  const r = draftWithAnthropic('p', {
    apiKey: 'sk-ant-abc\n',
    run: () => assert.fail('must not spawn curl with a malformed key'),
  });
  assert.equal(r.ok, false);
  assert.equal(r.retryable, false);
});
