#!/usr/bin/env node
// agy-doctor.mjs — diagnose & self-heal drift between the Antigravity CLI and our pinned contract.
//
// WHY: `agy` is under constant development and its headless print contract has broken on minor bumps
// before (1.0.10 shipped empty reviews for weeks). The shared rail (scripts/lib/cross-agent-cli.mjs)
// therefore PINS the version and FAIL-LOUDS on mismatch — safe, but every agy self-update stalls
// cross-review until a human re-verifies the contract and bumps AGY_PINNED by hand. This script makes
// that re-verification executable, so the agent that hits the pin failure is AUTHORIZED to clear it:
//
//   node scripts/agy-doctor.mjs          # diagnose: version vs pin, help contract, models, live probes
//   node scripts/agy-doctor.mjs --fix    # on clean version drift: bump AGY_PINNED + run the test suite
//
// What --fix will and will NOT do:
//   • WILL bump the pin — only when the installed version differs AND the live contract probe is green
//     (`agy --help` still shows -p/--model, both pinned models still listed by `agy models`, and at
//     least one live `-p`/`--model` probe returns real output). A failed probe still fails loud with
//     what broke — that's the 1.0.10 protection, kept.
//   • WILL NOT swap models. A vanished/renamed pinned model is reported with the current `agy models`
//     list; choosing a reviewer model is a judgment call (edit AGY_MODEL/AGY_FALLBACK_MODEL or set the
//     env overrides). It also never upgrades/downgrades the agy binary itself.
//   • WILL NOT commit or push. After --fix, commit the one-line bump via the normal flow (LOW tier —
//     docs/tooling). A script pushing branches from arbitrary checkouts would recreate the
//     shared-worktree collision class LEARNINGS warns about; agents already own the commit/PR flow.
//
// NOT wired into ops-nightly (deliberate): a cloud routine sandbox has no agy binary and agy has no
// headless auth (the same fact that keeps cross-review local-only), so drift can only be observed —
// and fixed — on a machine where agy runs. The distribution point is checkAgyVersion's own failure
// message, which names this command.
//
// Zero npm deps — Node 21+ (the --fix flow's `node --test 'scripts/lib/*.test.mjs' 'scripts/*.test.mjs'` relies on the test
// runner's own glob expansion under spawnSync(..., {shell:false}), which Node added in 21; below that,
// the literal, unexpanded pattern silently matches nothing). Pure decision logic exported for node:test
// (isMain-guarded, per LEARNINGS).

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { AGY_PINNED, AGY_MODEL, AGY_FALLBACK_MODEL } from './lib/cross-agent-cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIB_PATH = join(__dirname, 'lib', 'cross-agent-cli.mjs');

// ── Pure decision core (the unit under test) ─────────────────────────────────────────────────────────
// Given the observed facts, decide ONE action, most severe first:
//   'contract-broken' — the -p/--model interface itself changed, or agy errored on a live probe, or NO
//                       model produced output. A version bump must NOT be blessed; human re-verify.
//   'model-drift'     — a pinned model is no longer listed by `agy models` (rename/retirement). Reported,
//                       never auto-swapped.
//   'bump'            — version differs from the pin and the full contract probe is green → safe to bump.
//   'quota-warn'      — contract fine (version matches or bump already decided against), but the PRIMARY
//                       model returned empty on the live probe (quota/transient) while the fallback
//                       carried it — exactly the degrade runAntigravity handles; informational.
//   'ok'              — everything matches and probes green.
// `probes` values: 'ok' (real stdout) | 'empty' (exit 0, no output — the quota signature)
//                 | 'unavailable' (non-zero, but the provider said it is busy — see UPSTREAM_UNAVAILABLE)
//                 | 'error'
// (non-zero exit) | 'skipped'.
/**
 * Provider-side "busy, try later" signatures.
 *
 * 🚨 WHY THIS EXISTS. `agy -p … --model gpt-oss-120b-medium` began exiting 1 with
 * "Our servers are experiencing high traffic right now, please try again in a
 * minute." The probe classified any non-zero exit as 'error', 'error' means
 * "the interface changed", and that verdict refuses to bump the pin — so a
 * TRANSIENT CAPACITY BLIP ON ONE MODEL took the whole agy review family offline
 * and kept it there. Observed live 2026-08-19: the epic's cross-family pass ran
 * with two families instead of three for exactly this reason.
 *
 * The interface was never broken: `--help` still showed the print contract, both
 * slugs were still listed by `agy models`, and the primary model answered fine.
 * Three states were not enough — "I could not reach it" is not "it changed", and
 * collapsing them is the same mistake this codebase keeps recording.
 *
 * Kept deliberately NARROW. Anything that does not match stays 'error', so an
 * unrecognized flag or an unknown model slug — which also exit non-zero — still
 * break the contract loudly. A guard that swallowed every failure would be worse
 * than the bug it fixes.
 */
