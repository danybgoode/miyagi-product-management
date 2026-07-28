// prose-writer.mjs — the one rail every LOCAL prose surface in this repo writes through.
//
// PORTED from ~/dobby/golden-beans/scripts/lib/prose-writer.mjs (2026-07-26). What is NOT ported:
// golden-beans carries its own devin/agy spawn code because it is a separate repo. We already have
// that plumbing in `scripts/lib/cross-agent-cli.mjs`, so this file is a THIN adapter over it — a
// second spawn path would be a second place for the argv cap, the empty-output contract and the
// agy version pin to drift (sprint-1 build contract).
//
// Scope note (README D1): this is the LOCAL backend. A Claude Routine has no local CLI credentials
// — `hasCmd` returns false for both writers inside the routine sandbox — so the routines write
// their prose in-context and call the same pure guard as a separate `--post` step (D2). The guard,
// the persona and the lessons file are shared by both backends; only this writer is local-only.
//
// ── The router (README D1, and Daniel's call at golden-beans, 2026-07-26) ──────────────────────
// **Devin is the DEDICATED prose writer; agy on `gpt-oss-120b-medium` is the fallback.**
//
// This is a division of LABOUR, not a ranking. Codex and agy are the primary code reviewers and the
// builders lean on them, so their quota is the scarce resource — and this repo has already had the
// cross-family review layer go fully dark mid-epic when codex and agy were capped in the same
// session (2026-07-24, the reason devin was installed at all). Devin was added as a third review
// seat and sits mostly idle. Giving devin prose outright keeps the review quota free.
//
// The fallback is not decoration: agy carries a genuinely separate quota pool, and this repo has
// already been bitten by a single-provider rail going quiet mid-session (LEARNINGS — wire the
// fallback to the CONDITION, not to one of its signatures).
//
// ── PROSE_MODEL: one model, and deliberately not a Gemini one ──────────────────────────────────
// `gemini-3.5-flash-high` was `prose-draft.mjs`'s default until this sprint. That is the EXACT
// constant golden-beans identified as having silently destroyed the register of every report it
// wrote: the drafts people accepted had come from GPT-OSS, on the occasions Gemini's quota was
// exhausted and the pair fell through. The router was blamed and briefly reversed; the router was
// never the problem. The fix belongs in the model constant, so:
//   • ONE model. No model-level fallback, because a silent fall-through between two models with
//     materially different registers is a change of voice that nothing records.
//   • NOT a Gemini slug. If a future reader is about to "restore the fallback for resilience":
//     resilience already exists at the WRITER level (devin → agy, two separate quota pools). A
//     second model inside the agy path buys nothing and costs the register.
//
// ── Guard-and-retry, not guard-and-fail (README D3) ───────────────────────────────────────────
// Every draft, from either writer, goes through the pure `prose-guard` checks. A rejected draft is
// not discarded — the findings are handed back as a numbered revision note and the writer tries
// again. Only after that does a draft reach a human, and it arrives labelled with which writer and
// which model produced it and whether the guard passed it clean. A flagged report a human can
// correct beats a missing one.

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProse, findingsToRevisionNote } from './prose-guard.mjs';
import {
  runAntigravity,
  runDevin,
  hasCmd,
  loadPromptBody,
  AGY_ARG_LIMIT,
} from './cross-agent-cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..');
export const LESSONS_PATH = join(SCRIPTS_DIR, 'prose-lessons.md');
export const PROSE_DIR = join(SCRIPTS_DIR, 'prose');
export const PERSONA_PATH = join(PROSE_DIR, 'cpo-persona.md');

/** Per-surface task files (README D5). Plain files so both backends read the same words. */
export const SURFACES = ['standup', 'weekly', 'internal'];

// Env-overridable so a diagnosis run can pin a different model deliberately and visibly. That is a
// different thing from a hardcoded second model nobody notices firing — see the header.
export const PROSE_MODEL = process.env.PROSE_MODEL || 'gpt-oss-120b-medium';

/**
 * The accumulating lessons file, injected into every prompt on BOTH backends.
 *
 * This is the "it improves as we go" mechanism, and it is deliberately a PLAIN MARKDOWN FILE in the
 * repo rather than a model-side tuning artifact or a local CLI rule blob. Three reasons: it is
 * reviewable in a diff, it applies to whichever writer is on duty, and it survives a machine change
 * (D5 — `devin rules` would bind the specialization to one laptop).
 *
 * Not `loadPromptBody`: that one `die()`s on a missing or empty file, which is right for a prompt
 * the run cannot proceed without. An absent lessons file is a legitimate state (a fresh clone, a
 * deliberate reset) and must degrade to "no lessons", never kill a report.
 */
