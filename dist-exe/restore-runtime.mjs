// Restore the entire runtime to pristine 0.1.1-rc.2 from npm tarballs.
// Usage: node restore-runtime.mjs [runtime-dir]
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const RUNTIME = resolve(process.argv[2] ?? join(process.env.USERPROFILE ?? '.', '.dsh', 'runtime', '0.1.1-rc.2'))
const CACHE = 'C:/Users/ipres/AppData/Local/Temp/runtime-restore'
mkdirSync(CACHE, { recursive: true })

const VERSION = '0.1.1-rc.2'
const win = (p) => p.split('/').join('\\')
const jobs = [] // { name, target, sub }

// 1. The runtime root CLI package.
jobs.push({ name: '@deepseek-ai/dsh', target: RUNTIME, items: ['lib', 'config'] })
// 2. Every scoped package directory.
const scoped = join(RUNTIME, 'node_modules', '@deepseek-ai')
for (const name of readdirSync(scoped)) {
  if (!statSync(join(scoped, name)).isDirectory()) continue
  jobs.push({ name: '@deepseek-ai/' + name, target: join(scoped, name), items: ['lib', 'dist', 'config'] })
}

const ok = []
const fail = []
for (const job of jobs) {
  const tgz = join(CACHE, job.name.replace('@', '').replace('/', '-') + '-' + VERSION + '.tgz')
  if (!existsSync(tgz)) {
    try {
      const out = execSync('npm pack "' + job.name + '@' + VERSION + '" --pack-destination "' + CACHE + '"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      const produced = out.trim().split(/\r?\n/).pop()
      if (produced !== job.name.replace('@', '').replace('/', '-') + '-' + VERSION + '.tgz') throw new Error('unexpected pack output: ' + produced)
    } catch (e) {
      fail.push(job.name + ' (pack)')
      continue
    }
  }
  try {
    const staging = join(CACHE, 'stage', job.name.replace('/', '_'))
    rmSync(staging, { recursive: true, force: true })
    mkdirSync(staging, { recursive: true })
    execSync('tar --force-local -xzf "' + win(tgz) + '" -C "' + win(staging) + '"', { stdio: 'ignore' })
    const pkgDir = join(staging, 'package')
    for (const item of job.items) {
      const from = join(pkgDir, item)
      if (!existsSync(from)) continue
      const target = join(job.target, item)
      rmSync(target, { recursive: true, force: true })
      cpSync(from, target, { recursive: true })
    }
    rmSync(staging, { recursive: true, force: true })
    ok.push(job.name)
  } catch (e) {
    fail.push(job.name + ' (extract: ' + (e.message || '').slice(0, 60) + ')')
  }
}
console.log('restored:', ok.length, 'failed:', fail.length)
if (fail.length) console.log('failures:\n' + fail.join('\n'))
