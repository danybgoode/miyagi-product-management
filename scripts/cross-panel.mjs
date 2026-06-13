#!/usr/bin/env node
// cross-panel.mjs — an ADVISORY cross-agent second opinion on a PROPOSED PLAN (a scope/seed doc).
//
// The planning-half sibling of cross-review.mjs: instead of a PR diff it reads ONE plan doc and pipes it
// into a DIFFERENT model family's CLI (Codex or Antigravity) with an architecture LENS prompt
// (scripts/cross-panel.prompt.md), then PRINTS the critique. It is dev tooling, not app code, and is:
//   • SINGLE-PASS — one read per lens, no debate / iterate-to-convergence loop (our #1 token sink).
//   • PRINT-ONLY — it NEVER edits the doc. Daniel commits any takeaways himself as a normal doc commit.
//   • ADVISORY ONLY — never gates. Daniel's scope-doc approval remains the only gate (planning has no CI).
//
// Usage:
//   node scripts/cross-panel.mjs <scope-doc> --agent codex|antigravity --lens architect-purist [--dry-run]
//
// CLI plumbing is shared with cross-review.mjs via scripts/cross-agent-cli.mjs. Zero npm deps — Node 18+.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { AGENTS, die, need, ensureCmd, checkAgyVersion, loadPromptBody, runCodex, runAntigravity } from './cross-agent-cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, 'cross-panel.prompt.md');

function helpText(lenses) {
  return `cross-panel.mjs — advisory cross-agent second opinion on a proposed plan (a scope/seed doc).

Usage:
  node scripts/cross-panel.mjs <scope-doc> --agent codex|antigravity --lens <name> [--dry-run]

Flags:
  --agent <name>   reviewer CLI: ${Object.keys(AGENTS).join('|')} (default: codex)
  --lens  <name>   architecture lens: ${lenses.join('|')} (default: architect-purist)
  --dry-run        print the composed prompt that WOULD be sent, without invoking the CLI
  -h, --help       show this help

Advisory only — single-pass, print-only, never gates. Your scope-doc approval decides.`;
}

function parseArgs(argv) {
  const out = { doc: null, agent: 'codex', lens: 'architect-purist', dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--agent') out.agent = need(argv[++i], '--agent');
    else if (a.startsWith('--agent=')) out.agent = a.slice('--agent='.length);
    else if (a === '--lens') out.lens = need(argv[++i], '--lens');
    else if (a.startsWith('--lens=')) out.lens = a.slice('--lens='.length);
    else if (!a.startsWith('-') && out.doc === null) out.doc = a;
    else die(`unknown argument '${a}' (try --help)`);
  }
  return out;
}

// Parse the prompt library into { preamble, lenses: {name: sectionText} }. The shared preamble is
// everything before the first `## LENS:` heading; each lens runs to the next `## ` heading or EOF.
function parsePromptLibrary(body) {
  const headingRe = /^##[ \t]+/m;
  const lensRe = /^##[ \t]+LENS:[ \t]*(\S+)[ \t]*$/gm;
  const firstLens = body.search(/^##[ \t]+LENS:/m);
  if (firstLens === -1) die(`no '## LENS:' sections found in ${PROMPT_PATH}`);
  const preamble = body.slice(0, firstLens).trim();

  // Collect each lens heading's start, then slice to the next top-level `## ` heading.
  const starts = [];
  let m;
  while ((m = lensRe.exec(body)) !== null) starts.push({ name: m[1], at: m.index });
  const lenses = {};
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].at;
    // find the next `## ` heading after this lens's own heading line
    const rest = body.slice(from + 2);
    const nextRel = rest.search(headingRe);
    const to = nextRel === -1 ? body.length : from + 2 + nextRel;
    lenses[starts[i].name] = body.slice(from, to).trim();
  }
  return { preamble, lenses };
}

function readDoc(path) {
  if (!existsSync(path)) die(`scope doc not found: ${path}`);
  if (statSync(path).isDirectory()) die(`expected a file, got a directory: ${path}`);
  const text = readFileSync(path, 'utf8');
  if (!text.trim()) die(`scope doc is empty: ${path}`);
  return text;
}

// Compose the full prompt for one lens: shared preamble + the lens section.
function composeLensPrompt(preamble, lensSection) {
  return `${preamble}\n\n${lensSection}\n`;
}

// Run one lens against the doc through the selected agent, single pass. Returns the critique text.
function runLens(agent, prompt, docPath, docText) {
  if (agent === 'codex') return runCodex(prompt, `## Plan to review (${docPath})\n\n${docText}`);
  if (agent === 'antigravity') {
    const full = `${prompt}\n\n## Plan to review (${docPath})\n\n${docText}\n`;
    return runAntigravity(full);
  }
  die(`unknown --agent '${agent}'; use ${Object.keys(AGENTS).join('|')}`);
}

function ensureAgentCli(agent) {
  if (agent === 'codex') {
    ensureCmd('codex', 'codex not found — install Codex CLI (https://github.com/openai/codex) and `codex login`.');
  } else if (agent === 'antigravity') {
    ensureCmd('agy', 'agy not found — install the Antigravity CLI and authenticate it, then retry.');
    checkAgyVersion();
  }
}

function main() {
  const body = loadPromptBody(PROMPT_PATH);
  const { preamble, lenses } = parsePromptLibrary(body);
  const lensNames = Object.keys(lenses);

  const { doc, agent, lens, dryRun, help } = parseArgs(process.argv.slice(2));
  if (help) {
    process.stdout.write(helpText(lensNames) + '\n');
    process.exit(0);
  }
  if (doc === null) die('missing <scope-doc>. Usage: node scripts/cross-panel.mjs <scope-doc> --lens architect-purist');
  if (!AGENTS[agent]) die(`unknown --agent '${agent}'; use ${Object.keys(AGENTS).join('|')}`);
  if (!lenses[lens]) die(`unknown --lens '${lens}'; use ${lensNames.join('|')}`);

  const docText = readDoc(doc);
  const prompt = composeLensPrompt(preamble, lenses[lens]);

  if (dryRun) {
    process.stdout.write(`# --dry-run: composed prompt for lens '${lens}' (agent: ${agent})\n\n`);
    process.stdout.write(prompt + '\n');
    process.stdout.write(`## Plan to review (${doc})\n\n${docText}\n`);
    process.stderr.write('\n(dry-run — no CLI invoked)\n');
    process.exit(0);
  }

  ensureAgentCli(agent);
  const findings = runLens(agent, prompt, doc, docText);
  if (!findings) die(`${AGENTS[agent]} returned no output.`);

  process.stdout.write(`### 🔎 Cross-agent planning panel — ${lens} (${AGENTS[agent]})\n\n`);
  process.stdout.write(
    '> **Advisory only — not a gate.** CI/QA don\'t apply to planning; your scope-doc approval decides. ' +
      'Single-pass second opinion from a different model family.\n\n---\n\n'
  );
  process.stdout.write(findings + '\n');
}

main();
