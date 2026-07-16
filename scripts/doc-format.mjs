#!/usr/bin/env node
// doc-format.mjs — check Roadmap/ epic docs (README.md, sprint-N.md, RETROSPECTIVE.md) against the
// canonical shape: the `groom` plugin's scaffolding templates (dobby-foundation/ways-of-work,
// skills/groom/templates/) — proven canonical by the zero-drift 00-ideas/seeds/*.md control group
// (one authoring path, 81 files, identical shape; epic READMEs drift because they get hand-edited
// after scaffolding, away from the template). See Roadmap/09-platform-infra/doc-format-consistency/
// for the full rationale + the decisions behind each rule below.
//
// This is FORMAT checking (headings, frontmatter shape, section order) — complementary to
// doc-hygiene.mjs's CONTENT checking (dedupe, dead paths, staleness) on exactly two files.
//
//   node scripts/doc-format.mjs             # full-tree report (all docs, advisory)
//   node scripts/doc-format.mjs --check     # CI mode — exit 1 only for paths in ENFORCED_SWEPT_PATHS
//   node scripts/doc-format.mjs --hook      # single-file mode: read a path from stdin JSON
//                                            (Claude Code PostToolUse hook payload), exit 2 on drift
//
// Reuse, don't rebuild: epic discovery + status come from `roadmap-to-notion.mjs --extract` (the
// same SSOT build-order.mjs and doc-hygiene.mjs read) — this script does not re-derive epic status
// itself, and NEVER rewrites the `status:` frontmatter field (the Notion `Lifecycle ?? Status`
// fallback in roadmap-to-notion.mjs depends on that field's name + values staying stable).

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const EXTRACTOR = join(__dirname, 'roadmap-to-notion.mjs');

// Active (non-archived) epics are the only ones the sweep + hard gate ever apply to — status:
// archived epics are frozen historical record (Decision D3, doc-format-consistency epic README).
const ACTIVE_STATUSES = new Set(['Scaffolded', 'In progress', 'Shipped']);

// Grows as Sprint 2 sweeps each macro-section. Empty in Sprint 1 — everything is visible-but-advisory
// until a doc's path is added here (same incremental-adoption shape as lib/design-token-audit.ts's
// and lib/emoji-guard.ts's own enforcedSweptPaths in apps/miyagisanchez).
export const ENFORCED_SWEPT_PATHS = new Set([
  // 'Roadmap/09-platform-infra/doc-format-consistency/README.md',
]);

const VALID_EPIC_STATUSES = ['scaffolded', 'in-progress', 'shipped', 'archived'];
const CANONICAL_DOD_HEADING = '## Definition of Done (epic)';
const CANONICAL_RETRO_SECTIONS = ['## What shipped', '## What went well', '## What we learned', '## Gaps / follow-ups'];
const VALID_CLASSES = ['Feature', 'Spike', 'Bug', 'Chore'];