export function loadLessons(deps = {}) {
  const { read = readFileSync, exists = existsSync, path = LESSONS_PATH } = deps;
  if (!exists(path)) return '';
  const raw = read(path, 'utf8');
  const cut = raw.indexOf('\n---\n');
  return (cut === -1 ? raw : raw.slice(cut + 5)).trim();
}

/** The shared CPO register (D5). Fatal if missing — a report without the persona is not the artifact. */
export function loadPersona(load = loadPromptBody) {
  return load(PERSONA_PATH);
}

/** The per-surface task block (D5): audience, altitude, length budget, what "done" looks like. */
export function loadTask(surface, load = loadPromptBody) {
  return load(join(PROSE_DIR, `${surface}.task.md`));
}

/** Assemble the full writer prompt: house style → accumulated lessons → the task and its data. */
export function buildWriterPrompt({ style, lessons, task }) {
  const parts = [String(style).trim()];
  if (lessons) {
    parts.push(
      '\n\n## Lessons from previous drafts — these are corrections, apply every one\n\n' +
        'Each line below is a mistake a previous draft actually made and a human had to catch.\n\n' +
        lessons
    );
  }
  parts.push(`\n\n${String(task).trim()}\n`);
  return parts.join('');
}

// ── Writers ─────────────────────────────────────────────────────────────────────────────────
//
// SIGNATURE ADAPTATION, and it is the one thing to get right in this file. golden-beans' runners
// return `{ ok, text, error }`. OUR `runDevin`/`runAntigravity` (cross-agent-cli.mjs) return a
// STRING, or `null` when passed `{ soft: true }` — and without `soft` they `die()` the process.
// So: always pass `soft: true`, and treat a FALSY return as failure. Reading a falsy return as
// success would make every capped, unauthenticated or crashed writer look like a clean draft, and
// the guard would then be checking an empty string.

/**
 * Draft with devin. `runDevin` already rides `--prompt-file`, so there is no argv cap on this path
 * — which is why devin leads on the standup/weekly surfaces that feed in a lot of source material.
 *
 * `retryable: true` unconditionally, and that is a DELIBERATE deviation from golden-beans. Its
 * runner distinguishes "exit 0, empty stdout" (a measured transient, worth one retry) from a hard
 * spawn/exit failure; ours collapses every failure to `null` with the reason printed to stderr and
 * lost to the caller. Given `planWriters` has already confirmed the binary exists, what remains —
 * a quota cap, an auth lapse, a transient empty response — all surface here as exit-0-with-nothing
 * or a non-zero exit, and all are plausibly transient. A genuine outage still fails the second
 * attempt and demotes as before, so this costs one extra spawn on a real break and preserves the
 * measured fix. The alternative (never retry) throws away the better writer for a hiccup.
 */
export function draftWithDevin(prompt, deps = {}) {
  const { run = runDevin } = deps;
  const text = run(prompt, { soft: true });
  return text
    ? { ok: true, text: String(text).trim(), model: 'devin' }
    : {
        ok: false,
        text: '',
        model: 'devin',
        error: 'devin returned no output (quota cap, auth lapse, or a transient empty response)',
        retryable: true,
      };
}

/**
 * Draft with agy on the single prose model.
 *
 * The argv cap is checked HERE rather than left to `runAntigravity`, for one reason: it must be
 * marked non-retryable. A second identical attempt cannot shrink the prompt, so retrying it is pure
 * latency — and worse, it delays the fall-through to devin, which has no cap at all and would have
 * succeeded.
 *
 * No `onModel` callback (golden-beans has one) because there is nothing to report: the model chain
 * is one entry long, so the model that answered is `PROSE_MODEL` by construction. That is a
 * property of the single-model policy above — if anyone re-adds a second model, this attribution
 * silently starts lying, which is the second reason the policy is worth keeping.
 */
export function draftWithAgy(prompt, deps = {}) {
  const { run = runAntigravity, limit = AGY_ARG_LIMIT } = deps;
  if (Buffer.byteLength(prompt, 'utf8') > limit) {
    return {
      ok: false,
      text: '',
      model: PROSE_MODEL,
      error: `prompt exceeds agy's argv cap (${Math.round(limit / 1024)} KB) — agy takes the prompt in argv, not stdin`,
      retryable: false,
    };
  }
  const text = run(prompt, { models: [PROSE_MODEL], soft: true });
  return text
    ? { ok: true, text: String(text).trim(), model: PROSE_MODEL }
    : {
        ok: false,
        text: '',
        model: PROSE_MODEL,
        error: `agy returned no output for "${PROSE_MODEL}" (likely a quota cap)`,
        retryable: true,
      };
}

