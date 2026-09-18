#!/usr/bin/env node
// live-smoke.mjs — repo-root entry point for the ways-of-work `live-smoke` skill.
//
// The skill (and the dobby-foundation template) run `node scripts/live-smoke.mjs` from the repo root. This
// project's live-smoke is APP-LOCAL — apps/miyagisanchez/scripts/live-smoke.mjs — because its authed flows
// need that app's Playwright project and Clerk sign-in helpers. It has the same flags as the template's
// (--env, --flow, --path, --spec, --file, --preview-url), so this delegates, unchanged, rather than forking
// it or moving it. There is no live-smoke.config.json here: the app script owns its env matrix.

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'miyagisanchez', 'scripts', 'live-smoke.mjs');
const r = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
