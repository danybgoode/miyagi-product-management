#!/usr/bin/env node
// owed-ledger.mjs — turn 76 scattered "owed to Daniel" comments into one generated, categorised number.
//
// ── Why this exists ───────────────────────────────────────────────────────────────────────────
// The manual-QA debt has only ever been countable by grepping, which means it is quoted from memory
// and drifts. An external audit counted 80 occurrences across 75 files on 2026-07-24; two days later
// the real numbers were 76 and 71. Neither was wrong when written — a hand-counted number is simply
// stale on arrival, and the drift IS the argument for generating it.
//
// ── Follows build-order.mjs, deliberately ─────────────────────────────────────────────────────
// Generator + `--check` staleness mode + a committed artifact, the pattern already proven twice here
// (build-order.mjs, build-order-sync.mjs). Nothing new to learn, and the same CI-guard shape applies.
//
// ── Re-derive the population; never trust a list ──────────────────────────────────────────────
// LEARNINGS' "guard the population, not the door you found": a sweep that enumerates by hand misses
// the siblings nobody thought of, and that shipped a real consent hole. So this walks the spec tree
// mechanically every run. There is no allow-list, and a marker that matches is counted whether or not
// anyone expected it.
//
// ── Nothing is silently dropped ───────────────────────────────────────────────────────────────
// The categoriser is heuristic and will misfile things. An uncategorised marker lands in `other`,
// never in the bin: a ledger that quietly loses items is worse than the comments it replaced, because
// it looks authoritative. A test asserts input count === output count.
//
// Usage:
//   node scripts/owed-ledger.mjs             # write the markdown + json artifacts
//   node scripts/owed-ledger.mjs --check     # exit 1 if the committed artifact is stale (CI/hook)
//   node scripts/owed-ledger.mjs --json      # print the JSON to stdout, write nothing

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SPEC_DIR = join(ROOT, 'apps/miyagisanchez/e2e');
const OUT_MD = join(ROOT, 'Roadmap/00-ideas/OWED-LEDGER.md');
const OUT_JSON = join(ROOT, 'Roadmap/00-ideas/OWED-LEDGER.json');