// ── The HEADLESS writer (2026-07) ──────────────────────────────────────────────────────────────
//
// devin and agy are interactive CLIs with no headless auth — `hasCmd` returns false for both in a
// GitHub Actions runner and in the Claude Routine sandbox, which is why README D1 gave routines an
// in-context path instead. That left the merge report stranded on a git hook, and a hook is a worse
// trigger than it looks: it only fires on the machine that PULLS, so a squash-merge nobody pulls is
// never reported at all, and in a linked worktree the hook cannot even write its log.
//
// This backend closes that gap: the Anthropic API authenticates with an env var, so it works in a
// runner. It sits LAST in the router, which gives exactly the right behaviour from one ordered list
// — locally the already-paid CLI quota wins, and in CI (where neither binary exists) this is the
// only writer standing. It is also a genuine third quota pool for the local rail, which the
// merge-report log says we need: devin returned "high demand for this model" on 6 of 25 runs.
//
// ── Why curl+spawnSync and not fetch ───────────────────────────────────────────────────────────
// `writeProse` is SYNCHRONOUS by contract, because devin/agy are `spawnSync`. Making it async to
// accommodate one writer would ripple through both callers and all 22 existing tests for no gain in
// behaviour. Shelling out keeps ONE runner contract — "spawn something, get text or null" — and
// curl is present on ubuntu-latest and macOS alike. The seam stays pure where it matters: building
// the request and parsing the response are pure functions with their own tests; only the spawn is
// I/O. Zero npm deps either way (AGENTS rule 4), which also rules out the Anthropic SDK.

/** Env-overridable so a diagnosis run can pin a model deliberately and visibly — same rationale as
 * PROSE_MODEL above. Opus 5 is the default: a report Daniel reads as status is worth the good
 * model, and these are ~60-word outputs, so the per-run cost is negligible. */
export const ANTHROPIC_MODEL = process.env.PROSE_ANTHROPIC_MODEL || 'claude-opus-5';

/** Thinking is ON BY DEFAULT on Opus 5, and `max_tokens` caps thinking + visible text TOGETHER.
 * A 60-word report needs ~100 tokens of prose, so a naive `max_tokens: 256` would be spent on
 * thinking and return a truncated draft or none at all. This is deliberately generous headroom for
 * a short output — the cap is a safety rail, not a length control (the word limit lives in the
 * task file, where the guard can also see it). */
export const ANTHROPIC_MAX_TOKENS = 8192;

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/**
 * PURE — the request body. Separated so the model, the token ceiling and the effort level are
 * pinned by a test rather than by reading the spawn below.
 *
 * `effort: medium` because register is the whole point of this rail: the epic exists because a
 * cheap model silently destroyed the voice of every report it wrote (see the PROSE_MODEL note).
 * `low` is for work where only the answer matters; here the phrasing IS the answer.
 */
export function buildAnthropicRequest({ prompt, model = ANTHROPIC_MODEL, maxTokens = ANTHROPIC_MAX_TOKENS }) {
  return {
    model,
    max_tokens: maxTokens,
    output_config: { effort: 'medium' },
    messages: [{ role: 'user', content: String(prompt) }],
  };
}

/**
 * PURE — turn raw stdout into the runner contract `{ ok, text, model, error, retryable }`.
 *
 * Three things here are load-bearing, and all three are the "three states, never two" rule:
 *
 * 1. **Collect text blocks by TYPE, never by index.** `content[0]` is not the answer — with
 *    thinking on, the first block is a `thinking` block whose text is empty by default. Indexing
 *    would hand the guard an empty string and call it a clean draft.
 * 2. **A refusal is a failure, not an empty success.** `stop_reason: "refusal"` returns HTTP 200,
 *    so anything checking only the exit code reads it as a good response with no words in it.
 * 3. **Retryable is derived, not assumed.** `overloaded_error` / `api_error` / `rate_limit_error`
 *    are transient and worth the one retry the rail already gives; `invalid_request_error` and
 *    `authentication_error` are not, and retrying them just delays the fallback.
 */
