// Sync the whole freshly-built workspace into the installed dsh runtime
// (~/.dsh/runtime/0.1.1-rc.2): every @deepseek-ai/* runtime dependency that
// maps to a workspace package gets its lib/ (and dist/ for the web frontend)
// replaced, and the runtime root (the CLI package itself) gets lib/ + config/.
// The result is a consistent single-version runtime.
// Usage: node sync-runtime-full.mjs [runtime-dir]
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve('C:/Projects/deepseek-harness-master')
const RUNTIME = resolve(process.argv[2] ?? join(process.env.USERPROFILE ?? '.', '.dsh', 'runtime', '0.1.1-rc.2'))
if (!existsSync(RUNTIME)) throw new Error(`runtime dir not found: ${RUNTIME}`)

// name → source dir over vendor/*, packages/<group>/<pkg>, apps/<pkg>
const index = new Map()
const scan = (dir) => {
  const manifest = join(dir, 'package.json')
  if (!existsSync(manifest)) return
  try { index.set(JSON.parse(readFileSync(manifest, 'utf8')).name, dir) } catch { /* ignore malformed */ }
}
for (const d of readdirSync(join(ROOT, 'vendor'))) scan(join(ROOT, 'vendor', d))
for (const g of readdirSync(join(ROOT, 'packages'))) {
  const group = join(ROOT, 'packages', g)
  if (!statSync(group).isDirectory()) continue
  for (const d of readdirSync(group)) scan(join(group, d))
}
for (const d of readdirSync(join(ROOT, 'apps'))) scan(join(ROOT, 'apps', d))

let synced = 0
const missing = []

/** Replace one built output directory inside a runtime package dir. */
function refreshOutDir(runtimePkgDir, sourceDir, outDirName) {
  const built = join(sourceDir, outDirName)
  if (!existsSync(built)) return false
  rmSync(join(runtimePkgDir, outDirName), { recursive: true, force: true })
  cpSync(built, join(runtimePkgDir, outDirName), { recursive: true })
  return true
}

// 1. The runtime root is the CLI package itself (apps/cli): lib + config.
const cliDir = index.get('@deepseek-ai/dsh')
if (cliDir !== undefined) {
  if (refreshOutDir(RUNTIME, cliDir, 'lib')) synced++
  if (refreshOutDir(RUNTIME, cliDir, 'config')) synced++
  console.log('runtime root (cli):', cliDir)
} else missing.push('@deepseek-ai/dsh (runtime root)')

// 2. Every scoped runtime dependency that maps to a workspace package.
const nm = join(RUNTIME, 'node_modules', '@deepseek-ai')
for (const name of readdirSync(nm)) {
  const runtimePkgDir = join(nm, name)
  if (!statSync(runtimePkgDir).isDirectory()) continue
  const sourceDir = index.get(`@deepseek-ai/${name}`)
  if (sourceDir === undefined) { missing.push(`@deepseek-ai/${name}`); continue }
  let touched = refreshOutDir(runtimePkgDir, sourceDir, 'lib')
  if (name === 'dsh-web-frontend') touched = refreshOutDir(runtimePkgDir, sourceDir, 'dist') || touched
  if (existsSync(join(sourceDir, 'config'))) touched = refreshOutDir(runtimePkgDir, sourceDir, 'config') || touched
  // Bundle root manifests are loaded from the package dir at boot (not from
  // lib/), so a stale copy here drops inserts the fresh lib expects — for
  // example a cordis.patch.yml insert row added upstream between syncs.
  for (const manifest of ['cordis.patch.yml', 'cordis.yml']) {
    if (existsSync(join(sourceDir, manifest))) {
      cpSync(join(sourceDir, manifest), join(runtimePkgDir, manifest))
      touched = true
    }
  }
  if (touched) synced++
}

console.log(`synced ${synced} output dir(s) into ${RUNTIME}`)
if (missing.length) console.log('no workspace source for (left untouched):', missing.join(', '))
