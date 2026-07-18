import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSmallDocsUrl } from './pmo-templates.mjs';
import { isFunnelSeed } from './roadmap-status-buckets.mjs';

const DEFAULT_SOURCE_BASE = 'https://github.com/danybgoode/miyagi-product-management/blob/main';
const HASH_BASE = 'https://pmo-smalldocs.local';

const STATUS_ORDER = {
  'In progress': 0,
  Scaffolded: 1,
  Ready: 2,
  Queued: 3,
  Raw: 4,
  Shipped: 5,
  Archived: 6,
};

const STATUS_LABEL_ES = {
  'In progress': 'En curso',
  Scaffolded: 'Listo para construir',
  Ready: 'Listo',
  Queued: 'En cola',
  Raw: 'Idea cruda',
  Shipped: 'Shipped',
  Archived: 'Archivado',
  Planned: 'Planeado',
  'In review': 'En revision',
};

const GRAIN_LABEL_ES = {
  Epic: 'Epic',
  Sprint: 'Sprint',
  Seed: 'Idea',
};

function clean(value, fallback = '') {
  return value == null || value === '' ? fallback : String(value);
}

export function stripFrontmatter(markdown) {
  if (!markdown.startsWith('---')) return markdown;
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 4).replace(/^\s+/, '');
}

