import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

console.log('--- 1. Patching staging and packaging bundle for SEA ---')

// 1. Run patch-staging.mjs
execSync('node dist-exe/patch-staging.mjs', { stdio: 'inherit' })

// 2. Copy staging to runtime directory in user profile
const dshHome = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh')
const version = '0.1.1-rc.2'
const runtimeDir = join(dshHome, 'runtime', version)
console.log('Synchronizing runtime to:', runtimeDir)

function copyDirRecursive(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const item of readdirSync(src)) {
    const srcPath = join(src, item)
    const destPath = join(dest, item)
    try {
      if (statSync(srcPath).isDirectory()) {
        copyDirRecursive(srcPath, destPath)
      } else {
        copyFileSync(srcPath, destPath)
      }
    } catch (e) {
      console.warn('Copy warning for', srcPath, e.message)
    }
  }
}

copyDirRecursive('dist-exe/staging', runtimeDir)
console.log('Runtime directory synchronized successfully.')

// 3. Create sea-bootstrap.js with bulletproof GUI console protection
const bootstrapCode = `
const fs = require('fs');
const path = require('path');
const util = require('util');

const dshHome = process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh');
const logFile = path.join(dshHome, 'dsh.log');

function log(msg) {
  try {
    fs.appendFileSync(logFile, '[' + new Date().toISOString() + '] ' + msg + '\\n');
  } catch {}
}

// Redirect stdout / stderr / console to safe logger
function wrapStream(stream) {
  try {
    stream.on('error', () => {});
    stream.write = function (chunk, encoding, cb) {
      try {
        fs.appendFileSync(logFile, chunk);
      } catch {}
      if (typeof encoding === 'function') encoding();
      else if (typeof cb === 'function') cb();
      return true;
    };
  } catch {}
}

wrapStream(process.stdout);
wrapStream(process.stderr);

globalThis.console.log = function(...args) {
  log(util.format(...args));
};
globalThis.console.error = function(...args) {
  log('[ERROR] ' + util.format(...args));
};
globalThis.console.warn = function(...args) {
  log('[WARN] ' + util.format(...args));
};
globalThis.console.info = function(...args) {
  log('[INFO] ' + util.format(...args));
};

process.on('uncaughtException', (err) => {
  log('Uncaught Exception: ' + (err?.stack || err));
});

process.on('unhandledRejection', (reason) => {
  log('Unhandled Rejection: ' + (reason?.stack || reason));
});

log('SEA Executable started');
log('Process argv: ' + JSON.stringify(process.argv));

const rawArgs = process.argv.slice(2);
log('Raw args: ' + JSON.stringify(rawArgs));
const effectiveArgs = rawArgs.length === 0 ? ['web'] : rawArgs;
log('Effective args: ' + JSON.stringify(effectiveArgs));

// Dynamic import of ESM entry point in runtime
const version = '0.1.1-rc.2';
const runtimeDir = path.join(dshHome, 'runtime', version);
const binPath = path.join(runtimeDir, 'lib', 'bin.js');

log('Target bin path: ' + binPath);

async function main() {
  try {
    const binUrl = require('url').pathToFileURL(binPath).href;
    log('Importing ' + binUrl);
    process.argv = [process.argv[0], binPath, ...effectiveArgs];
    await import(binUrl);
    log('Import completed, holding event loop active');
    setInterval(() => {}, 1000 * 60 * 60 * 24);
  } catch (err) {
    log('Fatal bootstrap error: ' + (err?.stack || err));
    throw err;
  }
}

main().catch(err => {
  log('Top-level bootstrap catch: ' + (err?.stack || err));
  process.exit(1);
});
`
writeFileSync('dist-exe/sea-bootstrap.js', bootstrapCode)

// 4. Create sea-config.json
const seaConfig = {
  main: 'dist-exe/sea-bootstrap.js',
  output: 'dist-exe/sea-prep.blob',
  disableExperimentalSEAWarning: true
}
writeFileSync('dist-exe/sea-config.json', JSON.stringify(seaConfig, null, 2))

// 5. Generate sea-prep.blob
console.log('--- 2. Generating sea-prep.blob ---')
execSync('pnpm dlx node@24 --experimental-sea-config dist-exe/sea-config.json', { stdio: 'inherit' })

// 6. Get clean node.exe
console.log('--- 3. Locating Node 24 binary ---')
const nodePath = execSync('pnpm dlx node@24 -e "console.log(process.execPath)"', { encoding: 'utf8' }).trim().split('\n').pop().trim()
console.log('Node 24 binary at:', nodePath)

const outExe = 'dist-exe/dsh.exe'
if (existsSync(outExe)) {
  rmSync(outExe, { force: true })
}
copyFileSync(nodePath, outExe)
console.log('Copied node.exe -> dist-exe/dsh.exe')

// 7. Set icon via rcedit BEFORE postject
console.log('--- 4. Setting icon on base binary ---')
if (existsSync('dist-exe/rcedit1.exe') && existsSync('dist-exe/dsh.ico')) {
  try {
    execSync(`dist-exe\\rcedit1.exe "${outExe}" --set-icon "dist-exe\\dsh.ico"`, { stdio: 'inherit' })
    console.log('Icon applied successfully')
  } catch (e) {
    console.warn('rcedit warning:', e.message)
  }
}

// 8. Inject blob via postject
console.log('--- 5. Injecting blob into dsh.exe via postject ---')
execSync(`pnpm dlx postject "${outExe}" NODE_SEA_BLOB "dist-exe/sea-prep.blob" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite`, { stdio: 'inherit' })

// 9. Change subsystem to Windows GUI
console.log('--- 6. Setting GUI subsystem ---')
execSync(`node dist-exe/gui-subsystem.mjs "${outExe}"`, { stdio: 'inherit' })

console.log('--- BUILD COMPLETE: dist-exe/dsh.exe ---')