export const UPSTREAM_UNAVAILABLE = [
  /experiencing high traffic/i,
  /please try again/i,
  /server is busy/i,
  /temporarily unavailable/i,
  /\b(?:429|503)\b/,
  /rate.?limit/i,
  /overloaded/i,
];

/** Whether a non-zero probe was the provider being busy rather than the CLI changing. */
export function isUpstreamUnavailable(output) {
  const text = String(output || '');
  return UPSTREAM_UNAVAILABLE.some((re) => re.test(text));
}

export function decideDoctorAction({ installed, pinned, helpOk, primaryListed, fallbackListed, probes }) {
  const notes = [];
  if (!installed) return { action: 'contract-broken', notes: ['`agy --version` output didn\'t contain a parseable X.Y.Z — a version this blind cannot be bumped (would write the literal string "null" as the pin).'] };
  if (!helpOk) return { action: 'contract-broken', notes: ['`agy --help` no longer shows the -p/--model print contract.'] };
  if (probes.primary === 'error' || probes.fallback === 'error')
    return { action: 'contract-broken', notes: ['a live `agy -p … --model …` probe exited non-zero (not the quota signature — a real interface error).'] };
  // 'unavailable' is the provider being busy, NOT the interface changing — so it
  // must never break the contract on its own. But a version whose ONLY evidence
  // is two unreachable models has not been demonstrated to work, so that pairing
  // is still not blessable.
  const blind = (p) => p === 'empty' || p === 'unavailable';
  if (blind(probes.primary) && blind(probes.fallback))
    return { action: 'contract-broken', notes: ['NEITHER model produced output on the live probe (quota exhaustion and/or provider capacity) — a version this blind cannot be blessed; re-run later or re-verify by hand.'] };
  if (!primaryListed || !fallbackListed) {
    const missing = [!primaryListed && 'AGY_MODEL', !fallbackListed && 'AGY_FALLBACK_MODEL'].filter(Boolean);
    return { action: 'model-drift', notes: [`${missing.join(' and ')} no longer listed by \`agy models\` — pick a replacement (env override or edit the constant); not auto-swapped.`] };
  }
  if (probes.primary === 'empty') notes.push('the primary model returned empty on the live probe (quota/transient) — the fallback carried it.');
  if (probes.primary === 'unavailable') notes.push('the primary model reported provider capacity trouble — the fallback carried it. Not an interface problem.');
  if (probes.fallback === 'unavailable') notes.push('the FALLBACK model reported provider capacity trouble. The primary answered, so the contract is intact — but the second quota pool is unavailable right now, which is the whole point of having one. Re-check before relying on it.');
  if (installed !== pinned) return { action: 'bump', notes };
  if (notes.length) return { action: 'quota-warn', notes };
  return { action: 'ok', notes };
}

