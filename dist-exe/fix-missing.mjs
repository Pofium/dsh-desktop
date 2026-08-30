// Copy a missing package into dist-exe/staging/node_modules, resolving its
// source from the workspace (vendor/, packages/, apps/, or the pnpm store).
// Usage: node fix-missing.mjs <package-name>
import { cpSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const name = process.argv[2]
if (!name) throw new Error('usage: node fix-missing.mjs <package-name>')
const dest = join('dist-exe/staging/node_modules', name)
if (existsSync(dest)) {
  console.log(`${name}: already present`)
  process.exit(0)
}

// name → dir index over vendor/, packages/*/*/, apps/*/
const index = new Map()
const scan = (dir) => {
  const manifest = join(dir, 'package.json')
  if (!existsSync(manifest)) return
  try {
    index.set(JSON.parse(readFileSync(manifest, 'utf8')).name, dir)
  } catch { /* ignore malformed */ }
}
for (const d of readdirSync('vendor')) scan(`vendor/${d}`)
for (const g of readdirSync('packages')) {
  if (!statSync(`packages/${g}`).isDirectory()) continue
  for (const d of readdirSync(`packages/${g}`)) scan(`packages/${g}/${d}`)
}
for (const d of readdirSync('apps')) scan(`apps/${d}`)

const candidates = []
if (index.has(name)) candidates.push(index.get(name))
candidates.push(`node_modules/${name}`)
const storePrefix = name.replace('/', '+') + '@'
for (const dir of readdirSync('node_modules/.pnpm')) {
  if (dir.startsWith(storePrefix)) candidates.push(`node_modules/.pnpm/${dir}/node_modules/${name}`)
}

const source = candidates.find(c => existsSync(join(c, 'package.json')))
if (!source) {
  console.error(`${name}: no source found in workspace`)
  process.exit(1)
}
cpSync(source, dest, {
  recursive: true,
  dereference: true,
  filter: (p) => !p.split(/[\\/]/).includes('node_modules'),
})
console.log(`${name}: copied from ${source}`)
