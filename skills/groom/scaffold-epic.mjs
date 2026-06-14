#!/usr/bin/env node
// scaffold-epic.mjs — create an epic's Roadmap skeleton from templates (zero deps).
// Planning-only helper for the `groom` skill (Stage 7). Makes the structure; you write the content.
//
// Usage:
//   node skills/groom/scaffold-epic.mjs \
//     --slug checkout-state-hardening --area 02 \
//     --macro 02-checkout-and-payments --title "Checkout state hardening" \
//     --risk high --sprints "Durable payment state;Block ship before paid;One coupon-aware total"
//
// Flags: --type <feature|spike|chore|epic> (default feature) · --dry-run (print, write nothing)
// It does NOT commit — it prints the exact path-scoped git command for you to run.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..'); // skills/groom -> repo root
const TPL = join(__dirname, 'templates');

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const key = t.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { a[key] = true; }
      else { a[key] = next; i++; }
    }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const required = ['slug', 'area', 'macro', 'title', 'sprints'];
const missing = required.filter((k) => !args[k] || args[k] === true);
if (missing.length) {
  console.error(`scaffold-epic: missing required flag(s): ${missing.map((m) => '--' + m).join(', ')}`);
  console.error('Run with --slug --area --macro --title --sprints "S1;S2;S3" [--risk low|high] [--type feature] [--dry-run]');
  process.exit(1);
}

const slug = String(args.slug);
const area = String(args.area);
const macro = String(args.macro);
const title = String(args.title);
const risk = String(args.risk || 'high');
const type = String(args.type || 'feature');
const dryRun = !!args['dry-run'];
const date = new Date().toISOString().slice(0, 10);
const sprints = String(args.sprints).split(';').map((s) => s.trim()).filter(Boolean);

if (!sprints.length) { console.error('scaffold-epic: --sprints produced no sprint titles'); process.exit(1); }

const epicDir = join(REPO_ROOT, 'Roadmap', macro, slug);
if (existsSync(epicDir)) {
  console.error(`scaffold-epic: refusing to clobber existing epic dir: Roadmap/${macro}/${slug}`);
  process.exit(1);
}

const sub = (str, vars) => str.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));
const baseVars = { SLUG: slug, TITLE: title, AREA: area, MACRO: macro, RISK: risk, TYPE: type, DATE: date };

const sprintList = sprints
  .map((st, i) => `| ${i + 1} | ${st} | ${risk} |`)
  .join('\n');

const epicTpl = readFileSync(join(TPL, 'epic-README.md'), 'utf8');
const sprintTpl = readFileSync(join(TPL, 'sprint-N.md'), 'utf8');
const retroTpl = readFileSync(join(TPL, 'RETROSPECTIVE.md'), 'utf8');

const files = [];
files.push([join(epicDir, 'README.md'), sub(epicTpl, { ...baseVars, SPRINT_LIST: sprintList })]);
sprints.forEach((st, i) => {
  files.push([join(epicDir, `sprint-${i + 1}.md`), sub(sprintTpl, { ...baseVars, N: String(i + 1), SPRINT_TITLE: st })]);
});
files.push([join(epicDir, 'RETROSPECTIVE.md'), sub(retroTpl, baseVars)]);

const rel = (p) => p.replace(REPO_ROOT + '/', '');

if (dryRun) {
  console.log(`[dry-run] would create epic Roadmap/${macro}/${slug} with ${files.length} files:`);
  files.forEach(([p]) => console.log('  + ' + rel(p)));
  process.exit(0);
}

mkdirSync(epicDir, { recursive: true });
files.forEach(([p, body]) => writeFileSync(p, body));

console.log(`Scaffolded epic Roadmap/${macro}/${slug} (${files.length} files):`);
files.forEach(([p]) => console.log('  + ' + rel(p)));
console.log('\nNext:');
console.log(`  1. Fill the generated files with real stories / reuse list / QA stages.`);
console.log(`  2. The epic README frontmatter \`status:\` is the SSOT (born \`scaffolded\`; set \`shipped\` at close).`);
console.log(`     Set the SEED frontmatter \`epic: "${macro}/${slug}"\` so it leaves the funnel (the seed is funnel-only after this).`);
console.log(`  3. Commit PATH-SCOPED (never git add -A):`);
const paths = files.map(([p]) => `'${rel(p)}'`).join(' ');
console.log(`     git add ${paths} 'Roadmap/00-ideas/seeds/${slug}.md'`);
console.log(`     git commit -- ${paths} 'Roadmap/00-ideas/seeds/${slug}.md' -m "plan(${slug}): scaffold epic + sprints"`);