export function parseAnthropicResponse(raw) {
  const fail = (error, retryable) => ({ ok: false, text: '', model: ANTHROPIC_MODEL, error, retryable });

  const body = String(raw ?? '').trim();
  if (!body) return fail('anthropic returned no output (network failure or a killed curl)', true);

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    // Not JSON at all — a proxy error page, a truncated body, a curl diagnostic. Transient enough
    // to retry once; a real outage still fails the second attempt and demotes.
    return fail(`anthropic returned a non-JSON body: ${body.slice(0, 200)}`, true);
  }

  if (json?.type === 'error') {
    const kind = json.error?.type || 'unknown_error';
    const retryable = ['overloaded_error', 'api_error', 'rate_limit_error'].includes(kind);
    return fail(`anthropic ${kind}: ${json.error?.message || 'no message'}`, retryable);
  }

  if (json?.stop_reason === 'refusal') {
    return fail(`anthropic declined the request (${json.stop_details?.category ?? 'no category'})`, false);
  }

  const text = (Array.isArray(json?.content) ? json.content : [])
    .filter((b) => b?.type === 'text')
    .map((b) => String(b.text ?? ''))
    .join('')
    .trim();

  if (!text) {
    // Reached only when the response is structurally fine but carries no prose — e.g. the whole
    // budget went to thinking and stop_reason is max_tokens. Retryable: it is a budget accident,
    // not a broken writer.
    return fail(`anthropic returned no text (stop_reason: ${json?.stop_reason ?? 'unknown'})`, true);
  }

  return { ok: true, text, model: json?.model || ANTHROPIC_MODEL };
}

/**
 * Draft with the Anthropic API over curl. Thin I/O shell — the decisions live in the two pure
 * functions above.
 *
 * The body goes via a TEMP FILE and `--data-binary @file`, not an argv string: prompts here carry
 * the persona, the lessons file and a full evidence pack, which is comfortably past the argv cap
 * that already bites agy (see `draftWithAgy`).
 *
 * The API key goes in a curl CONFIG FILE (`--config`), inside a 0700 temp dir, because argv is
 * world-readable via `ps` on a shared machine. Note curl does NOT expand `$VAR` inside a header
 * value — that is a shell feature, and there is no shell here — so an env var is not an option on
 * this path; the config file is what actually keeps the key off the command line.
 */