// Pure string transform: rewrite the AGY_PINNED constant + the doctor-managed "last verified" marker
// line in the lib source. Throws (never half-writes) if either anchor is missing or ambiguous.
export function bumpPinnedSource(source, newVersion, date) {
  const pinRe = /^export const AGY_PINNED = '[^']+';$/m;
  const markerRe = /^\/\/ agy-doctor: last verified [0-9-]+ against \S+\.$/m;
  if (!pinRe.test(source)) throw new Error('AGY_PINNED constant line not found — lib shape changed, bump by hand.');
  if (!markerRe.test(source)) throw new Error('agy-doctor marker line not found — lib shape changed, bump by hand.');
  return source
    .replace(pinRe, `export const AGY_PINNED = '${newVersion}';`)
    .replace(markerRe, `// agy-doctor: last verified ${date} against ${newVersion}.`);
}

// agy 1.1.11 changed `agy models` from one slug per line to tabular
// "slug<TAB>display name" rows. Compare the first field only; comparing the whole
// display row produces a false model-drift result even while both live probes pass.
export function parseAgyModelSlugs(output) {
  return String(output ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^fetching available models/i.test(line))
    // 1.1.11 rows are tab-separated. Legacy output is one complete slug per
    // line. Never take the first whitespace word from prose: a status line
    // such as "gemini-… is unavailable" must not prove that model is listed.
    .flatMap((line) => {
      const tab = line.indexOf('\t');
      const candidate = tab === -1 ? line : line.slice(0, tab).trim();
      // A tab is the 1.1.11 row boundary, so its first field may be a simple
      // alphabetic slug. A legacy bare line has no structural marker: require
      // model-ID punctuation/digits so arbitrary prose cannot prove a listing.
      const valid = tab === -1
        ? /^(?=.*[0-9._:/-])[a-z0-9][a-z0-9._:/-]*$/.test(candidate)
        : /^[a-z0-9][a-z0-9._:/-]*$/.test(candidate);
      return valid ? [candidate] : [];
    });
}

// ── I/O helpers (thin, injectable-free — the decision core above is what tests exercise) ─────────────
function agy(args, input) {
  return spawnSync('agy', args, { encoding: 'utf8', input: input ?? '', maxBuffer: 16 * 1024 * 1024 });
}

function observe() {
  const ver = agy(['--version']);
  if (ver.error) {
    process.stderr.write('✗ agy not found on PATH — install the Antigravity CLI first.\n');
    process.exit(1);
  }
  const installed = (((ver.stdout || '') + (ver.stderr || '')).match(/\d+\.\d+\.\d+/) || [null])[0];
  // agy prints --help to STDERR (confirmed live 1.0.16) — read both streams for robustness.
  const helpR = agy(['--help']);
  const help = (helpR.stdout || '') + (helpR.stderr || '');
  const helpOk = /^\s*-p\b/m.test(help) && /--model\b/.test(help);
  const modelsR = agy(['models']);
  const modelsOutput = (modelsR.stdout || '') + (modelsR.stderr || '');
  const models = modelsOutput.split('\n').map((l) => l.trim()).filter(Boolean);
  const modelSlugs = parseAgyModelSlugs(modelsOutput);
  const probe = (model) => {
    const r = agy(['-p', 'Reply with exactly: OK', '--model', model]);
    // A non-zero exit is an interface break ONLY if the provider did not just say
    // it was busy. See `UPSTREAM_UNAVAILABLE` for the incident this distinction
    // comes from.
    if (r.status !== 0) {
      return isUpstreamUnavailable((r.stdout || '') + (r.stderr || '')) ? 'unavailable' : 'error';
    }
    return (r.stdout || '').trim() ? 'ok' : 'empty';
  };
  const probes = { primary: probe(AGY_MODEL), fallback: 'skipped' };
  // Probe the fallback only when needed for the decision (primary empty/error, or a version bump needs
  // the fuller picture) — each probe is a real model call.
  if (probes.primary !== 'ok' || installed !== AGY_PINNED) probes.fallback = probe(AGY_FALLBACK_MODEL);
  return {
    installed,
    pinned: AGY_PINNED,
    helpOk,
    primaryListed: modelSlugs.includes(AGY_MODEL),
    fallbackListed: modelSlugs.includes(AGY_FALLBACK_MODEL),
    models,
    probes,
  };
}