function normalizeLine(line) {
  return line
    .replace(/<[^>]+>/g, '')
    .replace(/\[[ xX]\]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function firstUsefulParagraph(markdown, maxChars = 520) {
  const body = stripFrontmatter(markdown)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !line.startsWith('|'))
    .filter((line) => !line.startsWith('```'))
    .filter((line) => !/^[-*_]{3,}$/.test(line));
  const picked = body.find((line) => normalizeLine(line).length >= 70) || body[0] || '';
  const normalized = normalizeLine(picked);
  return normalized.length > maxChars ? `${normalized.slice(0, maxChars - 1).trim()}...` : normalized;
}

export function extractHeadings(markdown, max = 10) {
  const body = stripFrontmatter(markdown);
  const out = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^#{2,3}\s+(.+)$/);
    if (!m) continue;
    const text = normalizeLine(m[1].replace(/[\u2705\u2b1c\u{1f3d7}\u{1f7e6}]/gu, ''));
    if (!text || /^smoke|qa|definition of done$/i.test(text)) continue;
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

export function parseProgress(progress) {
  const m = String(progress || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return { done: null, total: null, percent: null };
  const done = Number(m[1]);
  const total = Number(m[2]);
  return { done, total, percent: total ? Math.round((done / total) * 100) : null };
}

function byStatusThenAreaThenName(a, b) {
  return (STATUS_ORDER[a.status] ?? 50) - (STATUS_ORDER[b.status] ?? 50)
    || clean(a.area).localeCompare(clean(b.area))
    || clean(a.name).localeCompare(clean(b.name));
}

function byBuildOrderThenName(a, b) {
  const aa = Number.isFinite(Number(a.build_order)) ? Number(a.build_order) : 9999;
  const bb = Number.isFinite(Number(b.build_order)) ? Number(b.build_order) : 9999;
  return aa - bb || clean(a.area).localeCompare(clean(b.area)) || clean(a.name).localeCompare(clean(b.name));
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = clean(row[key], 'Sin clasificar');
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

export function summarizeRoadmapRows(rows) {
  const epics = rows.filter((row) => row.grain === 'Epic');
  const sprints = rows.filter((row) => row.grain === 'Sprint');
  const seeds = rows.filter((row) => row.grain === 'Seed');
  return {
    total: rows.length,
    epics: epics.length,
    sprints: sprints.length,
    seeds: seeds.length,
    shippedEpics: epics.filter((row) => row.status === 'Shipped').length,
    activeEpics: epics.filter((row) => row.status === 'In progress').length,
    scaffoldedEpics: epics.filter((row) => row.status === 'Scaffolded').length,
    // reporthub-as-notion S2.1 fix: a seed that already shipped/scaffolded/archived is still
    // grain:'Seed' in the projection but is NOT a funnel member — matches
    // Roadmap/00-ideas/BUILD-ORDER.md's "Funnel" count exactly (scripts/build-order.mjs uses the SAME
    // scripts/lib/roadmap-status-buckets.mjs definition). Previously this counted every seed row
    // unconditionally, overcounting the hub's "Ideas en funnel" stat.
    funnelSeeds: rows.filter(isFunnelSeed).length,
    byStatus: countBy(epics, 'status'),
    byArea: countBy(epics, 'area'),
  };
}

function hrefForMarkdown(markdown, { present = false } = {}) {
  const url = buildSmallDocsUrl(markdown, { baseUrl: HASH_BASE, present });
  return `/docs${new URL(url).hash}`;
}

function tableRow(cells) {
  return `| ${cells.map((cell) => String(cell).replace(/\n/g, ' ').replace(/\|/g, '/')).join(' | ')} |`;
}

function frontmatter(title, tags = []) {
  return [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `tags: [${tags.map((tag) => `"${tag}"`).join(', ')}]`,
    'styles:',
    '  slideAspectRatio: "16:9"',
    '  theme:',
    '    accent: "#0d2f2b"',
    '    highlight: "#f2ff5c"',
    '---',
    '',
  ].join('\n');
}

function sourceUrl(row, sourceBaseUrl) {
  return `${sourceBaseUrl}/${row.doc_link}`;
}

export function buildRoadmapItemMarkdown(row, { markdown = '', generatedAt = new Date(), sourceBaseUrl = DEFAULT_SOURCE_BASE } = {}) {
  const summary = firstUsefulParagraph(markdown) || 'Resumen publico generado desde la proyeccion del Roadmap.';
  const headings = extractHeadings(markdown, row.grain === 'Epic' ? 9 : 7);
  const progress = clean(row.sprint_progress, 'Sin progreso registrado');
  const title = `${clean(row.name, row.slug)} - ${GRAIN_LABEL_ES[row.grain] || row.grain}`;
  const lines = [
    frontmatter(title, ['roadmap', String(row.grain || '').toLowerCase(), clean(row.status, 'status').toLowerCase().replace(/\s+/g, '-')]),
    `# ${clean(row.name, row.slug)}`,
    '',
    `> Snapshot publico del Roadmap generado ${generatedAt.toISOString().slice(0, 10)}.`,
    '',
    tableRow(['Campo', 'Valor']),
    tableRow(['---', '---']),
    tableRow(['Tipo', GRAIN_LABEL_ES[row.grain] || row.grain]),
    tableRow(['Estado', STATUS_LABEL_ES[row.status] || clean(row.status, 'Sin estado')]),
    tableRow(['Area', clean(row.area, 'Sin area')]),
    tableRow(['Progreso', progress]),
    tableRow(['Riesgo', clean(row.risk, 'No clasificado')]),
    '',
    '## Resumen',
    '',
    summary,
    '',
  ];
  if (headings.length) {
    lines.push('## Estructura visible', '');
    for (const heading of headings) lines.push(`- ${heading}`);
    lines.push('');
  }
  lines.push('## Fuente', '', `[Abrir en GitHub](${sourceUrl(row, sourceBaseUrl)})`);
  return lines.join('\n');
}

function rowsForPublicDirectory(rows) {
  return rows
    .filter((row) => ['Epic', 'Sprint', 'Seed'].includes(row.grain))
    .filter((row) => row.status !== 'Archived')
    .sort(byStatusThenAreaThenName);
}

function buildBoardMarkdown(rows, stats, generatedAt) {
  const epics = rows.filter((row) => row.grain === 'Epic').sort(byStatusThenAreaThenName);
  const lines = [
    frontmatter('Roadmap board - Miyagi Reports', ['roadmap', 'board']),
    '# Roadmap board',
    '',
    `> Corte publico generado ${generatedAt.toISOString().slice(0, 10)}.`,
    '',
    tableRow(['Indicador', 'Valor']),
    tableRow(['---', '---']),
    tableRow(['Epics shipped', stats.shippedEpics]),
    tableRow(['Epics en curso', stats.activeEpics]),
    tableRow(['Epics listos', stats.scaffoldedEpics]),
    tableRow(['Ideas en funnel', stats.funnelSeeds]),
    '',
    '## Por estado',
    '',
    tableRow(['Estado', 'Epics']),
    tableRow(['---', '---']),
  ];
  for (const [status, count] of Object.entries(stats.byStatus)) lines.push(tableRow([STATUS_LABEL_ES[status] || status, count]));
  lines.push('', '## Epics activos y listos', '');
  for (const row of epics.filter((item) => item.status !== 'Shipped').slice(0, 36)) {
    lines.push(`- **${row.name}** - ${STATUS_LABEL_ES[row.status] || row.status}; ${clean(row.sprint_progress, 'sin progreso')}.`);
  }
  return lines.join('\n');
}

function buildTimelineMarkdown(rows, generatedAt) {
  const epics = rows.filter((row) => row.grain === 'Epic' && row.status !== 'Archived').sort(byBuildOrderThenName);
  const lines = [
    frontmatter('Roadmap timeline - Miyagi Reports', ['roadmap', 'timeline']),
    '# Roadmap timeline',
    '',
    `> Secuencia operativa generada ${generatedAt.toISOString().slice(0, 10)}. Ordenada por build_order cuando existe, despues por area.`,
    '',
    tableRow(['Orden', 'Epic', 'Estado', 'Area', 'Progreso']),
    tableRow(['---', '---', '---', '---', '---']),
  ];
  for (const row of epics.slice(0, 90)) {
    lines.push(tableRow([
      clean(row.build_order, '-'),
      row.name,
      STATUS_LABEL_ES[row.status] || row.status,
      clean(row.area, '-'),
      clean(row.sprint_progress, '-'),
    ]));
  }
  return lines.join('\n');
}

function buildSprintBoardMarkdown(rows, generatedAt) {
  const sprints = rows.filter((row) => row.grain === 'Sprint').sort(byStatusThenAreaThenName);
  const lines = [
    frontmatter('Sprint board - Miyagi Reports', ['roadmap', 'sprints']),
    '# Sprint board',
    '',
    `> Vista publica generada ${generatedAt.toISOString().slice(0, 10)}.`,
    '',
    tableRow(['Sprint', 'Estado', 'Area', 'Progreso']),
    tableRow(['---', '---', '---', '---']),
  ];
  for (const row of sprints.slice(0, 120)) {
    lines.push(tableRow([row.name, STATUS_LABEL_ES[row.status] || row.status, clean(row.area, '-'), clean(row.sprint_progress, '-')]));
  }
  return lines.join('\n');
}

function buildShippedMarkdown(rows, generatedAt) {
  const shipped = rows.filter((row) => row.grain === 'Epic' && row.status === 'Shipped')
    .sort((a, b) => clean(a.area).localeCompare(clean(b.area)) || clean(a.name).localeCompare(clean(b.name)));
  const lines = [
    frontmatter('Shipped epics - Miyagi Reports', ['roadmap', 'shipped']),
    '# Shipped epics',
    '',
    `> Inventario publico generado ${generatedAt.toISOString().slice(0, 10)}.`,
    '',
  ];
  for (const row of shipped) lines.push(`- **${row.name}** - ${clean(row.area, 'Sin area')}; ${clean(row.sprint_progress, 'sin progreso')}.`);
  return lines.join('\n');
}

function buildFunnelMarkdown(rows, generatedAt) {
  // S2.1 fix: only Raw/Ready/Queued seeds are funnel members (see isFunnelSeed) — a shipped/scaffolded/
  // archived seed used to leak into this view too.
  const seeds = rows.filter(isFunnelSeed).sort(byStatusThenAreaThenName);
  const lines = [
    frontmatter('Idea funnel - Miyagi Reports', ['roadmap', 'funnel']),
    '# Idea funnel',
    '',
    `> Ideas todavia no scaffolded, generado ${generatedAt.toISOString().slice(0, 10)}.`,
    '',
    tableRow(['Idea', 'Estado', 'Area', 'Prioridad', 'Riesgo']),
    tableRow(['---', '---', '---', '---', '---']),
  ];
  for (const row of seeds) {
    lines.push(tableRow([row.name, STATUS_LABEL_ES[row.status] || row.status, clean(row.area, '-'), clean(row.priority, '-'), clean(row.risk, '-')]));
  }
  return lines.join('\n');
}

function makeView(id, title, description, kind, markdown) {
  return {
    id,
    title,
    description,
    kind,
    href: hrefForMarkdown(markdown),
  };
}

function makeItem(row, markdown, sourceBaseUrl) {
  const progress = parseProgress(row.sprint_progress);
  return {
    id: row.slug,
    title: row.name,
    grain: row.grain,
    grainLabel: GRAIN_LABEL_ES[row.grain] || row.grain,
    status: row.status,
    statusLabel: STATUS_LABEL_ES[row.status] || row.status,
    area: row.area || '',
    priority: row.priority || '',
    risk: row.risk || '',
    progressLabel: row.sprint_progress || '',
    progress,
    sourcePath: row.doc_link,
    sourceUrl: sourceUrl(row, sourceBaseUrl),
    href: hrefForMarkdown(markdown),
  };
}

export function buildReportHubData(rows, { readDoc, generatedAt = new Date(), sourceBaseUrl = DEFAULT_SOURCE_BASE } = {}) {
  const publicRows = rowsForPublicDirectory(rows);
  const stats = summarizeRoadmapRows(rows);
  const read = readDoc || ((docLink) => readFileSync(join(process.cwd(), docLink), 'utf8'));
  const items = publicRows.map((row) => {
    let markdown = '';
    try { markdown = read(row.doc_link); } catch (_) {}
    return makeItem(row, buildRoadmapItemMarkdown(row, { markdown, generatedAt, sourceBaseUrl }), sourceBaseUrl);
  });
  const views = [
    makeView('roadmap-board', 'Roadmap board', 'Estado ejecutivo por epics, progreso y funnel.', 'board', buildBoardMarkdown(rows, stats, generatedAt)),
    makeView('roadmap-timeline', 'Roadmap timeline', 'Secuencia por build_order y area para contar hacia donde vamos.', 'timeline', buildTimelineMarkdown(rows, generatedAt)),
    makeView('sprint-board', 'Sprint board', 'Vista de sprints y avance visible por historia.', 'sprints', buildSprintBoardMarkdown(rows, generatedAt)),
    makeView('shipped-feed', 'Shipped feed', 'Inventario de epics ya cerrados y listos para mostrar.', 'shipped', buildShippedMarkdown(rows, generatedAt)),
    makeView('idea-funnel', 'Idea funnel', 'Ideas sin scaffold para conversaciones futuras.', 'funnel', buildFunnelMarkdown(rows, generatedAt)),
  ];
  return {
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    source: {
      repo: 'danybgoode/miyagi-product-management',
      branch: 'main',
      baseUrl: sourceBaseUrl,
      projection: 'scripts/roadmap-to-notion.mjs --extract',
    },
    stats,
    views,
    items,
  };
}
