// Materialize bare-import dependencies that freshly built runtime packages
// need but the runtime node_modules lacks. For every @deepseek-ai/* package
// (and the runtime root lib), parse emitted JS for bare specifiers, and copy
// any missing package from the workspace pnpm store into the runtime, then
// recurse into the copied package's own imports.
// Usage: node sync-runtime-deps.mjs [runtime-dir]
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve('C:/Projects/deepseek-harness-master')
const RUNTIME = resolve(process.argv[2] ?? join(process.env.USERPROFILE ?? '.', '.dsh', 'runtime', '0.1.1-rc.2'))
const RUNTIME_NM = join(RUNTIME, 'node_modules')
const ROOT_NM = join(ROOT, 'node_modules')
const PNPM_DIR = join(ROOT_NM, '.pnpm')
if (!existsSync(RUNTIME_NM)) throw new Error('runtime node_modules not found: ' + RUNTIME_NM)

// Workspace package index: name → source dir, for packages the 0.1.1 runtime
// never carried (name != directory packages have no pnpm store entry here).
const WS_INDEX = new Map()
const scanWs = (dir) => {
  const manifest = join(dir, 'package.json')
  if (!existsSync(manifest)) return
  try { WS_INDEX.set(JSON.parse(readFileSync(manifest, 'utf8')).name, dir) } catch { /* ignore malformed */ }
}
for (const g of readdirSync(ROOT)) {
  const group = join(ROOT, g)
  if (!statSync(group).isDirectory() || g === 'node_modules' || g === 'dist-exe') continue
  for (const d of readdirSync(group)) {
    const sub = join(group, d)
    if (!statSync(sub).isDirectory() || d === 'node_modules') continue
    scanWs(sub)
    if (g === 'packages') for (const d2 of readdirSync(sub)) {
      const sub2 = join(sub, d2)
      if (statSync(sub2).isDirectory() && d2 !== 'node_modules') scanWs(sub2)
    }
  }
}

const SCANNED = new Set()
const COPIED = new Set()
const FAIL = new Set()

function* jsFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) yield* jsFiles(full)
    else if (/\.m?js$/u.test(entry)) yield full
  }
}

/** Bare package name of an imported specifier ('a/b/c' → 'a', '@a/b/c' → '@a/b'). */
function bareName(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('#')) return undefined
  if (specifier.startsWith('node:')) return undefined
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? (parts.length >= 2 ? parts.slice(0, 2).join('/') : undefined) : parts[0]
}

function* bareImports(file) {
  const text = readFileSync(file, 'utf8')
  const re = /(?:import\s[^;'"]*?from\s*|import\s*\(\s*|require\(\s*|export\s[^;'"]*?from\s*)["']([^"']+)["']/g
  for (const m of text.matchAll(re)) {
    const name = bareName(m[1])
    if (name !== undefined) yield name
  }
}

/** Locate a package copy in the workspace pnpm layout. */
function findWorkspacePackage(name) {
  const direct = join(ROOT_NM, name)
  if (existsSync(direct)) return direct
  if (!existsSync(PNPM_DIR)) return undefined
  const prefix = name.replace('/', '+') + '@'
  for (const entry of readdirSync(PNPM_DIR)) {
    if (!entry.startsWith(prefix)) continue
    const candidate = join(PNPM_DIR, entry, 'node_modules', name)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

function ensurePackage(name) {
  if (SCANNED.has(name) || FAIL.has(name)) return
  SCANNED.add(name)
  const target = join(RUNTIME_NM, name)
  if (!existsSync(target)) {
    let source = findWorkspacePackage(name)
    let mode = 'external'
    if (source === undefined && WS_INDEX.has(name)) {
      // A workspace package the runtime never shipped: materialize it as a
      // package.json + built lib pair, mirroring the packed runtime layout.
      source = WS_INDEX.get(name)
      mode = 'workspace'
    }
    if (source === undefined) {
      FAIL.add(name)
      console.log('MISSING (not in workspace):', name)
      return
    }
    if (mode === 'workspace') {
      // Copy only shipped artifacts: the source tree's own node_modules holds
      // cyclic pnpm links that must never be dereferenced into the runtime.
      mkdirSync(target, { recursive: true })
      for (const item of ['package.json', 'lib', 'dist', 'config']) {
        const from = join(source, item)
        if (existsSync(from)) cpSync(from, join(target, item), { recursive: true, dereference: true })
      }
    } else {
      cpSync(source, target, { recursive: true, dereference: true })
    }
    COPIED.add(name)
    console.log('copied (' + mode + '):', name)
  }
  // Recurse into the package now present in the runtime.
  for (const sub of ['lib', 'dist']) {
    const dir = join(target, sub)
    if (existsSync(dir) && statSync(dir).isDirectory()) {
      for (const file of jsFiles(dir)) for (const dep of bareImports(file)) ensurePackage(dep)
    }
  }
}

// 1. Seed from every @deepseek-ai package in the runtime.
const scoped = join(RUNTIME_NM, '@deepseek-ai')
for (const name of readdirSync(scoped)) {
  const dir = join(scoped, name)
  if (!statSync(dir).isDirectory()) continue
  for (const sub of ['lib', 'dist']) {
    const libDir = join(dir, sub)
    if (existsSync(libDir) && statSync(libDir).isDirectory()) {
      for (const file of jsFiles(libDir)) for (const dep of bareImports(file)) ensurePackage(dep)
    }
  }
}
// 2. The runtime root CLI lib.
const rootLib = join(RUNTIME, 'lib')
if (existsSync(rootLib)) {
  for (const file of jsFiles(rootLib)) for (const dep of bareImports(file)) ensurePackage(dep)
}

console.log('done: ' + COPIED.size + ' copied, ' + SCANNED.size + ' scanned, ' + FAIL.size + ' missing')