async function main() {
  const fix = process.argv.includes('--fix');
  const obs = observe();
  // 'skipped' → 'ok' is safe BY CONSTRUCTION, not convention: observe() skips the fallback probe only
  // when the primary probed 'ok' AND installed === pinned — and with installed === pinned the decision
  // can never reach 'bump', so a bump is never blessed on an unprobed fallback. (If observe()'s skip
  // condition ever changes, revisit this substitution.)
  const decision = decideDoctorAction({
    ...obs,
    probes: { primary: obs.probes.primary, fallback: obs.probes.fallback === 'skipped' ? 'ok' : obs.probes.fallback },
  });

  const line = (s) => process.stdout.write(`${s}\n`);
  line(`agy-doctor — installed ${obs.installed} · pinned ${obs.pinned} · help contract ${obs.helpOk ? 'ok' : 'BROKEN'}`);
  line(`models: primary ${obs.primaryListed ? 'listed' : 'MISSING'} ("${AGY_MODEL}") · fallback ${obs.fallbackListed ? 'listed' : 'MISSING'} ("${AGY_FALLBACK_MODEL}")`);
  line(`live probe: primary ${obs.probes.primary} · fallback ${obs.probes.fallback}`);
  for (const n of decision.notes) line(`  note: ${n}`);

  switch (decision.action) {
    case 'ok':
      line('✓ no drift — pin, models, and print contract all verified live.');
      return;
    case 'quota-warn':
      line('✓ no drift (transient primary-model quota noted above — runAntigravity degrades to the fallback on its own).');
      return;
    case 'model-drift':
      line(`✗ model drift. Current \`agy models\`:\n  ${obs.models.join('\n  ')}`);
      line('Pick a replacement: set AGY_MODEL / AGY_FALLBACK_MODEL env, or edit the constants in scripts/lib/cross-agent-cli.mjs. Not auto-fixed (judgment call).');
      process.exitCode = 1;
      return;
    case 'contract-broken':
      line('✗ contract broken — do NOT bump the pin. Re-verify `agy -p "<prompt>" --model "<model>"` by hand against `agy --help`.');
      process.exitCode = 1;
      return;
    case 'bump': {
      if (!fix) {
        line(`→ version drift with a GREEN contract probe: safe to bump. Run \`node scripts/agy-doctor.mjs --fix\` to update AGY_PINNED ${obs.pinned} → ${obs.installed}.`);
        return;
      }
      const src = readFileSync(LIB_PATH, 'utf8');
      const today = new Date().toISOString().slice(0, 10);
      writeFileSync(LIB_PATH, bumpPinnedSource(src, obs.installed, today));
      line(`✓ AGY_PINNED bumped ${obs.pinned} → ${obs.installed} (probe green; marker dated ${today}).`);
      const t = spawnSync('node', ['--test', 'scripts/lib/*.test.mjs', 'scripts/*.test.mjs'], {
        encoding: 'utf8', cwd: resolve(__dirname, '..'), shell: false,
      });
      if (t.status !== 0) {
        line('✗ test suite FAILED after the bump — review before committing:');
        process.stdout.write((t.stdout || '').split('\n').filter((l) => /not ok|fail/i.test(l)).slice(0, 10).join('\n') + '\n');
        process.exitCode = 1;
        return;
      }
      line('✓ scripts test suite green. Next: commit the one-line bump (LOW tier) via the normal flow —');
      line('  branch `chore/agy-pin-bump-' + obs.installed + '`, path-limited commit of scripts/lib/cross-agent-cli.mjs, PR.');
      return;
    }
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) await main();
