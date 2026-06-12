#!/usr/bin/env node
// flags.mjs — manage Flagsmith feature flags via the Flagsmith Admin API.
//
// Why a script: a flag defined in code (lib/flags.ts DEFAULT_FLAGS) is INVISIBLE in the Flagsmith
// dashboard until someone creates it via the API — absent ⇒ every read returns the code default and
// there is nothing to toggle (LEARNINGS → Architecture, 2026-06-11 custom-domain-paywall: the flag
// existed in code for days but Daniel "didn't see it"). Creating a feature at the PROJECT level makes
// it appear in EVERY environment at once, so it is toggleable in the dashboard immediately.
//
// The two flag polarities (comment the polarity in lib/flags.ts DEFAULT_FLAGS too):
//   • KILL-SWITCH  ⇒ default ON  (fail-open: the feature stays on if Flagsmith is down/absent;
//                                 disabling is the deliberate act). e.g. checkout.stripe_enabled
//   • ENABLEMENT   ⇒ default OFF (a flag outage can never trap users behind a new gate;
//                                 enabling is the deliberate act).   e.g. domain.paywall_enabled
//
// This is a CONVENIENCE tool only — it does not auto-flag epics or gate anything.
//
// Usage:
//   node scripts/flags.mjs list
//   node scripts/flags.mjs create <name> [--on|--off] [--all-envs]
//   node scripts/flags.mjs flip <name> --on|--off [--env <name>]
//   node scripts/flags.mjs delete <name>
//
// Reads FLAGSMITH_ADMIN_API_TOKEN from env (FLAGSMITH_PROJECT_ID optional, default 39767 =
// miyagisanchezmarketplace on SaaS). Zero npm deps — Node 18+ (global fetch).

const API = 'https://api.flagsmith.com/api/v1';
const PROJECT_ID = process.env.FLAGSMITH_PROJECT_ID || '39767';

const HELP = `flags.mjs — manage Flagsmith feature flags via the Admin API.

Usage:
  node scripts/flags.mjs list
  node scripts/flags.mjs create <name> [--on|--off] [--all-envs]
  node scripts/flags.mjs flip <name> --on|--off [--env <name>]
  node scripts/flags.mjs delete <name>

Commands:
  list    features × environments grid (name, default, per-env on/off)
  create  create the flag at PROJECT level ⇒ it appears in EVERY environment immediately
          (a flag that exists only in code is invisible/untoggleable in the dashboard).
          --all-envs additionally writes the explicit on/off state into each environment.
  flip    toggle the flag; --env omitted ⇒ flips ALL environments (each printed)
  delete  remove the feature from the project (all environments)

Polarity (pick the default to match — and mirror it in lib/flags.ts DEFAULT_FLAGS):
  KILL-SWITCH ⇒ create --on   (fail-open; disabling is the deliberate act)
  ENABLEMENT  ⇒ create --off  (an outage can never trap users behind a new gate)

Env: FLAGSMITH_ADMIN_API_TOKEN (required), FLAGSMITH_PROJECT_ID (optional, default 39767).`;

function die(msg) {
  process.stderr.write(`✗ ${msg}\n`);
  process.exit(1);
}

function token() {
  const t = process.env.FLAGSMITH_ADMIN_API_TOKEN;
  if (!t) {
    die(
      'FLAGSMITH_ADMIN_API_TOKEN is not set — export it (staged in apps/miyagisanchez/.env.local; ' +
        'create one under app.flagsmith.com → Account → Keys if missing).'
    );
  }
  return t;
}

function parseArgs(argv) {
  const out = { cmd: null, name: null, on: null, allEnvs: false, env: null, help: false };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--on') out.on = true;
    else if (a === '--off') out.on = false;
    else if (a === '--all-envs') out.allEnvs = true;
    else if (a === '--env') {
      out.env = argv[++i];
      if (out.env === undefined || out.env.startsWith('-')) die('--env requires a value');
    } else if (a.startsWith('--env=')) out.env = a.slice('--env='.length);
    else if (a.startsWith('-')) die(`unknown flag '${a}' (try --help)`);
    else pos.push(a);
  }
  [out.cmd, out.name] = pos;
  return out;
}

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Token ${token()}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.detail || JSON.stringify(json).slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(`${method} ${path} failed (${res.status}): ${msg}`);
  }
  return json;
}

const results = (json) => json?.results ?? json ?? [];

async function getEnvironments() {
  const envs = results(await api('GET', `/environments/?project=${PROJECT_ID}`));
  if (!envs.length) die(`project ${PROJECT_ID} has no environments (wrong project id or token?).`);
  return envs;
}

async function getFeatures() {
  return results(await api('GET', `/projects/${PROJECT_ID}/features/?page_size=999`));
}

async function findFeature(name) {
  const f = (await getFeatures()).find((x) => x.name === name);
  if (!f) die(`flag '${name}' not found in project ${PROJECT_ID} — \`list\` shows what exists.`);
  return f;
}

function resolveEnvs(envs, wanted) {
  if (!wanted) return envs;
  const match = envs.filter((e) => e.name.toLowerCase() === wanted.toLowerCase());
  if (!match.length) die(`environment '${wanted}' not found — have: ${envs.map((e) => e.name).join(', ')}`);
  return match;
}

// Current (published) per-env state of one feature.
async function envState(env, featureId) {
  const states = results(
    await api('GET', `/environments/${env.api_key}/featurestates/?feature=${featureId}`)
  );
  return states.find((s) => s.feature === featureId) ?? states[0] ?? null;
}

