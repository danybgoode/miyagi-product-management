#!/usr/bin/env node
// codex-doctor.mjs — diagnose why the Codex CLI can't run, and name the exact fix.
//
// WHY: `codex` is the DEFAULT cross-agent reviewer (scripts/cross-review.mjs), but it fails in three
// operator-fixable ways that otherwise surface as an opaque `codex exec failed …` and force a manual
// `--agent antigravity`. This makes the diagnosis executable — the agent that hits a codex failure runs
// this and learns which of the three it is:
//
//   node scripts/codex-doctor.mjs        # diagnose: present? version? a live `codex exec` probe → class
//
// The three recoverable classes (all confirmed live 2026-07-20 against codex-cli 0.142.5):
//   • auth-lapsed  — token expired/revoked. Fix: `codex login`.
//   • cli-outdated — the installed CLI is too old for the model it runs (its own default, or CODEX_MODEL):
//                    "The 'gpt-5.6-sol' model requires a newer version of Codex." Fix: upgrade codex
//                    (`npm install -g @openai/codex@latest`, or your install channel), OR set
//                    CODEX_MODEL to a model the INSTALLED codex supports as a stopgap (`codex exec -m …`).
//   • missing      — codex not on PATH. Fix: install it.
// Plus 'broken' (a non-auth/non-stale exec error — surfaced verbatim, not masked) and 'ok'.
//
// UNLIKE agy-doctor there is NO --fix: codex is not version-PINNED in the repo (nothing to bump), and
// upgrading a global binary is an environment-specific system mutation this script deliberately won't run
// on its own (same stance agy-doctor takes toward the agy binary itself). It DIAGNOSES and names the fix.
// The runtime already self-heals both recoverable classes by auto-falling-back to Antigravity
// (runWithCodexFallback) — this script is for when you want codex ITSELF back.
//
// NOT wired into a cloud routine (deliberate): a routine sandbox has no codex binary/auth, so codex drift
// can only be observed on a machine where codex runs — the same reason cross-review is local-only.
//
// Zero npm deps — Node 18+. Pure decision logic exported for node:test (isMain-guarded, per LEARNINGS).

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { isCodexAuthError, isCodexOutdated, CODEX_MODEL } from './lib/cross-agent-cli.mjs';

// ── Pure decision core (the unit under test) ─────────────────────────────────────────────────────────
// Given the observed facts, decide ONE action. `probe` is the classified result of a live `codex exec`:
//   'ok'       — real stdout, exit 0.
//   'auth'     — non-zero + an auth-lapse signal (isCodexAuthError).
//   'outdated' — non-zero + a stale-CLI signal (isCodexOutdated).
//   'error'    — non-zero for some other reason (surfaced verbatim, never masked).
//   'skipped'  — not probed (binary missing).
export function decideCodexDoctorAction({ present, probe }) {
  if (!present) return { action: 'missing', note: 'codex is not on PATH.' };
  switch (probe) {
    case 'ok':
      return { action: 'ok', note: 'a live `codex exec` probe returned real output.' };
    case 'auth':
      return { action: 'auth-lapsed', note: 'codex is installed but its token has lapsed/was revoked.' };
    case 'outdated':
      return { action: 'cli-outdated', note: 'the installed codex is too old for the model it runs.' };
    default:
      return { action: 'broken', note: 'a live `codex exec` probe failed for a non-auth, non-stale reason.' };
  }
}

// Human-readable remediation per action — kept beside the decision so the message and the classification
// can't drift. `ctx` carries the observed version + the CODEX_MODEL escape-hatch state.
export function remediation(action, ctx = {}) {
  const model = ctx.codexModel ? `CODEX_MODEL="${ctx.codexModel}"` : 'CODEX_MODEL (unset — codex uses its own default model)';
  switch (action) {
    case 'ok':
      return null;
    case 'missing':
      return 'Install the Codex CLI (e.g. `npm install -g @openai/codex`), then `codex login`.';
    case 'auth-lapsed':
      return 'Restore the token: `codex login`. (The cross-review runtime already auto-falls-back to Antigravity meanwhile.)';
    case 'cli-outdated':
      return [
        'The installed codex is behind its model requirement. Either:',
        '  1. Upgrade the CLI: `npm install -g @openai/codex@latest` (or your install channel), OR',
        `  2. Stopgap — pin a model the installed CLI supports: set CODEX_MODEL to a listed model so`,
        '     cross-review runs `codex exec -m <model>`. Currently ' + model + '.',
        'Until then, cross-review auto-falls-back to Antigravity on its own.',
      ].join('\n');
    default:
      return 'Non-auth, non-stale codex error — read the probe stderr above; not an auto-diagnosable class.';
  }
}

// ── I/O (thin — the decision core above is what tests exercise) ───────────────────────────────────────
function codex(args, input) {
  return spawnSync('codex', args, { encoding: 'utf8', input: input ?? '', maxBuffer: 16 * 1024 * 1024 });
}

function observe() {
  const ver = codex(['--version']);
  if (ver.error) return { present: false, version: null, probe: 'skipped', probeStderr: '' };
  const version = (((ver.stdout || '') + (ver.stderr || '')).match(/\d+\.\d+\.\d+/) || [null])[0];
  // One real, minimal `codex exec` — the same call cross-review makes (respecting CODEX_MODEL), so the
  // probe sees exactly what the reviewer would. A tiny prompt keeps the token/CLI-version check cheap.
  const args = CODEX_MODEL ? ['exec', '-m', CODEX_MODEL, 'Reply with exactly: OK'] : ['exec', 'Reply with exactly: OK'];
  const r = codex(args, '');
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  let probe;
  if (r.status === 0 && (r.stdout || '').trim()) probe = 'ok';
  else if (isCodexOutdated(out)) probe = 'outdated';
  else if (isCodexAuthError(out)) probe = 'auth';
  else probe = 'error';
  return { present: true, version, probe, probeStderr: (r.stderr || '').trim() };
}

async function main() {
  const obs = observe();
  const { action, note } = decideCodexDoctorAction(obs);
  const line = (s) => process.stdout.write(`${s}\n`);

  line(`codex-doctor — ${obs.present ? `installed ${obs.version || '(unparsed version)'}` : 'NOT INSTALLED'} · CODEX_MODEL ${CODEX_MODEL ? `="${CODEX_MODEL}"` : 'unset'}`);
  if (obs.present) line(`live probe: ${obs.probe}`);
  line(`  → ${note}`);

  const fix = remediation(action, { codexModel: CODEX_MODEL });
  if (action === 'ok') {
    line('✓ codex is healthy — no fallback needed.');
    return;
  }
  if (obs.probe === 'error' && obs.probeStderr) {
    line('  probe stderr (tail):');
    line('    ' + obs.probeStderr.split('\n').slice(-3).join('\n    '));
  }
  line('✗ ' + action + ':');
  line(fix.split('\n').map((l) => '  ' + l).join('\n'));
  process.exitCode = 1;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) await main();
