#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReportHubData } from './lib/pmo-report-hub-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_OUT = join(ROOT, '.worktrees', 'smalldocs-report-hub', 'public', 'reports-data.json');
const EXTRACTOR = join(ROOT, 'scripts', 'roadmap-to-notion.mjs');

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { out: DEFAULT_OUT, pretty: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      out.out = resolve(argv[++i]);
    } else if (arg === '--compact') {
      out.pretty = false;
    } else if (arg === '--help' || arg === '-h') {
      out.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return out;
}

function help() {
  return [
    'Usage: node scripts/pmo-report-hub-data.mjs [--out <file>] [--compact]',
    '',
    'Builds the hosted PMO/Roadmap report library data file for the SmallDocs fork.',
    `Default --out: ${DEFAULT_OUT}`,
  ].join('\n');
}

function loadRows() {
  const json = execFileSync(process.execPath, [EXTRACTOR, '--extract'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(json);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(help());
    return;
  }
  const rows = loadRows();
  const data = buildReportHubData(rows, {
    generatedAt: new Date(),
    readDoc: (docLink) => readFileSync(join(ROOT, docLink), 'utf8'),
  });
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, JSON.stringify(data, null, args.pretty ? 2 : 0) + '\n');
  console.log(`Wrote ${args.out} (${data.items.length} items, ${data.views.length} views)`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  });
}