// Set a feature's enabled state in one environment. Both project envs use v2 feature versioning,
// where the published state is immutable — the write is: create a new version (clones current
// state) → patch its feature state → publish. Legacy (non-v2) envs take a direct PATCH.
async function setEnvState(env, feature, on) {
  if (env.use_v2_feature_versioning) {
    // NB: the versions endpoints take the numeric environment id; the featurestates ones take api_key.
    const base = `/environments/${env.id}/features/${feature.id}/versions/`;
    const version = await api('POST', base, {});
    const uuid = version.uuid;
    const states = results(await api('GET', `${base}${uuid}/featurestates/`));
    const fs = states.find((s) => !s.feature_segment && !s.identity) ?? states[0];
    if (!fs) throw new Error(`no feature state in new version for '${feature.name}' in ${env.name}`);
    await api('PATCH', `${base}${uuid}/featurestates/${fs.id}/`, { enabled: on });
    await api('POST', `${base}${uuid}/publish/`, {});
  } else {
    const fs = await envState(env, feature.id);
    if (!fs) throw new Error(`no feature state for '${feature.name}' in ${env.name}`);
    await api('PATCH', `/environments/${env.api_key}/featurestates/${fs.id}/`, { enabled: on });
  }
  process.stderr.write(`✓ ${feature.name} → ${on ? 'ON' : 'OFF'} in ${env.name}\n`);
}

async function cmdList() {
  const [features, envs] = await Promise.all([getFeatures(), getEnvironments()]);
  if (!features.length) {
    process.stdout.write(`(no flags in project ${PROJECT_ID})\n`);
    return;
  }
  const stateMaps = await Promise.all(
    envs.map(async (env) => {
      const states = results(await api('GET', `/environments/${env.api_key}/featurestates/?page_size=999`));
      return new Map(states.map((s) => [s.feature, s.enabled]));
    })
  );
  const w = Math.max(...features.map((f) => f.name.length), 4) + 2;
  const header = 'flag'.padEnd(w) + 'default'.padEnd(9) + envs.map((e) => e.name.padEnd(13)).join('');
  process.stdout.write(header + '\n');
  for (const f of features) {
    const cells = stateMaps.map((m) => {
      const v = m.get(f.id);
      return (v === undefined ? '—' : v ? 'ON' : 'off').padEnd(13);
    });
    process.stdout.write(f.name.padEnd(w) + (f.default_enabled ? 'ON' : 'off').padEnd(9) + cells.join('') + '\n');
  }
}

async function cmdCreate(name, on, allEnvs) {
  if (!name) die('create requires <name>.');
  const enabled = on === null ? false : on; // unspecified ⇒ off (the safe enablement default)
  if (on === null) {
    process.stderr.write(
      '⚠ no --on/--off given — defaulting OFF (enablement polarity). A KILL-SWITCH should be --on.\n'
    );
  }
  const existing = (await getFeatures()).find((x) => x.name === name);
  if (existing) die(`flag '${name}' already exists (id ${existing.id}) — use flip to change its state.`);
  const f = await api('POST', `/projects/${PROJECT_ID}/features/`, {
    name,
    default_enabled: enabled,
    description: `Created via scripts/flags.mjs (${enabled ? 'kill-switch default-ON' : 'enablement default-OFF'}).`,
  });
  const envs = await getEnvironments();
  process.stderr.write(
    `✓ created '${name}' (id ${f.id}) default ${enabled ? 'ON' : 'OFF'} — project-level, so it now ` +
      `exists in every environment (${envs.map((e) => e.name).join(', ')}) and is toggleable in the dashboard.\n`
  );
  if (allEnvs) {
    for (const env of envs) await setEnvState(env, f, enabled);
  }
  process.stderr.write(`  remember: mirror the default in lib/flags.ts DEFAULT_FLAGS with a polarity comment.\n`);
}

async function cmdFlip(name, on, envName) {
  if (!name) die('flip requires <name>.');
  if (on === null) die('flip requires --on or --off.');
  const feature = await findFeature(name);
  const envs = resolveEnvs(await getEnvironments(), envName);
  if (!envName) process.stderr.write(`(no --env — flipping ALL ${envs.length} environments)\n`);
  for (const env of envs) await setEnvState(env, feature, on);
}

async function cmdDelete(name) {
  if (!name) die('delete requires <name>.');
  const feature = await findFeature(name);
  await api('DELETE', `/projects/${PROJECT_ID}/features/${feature.id}/`);
  process.stderr.write(`✓ deleted '${name}' (id ${feature.id}) from project ${PROJECT_ID} (all environments).\n`);
}

async function main() {
  const { cmd, name, on, allEnvs, env, help } = parseArgs(process.argv.slice(2));
  if (help || !cmd) {
    process.stdout.write(HELP + '\n');
    process.exit(help ? 0 : 1);
  }
  token(); // fail fast with the fix-naming message before any network call
  if (cmd === 'list') await cmdList();
  else if (cmd === 'create') await cmdCreate(name, on, allEnvs);
  else if (cmd === 'flip') await cmdFlip(name, on, env);
  else if (cmd === 'delete') await cmdDelete(name);
  else die(`unknown command '${cmd}' — use list|create|flip|delete (try --help)`);
}

main().catch((e) => die(e.message));
