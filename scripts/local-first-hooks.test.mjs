import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const prePush = readFileSync(join(root, '.githooks', 'pre-push'), 'utf8')

test('Notion pre-push log path works in linked worktrees', () => {
  assert.match(prePush, /git rev-parse --git-common-dir/)
  assert.match(prePush, /git rev-parse --git-path notion-sync\.last\.log/)
  assert.doesNotMatch(prePush, />\.git\/notion-sync\.last\.log/)
  assert.match(
    prePush,
    /nohup node scripts\/roadmap-to-notion\.mjs --sync >"\$notion_log" 2>&1 &/,
  )
})

test('full Notion projection is main-only and hosted sync is path-gated to main', () => {
  assert.match(prePush, /current_branch=.*git symbolic-ref/)
  assert.match(prePush, /"\$current_branch" != "main"/)

  const workflow = readFileSync(join(root, '.github', 'workflows', 'notion-sync.yml'), 'utf8')
  assert.match(workflow, /push:\s*\n\s*branches:\s*\[main\]/)
  assert.match(workflow, /paths:\s*\n\s*- 'Roadmap\/\*\*'/)
})
