#!/usr/bin/env node
// roadmap-to-notion.mjs — project the Roadmap docs into the Notion "Marketplace Roadmap" board.
// ONE-WAY, docs → Notion. Docs are the only source of truth; the board is a rebuilt projection.
//
// Modes:
//   --extract           print the projected rows as JSON (no Notion needed; the testable core)
//   --sync              upsert rows into Notion (needs env NOTION_TOKEN + NOTION_DB_ID)
//
// Grain (full funnel, 3 grains):
//   • Epic   — one row per epic folder under Roadmap/<NN-macro>/<slug>/ (has a README.md)
//   • Sprint — one row per sprint-N.md inside an epic, linked to its Epic via the "Epic" relation
//   • Seed   — one row per seed in 00-ideas/seeds/ whose frontmatter epic == null (un-scaffolded funnel)
//
// Status derivation (docs win, re-derived every run):
//   SPRINT: read its `**Status:**` line (controlled vocab below) → else count story ticks.
//     Planned (none started) · In progress (some stories ✅) · In review (all ✅, not yet closed out /
//     "built — awaiting review/draft PR") · Shipped (✅ merged/shipped, or all ✅ + smoke walkthrough written).
//   EPIC: rolled up from its sprints — all Shipped ⇒ Shipped · any active ⇒ In progress · all Planned ⇒ Scaffolded.
//   SEED: its frontmatter status (raw|ready|queued|archived).
//
// NOTE on the sprint `**Status:**` line: the "Wrap S<n>" step (SESSION-KICKOFFS §7) should set it to one of
//   ⬜ Planned · 🏗 In progress · 🟦 In review · ✅ Shipped — that keeps this projection trivially reliable.
//   Legacy freeform lines are still mapped best-effort below.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const ROADMAP = join(REPO, 'Roadmap');
const SEEDS = join(ROADMAP, '00-ideas', 'seeds');

const AREA_NAMES = {
  '01': '01 Discovery', '02': '02 Checkout & Payments', '03': '03 Selling & Shops',
  '04': '04 Shipping', '05': '05 Trust/Offers/Messaging', '06': '06 Print',
  '07': '07 Agentic/Federated', '08': '08 Growth', '09': '09 Platform-infra',
  '10': '10 Events & Ticketing',
};
const SEED_STATUS_LABEL = {
  raw: 'Raw', ready: 'Ready', queued: 'Queued', scaffolded: 'Scaffolded',
  'in-progress': 'In progress', shipped: 'Shipped', archived: 'Archived',
};
const PRIORITY_LABEL = {
  'wave-0': 'Wave 0 Enablers', 'wave-1': 'Wave 1', 'wave-2': 'Wave 2',
  'wave-3': 'Wave 3', 'wave-4': 'Wave 4',
};
const TYPE_LABEL = { feature: 'Feature', spike: 'Spike', chore: 'Chore', epic: 'Epic' };

function parseFrontmatter(md) {
  if (!md.startsWith('---')) return {};
  const end = md.indexOf('\n---', 3);
  if (end === -1) return {};
  const block = md.slice(3, end).trim();
  const fm = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (v[0] === '"' || v[0] === "'") {
      const q = v[0]; const e = v.indexOf(q, 1);
      v = e > 0 ? v.slice(1, e) : v.slice(1);             // quoted: take inside quotes (keeps '#5')
    } else {
      const h = v.search(/\s#/); if (h >= 0) v = v.slice(0, h); // strip inline ` # comment`
      v = v.trim();
      if (v === 'null' || v === '') v = null;
    }
    fm[m[1]] = v;
  }
  return fm;
}

function readSeeds() {
  if (!existsSync(SEEDS)) return [];
  return readdirSync(SEEDS).filter((f) => f.endsWith('.md')).map((f) => {
    const fm = parseFrontmatter(readFileSync(join(SEEDS, f), 'utf8'));
    return { ...fm, _file: `Roadmap/00-ideas/seeds/${f}` };
  });
}

