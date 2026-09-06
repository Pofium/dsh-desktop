import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RELEASE_DIR = join(ROOT, 'dist-release');
mkdirSync(RELEASE_DIR, { recursive: true });

const zipName = 'DeepSeek-Harness-v0.1.2-rc.1-windows-x64.zip';
const zipPath = join(RELEASE_DIR, zipName);

console.log('Creating Release ZIP at:', zipPath);

// Use PowerShell Compress-Archive
const appDir = join(ROOT, 'dist-exe', 'DeepSeek-Harness');
if (!existsSync(appDir)) {
  console.error('App directory not found:', appDir);
  process.exit(1);
}

execSync(`powershell.exe -NoProfile -Command "Compress-Archive -Path '${appDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });

console.log('Release ZIP created successfully:', zipPath);
