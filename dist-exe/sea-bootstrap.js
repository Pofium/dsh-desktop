
const fs = require('fs');
const path = require('path');
const util = require('util');

const dshHome = process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh');
const logFile = path.join(dshHome, 'dsh.log');

function log(msg) {
  try {
    fs.appendFileSync(logFile, '[' + new Date().toISOString() + '] ' + msg + '\n');
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
