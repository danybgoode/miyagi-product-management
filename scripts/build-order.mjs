#!/usr/bin/env node
// build-order.mjs — render Roadmap/00-ideas/BUILD-ORDER.md from the SAME projection the Notion
// sync uses (roadmap-to-notion.mjs --extract). One source of truth: seed frontmatter + epic/sprint
// status lines. This file is GENERATED — never hand-edit BUILD-ORDER.md; run this instead.
//
//   node scripts/build-order.mjs            # write Roadmap/00-ideas/BUILD-ORDER.md
//   node scripts/build-order.mjs --check    # exit 1 if the file is stale (for CI/precommit)
//
// Why this exists: BUILD-ORDER.md used to be hand-maintained, so it drifted on every merge. Status
// and ordering already live in seed frontmatter (the SSOT the Notion projection reads). This makes
// the in-repo board a derived view that cannot drift.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const OUT = join(REPO, 'Roadmap', '00-ideas', 'BUILD-ORDER.md');
const SEEDS = join(REPO, 'Roadmap', '00-ideas', 'seeds');
const EXTRACTOR = join(__dirname, 'roadmap-to-notion.mjs');

function extract() {
  const json = execFileSync('node', [EXTRACTOR, '--extract'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(json);
}

// Seed frontmatter is the declared SSOT (00-ideas/README). Read it directly so epic status comes
// from frontmatter — NOT from the extractor's brittle prose-parse of sprint docs.
function parseFrontmatter(md) {
  if (!md.startsWith('---')) return {};
  const end = md.indexOf('\n---', 3);
  if (end === -1) return {};
  const fm = {};
  for (const line of md.slice(3, end).split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (v[0] === '"' || v[0] === "'") { const q = v[0], e = v.indexOf(q, 1); v = e > 0 ? v.slice(1, e) : v.slice(1); }
    else { const h = v.search(/\s#/); if (h >= 0) v = v.slice(0, h); v = v.trim(); if (v === 'null' || v === '') v = null; }
    fm[m[1]] = v;
  }
  return fm;
}
// Map epic-folder-slug → { status, priority } from seed frontmatter (the SSOT).
function seedStatusByEpic() {
  const map = {};
  if (!existsSync(SEEDS)) return map;
  for (const f of readdirSync(SEEDS).filter((f) => f.endsWith('.md'))) {
    const fm = parseFrontmatter(readFileSync(join(SEEDS, f), 'utf8'));
    if (fm.epic) map[fm.epic.split('/').pop()] = { status: fm.status, priority: fm.priority };
  }
  return map;
}
// Frontmatter status vocab → board bucket.
const FM_TO_BUCKET = { shipped: 'Shipped', 'in-progress': 'In progress', scaffolded: 'Scaffolded', queued: 'Scaffolded', ready: 'Funnel', raw: 'Funnel', archived: 'Archived' };

// Epic status → bucket. Sprints are folded into their epic via sprint_progress; seeds are the funnel.
const EPIC_BUCKETS = [
  { key: 'In progress', emoji: '🏗️', title: 'Building now' },
  { key: 'Scaffolded',  emoji: '📋', title: 'Ready to build (scaffolded, not started)' },
  { key: 'Shipped',     emoji: '✅', title: 'Shipped' },
];
// Seeds not yet scaffolded = the funnel.
const SEED_FUNNEL = new Set(['Raw', 'Ready', 'Queued']);

function line(r) {
  const bits = [`[${r.name}](../../${r.doc_link.replace(/^Roadmap\//, '')})`];
  const meta = [];
  if (r.area) meta.push(r.area);
  if (r.sprint_progress) meta.push(r.sprint_progress);
  if (r.risk) meta.push(`risk: ${r.risk}`);
  if (r.priority) meta.push(r.priority);
  return `- ${bits[0]}${meta.length ? ` — ${meta.join(' · ')}` : ''}`;
}

function render(rows) {
  const epics = rows.filter((r) => r.grain === 'Epic');
  const seeds = rows.filter((r) => r.grain === 'Seed');
  const now = new Date().toISOString().slice(0, 10);

  // Prefer seed-frontmatter status (SSOT); record drift vs the extractor's prose-derived status.
  const fmMap = seedStatusByEpic();
  const drift = [];
  for (const e of epics) {
    const fm = fmMap[e.slug];
    e._derived = e.status;            // what prose-parsing said
    e._seeded = !!fm;
    if (fm && fm.status) {
      const bucket = FM_TO_BUCKET[fm.status] || e.status;
      if (bucket !== 'Funnel' && bucket !== 'Archived') e.status = bucket;
      if (e._derived !== e.status) drift.push({ name: e.name, frontmatter: fm.status, derived: e._derived });
    }
  }
  render._drift = drift;

  const out = [];
  out.push('<!-- GENERATED FILE — do not edit by hand.');
  out.push('     Regenerate:  node scripts/build-order.mjs');
  out.push('     Source of truth: seed frontmatter (status/priority/epic) + epic & sprint status lines,');
  out.push('     via the same projection the Notion sync reads (scripts/roadmap-to-notion.mjs --extract). -->');
  out.push('');
  out.push('# Build order — generated status board');
  out.push('');
  out.push(`> **Generated ${now} from frontmatter — do not hand-edit.** To change what this shows, edit the`);
  out.push('> seed/epic/sprint docs (status lives there), then run `node scripts/build-order.mjs`.');
  out.push('> Status & ordering single-source-of-truth = **seed frontmatter**; this board and the Notion');
  out.push('> "Marketplace Roadmap" DB are both *derived views* of it.');
  out.push('');

  for (const b of EPIC_BUCKETS) {
    const list = epics.filter((e) => e.status === b.key)
      .sort((a, z) => (a.area || '').localeCompare(z.area || '') || a.name.localeCompare(z.name));
    out.push(`## ${b.emoji} ${b.title} (${list.length})`);
    out.push('');
    out.push(list.length ? list.map(line).join('\n') : '_None._');
    out.push('');
  }

  const funnel = seeds.filter((s) => SEED_FUNNEL.has(s.status))
    .sort((a, z) => (a.priority || 'zzz').localeCompare(z.priority || 'zzz') || a.name.localeCompare(z.name));
  out.push(`## ⬜ Funnel — seeds not yet scaffolded (${funnel.length})`);
  out.push('');
  out.push(funnel.length ? funnel.map((s) => {
    const meta = [s.status, s.type, s.priority].filter(Boolean).join(' · ');
    return `- [${s.name}](seeds/${s.slug}.md)${meta ? ` — ${meta}` : ''}`;
  }).join('\n') : '_None._');
  out.push('');

  if (drift.length) {
    out.push(`## ⚠️ Status drift — frontmatter vs prose-derived (${drift.length})`);
    out.push('');
    out.push('These epics’ seed-frontmatter status disagrees with what the extractor derives from the sprint');
    out.push('docs. The board trusts **frontmatter**; the mismatch means one side is stale. Reconcile against');
    out.push('live code (see the cleanup handoff), then both this board and the Notion projection go correct.');
    out.push('');
    out.push('| Epic | frontmatter (used) | prose-derived |');
    out.push('|---|---|---|');
    for (const d of drift) out.push(`| ${d.name} | ${d.frontmatter} | ${d.derived} |`);
    out.push('');
  }

  out.push('---');
  out.push(`_Epics: ${epics.length} · seeds in funnel: ${funnel.length} · status drift: ${drift.length}. Regenerate with \`node scripts/build-order.mjs\`._`);
  out.push('');
  return out.join('\n');
}

const rows = extract();
const content = render(rows);

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  // Ignore the "Generated <date>" line when comparing so a date-only diff isn't "stale".
  const norm = (s) => s.replace(/^> \*\*Generated \d{4}-\d{2}-\d{2} /m, '> **Generated DATE ');
  if (norm(current) !== norm(content)) {
    console.error('BUILD-ORDER.md is stale — run: node scripts/build-order.mjs');
    process.exit(1);
  }
  console.log('BUILD-ORDER.md is up to date.');
} else {
  writeFileSync(OUT, content);
  console.log(`Wrote ${OUT}`);
}
