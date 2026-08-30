import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const stagingDir = 'dist-exe/staging'
if (!existsSync(stagingDir)) {
  console.error('staging dir does not exist')
  process.exit(1)
}

// 1. Update staging/package.json pkg.assets
const manifestPath = join(stagingDir, 'package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.bin = 'lib/bin.js'
manifest.pkg = {
  assets: [
    'lib/**/*',
    'config/**/*',
    'package.json',
    'node_modules/**/*'
  ]
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log('updated dist-exe/staging/package.json pkg.assets')

// 2. Patch bin.js
const binPath = join(stagingDir, 'lib/bin.js')
let binContent = readFileSync(binPath, 'utf8')

// If there's a shebang, strip it first so we can place imports cleanly at the top
const hasShebang = binContent.startsWith('#!')
if (hasShebang) {
  binContent = binContent.replace(/^#![^\r\n]*[\r\n]+/, '')
}

const extractHelper = `#!/usr/bin/env node
import { existsSync as __existsSync, mkdirSync as __mkdirSync, readFileSync as __readFileSync, writeFileSync as __writeFileSync, readdirSync as __readdirSync, statSync as __statSync, appendFileSync as __appendFileSync } from "node:fs";
import { join as __join } from "node:path";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { resolveDshHome as __resolveDshHome } from "@deepseek-ai/dsh-home-paths";

function __dshLog(msg) {
  try {
    const logFile = __join(__resolveDshHome(), "dsh.log");
    __appendFileSync(logFile, "[" + new Date().toISOString() + "] " + msg + "\\n");
  } catch {}
}

process.on("uncaughtException", (err) => {
  __dshLog("Uncaught Exception: " + (err?.stack || err));
});

process.on("unhandledRejection", (reason) => {
  __dshLog("Unhandled Rejection: " + (reason?.stack || reason));
});

function __copyDirRecursive(src, dest) {
  __mkdirSync(dest, { recursive: true });
  for (const item of __readdirSync(src)) {
    const srcPath = __join(src, item);
    const destPath = __join(dest, item);
    try {
      if (__statSync(srcPath).isDirectory()) {
        __copyDirRecursive(srcPath, destPath);
      } else {
        __writeFileSync(destPath, __readFileSync(srcPath));
      }
    } catch (err) {
      __dshLog("Copy error " + srcPath + ": " + (err?.stack || err));
    }
  }
}

function __ensureSeaRuntime() {
  if (typeof process.pkg === "undefined") return;
  try {
    __dshLog("Initializing SEA runtime...");
    const home = __resolveDshHome();
    const manifestPath = __fileURLToPath(new URL("../package.json", import.meta.url));
    const version = JSON.parse(__readFileSync(manifestPath, "utf8")).version || "0.1.1-rc.2";
    const runtimeDir = __join(home, "runtime", version);
    const marker = __join(runtimeDir, ".extracted_v4");
    if (!__existsSync(marker)) {
      __dshLog("Extracting runtime files to " + runtimeDir);
      const snapshotStaging = __fileURLToPath(new URL("..", import.meta.url));
      __copyDirRecursive(snapshotStaging, runtimeDir);
      __writeFileSync(marker, version);
      __dshLog("Runtime extracted successfully");
    } else {
      __dshLog("Runtime already extracted at " + runtimeDir);
    }
  } catch (err) {
    __dshLog("Failed to initialize runtime: " + (err?.stack || err));
  }
}
__ensureSeaRuntime();
`

if (!binContent.includes('__ensureSeaRuntime')) {
  binContent = extractHelper + '\n' + binContent
}

// Default to 'web' when no CLI args are provided (e.g. double clicked in Windows Explorer)
binContent = binContent.replace(
  /const invocation = parseDshArgs\(process\.argv\.slice\(2\), readVersion\(\)\);/g,
  `const __rawArgs = process.argv.slice(2);
__dshLog("rawArgs: " + JSON.stringify(__rawArgs));
const __effectiveArgs = __rawArgs.length === 0 ? ["web"] : __rawArgs;
__dshLog("effectiveArgs: " + JSON.stringify(__effectiveArgs));
const invocation = parseDshArgs(__effectiveArgs, readVersion());
__dshLog("invocation resolved: " + JSON.stringify(invocation));`
)

// Wrap invocation switch in try/catch to log errors
binContent = binContent.replace(
  /switch \(invocation\.mode\) \{[\s\S]*?\n\}/,
  `try {
__dshLog("Starting mode: " + invocation.mode);
switch (invocation.mode) {
	case "profile": {
		const { runProfile } = await import("./profile-boot-BnJoK_kl.js");
		await runProfile({
			environment: loadLayeredEnv("dsh"),
			profile: invocation.profile,
			patchFiles: invocation.patches,
			args: invocation.args
		});
		break;
	}
	case "plugin": {
		const { runPlugin } = await import("./plugin-9h8shc4d.js");
		process.exit(runPlugin(invocation.profile, invocation.args));
		break;
	}
	case "dump-config": {
		const { runDumpConfig } = await import("./dump-config-D-jtgwY3.js");
		runDumpConfig(invocation.profile, invocation.defaultOnly, invocation.patches);
		break;
	}
	default: throw new Error(\`dsh: unhandled invocation mode \${JSON.stringify(invocation)}\`);
}
__dshLog("Boot dispatch completed");
} catch (__dispatchError) {
  __dshLog("Dispatch error: " + (__dispatchError?.stack || __dispatchError));
  throw __dispatchError;
}`
)

writeFileSync(binPath, binContent)
console.log('patched dist-exe/staging/lib/bin.js')

// 3. Patch dsh-app-boot
const appBootPath = join(stagingDir, 'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')
if (existsSync(appBootPath)) {
  let appBootContent = readFileSync(appBootPath, 'utf8')

  const runtimeAnchorHelper = `
import { appendFileSync as __bootAppendFileSync } from "node:fs";
function __bootLog(msg) {
  try {
    const logFile = join(resolveDshHome(), "dsh.log");
    __bootAppendFileSync(logFile, "[" + new Date().toISOString() + "] [boot] " + msg + "\\n");
  } catch {}
}
function __resolveRuntimeAnchor(anchor, home) {
  try {
    const version = JSON.parse(readFileSync(anchor, "utf8")).version || "0.1.1-rc.2";
    const runtimeAnchor = join(home, "runtime", version, "package.json");
    if (existsSync(runtimeAnchor)) return runtimeAnchor;
  } catch {}
  return anchor;
}
`
  if (!appBootContent.includes('__resolveRuntimeAnchor')) {
    appBootContent = runtimeAnchorHelper + '\n' + appBootContent

    appBootContent = appBootContent.replace(
      /function healProfilesModuleFallback\(installAnchor, home = resolveDshHome\(\)\) {/g,
      `function healProfilesModuleFallback(installAnchor, home = resolveDshHome()) {
	installAnchor = __resolveRuntimeAnchor(installAnchor, home);`
    )

    appBootContent = appBootContent.replace(
      /function loadProfile\(binName, name, installAnchor, home = resolveDshHome\(\), options = {}\) {/g,
      `function loadProfile(binName, name, installAnchor, home = resolveDshHome(), options = {}) {
	installAnchor = __resolveRuntimeAnchor(installAnchor, home);`
    )

    appBootContent = appBootContent.replace(
      /function resolveBundleDir\(binName, packageName, installAnchor, profileDir\) {/g,
      `function resolveBundleDir(binName, packageName, installAnchor, profileDir) {
	installAnchor = __resolveRuntimeAnchor(installAnchor, resolveDshHome());`
    )

    appBootContent = appBootContent.replace(
      /proc\.stderr\.write\(`\$\{binName\}: fatal load failure: \$\{err instanceof Error \? err\.stack \?\? err\.message : String\(err\)\}\\n`\);/g,
      `__bootLog("FATAL: " + (err instanceof Error ? err.stack ?? err.message : String(err)));
proc.stderr.write(\`\${binName}: fatal load failure: \${err instanceof Error ? err.stack ?? err.message : String(err)}\\n\`);`
    )

    writeFileSync(appBootPath, appBootContent)
    console.log('patched dsh-app-boot/lib/index.js')
  }
}

// 4. Patch profile-boot-*.js files in staging/lib
for (const file of readdirSync(join(stagingDir, 'lib'))) {
  if (file.startsWith('profile-boot-') && file.endsWith('.js')) {
    const filePath = join(stagingDir, 'lib', file)
    let content = readFileSync(filePath, 'utf8')
    if (!content.includes('__runtimePresetRoot') && content.includes('SHIPPED_PRESET_ROOT')) {
      const imports = `import { existsSync as __existsSync2 } from "node:fs";\nimport { join as __join2 } from "node:path";\nimport { resolveDshHome as __resolveDshHome2 } from "@deepseek-ai/dsh-home-paths";\n`
      content = imports + `
function __runtimePresetRoot(presetRoot) {
  try {
    const home = __resolveDshHome2();
    const version = "0.1.1-rc.2";
    const runtimePreset = __join2(home, "runtime", version, "config", "agent-presets");
    if (__existsSync2(runtimePreset)) return runtimePreset;
  } catch {}
  return presetRoot;
}
` + content
      content = content.replace(
        /path: SHIPPED_PRESET_ROOT/g,
        `path: __runtimePresetRoot(SHIPPED_PRESET_ROOT)`
      )
      writeFileSync(filePath, content)
      console.log(`patched ${filePath}`)
    }
  }
}

// 5. Patch dsh-web-app browser opener to directly invoke PowerShell on Windows
const webAppPath = join(stagingDir, 'node_modules/@deepseek-ai/dsh-web-app/lib/index.js')
if (existsSync(webAppPath)) {
  let webAppContent = readFileSync(webAppPath, 'utf8')
  webAppContent = webAppContent.replace(
    /async function openBrowser\(url\) \{[\s\S]*?\n\}/,
    `async function openBrowser(url) {
	try {
		const { spawn } = await import("node:child_process");
		spawn("powershell.exe", ["-NoProfile", "-Command", \`Start-Process "\${url}"\`], {
			detached: true,
			stdio: "ignore"
		}).unref();
	} catch (error) {
		console.error("web-app: failed to open browser:", error);
	}
}`
  )
  writeFileSync(webAppPath, webAppContent)
  console.log('patched dsh-web-app browser opener')
}
