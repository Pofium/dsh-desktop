import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve('dist-exe');
const SOURCE_DIST = join(ROOT, 'electron-app', 'node_modules', 'electron', 'dist');
const TARGET_DIR = join(ROOT, 'DeepSeek-Harness');
const STAGING_APP = join(ROOT, 'app-staging');
const RESOURCES_DIR = join(TARGET_DIR, 'resources');

console.log('--- Packaging Standalone DeepSeek Harness Desktop App (ASAR mode) ---');

if (!existsSync(SOURCE_DIST)) {
  console.error('Error: Electron dist directory not found at', SOURCE_DIST);
  process.exit(1);
}

// 1. Clean previous build
if (existsSync(TARGET_DIR)) {
  console.log('Cleaning previous build at:', TARGET_DIR);
  rmSync(TARGET_DIR, { recursive: true, force: true });
}
if (existsSync(STAGING_APP)) {
  rmSync(STAGING_APP, { recursive: true, force: true });
}
mkdirSync(STAGING_APP, { recursive: true });

// 2. Helper to copy folder recursively
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

// 3. Copy Electron distribution files
console.log('Copying Electron binaries from:', SOURCE_DIST);
copyDir(SOURCE_DIST, TARGET_DIR);

// 4. Rename electron.exe to DeepSeek Harness.exe
const origExe = join(TARGET_DIR, 'electron.exe');
const targetExe = join(TARGET_DIR, 'DeepSeek Harness.exe');
if (existsSync(origExe)) {
  copyFileSync(origExe, targetExe);
  rmSync(origExe, { force: true });
  console.log('Renamed electron.exe -> DeepSeek Harness.exe');
}

// Remove default_app.asar
const defaultAsar = join(RESOURCES_DIR, 'default_app.asar');
if (existsSync(defaultAsar)) {
  rmSync(defaultAsar, { force: true });
}

// 5. Stage app files
console.log('Staging app files...');
const appFiles = ['main.js', 'preload.js', 'package.json', 'splash.html', 'dsh.ico', 'icon-256.png'];
for (const f of appFiles) {
  const src = join(ROOT, 'electron-app', f);
  if (existsSync(src)) {
    copyFileSync(src, join(STAGING_APP, f));
  }
}

// 6. Create app.asar archive via asar CLI
console.log('Packaging app.asar archive...');
const targetAsar = join(RESOURCES_DIR, 'app.asar');
const asarBin = join(ROOT, 'electron-app', 'node_modules', '.bin', 'asar.cmd');
execSync(`"${asarBin}" pack "${STAGING_APP}" "${targetAsar}"`, { stdio: 'inherit' });
console.log('app.asar created successfully!');
rmSync(STAGING_APP, { recursive: true, force: true });

// 7. Copy dsh.exe / node runtime into TARGET_DIR
const dshExe = join(ROOT, 'dsh.exe');
if (existsSync(dshExe)) {
  console.log('Bundling dsh.exe into application folder...');
  copyFileSync(dshExe, join(TARGET_DIR, 'dsh.exe'));
}

try {
  const node24Out = execSync('pnpm dlx node@24 -e "console.log(process.execPath)"', { encoding: 'utf8' });
  const node24Path = node24Out.trim().split(/\r?\n/).pop().trim();
  if (existsSync(node24Path)) {
    console.log('Bundling Node 24 runtime into application folder from:', node24Path);
    copyFileSync(node24Path, join(TARGET_DIR, 'node.exe'));
  }
} catch (e) {
  console.warn('Node runtime bundle note:', e.message);
}

// 8. Apply icon and set GUI subsystem to DeepSeek Harness.exe
const rcedit = join(ROOT, 'rcedit-x64.exe');
const icon = join(ROOT, 'dsh.ico');
const setSubsystem = join(ROOT, 'set-subsystem.mjs');
if (existsSync(icon)) {
  copyFileSync(icon, join(TARGET_DIR, 'dsh.ico'));
}
if (existsSync(targetExe)) {
  if (existsSync(rcedit) && existsSync(icon)) {
    console.log('Applying custom app icon via rcedit...');
    try {
      execSync(`"${rcedit}" "${targetExe}" --set-icon "${icon}"`, { stdio: 'inherit' });
      console.log('Icon applied successfully!');
    } catch (e) {
      console.warn('rcedit warning:', e.message);
    }
  }
  if (existsSync(setSubsystem)) {
    console.log('Ensuring Windows GUI subsystem (2)...');
    try {
      execSync(`node "${setSubsystem}" "${targetExe}" 2`, { stdio: 'inherit' });
    } catch (e) {
      console.warn('set-subsystem warning:', e.message);
    }
  }
}

console.log('\n======================================================');
console.log('  SUCCESS! Standalone Desktop App generated at:');
console.log(`  ${targetExe}`);
console.log('======================================================\n');