export function draftWithAnthropic(prompt, deps = {}) {
  const {
    run = spawnSync,
    apiKey = process.env.ANTHROPIC_API_KEY,
    model = ANTHROPIC_MODEL,
    parse = parseAnthropicResponse,
  } = deps;

  if (!apiKey) {
    return {
      ok: false,
      text: '',
      model,
      error: 'ANTHROPIC_API_KEY is not set',
      retryable: false,
    };
  }

  // A key carrying a quote or newline would break out of the config file's quoting. Real keys are
  // `sk-ant-...` — alphanumerics, dashes, underscores — so this only ever fires on a mangled env
  // var (a stray newline from `jq -r`, say), and failing loudly beats sending a broken request.
  if (/["\r\n]/.test(apiKey)) {
    return { ok: false, text: '', model, error: 'ANTHROPIC_API_KEY contains a quote or newline', retryable: false };
  }

  const dir = mkdtempSync(join(tmpdir(), 'prose-anthropic-'));
  const bodyPath = join(dir, 'request.json');
  const configPath = join(dir, 'curl.conf');
  try {
    writeFileSync(bodyPath, JSON.stringify(buildAnthropicRequest({ prompt, model })));
    writeFileSync(
      configPath,
      [
        'silent',
        'show-error',
        'max-time = 300',
        'request = POST',
        `url = "${ANTHROPIC_URL}"`,
        'header = "content-type: application/json"',
        'header = "anthropic-version: 2023-06-01"',
        `header = "x-api-key: ${apiKey}"`,
        `data-binary = "@${bodyPath}"`,
        '',
      ].join('\n'),
      { mode: 0o600 }
    );
    const r = run('curl', ['--config', configPath], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    if (r.error) return { ok: false, text: '', model, error: `curl failed to spawn: ${r.error.message}`, retryable: true };
    return parse(r.stdout);
  } finally {
    // Always — the config file holds the key in plaintext, so leaving it behind on a thrown
    // exception would be the leak the config file exists to prevent.
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Pure routing decision — which writers to try, in order.
 *
 * Separated from the I/O so the policy is pinned by a test rather than by reading the orchestration
 * below. `preferred` lets a caller force one writer (useful when diagnosing which one produced a
 * bad draft) without editing the rail.
 */
export function planWriters({ devinAvailable, agyAvailable, anthropicAvailable, preferred }) {
  // ORDER IS THE POLICY. Devin first — see the router note at the top of this file. Changing this
  // array changes who writes every report in the repo, so it is the one line to read.
  //
  // Anthropic sits LAST, and that single position covers both environments without a mode flag:
  // locally devin/agy are installed and win (their quota is already paid for), while in a runner
  // neither binary exists and the API is the only writer left. It doubles as a third quota pool
  // for the local rail, which the merge-report log says we need.
  const all = [
    { name: 'devin', available: devinAvailable },
    { name: 'agy', available: agyAvailable },
    { name: 'anthropic', available: anthropicAvailable },
  ];
  if (preferred) {
    const chosen = all.find((w) => w.name === preferred);
    return chosen?.available ? [preferred] : [];
  }
  return all.filter((w) => w.available).map((w) => w.name);
}

/**
 * Write prose: try each available writer, guard every draft, retry once with the findings.
 *
 * Returns `{ ok, text, writer, model, guard, attempts }`. `guard.ok === false` on a returned draft
 * means both passes still tripped a rule — the draft is handed back anyway, WITH its findings,
 * because a flawed draft a human can see and fix beats a hard failure that produces nothing (D3).
 * The caller is responsible for SURFACING `guard` rather than quietly publishing the text.
 */
export function writeProse({ prompt, evidence, preferred }, deps = {}) {
  const {
    devin = draftWithDevin,
    agy = draftWithAgy,
    anthropic = draftWithAnthropic,
    has = hasCmd,
    apiKey = process.env.ANTHROPIC_API_KEY,
    guard = checkProse,
    warn = (m) => process.stderr.write(`${m}\n`),
  } = deps;

  const writers = planWriters({
    devinAvailable: has('devin'),
    agyAvailable: has('agy'),
    // Availability is a KEY plus a transport, not `hasCmd` — there is no `anthropic` binary to
    // look for. Both halves are required: curl is universally present but a missing key is the
    // normal state on a laptop, and claiming availability without one turns a clean "not
    // installed" into a guaranteed failed attempt plus a retry.
    anthropicAvailable: !!apiKey && has('curl'),
    preferred,
  });
  if (writers.length === 0) {
    return {
      ok: false,
      text: '',
      writer: null,
      model: null,
      guard: null,
      attempts: 0,
      error: 'no prose writer available',
    };
  }

  const runners = { devin, agy, anthropic };
  let attempts = 0;
  let best = null;

  for (const name of writers) {
    let currentPrompt = prompt;

    // Two passes per writer: the draft, then one revision against the guard's findings.
    for (let pass = 0; pass < 2; pass++) {
      attempts++;
      let result = runners[name](currentPrompt);

      // ── One retry on a RETRYABLE failure before demoting the writer ──────────────────────────
      // Observed live at golden-beans (2026-07-25): devin returned exit 0 with empty stdout on a
      // 9 KB prompt, and the identical prompt succeeded moments later — a transient, not a broken
      // CLI. Falling straight through to the fallback on that costs the better writer for no
      // reason. A genuine outage still fails on the second attempt and demotes as before, so this
      // buys resilience without hiding a real break. An oversized prompt is NOT retryable: a second
      // identical attempt cannot shrink it.
      if (!result.ok && result.retryable) {
        warn(`⚠ ${name}: ${result.error} — retrying once before falling back.`);
        attempts++;
        result = runners[name](currentPrompt);
      }

      if (!result.ok) {
        warn(`⚠ ${name} failed: ${result.error} — trying the next writer.`);
        break; // a broken writer will not be fixed by a revision note
      }

      const verdict = guard(result.text, evidence);
      if (verdict.ok)
        return {
          ok: true,
          text: result.text,
          writer: name,
          model: result.model ?? name,
          guard: verdict,
          attempts,
        };

      // Keep the LATEST draft as the fallback, not the first. golden-beans' cross-review caught the
      // original `if (!best)` here: it pinned `best` to the pass-0 draft, so when the revision pass
      // also tripped a rule we returned the UNREVISED text and threw away the one written
      // specifically to address the findings. The revision is strictly better informed even when it
      // is still imperfect, and returning the older draft would make the retry pass pure cost.
      best = { text: result.text, writer: name, model: result.model ?? name, guard: verdict };
      warn(`⚠ ${name} draft rejected (${verdict.findings.map((f) => f.code).join(', ')}) — revising.`);
      currentPrompt = `${prompt}\n\n---\n\n## Your previous draft\n\n${result.text}\n\n---\n\n${findingsToRevisionNote(verdict.findings)}`;
    }
  }

  if (best) return { ok: false, ...best, attempts };
  return {
    ok: false,
    text: '',
    writer: null,
    model: null,
    guard: null,
    attempts,
    error: 'every writer failed',
  };
}
