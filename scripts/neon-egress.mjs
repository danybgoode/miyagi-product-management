#!/usr/bin/env node
// neon-egress.mjs — one-command read of Neon per-project egress + the org total vs the 5 GB cap.
//
// Why a script: the Neon-egress epic needs a REPEATABLE baseline so every later lever's effect is
// measured (not guessed). The spike read these numbers by hand from the console; this reproduces that
// read in one command and prints a copy-pasteable block for a PR / sprint note. (Roadmap
// 09-platform-infra/neon-egress-and-db-isolation, Story 1.1.)
//
// What it reads: GET /api/v2/projects/{id} → project.data_transfer_bytes for the three projects in the
// commerce org, then computes the org total and % of the 5 GB/month public-transfer allowance (the cap
// is per-ORG, decimal GB = 1e9 bytes — 4.296 GB == 85.9%, matching the spike).
//
// Usage:
//   node scripts/neon-egress.mjs              # human table
//   node scripts/neon-egress.mjs --json       # machine-readable JSON
//
// Auth (no secret committed): NEON_API_KEY if set, else the local neonctl OAuth token from
// ~/.config/neonctl/credentials.json (the `.access_token`, override dir with NEONCTL_CONFIG_DIR or
// --config-dir). The neonctl token is short-lived — if you get a 401, run any `neonctl` command (e.g.
// `neonctl projects list`) to refresh it, or `export NEON_API_KEY=<a Neon API key>`. Zero npm deps —
// Node 18+ (global fetch).

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const API = 'https://console.neon.tech/api/v2';

// The commerce org and its three projects. Project IDs are stable public identifiers (not secrets);
// keep them here so the script is self-contained. (From the spike Decision, validated 2026-06-21.)
const ORG_ID = 'org-fancy-pond-57061061';
const CAP_BYTES = 5_000_000_000; // 5 GB/month, decimal, per-org public-network-transfer allowance.
const PROJECTS = [
  { id: 'shiny-paper-72860331', label: 'medusa-bonsai (commerce)' },
  { id: 'square-mode-16910372', label: 'panfleto-miniflux' },
  { id: 'curly-pond-03179354', label: 'justread' },
];

const HELP = `neon-egress.mjs — read Neon per-project egress + the org total vs the 5 GB cap.

Usage:
  node scripts/neon-egress.mjs [--json] [--config-dir <path>]

Flags:
  --json              emit machine-readable JSON instead of the human table
  --config-dir <dir>  neonctl config dir (default: $NEONCTL_CONFIG_DIR or ~/.config/neonctl)
  -h, --help          show this help

Auth: NEON_API_KEY if set, else the neonctl OAuth access_token (refresh with any \`neonctl\` command
on a 401). Org ${ORG_ID}, cap ${CAP_BYTES / 1e9} GB.`;

function die(msg) {
  process.stderr.write(`✗ ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { json: false, configDir: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--config-dir') {
      out.configDir = argv[++i];
      if (out.configDir === undefined || out.configDir.startsWith('-')) die('--config-dir requires a value');
    } else if (a.startsWith('--config-dir=')) out.configDir = a.slice('--config-dir='.length);
    else die(`unknown argument '${a}' (try --help)`);
  }
  return out;
}

function resolveToken(configDir) {
  if (process.env.NEON_API_KEY) return process.env.NEON_API_KEY;
  const dir = configDir || process.env.NEONCTL_CONFIG_DIR || join(homedir(), '.config', 'neonctl');
  const credPath = join(dir, 'credentials.json');
  try {
    const token = JSON.parse(readFileSync(credPath, 'utf8')).access_token;
    if (!token) throw new Error('no access_token field');
    return token;
  } catch (e) {
    die(
      `no Neon credentials — set NEON_API_KEY, or log in with neonctl (read ${credPath} failed: ${e.message}).`,
    );
  }
}

async function projectEgress(token, id) {
  const res = await fetch(`${API}/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint = res.status === 401 ? ' — token expired? run any `neonctl` command to refresh, or set NEON_API_KEY' : '';
    throw new Error(`GET /projects/${id} → ${res.status} ${body.message || ''}${hint}`);
  }
  return body.project?.data_transfer_bytes ?? 0;
}

const mb = (b) => (b / 1e6).toFixed(1);
const gb = (b) => (b / 1e9).toFixed(3);
const pct = (b) => ((b / CAP_BYTES) * 100).toFixed(1);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP + '\n');
    return;
  }
  const token = resolveToken(args.configDir);
  const rows = [];
  for (const p of PROJECTS) {
    rows.push({ ...p, bytes: await projectEgress(token, p.id) });
  }
  const total = rows.reduce((s, r) => s + r.bytes, 0);

  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          org: ORG_ID,
          cap_bytes: CAP_BYTES,
          read_at: new Date().toISOString(),
          projects: rows.map((r) => ({ id: r.id, label: r.label, bytes: r.bytes, pct_of_cap: +pct(r.bytes) })),
          org_total_bytes: total,
          org_total_gb: +gb(total),
          org_pct_of_cap: +pct(total),
        },
        null,
        2,
      ) + '\n',
    );
    return;
  }

  const out = [];
  out.push(`Neon egress — org ${ORG_ID} — cap ${CAP_BYTES / 1e9} GB/mo — read ${new Date().toISOString()}`);
  out.push('');
  out.push('| Project | Egress (MB) | Egress (GB) | % of 5 GB |');
  out.push('|---|--:|--:|--:|');
  for (const r of rows) {
    out.push(`| ${r.label} | ${mb(r.bytes)} | ${gb(r.bytes)} | ${pct(r.bytes)}% |`);
  }
  out.push(`| **ORG TOTAL** | **${mb(total)}** | **${gb(total)}** | **${pct(total)}%** |`);
  out.push('');
  out.push(`Headroom to cap: ${gb(CAP_BYTES - total)} GB (${(100 - +pct(total)).toFixed(1)}% remaining).`);
  process.stdout.write(out.join('\n') + '\n');
}

main().catch((e) => die(e.message));