export function extractEpics() {
  const json = execFileSync('node', [EXTRACTOR, '--extract'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(json).filter((r) => r.grain === 'Epic');
}

export function readRelative(relPath) {
  return readFileSync(join(REPO, relPath), 'utf8');
}

export function existsRelative(relPath) {
  return existsSync(join(REPO, relPath));
}

/** Every sprint-N.md and RETROSPECTIVE.md sitting alongside an epic's README.md. */
export function siblingDocs(readmeRelPath) {
  const dir = dirname(readmeRelPath);
  const absDir = join(REPO, dir);
  if (!existsSync(absDir)) return { sprints: [], retro: null };
  const entries = readdirSync(absDir);
  const sprints = entries
    .filter((f) => /^sprint-\d+\.md$/.test(f))
    .sort((a, z) => Number(a.match(/\d+/)[0]) - Number(z.match(/\d+/)[0]))
    .map((f) => join(dir, f));
  const retro = entries.includes('RETROSPECTIVE.md') ? join(dir, 'RETROSPECTIVE.md') : null;
  return { sprints, retro };
}

// ── Individual checkers — each returns a list of { rule, detail } offenses for one file's content ──

export function checkEpicReadme(content) {
  const offenses = [];

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    offenses.push({ rule: 'frontmatter-missing', detail: 'no --- frontmatter block at the top of the file' });
  } else {
    const fm = fmMatch[1];
    if (!/^status:\s*\S/m.test(fm)) offenses.push({ rule: 'frontmatter-status-missing', detail: 'no `status:` key in frontmatter' });
    else {
      const statusVal = fm.match(/^status:\s*(\S+)/m)[1];
      if (!VALID_EPIC_STATUSES.includes(statusVal)) {
        offenses.push({ rule: 'frontmatter-status-invalid', detail: `status: "${statusVal}" is not one of ${VALID_EPIC_STATUSES.join('|')}` });
      }
    }
    if (!/^slug:\s*\S/m.test(fm)) offenses.push({ rule: 'frontmatter-slug-missing', detail: 'no `slug:` key in frontmatter' });
  }

  // Catch any header-shaped blockquote line, not just an already-canonical one — a line starting
  // with the legacy `**Macro-section:**` still needs to be FOUND so it can be flagged as legacy,
  // rather than mis-reported as entirely missing.
  const headerLine = content.split('\n').find((l) => {
    const t = l.trim();
    return t.startsWith('> **Area:**') || t.startsWith('> **Macro-section:**');
  });
  if (!headerLine) {
    offenses.push({ rule: 'header-missing', detail: 'no `> **Area:** ...` header blockquote line found' });
  } else {
    if (!headerLine.includes('**Risk:**')) offenses.push({ rule: 'header-missing-risk', detail: 'header line has Area but no **Risk:** field' });
    if (!headerLine.includes('**Class:**')) {
      offenses.push({ rule: 'header-missing-class', detail: 'header line has no **Class:** field (should be one of Feature|Spike|Bug|Chore, between Risk and Scope seed)' });
    } else {
      const classMatch = headerLine.match(/\*\*Class:\*\*\s*([^·]+)/);
      const classVal = classMatch ? classMatch[1].trim() : '';
      if (!VALID_CLASSES.includes(classVal)) {
        offenses.push({ rule: 'header-class-invalid', detail: `**Class:** "${classVal}" is not one of ${VALID_CLASSES.join('|')} (free-text descriptions belong in ## Why, not the header)` });
      }
    }
    if (!headerLine.includes('**Scope seed:**')) {
      if (headerLine.includes('**Scope doc:**')) {
        offenses.push({ rule: 'header-scope-doc-legacy', detail: 'header uses **Scope doc:** — canonical is **Scope seed:** pointing at 00-ideas/seeds/ (2. readyforscope/ is documented legacy per 00-ideas/README.md)' });
      } else {
        offenses.push({ rule: 'header-missing-scope-seed', detail: 'header line has no **Scope seed:** field' });
      }
    } else if (headerLine.includes('00-ideas/seeds/')) {
      const linkMatch = headerLine.match(/\(([^)]*00-ideas\/seeds\/[^)]+)\)/);
      if (linkMatch) {
        const linkTarget = linkMatch[1].replace(/^\.\.\/\.\.\//, '');
        if (!existsRelative(join('Roadmap', linkTarget))) {
          offenses.push({ rule: 'header-scope-seed-broken-link', detail: `**Scope seed:** links to ${linkTarget}, which doesn't exist` });
        }
      }
    }
    if (headerLine.includes('**Macro-section:**')) {
      offenses.push({ rule: 'header-macro-section-legacy', detail: 'header uses **Macro-section:**/**BUILD-ORDER:** — canonical is **Area:**' });
    }
  }

  if (!content.includes(CANONICAL_DOD_HEADING)) {
    if (/^##\s+Epic Definition of Done/m.test(content)) {
      offenses.push({ rule: 'dod-heading-legacy', detail: `heading is "## Epic Definition of Done" — canonical is "${CANONICAL_DOD_HEADING}"` });
    } else if (/^##\s+Definition of Done/m.test(content)) {
      const actual = content.match(/^##\s+.*Definition of Done.*$/m)[0];
      offenses.push({ rule: 'dod-heading-mismatch', detail: `heading is "${actual}" — canonical is "${CANONICAL_DOD_HEADING}"` });
    } else {
      offenses.push({ rule: 'dod-heading-missing', detail: `no "${CANONICAL_DOD_HEADING}" section found` });
    }
  }

  return offenses;
}

export function checkSprintDoc(content) {
  const offenses = [];
  const statusLine = content.split('\n').find((l) => l.includes('**Status:**') || l.includes('Status:'));
  if (!statusLine) {
    offenses.push({ rule: 'sprint-status-missing', detail: 'no Status line found' });
  } else {
    const trimmed = statusLine.trim();
    // "Combined" (Epic/Risk sharing the line with Status) is checked independent of what the line
    // starts with — the real drift examples combine in different orders (Epic·Risk·Status vs
    // Epic·Risk on one line + Status on the next blockquote line), so this must not be nested under
    // a "starts with **Status:**" branch or the most common combined shape never matches.
    const combinesOtherFields = /\*\*(Risk|Epic):/i.test(trimmed);
    if (trimmed.startsWith('>')) {
      offenses.push({ rule: 'sprint-status-blockquote', detail: 'Status line is a blockquote (`> ...`) — canonical is a plain `**Status:** ...` line, no backlink/Risk on the same line' });
    } else if (combinesOtherFields) {
      offenses.push({ rule: 'sprint-status-combined', detail: 'Status line combines Epic/Risk on the same line — canonical is Status alone' });
    } else if (!trimmed.startsWith('**Status:**')) {
      offenses.push({ rule: 'sprint-status-format', detail: `Status line doesn't start with "**Status:**" — found: "${trimmed.slice(0, 60)}"` });
    }
  }
  return offenses;
}

export function checkRetrospective(content) {
  const offenses = [];
  const closedLine = content.split('\n').find((l) => /closed/i.test(l) && l.trim() !== '');
  if (!closedLine) {
    offenses.push({ rule: 'retro-closed-missing', detail: 'no "Closed" date line found near the top' });
  } else if (!/^_Closed:\s*\d{4}-\d{2}-\d{2}_$/.test(closedLine.trim())) {
    if (/^\*\*Closed/.test(closedLine.trim())) {
      offenses.push({ rule: 'retro-closed-bold', detail: `"Closed" line is bold (**Closed ...**) — canonical is italic: "_Closed: YYYY-MM-DD_"` });
    } else {
      offenses.push({ rule: 'retro-closed-format', detail: `"Closed" line doesn't match canonical "_Closed: YYYY-MM-DD_" — found: "${closedLine.trim()}"` });
    }
  }

  for (const heading of CANONICAL_RETRO_SECTIONS) {
    if (!content.includes(heading)) {
      offenses.push({ rule: 'retro-section-missing', detail: `missing canonical section "${heading}"` });
    }
  }

  return offenses;
}

// ── Full-tree walk ──────────────────────────────────────────────────────────

export function findAllOffenses({ activeOnly = false } = {}) {
  const epics = extractEpics().filter((e) => !activeOnly || ACTIVE_STATUSES.has(e.status));
  const results = [];

  for (const epic of epics) {
    const readmePath = epic.doc_link;
    if (!existsRelative(readmePath)) continue; // extractor can lag a just-renamed/moved doc
    const readmeOffenses = checkEpicReadme(readRelative(readmePath));
    if (readmeOffenses.length) results.push({ path: readmePath, docType: 'epic-README', offenses: readmeOffenses });

    const { sprints, retro } = siblingDocs(readmePath);
    for (const sprintPath of sprints) {
      const sprintOffenses = checkSprintDoc(readRelative(sprintPath));
      if (sprintOffenses.length) results.push({ path: sprintPath, docType: 'sprint', offenses: sprintOffenses });
    }
    if (retro) {
      const retroOffenses = checkRetrospective(readRelative(retro));
      if (retroOffenses.length) results.push({ path: retro, docType: 'retrospective', offenses: retroOffenses });
    }
  }

  return results;
}

export function formatOffense(fileResult) {
  return fileResult.offenses.map((o) => `  [${o.rule}] ${o.detail}`).join('\n');
}

// ── CLI modes ────────────────────────────────────────────────────────────────

function runReport() {
  const results = findAllOffenses();
  if (!results.length) {
    console.log('doc-format: zero findings across the full Roadmap tree.');
    return;
  }
  console.log(`doc-format: ${results.length} file(s) with findings\n`);
  const byType = {};
  for (const r of results) (byType[r.docType] ??= []).push(r);
  for (const [docType, group] of Object.entries(byType)) {
    console.log(`── ${docType} (${group.length}) ──`);
    for (const r of group) {
      const enforced = ENFORCED_SWEPT_PATHS.has(r.path) ? ' [ENFORCED]' : '';
      console.log(`${r.path}${enforced}`);
      console.log(formatOffense(r));
    }
    console.log('');
  }
  const enforcedCount = results.filter((r) => ENFORCED_SWEPT_PATHS.has(r.path)).length;
  console.log(`Total: ${results.length} file(s), ${enforcedCount} enforced (would fail --check).`);
}

function runCheck() {
  const results = findAllOffenses();
  const enforced = results.filter((r) => ENFORCED_SWEPT_PATHS.has(r.path));
  if (enforced.length) {
    console.error(`doc-format --check: ${enforced.length} enforced file(s) have drift:\n`);
    for (const r of enforced) {
      console.error(r.path);
      console.error(formatOffense(r));
    }
    process.exit(1);
  }
  console.log(`doc-format --check: clean (${ENFORCED_SWEPT_PATHS.size} path(s) enforced, ${results.length} advisory finding(s) elsewhere).`);
}

function runHook() {
  let input = '';
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    let filePath;
    try {
      const payload = JSON.parse(input);
      filePath = payload?.tool_input?.file_path;
    } catch {
      process.exit(0); // malformed hook payload — fail open, never block an edit on a parse error
    }
    if (!filePath) process.exit(0);
    const relPath = relative(REPO, filePath);
    if (!/^Roadmap\/.*\.md$/.test(relPath)) process.exit(0); // not a Roadmap doc — nothing to check
    if (!existsSync(filePath)) process.exit(0);

    const content = readFileSync(filePath, 'utf8');
    const base = relPath.split('/').pop();
    let offenses = [];
    if (base === 'README.md') offenses = checkEpicReadme(content);
    else if (/^sprint-\d+\.md$/.test(base)) offenses = checkSprintDoc(content);
    else if (base === 'RETROSPECTIVE.md') offenses = checkRetrospective(content);
    else process.exit(0); // not an epic doc type this checker covers (e.g. a seed, the poster)

    if (offenses.length) {
      console.error(`doc-format: ${relPath} has ${offenses.length} format finding(s):`);
      console.error(formatOffense({ offenses }));
      process.exit(2);
    }
    process.exit(0);
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--hook')) {
    runHook();
  } else if (process.argv.includes('--check')) {
    runCheck();
  } else {
    runReport();
  }
}
