#!/usr/bin/env bash
# Полная пересборка dsh.exe из исходников (после git pull).
# Запуск из корня репо:  bash dist-exe/rebuild.sh
set -e
cd "$(dirname "$0")/.."

# --- 0. Node >= 22.19 (системный 22.13 ломает tsdown) ---
NODE24_BIN=$(pnpm dlx node@24 -e "console.log(require('node:path').dirname(process.execPath))" 2>/dev/null | tail -1)
export PATH="$NODE24_BIN:$PATH"
NODE24="$NODE24_BIN/node.exe"
echo "node: $("$NODE24" --version)"

# --- 1. deps + build ---
CI=true pnpm install
if git rev-parse HEAD >/dev/null 2>&1; then
  CI=true pnpm run build
else
  # нет .git — подменяем хеш
  DSH_CLIENT_COMMIT_HASH=0000000000000000000000000000000000000000 CI=true pnpm run build
fi

# --- 2. staging closure ---
rm -rf dist-exe/staging
CI=true pnpm --filter @deepseek-ai/dsh deploy --legacy --prod \
  --config.node-linker=hoisted --config.auto-install-peers=false \
  --config.link-workspace-packages=true dist-exe/staging

# pkg-конфиг в манифест стаджинга
node -e "
const fs=require('fs');const p='dist-exe/staging/package.json';
const m=JSON.parse(fs.readFileSync(p,'utf8'));
m.bin='lib/bin.js';
m.pkg={assets:['lib/**/*.js','config/**/*','package.json','node_modules/**/*.js','node_modules/**/*.cjs','node_modules/**/*.mjs','node_modules/**/package.json','node_modules/**/*.json','node_modules/**/*.node','node_modules/**/*.wasm','node_modules/**/*.yml','node_modules/**/*.yaml','node_modules/**/*.md','node_modules/**/*.txt','node_modules/**/*.html','node_modules/**/*.css','node_modules/**/*.svg','node_modules/**/*.woff2','node_modules/**/*.ttf','node_modules/**/*.dll','node_modules/**/*.exe']};
fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');
"

# --- 3. докладываем пакеты, потерянные legacy-хойстером ---
for i in $(seq 1 30); do
  out=$(node dist-exe/staging/lib/bin.js --version 2>&1) && { echo "staging OK: $out"; break; }
  pkg=$(echo "$out" | grep -oP "Cannot find package '\K[^']+" | head -1)
  [ -z "$pkg" ] && { echo "$out" | head -10; exit 1; }
  node dist-exe/fix-missing.mjs "$pkg" || exit 1
done

# --- 4. патчим стаджинг (самораспаковка рантайма + fallback для плагинов + default web) ---
node dist-exe/patch-staging.mjs

# --- 5. иконка в базовый node.exe и zip ДО инъекции SEA-блоба ---
powershell.exe -NoProfile -Command "
Add-Type -AssemblyName System.IO.Compression.FileSystem
\$zipPath = \"\$HOME\.pkg-cache\sea\node-v24.19.0-win-x64.zip\"
if (Test-Path \$zipPath) {
  \$tempDir = \"\$HOME\.pkg-cache\sea\temp_node\"
  Remove-Item -Recurse -Force \$tempDir -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path \$tempDir | Out-Null
  \$zip = [System.IO.Compression.ZipFile]::Open(\$zipPath, [System.IO.Compression.ZipArchiveMode]::Update)
  \$entry = \$zip.GetEntry('node-v24.19.0-win-x64/node.exe')
  if (\$entry) {
    \$extractedExe = \"\$tempDir\node.exe\"
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile(\$entry, \$extractedExe, \$true)
    & 'dist-exe\rcedit1.exe' \$extractedExe --set-icon 'dist-exe\dsh.ico'
    \$entry.Delete()
    \$newEntry = \$zip.CreateEntry('node-v24.19.0-win-x64/node.exe')
    \$stream = \$newEntry.Open()
    \$fileBytes = [System.IO.File]::ReadAllBytes(\$extractedExe)
    \$stream.Write(\$fileBytes, 0, \$fileBytes.Length)
    \$stream.Close()
  }
  \$zip.Dispose()
  Remove-Item -Recurse -Force \$tempDir -ErrorAction SilentlyContinue
}
\$exePath = \"\$HOME\.pkg-cache\sea\node-v24.19.0-win-x64.exe\"
if (Test-Path \$exePath) {
  & 'dist-exe\rcedit1.exe' \$exePath --set-icon 'dist-exe\dsh.ico'
}
"

# --- 6. pkg сборка ---
CI=true pnpm dlx @yao-pkg/pkg@6.21.0 dist-exe/staging --sea \
  --targets node24-win-x64 --output dist-exe/dsh.exe

# --- 7. GUI subsystem (без консольного окна) ---
node dist-exe/gui-subsystem.mjs dist-exe/dsh.exe

echo "== done: dist-exe/dsh.exe =="
./dist-exe/dsh.exe --version
