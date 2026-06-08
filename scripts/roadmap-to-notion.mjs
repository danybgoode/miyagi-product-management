#!/usr/bin/env node
// roadmap-to-notion.mjs — project the Roadmap docs into the Notion "Marketplace Roadmap" board.
// ONE-WAY, docs → Notion. Docs are the only source of truth; the board is a rebuilt projection.
//
// Modes:
//   --extract           print the projected rows as JSON (no Notion needed; the testable core)
//   --sync              upsert rows into Notion (needs env NOTION_TOKEN + NOTION_DB_ID)
//
// Row model (signed-off map):
//   Name · Status · Area · Priority · Type · Risk · Grain · Sprint progress · Build order ID · Doc link
// Grain rule (full funnel): one row per EPIC folder + one row per SEED whose frontmatter has epic == null
// (scaffolded/shipped seeds are represented by their epic row, not duplicated).
//
// Status derivation (docs win): epic with RETROSPECTIVE.md or poster ✅ => Shipped;
//   some sprint stories ticked => In progress; epic dir exists => Scaffolded;
//   seed frontmatter otherwise (raw|ready|queued|archived|in-progress|shipped).

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
};
const STATUS_LABEL = {
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
      const q = v[0]; const end = v.indexOf(q, 1);
      v = end > 0 ? v.slice(1, end) : v.slice(1);        // quoted: take inside quotes (keeps '#5')
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

function epicProgress(epicPath) {
  const sprints = readdirSync(epicPath).filter((f) => /^sprint-\d+\.md$/.test(f));
  let total = 0, done = 0, anyTick = false;
  for (const s of sprints) {
    const body = readFileSync(join(epicPath, s), 'utf8');
    const ticked = (body.match(/✅|\[x\]/gi) || []).length;
    const stories = (body.match(/^###\s+Story/gim) || []).length;
    total += stories; done += Math.min(ticked, stories || ticked);
    if (ticked > 0) anyTick = true;
  }
  return { sprints: sprints.length, total, done, anyTick };
}

function deriveEpicStatus(epicPath) {
  if (existsSync(join(epicPath, 'RETROSPECTIVE.md'))) {
    // RETROSPECTIVE may be a stub; treat existence + non-trivial size as shipped signal
    const retro = readFileSync(join(epicPath, 'RETROSPECTIVE.md'), 'utf8');
    if (retro.replace(/<!--[\s\S]*?-->/g, '').replace(/[#\s\-_]/g, '').length > 40) return 'shipped';
  }
  const p = epicProgress(epicPath);
  if (p.anyTick) return 'in-progress';
  return 'scaffolded';
}

function buildRows() {
  const seeds = readSeeds();
  const seedByEpic = new Map();
  for (const s of seeds) if (s.epic) seedByEpic.set(s.epic, s);

  const rows = [];

  // Epic rows
  for (const e of listEpicDirs()) {
    const epicKey = `${e.macro}/${e.slug}`;
    const seed = seedByEpic.get(epicKey) || {};
    const status = deriveEpicStatus(e.path);
    const prog = epicProgress(e.path);
    rows.push({
      name: epicTitle(e.path, e.slug),
      slug: e.slug,
      grain: 'Epic',
      status: STATUS_LABEL[status],
      area: AREA_NAMES[e.area] || e.area,
      priority: seed.priority ? PRIORITY_LABEL[seed.priority] || seed.priority : null,
      type: TYPE_LABEL[seed.type] || 'Epic',
      risk: seed.risk ? (seed.risk === 'high' ? 'High' : 'Low') : null,
      sprint_progress: prog.total ? `${prog.done}/${prog.total} stories` : `${prog.sprints} sprints`,
      build_order: seed.build_order || null,
      doc_link: `Roadmap/${epicKey}/README.md`,
    });
  }

  // Seed rows: only seeds with no scaffolded epic (epic == null)
  for (const s of seeds.filter((x) => !x.epic)) {
    rows.push({
      name: s.title || s.slug,
      slug: s.slug,
      grain: 'Seed',
      status: STATUS_LABEL[s.status] || 'Raw',
      area: AREA_NAMES[s.area] || s.area || null,
      priority: s.priority ? PRIORITY_LABEL[s.priority] || s.priority : null,
      type: TYPE_LABEL[s.type] || 'Feature',
      risk: s.risk ? (s.risk === 'high' ? 'High' : 'Low') : null,
      sprint_progress: null,
      build_order: s.build_order || null,
      doc_link: s._file,
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
function props(row) {
  return {
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
}

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

let created = 0, updated = 0;
for (const row of rows) {
  const id = existing.get(row.slug);
  if (id) { await api(`/pages/${id}`, { method: 'PATCH', body: JSON.stringify({ properties: props(row) }) }); updated++; }
  else { await api(`/pages`, { method: 'POST', body: JSON.stringify({ parent: { database_id: DB }, properties: props(row) }) }); created++; }
}
// Archive Notion rows whose slug no longer exists in docs (never hard-delete)
for (const [slug, id] of existing) {
  if (!rows.find((r) => r.slug === slug)) { await api(`/pages/${id}`, { method: 'PATCH', body: JSON.stringify({ properties: { Status: sel('Archived') } }) }); }
}
console.log(`sync done — created ${created}, updated ${updated}, scanned ${existing.size} existing`);
