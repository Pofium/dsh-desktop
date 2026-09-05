// Sync freshly rebuilt client packages into the installed dsh runtime that
// the desktop exe spawns (~/.dsh/runtime/0.1.1-rc.2). Targeted: only the
// packages named on stdin (workspace dirs) have their lib/ (and dist/ for the
// web frontend) replaced, so the installed server halves stay exactly as
// installed.
// Usage: node sync-runtime.mjs [runtime-dir] < package-dir-list
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const ROOT = resolve('C:/Projects/deepseek-harness-master')
const RUNTIME = resolve(process.argv[2] ?? join(process.env.USERPROFILE ?? '.', '.dsh', 'runtime', '0.1.1-rc.2'))
if (!existsSync(RUNTIME)) throw new Error(`runtime dir not found: ${RUNTIME}`)

const list = readFileSync(0, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(Boolean)

let synced = 0
for (const dir of list) {
  const sourceDir = resolve(ROOT, dir)
  const manifest = JSON.parse(readFileSync(join(sourceDir, 'package.json'), 'utf8'))
  const name = manifest.name
  if (typeof name !== 'string' || !name.startsWith('@deepseek-ai/')) throw new Error(`unexpected package name in ${dir}: ${String(name)}`)
  const target = join(RUNTIME, 'node_modules', name)
  if (!existsSync(target)) {
    console.log(`skip ${name}: not present in runtime`)
    continue
  }
  const lib = join(sourceDir, 'lib')
  if (existsSync(lib)) {
    rmSync(join(target, 'lib'), { recursive: true, force: true })
    cpSync(lib, join(target, 'lib'), { recursive: true })
    synced++
  }
  if (name === '@deepseek-ai/dsh-web-frontend') {
    const dist = join(sourceDir, 'dist')
    if (existsSync(dist)) {
      rmSync(join(target, 'dist'), { recursive: true, force: true })
      cpSync(dist, join(target, 'dist'), { recursive: true })
      synced++
    }
  }
  console.log(`synced ${name} (${basename(dir)})`)
}
console.log(`done: ${synced} output dir(s) updated in ${RUNTIME}`)
