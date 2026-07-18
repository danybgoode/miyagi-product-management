// pmo-trend-view.mjs — reporthub-as-notion S2.2: PMO metrics graphs. Pure data-shaping only: turns the
// PMO window log's ALREADY-COMPUTED per-window summaries (see scripts/lib/pmo-window-log.mjs's
// pmoLogLine — the same object pmo-report.mjs persists to claude/pmo-reports-log on every --weekly run)
// into SmallDocs ```chart fenced-block markdown. No new metric computation — this epic's Medusa-first
// note ("no new report-computation code") applies here too: every number plotted already exists in a
// log line pmo-report.mjs wrote; this module only reshapes history into chart JSON.
//
// This is the source markdown for the hub's stable "PMO metrics" view. scripts/publish-live-views.mjs
// uploads it to a well-known, overwrite-allowed live/ slug so the EXISTING /r/<slug> resolver (built in
// Sprint 1, deployed) serves it with zero fork-side changes — see that script's header comment for why.
//
// The weekly/monthly Telegram decks (scripts/pmo/templates/*.md) already ship a SNAPSHOT bar chart of
// the current window plus a benchmarks table (the "AI-differential") — that satisfies "weekly PMO
// Telegram message links a chart view" on its own (Sprint 1's registry upgrade already makes that link
// short). What was missing, and what this module adds, is a TREND across windows (the log has many
// entries; the snapshot decks only ever show the latest one) surfaced as its own stable hub view.

function pad2(n) {
  return String(n).padStart(2, '0');
}

function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  return `${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())}`;
}

// Most recent `maxWindows` log entries, oldest-first (a chart reads left-to-right as time-forward, and
// parsePmoLog/pmoLogLine already append in chronological order, so this is a plain tail-slice).
export function recentWindows(logEntries, maxWindows = 12) {
  return (logEntries || []).slice(-maxWindows);
}

export function buildThroughputChart(logEntries, { maxWindows = 12 } = {}) {
  const windows = recentWindows(logEntries, maxWindows);
  return {
    type: 'line',
    title: 'Throughput por ventana PMO',
    subtitle: 'Historias y epics shipped por corte',
    labels: windows.map((w) => shortDate(w.windowEnd)),
    datasets: [
      { label: 'Historias shipped', values: windows.map((w) => w.summary?.shippedStories ?? 0) },
      { label: 'Epics shipped', values: windows.map((w) => w.summary?.shippedEpics ?? 0) },
    ],
    yAxis: 'Conteo',
  };
}

export function buildDoraChart(logEntries, { maxWindows = 12 } = {}) {
  const windows = recentWindows(logEntries, maxWindows);
  return {
    type: 'line',
    title: 'DORA-ish por ventana PMO',
    subtitle: 'Deploys y change-fail proxy por corte',
    labels: windows.map((w) => shortDate(w.windowEnd)),
    datasets: [
      { label: 'Deploys (merges a main)', values: windows.map((w) => w.summary?.deploys ?? 0) },
      { label: 'Change-fail proxy', values: windows.map((w) => w.summary?.changeFailProxy ?? 0) },
    ],
    yAxis: 'Conteo',
  };
}

export function buildDocOpsChart(logEntries, { maxWindows = 12 } = {}) {
  const windows = recentWindows(logEntries, maxWindows);
  return {
    type: 'bar',
    title: 'Doc-ops por ventana PMO',
    subtitle: 'Promociones a LEARNINGS por corte',
    labels: windows.map((w) => shortDate(w.windowEnd)),
    values: windows.map((w) => w.summary?.learningsPromotions ?? 0),
    yAxis: 'Promociones',
  };
}

function chartBlock(chart) {
  return ['```chart', JSON.stringify(chart), '```'].join('\n');
}

export function buildPmoMetricsMarkdown({ logEntries = [], generatedAt = new Date(), maxWindows = 12 } = {}) {
  const windows = recentWindows(logEntries, maxWindows);
  const generatedDate = generatedAt.toISOString().slice(0, 10);
  const lines = [
    '---',
    'title: "PMO metrics - Miyagi Reports"',
    'tags: ["pmo", "metrics", "live"]',
    'styles:',
    '  theme:',
    '    accent: "#0d2f2b"',
    '    highlight: "#f2ff5c"',
    '---',
    '',
    '# PMO metrics',
    '',
    `> Vista viva generada ${generatedDate} desde ${windows.length} ventana(s) del log operativo ` +
      '(`claude/pmo-reports-log`). Se republica en cada corte PMO — este link no cambia.',
    '',
  ];

  if (!windows.length) {
    lines.push(
      '## Sin datos todavia',
      '',
      'Aun no hay ventanas PMO registradas. Corre `node scripts/pmo-report.mjs --weekly` para establecer la primera.'
    );
    return lines.join('\n');
  }

  lines.push(
    '## Throughput',
    '',
    chartBlock(buildThroughputChart(logEntries, { maxWindows })),
    '',
    '## DORA-ish',
    '',
    chartBlock(buildDoraChart(logEntries, { maxWindows })),
    '',
    '## Doc-ops',
    '',
    chartBlock(buildDocOpsChart(logEntries, { maxWindows })),
    '',
    '## Fuente',
    '',
    'Datos: `scripts/pmo-report.mjs` (rama `claude/pmo-reports-log`). El diferencial vs. benchmarks ' +
      'externos (el "AI-differential") vive en el deck semanal (Telegram) y el packet mensual — ver ' +
      '`scripts/pmo/templates/`.'
  );
  return lines.join('\n');
}