// Case-insensitive: real comments say "owed to Daniel", "Owed (Daniel…)", "stay owed to Daniel".
const MARKER = /owed\s*(?:to|\()?\s*daniel/i;

export const CATEGORIES = ['money-path', 'auth-path', 'admin-only', 'other'];

/**
 * Categorise one marker by rule, from its file path + the surrounding comment text.
 *
 * Order matters: money beats auth beats admin. A checkout smoke that also needs a login is money —
 * that is the one a human should run first, and the most expensive to get wrong.
 */
export function categorise({ file, text }) {
  const hay = `${file} ${text}`.toLowerCase();
  // Word boundaries throughout. Substring matching filed a pin-ORDERing check as money-path because
  // "order" appears inside "ordering" — caught by this module's own test. "border", "reorder" and
  // "recorded" are the same trap, and a miscategorised money-path item is the most misleading kind:
  // it is the bucket a human is told to run FIRST.
  if (/\b(?:checkout|payments?|stripe|mercadopago|money|prices?|pricing|refunds?|payouts?|orders?|carts?|subscriptions?)\b/.test(hay)) {
    return 'money-path';
  }
  if (/\b(?:auth|authed|sign-?in|log-?in|sessions?|clerk|credentials?|tokens?)\b/.test(hay)) {
    return 'auth-path';
  }
  if (/\b(?:admin|moderation|contenido|seleccion)\b/.test(hay)) return 'admin-only';
  return 'other';
}

/** Recursively list spec files. Pure-ish: I/O injected so the walk is testable. */
export function listSpecFiles(dir, deps = {}) {
  const { read = readdirSync, stat = statSync } = deps;
  const out = [];
  const walk = (d) => {
    let entries;
    try {
      entries = read(d);
    } catch {
      return; // an unreadable directory is not a reason to lose the whole ledger
    }
    for (const name of entries) {
      const p = join(d, name);
      let s;
      try {
        s = stat(p);
      } catch {
        continue;
      }
      if (s.isDirectory()) walk(p);
      else if (/\.spec\.ts$/.test(name)) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Extract every marker from one file's contents. PURE.
 *
 * Captures the line and a little surrounding context, because the comment text is what makes the
 * categorisation possible and what makes the ledger readable.
 */
export function extractMarkers(contents, file) {
  const lines = String(contents ?? '').split('\n');
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    if (!MARKER.test(lines[i])) continue;
    // Strip comment punctuation so the text reads as prose in the report.
    const text = lines[i].replace(/^\s*(?:\/\/|\/\*+|\*+\/?|#)\s?/, '').trim();
    found.push({ file, line: i + 1, text });
  }
  return found;
}

/** Group markers by category. PURE. Asserts nothing is lost. */
export function buildLedger(markers) {
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  for (const m of markers) {
    const cat = categorise(m);
    byCategory[cat].push({ ...m, category: cat });
  }
  const counted = Object.values(byCategory).reduce((n, arr) => n + arr.length, 0);
  // A ledger that loses items is worse than the scattered comments it replaced.
  if (counted !== markers.length) {
    throw new Error(`owed-ledger: ${markers.length} markers in, ${counted} out — categorisation dropped items.`);
  }
  return {
    total: markers.length,
    files: new Set(markers.map((m) => m.file)).size,
    byCategory: Object.fromEntries(CATEGORIES.map((c) => [c, byCategory[c].length])),
    items: byCategory,
  };
}

export function renderMarkdown(ledger, generatedAt) {
  const l = [];
  l.push('# Owed ledger — manual verification still outstanding');
  l.push('');
  l.push('> **GENERATED — do not hand-edit.** `node scripts/owed-ledger.mjs`.');
  l.push('> Re-derived from the spec tree on every run, never from a maintained list.');
  l.push('');
  l.push(`_Generated: ${generatedAt}_`);
  l.push('');
  l.push(`**${ledger.total} check(s) owed across ${ledger.files} spec file(s).**`);
  l.push('');
  l.push('| Category | Count | What it means |');
  l.push('|---|---|---|');
  l.push(`| money-path | ${ledger.byCategory['money-path']} | Touches checkout, payment or order state — run these first |`);
  l.push(`| auth-path | ${ledger.byCategory['auth-path']} | Needs a real signed-in session a script cannot mint against production |`);
  l.push(`| admin-only | ${ledger.byCategory['admin-only']} | Behind an admin surface |`);
  l.push(`| other | ${ledger.byCategory.other} | Everything the rules could not confidently place — **not a bin, a to-triage list** |`);
  l.push('');
  for (const cat of CATEGORIES) {
    const items = ledger.items[cat];
    if (!items.length) continue;
    l.push(`## ${cat} (${items.length})`);
    l.push('');
    for (const it of items) l.push(`- \`${it.file}:${it.line}\` — ${it.text}`);
    l.push('');
  }
  return `${l.join('\n')}\n`;
}

function gather() {
  const files = listSpecFiles(SPEC_DIR);
  const markers = [];
  for (const f of files) {
    const rel = relative(ROOT, f);
    markers.push(...extractMarkers(readFileSync(f, 'utf8'), rel));
  }
  return buildLedger(markers);
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const jsonOnly = argv.includes('--json');

  if (!existsSync(SPEC_DIR)) {
    // The spec tree lives in a sibling repo that is gitignored here. Its absence is a real
    // possibility (a fresh clone of the root repo alone), and it must not read as "zero owed".
    process.stderr.write(
      `owed-ledger: ${relative(ROOT, SPEC_DIR)} not found — the frontend repo is not checked out here.\n` +
        `  Refusing to emit a ledger that would read as "nothing is owed".\n`
    );
    process.exit(jsonOnly || check ? 1 : 0);
  }

  const ledger = gather();
  const generatedAt = new Date().toISOString().slice(0, 10);

  if (jsonOnly) {
    process.stdout.write(`${JSON.stringify({ ...ledger, generatedAt }, null, 2)}\n`);
    return;
  }

  const md = renderMarkdown(ledger, generatedAt);
  // The JSON is what the standup's evidence pack reads; keep it small and stable.
  const json = `${JSON.stringify({ total: ledger.total, files: ledger.files, byCategory: ledger.byCategory, generatedAt }, null, 2)}\n`;

  if (check) {
    // Compare on the COUNTS, not the whole file: the generated-at date changes daily and would make
    // every run look stale, which is how a staleness gate gets disabled.
    const prev = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, 'utf8')) : null;
    const same =
      prev &&
      prev.total === ledger.total &&
      prev.files === ledger.files &&
      JSON.stringify(prev.byCategory) === JSON.stringify(ledger.byCategory);
    if (!same) {
      process.stderr.write(
        `owed-ledger: the committed ledger is stale — run \`node scripts/owed-ledger.mjs\`.\n` +
          `  committed: ${prev ? `${prev.total} owed` : '(missing)'} · actual: ${ledger.total} owed\n`
      );
      process.exit(1);
    }
    process.stdout.write(`owed-ledger: up to date (${ledger.total} owed).\n`);
    return;
  }

  writeFileSync(OUT_MD, md, 'utf8');
  writeFileSync(OUT_JSON, json, 'utf8');
  process.stdout.write(
    `owed-ledger: ${ledger.total} owed across ${ledger.files} files — ` +
      `${CATEGORIES.map((c) => `${ledger.byCategory[c]} ${c}`).join(', ')}\n`
  );
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