function listEpicDirs() {
  const out = [];
  for (const macro of readdirSync(ROADMAP)) {
    if (!/^[0-9]{2}-/.test(macro)) continue; // macro-section folders only
    const macroPath = join(ROADMAP, macro);
    if (!statSync(macroPath).isDirectory()) continue;
    for (const slug of readdirSync(macroPath)) {
      const epicPath = join(macroPath, slug);
      if (!statSync(epicPath).isDirectory()) continue;
      if (!existsSync(join(epicPath, 'README.md'))) continue;
      out.push({ macro, slug, path: epicPath, area: macro.slice(0, 2) });
    }
  }
  return out;
}

function epicTitle(epicPath, slug) {
  try {
    const first = readFileSync(join(epicPath, 'README.md'), 'utf8').split('\n').find((l) => l.startsWith('# '));
    if (first) return first.replace(/^#\s+(Epic\s*[—·:\-]\s*)?/i, '').trim();
  } catch {}
  return slug;
}

// --- story counting: tolerant of the real heading drift (### S1.1 / ### Story 1.1 / ### US-1) ---
const STORY_RE = /^###\s+(?:Story\s+\d+|S\d+(?:\.\d+)?(?:\s*\([^)]*\))?|US-\d+)\b/i;
function countStories(body) {
  let total = 0, done = 0;
  for (const line of body.split('\n')) {
    if (STORY_RE.test(line)) { total++; if (line.includes('✅')) done++; }
  }
  return { total, done };
}

// --- sprint status: the `**Status:**` line first, then story ticks ---
function deriveSprintStatus(body) {
  const hasSmoke = /Smoke walkthrough \(do these|—\s*Smoke walkthrough/i.test(body);
  const m = body.match(/^\*\*Status:\*\*\s*(.+)$/mi);
  const line = (m ? m[1] : '').trim();
  const s = line.toLowerCase();
  if (line) {
    if (/⬜|not started|^planned\b/.test(s)) return 'Planned';
    if (/🟦|in review|awaiting\s*(pr|review)|draft\s*\[?pr|built\s*—.*(awaiting|review|draft)/.test(s)) return 'In review';
    if (/✅/.test(line) && /(shipped|merged|live|in prod|to\s*`?main`?|on\s*`?main`?)/.test(s)) return 'Shipped';
    if (/✅\s*built|built\s*\(/.test(s)) return 'In review';           // "built" with no merge word ⇒ not yet shipped
    if (/🏗|in progress|wip|building\b/.test(s)) return 'In progress';
    if (/✅/.test(line)) return 'Shipped';
  }
  const { total, done } = countStories(body);
  if (total > 0) {
    if (done === total) return hasSmoke ? 'Shipped' : 'In review';
    if (done > 0) return 'In progress';
    return 'Planned';
  }
  return 'Planned';
}

function sprintTitleFrom(body, n) {
  const first = body.split('\n').find((l) => l.startsWith('# ')) || '';
  const m = first.match(/Sprint\s+\d+\s*[:—\-]\s*(.+)$/i);
  return m ? m[1].trim() : `Sprint ${n}`;
}

function epicSprints(epicPath) {
  return readdirSync(epicPath)
    .filter((f) => /^sprint-(\d+)\.md$/.test(f))
    .map((f) => Number(f.match(/^sprint-(\d+)\.md$/)[1]))
    .sort((a, b) => a - b)
    .map((n) => {
      const body = readFileSync(join(epicPath, `sprint-${n}.md`), 'utf8');
      const { total, done } = countStories(body);
      return { n, title: sprintTitleFrom(body, n), status: deriveSprintStatus(body), total, done };
    });
}

// A written, DATED retrospective is the strongest "this epic closed" signal. The scaffold template only
// carries a literal `<date>` placeholder, so requiring a real ISO date avoids false-firing on stubs.
function epicShippedByRetro(epicPath) {
  const f = join(epicPath, 'RETROSPECTIVE.md');
  if (!existsSync(f)) return false;
  const t = readFileSync(f, 'utf8');
  return /(shipped|closed|complete|live|launched)[^\n]{0,60}20\d\d-\d\d-\d\d/i.test(t)
      || /20\d\d-\d\d-\d\d[^\n]{0,60}(shipped|closed|complete|live|launched)/i.test(t)
      || /all\s+\d+\s+sprints?\s+shipped/i.test(t);
}

function deriveEpicStatus(sprints, retroShipped) {
  if (retroShipped) return 'Shipped';
  if (sprints.length && sprints.every((s) => s.status === 'Shipped')) return 'Shipped';
  if (sprints.some((s) => s.status === 'Shipped' || s.status === 'In progress' || s.status === 'In review')) return 'In progress';
  return 'Scaffolded'; // scaffolded-only / all Planned
}

function buildRows() {
  const seeds = readSeeds();
  const seedByEpic = new Map();
  for (const s of seeds) if (s.epic) seedByEpic.set(s.epic, s);

  const rows = [];

  for (const e of listEpicDirs()) {
    const epicKey = `${e.macro}/${e.slug}`;
    const seed = seedByEpic.get(epicKey) || {};
    const sprints = epicSprints(e.path);
    const retroShipped = epicShippedByRetro(e.path);
    const status = deriveEpicStatus(sprints, retroShipped);
    const totStories = sprints.reduce((a, s) => a + s.total, 0);
    const doneStories = sprints.reduce((a, s) => a + s.done, 0);
    const area = AREA_NAMES[e.area] || e.area;
    const priority = seed.priority ? PRIORITY_LABEL[seed.priority] || seed.priority : null;
    const risk = seed.risk ? (seed.risk === 'high' ? 'High' : 'Low') : null;

    // Epic row
    rows.push({
      name: epicTitle(e.path, e.slug),
      slug: e.slug,
      grain: 'Epic',
      status,
      area,
      priority,
      type: TYPE_LABEL[seed.type] || 'Epic',
      risk,
      sprint_progress: totStories ? `${doneStories}/${totStories} stories` : `${sprints.length} sprints`,
      build_order: seed.build_order || null,
      doc_link: `Roadmap/${epicKey}/README.md`,
      epic_slug: null,
    });

    // Sprint rows (one per sprint-N.md), related to the Epic by slug
    for (const sp of sprints) {
      // A closed epic (dated retro) whose older sprint files lack tick-markers: floor Planned → Shipped
      // so the Sprint board doesn't show a Shipped epic full of "Planned" sprints. Real in-flight signals
      // (In progress / In review) are preserved.
      const sprintStatus = retroShipped && sp.status === 'Planned' ? 'Shipped' : sp.status;
      rows.push({
        name: `${epicTitle(e.path, e.slug)} — S${sp.n}: ${sp.title}`,
        slug: `${e.slug}--s${sp.n}`,
        grain: 'Sprint',
        status: sprintStatus,
        area,
        priority,
        type: 'Sprint',
        risk,
        sprint_progress: sp.total ? `${sp.done}/${sp.total} stories` : '—',
        build_order: seed.build_order || null,
        doc_link: `Roadmap/${epicKey}/sprint-${sp.n}.md`,
        epic_slug: e.slug, // resolved to the Epic page id at sync time
      });
    }
  }

  // Seed rows: only seeds with no scaffolded epic (epic == null)
  for (const s of seeds.filter((x) => !x.epic)) {
    rows.push({
      name: s.title || s.slug,
      slug: s.slug,
      grain: 'Seed',
      status: SEED_STATUS_LABEL[s.status] || 'Raw',
      area: AREA_NAMES[s.area] || s.area || null,
      priority: s.priority ? PRIORITY_LABEL[s.priority] || s.priority : null,
      type: TYPE_LABEL[s.type] || 'Feature',
      risk: s.risk ? (s.risk === 'high' ? 'High' : 'Low') : null,
      sprint_progress: null,
      build_order: s.build_order || null,
      doc_link: s._file,
      epic_slug: null,
    });
  }
  return rows;
}

const mode = process.argv.includes('--sync') ? 'sync' : 'extract';
const rows = buildRows();

if (mode === 'extract') {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

// --- sync mode: upsert into Notion by slug (docs always win) ---
const TOKEN = process.env.NOTION_TOKEN;
const DB = process.env.NOTION_DB_ID;
if (!TOKEN || !DB) { console.error('sync: set NOTION_TOKEN and NOTION_DB_ID'); process.exit(1); }
const NV = '2022-06-28';
const api = (path, init = {}) => fetch(`https://api.notion.com/v1${path}`, {
  ...init,
  headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': NV, 'Content-Type': 'application/json', ...(init.headers || {}) },
}).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j)); return j; });

const sel = (v) => (v ? { select: { name: String(v) } } : { select: null });
const rt = (v) => ({ rich_text: v ? [{ text: { content: String(v) } }] : [] });
function props(row, epicId) {
  const p = {
    Name: { title: [{ text: { content: row.name } }] },
    Slug: rt(row.slug),
    Status: sel(row.status),
    Area: sel(row.area),
    Priority: sel(row.priority),
    Type: sel(row.type),
    Risk: sel(row.risk),
    Grain: sel(row.grain),
    'Sprint progress': rt(row.sprint_progress),
    'Build order ID': rt(row.build_order),
    'Doc link': rt(row.doc_link),
    'Last synced': { date: { start: new Date().toISOString().slice(0, 10) } },
  };
  if (row.grain === 'Sprint') p.Epic = { relation: epicId ? [{ id: epicId }] : [] };
  return p;
}

// 1. Snapshot existing rows by slug
const existing = new Map();
let cursor;
do {
  const page = await api(`/databases/${DB}/query`, { method: 'POST', body: JSON.stringify(cursor ? { start_cursor: cursor } : {}) });
  for (const p of page.results) {
    const slug = p.properties?.Slug?.rich_text?.[0]?.plain_text;
    if (slug) existing.set(slug, p.id);
  }
  cursor = page.has_more ? page.next_cursor : null;
} while (cursor);

const slugToId = new Map(existing); // slug -> page id (kept current as we upsert)
async function upsert(row, epicId) {
  const id = slugToId.get(row.slug) || existing.get(row.slug);
  if (id) { await api(`/pages/${id}`, { method: 'PATCH', body: JSON.stringify({ properties: props(row, epicId) }) }); return { id, created: false }; }
  const created = await api(`/pages`, { method: 'POST', body: JSON.stringify({ parent: { database_id: DB }, properties: props(row, epicId) }) });
  slugToId.set(row.slug, created.id);
  return { id: created.id, created: true };
}

let created = 0, updated = 0;
// Pass 1: Epics + Seeds first (so sprint→epic relations can resolve)
for (const row of rows.filter((r) => r.grain !== 'Sprint')) {
  const r = await upsert(row); r.created ? created++ : updated++;
}
// Pass 2: Sprints, relation → parent epic page id
for (const row of rows.filter((r) => r.grain === 'Sprint')) {
  const epicId = slugToId.get(row.epic_slug) || existing.get(row.epic_slug) || null;
  const r = await upsert(row, epicId); r.created ? created++ : updated++;
}
// Archive Notion rows whose slug no longer exists in docs (never hard-delete)
for (const [slug, id] of existing) {
  if (!rows.find((r) => r.slug === slug)) { await api(`/pages/${id}`, { method: 'PATCH', body: JSON.stringify({ properties: { Status: sel('Archived') } }) }); }
}
console.log(`sync done — created ${created}, updated ${updated}, scanned ${existing.size} existing`);
