// DeepSeek Harness — Electron main process
// Starts the dsh web server and displays UI in a native window

const { app, BrowserWindow, Menu, MenuItem } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

// Safe file logger — DO NOT write to stdout/stderr in Windows GUI mode
const dshHome = process.env.DSH_HOME || path.join(
  process.env.USERPROFILE || process.env.HOME || '.', '.dsh'
);
try { fs.mkdirSync(dshHome, { recursive: true }); } catch {}
const logFile = path.join(dshHome, 'dsh-electron.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(logFile, line); } catch {}
}

process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err?.stack || err}`);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason?.stack || reason}`);
});

log('=== Electron main.js started ===');
log(`argv: ${JSON.stringify(process.argv)}`);
log(`execPath: ${process.execPath}`);
log(`__dirname: ${__dirname}`);

// Configuration
const DSH_PORT = 3080;
const DSH_URL = `http://127.0.0.1:${DSH_PORT}`;
const POLL_INTERVAL_MS = 500;
const MAX_WAIT_MS = 90_000;

// State
let mainWindow = null;
let serverProcess = null;

/** Resolve path to dsh runtime or exe */
function resolveDshCommand() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'dsh.exe'),
    path.join(path.dirname(process.execPath), '..', 'dsh.exe'),
    path.join(__dirname, '..', 'dsh.exe'),
    path.join(__dirname, 'dsh.exe'),
    process.resourcesPath ? path.join(process.resourcesPath, 'dsh.exe') : null,
    process.resourcesPath ? path.join(process.resourcesPath, '..', 'dsh.exe') : null
  ].filter(Boolean);

  for (const dshExe of candidates) {
    log(`Checking dsh.exe candidate: ${dshExe} exists=${fs.existsSync(dshExe)}`);
    if (fs.existsSync(dshExe)) {
      return { command: dshExe, args: ['web', '--no-open'] };
    }
  }

  const version = '0.1.2-rc.1';
  const binJs = path.join(dshHome, 'runtime', version, 'lib', 'bin.js');
  log(`Checking runtime bin.js: ${binJs} exists=${fs.existsSync(binJs)}`);
  if (fs.existsSync(binJs)) {
    return { command: 'node', args: [binJs, 'web', '--no-open'] };
  }

  const stagingBin = path.join(__dirname, '..', 'staging', 'lib', 'bin.js');
  log(`Checking staging bin.js: ${stagingBin} exists=${fs.existsSync(stagingBin)}`);
  if (fs.existsSync(stagingBin)) {
    return { command: 'node', args: [stagingBin, 'web', '--no-open'] };
  }

  const repoCli = path.resolve(__dirname, '..', '..', 'apps', 'cli', 'src', 'bin.ts');
  log(`Checking repo CLI: ${repoCli} exists=${fs.existsSync(repoCli)}`);
  if (fs.existsSync(repoCli)) {
    const localNode = path.join(path.dirname(process.execPath), 'node.exe');
    const nodeCmd = fs.existsSync(localNode) ? localNode : 'node';
    return { command: nodeCmd, args: ['--import', 'tsx/esm', repoCli, 'web', '--no-open'] };
  }

  return null;
}

/** Check if a TCP port is accepting connections */
function isPortReady(port) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(300);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => { sock.destroy(); resolve(false); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, '127.0.0.1');
  });
}

/** Wait until the dsh web server is ready */
async function waitForServer(port, maxWait) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (await isPortReady(port)) return true;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return false;
}

function getIconPath() {
  const iconCandidates = [
    path.join(__dirname, 'dsh.ico'),
    path.join(__dirname, '..', 'dsh.ico'),
    path.join(path.dirname(process.execPath), 'dsh.ico'),
    path.join(__dirname, 'icon-256.png'),
    path.join(__dirname, '..', 'icon-256.png')
  ];
  for (const p of iconCandidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createWindow() {
  const iconPath = getIconPath();
  log(`Creating BrowserWindow, icon: ${iconPath}`);

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'DeepSeek Harness',
    icon: iconPath,
    backgroundColor: '#0f0f23',
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
    },
  });

  Menu.setApplicationMenu(null);

  try {
    mainWindow.webContents.session.setSpellCheckerLanguages(['ru-RU', 'ru', 'en-US', 'en']);
    mainWindow.webContents.session.clearCache();
  } catch (e) {
    log(`Session init error: ${e.message}`);
  }

  // Right-click context menu (Spellcheck suggestions, Clipboard, Selection)
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();

    // 1. Spellcheck suggestions
    if (params.misspelledWord) {
      if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
        for (const suggestion of params.dictionarySuggestions) {
          menu.append(new MenuItem({
            label: suggestion,
            click: () => mainWindow.webContents.replaceMisspelling(suggestion),
          }));
        }
      } else {
        menu.append(new MenuItem({
          label: 'Нет вариантов исправления',
          enabled: false,
        }));
      }
      menu.append(new MenuItem({
        label: `Добавить "${params.misspelledWord}" в словарь`,
        click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // 2. Editable text field actions
    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Отменить', role: 'undo' }));
      menu.append(new MenuItem({ label: 'Повторить', role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Вырезать', role: 'cut' }));
      menu.append(new MenuItem({ label: 'Копировать', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Вставить', role: 'paste' }));
      menu.append(new MenuItem({ label: 'Вставить без форматирования', role: 'pasteAndMatchStyle' }));
      menu.append(new MenuItem({ label: 'Удалить', role: 'delete' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Выделить всё', role: 'selectAll' }));
    } else if (params.selectionText) {
      // 3. Selection actions
      menu.append(new MenuItem({ label: 'Копировать', role: 'copy' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Выделить всё', role: 'selectAll' }));
    }

    // 4. DevTools inspect option (if enabled in dev)
    if (process.env.DSH_DEV || process.env.NODE_ENV === 'development') {
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Исследовать элемент',
        click: () => mainWindow.webContents.inspectElement(params.x, params.y),
      }));
    }

    if (menu.items.length > 0) {
      menu.popup();
    }
  });

  const splashPath = path.join(__dirname, 'splash.html');
  log(`Loading splash: ${splashPath}`);
  mainWindow.loadFile(splashPath);
  log('Splash loaded, window shown');

  mainWindow.on('closed', () => {
    log('Window closed by user');
    mainWindow = null;
    killServer();
  });

  return mainWindow;
}

function killServer() {
  if (serverProcess && !serverProcess.killed) {
    log(`Killing server PID ${serverProcess.pid}`);
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch {}
    serverProcess = null;
  }
}

async function startServer() {
  const cmd = resolveDshCommand();
  if (!cmd) {
    log('ERROR: No dsh runtime found');
    if (mainWindow) {
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
        '<html><body style="background:#1a1a3e;color:#e0e0e0;font-family:Segoe UI;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column"><h2 style="color:#ef4444">Ошибка</h2><p>Не найден dsh runtime.</p></body></html>'
      ));
    }
    return;
  }

  log(`Starting dsh: ${cmd.command} ${cmd.args.join(' ')}`);

  if (await isPortReady(DSH_PORT)) {
    log('Server already running on port 3080, resolving token URL...');
    let targetUrl = DSH_URL;
    try {
      const serverLog = fs.readFileSync(path.join(dshHome, 'dsh-server.log'), 'utf8');
      const matches = Array.from(serverLog.matchAll(/dsh web:\s+(https?:\/\/[^\s\)]+)/gi));
      if (matches.length > 0) {
        targetUrl = matches[matches.length - 1][1];
        log(`Found recent token URL from server log: ${targetUrl}`);
      }
    } catch (e) {
      log(`Could not read server log: ${e.message}`);
    }
    if (mainWindow) {
      log(`Loading URL in native window: ${targetUrl}`);
      mainWindow.loadURL(targetUrl);
    }
    return;
  }

  let authenticatedUrl = DSH_URL;

  serverProcess = spawn(cmd.command, cmd.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: { ...process.env, BROWSER: 'none' },
  });

  const serverLogStream = fs.createWriteStream(path.join(dshHome, 'dsh-server.log'), { flags: 'a' });
  serverLogStream.write(`\n--- ${new Date().toISOString()} Starting ---\n`);
  
  serverProcess.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    const match = text.match(/dsh web:\s+(https?:\/\/[^\s\)]+)/i);
    if (match && match[1]) {
      authenticatedUrl = match[1];
      log(`Captured authenticated URL: ${authenticatedUrl}`);
    }
  });

  serverProcess.stdout?.pipe(serverLogStream);
  serverProcess.stderr?.pipe(serverLogStream);

  serverProcess.on('error', (err) => {
    log(`Server spawn error: ${err.stack || err}`);
  });

  serverProcess.on('exit', (code, signal) => {
    log(`Server exited: code=${code}, signal=${signal}`);
    serverLogStream.end();
  });

  log(`Waiting for port ${DSH_PORT}...`);
  const ready = await waitForServer(DSH_PORT, MAX_WAIT_MS);

  if (ready && mainWindow) {
    if (authenticatedUrl === DSH_URL) {
      try {
        const serverLog = fs.readFileSync(path.join(dshHome, 'dsh-server.log'), 'utf8');
        const matches = Array.from(serverLog.matchAll(/dsh web:\s+(https?:\/\/[^\s\)]+)/gi));
        if (matches.length > 0) {
          authenticatedUrl = matches[matches.length - 1][1];
          log(`Found recent token URL from server log: ${authenticatedUrl}`);
        }
      } catch {}
    }
    log(`Server ready! Loading UI in native window: ${authenticatedUrl}`);
    mainWindow.loadURL(authenticatedUrl);
    mainWindow.webContents.on('page-title-updated', (_event, title) => {
      if (mainWindow) mainWindow.setTitle(title || 'DeepSeek Harness');
    });
  } else if (mainWindow) {
    log('Server timeout!');
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
      `<html><body style="background:#1a1a3e;color:#e0e0e0;font-family:Segoe UI;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column"><h2 style="color:#ef4444">Таймаут</h2><p>Сервер не запустился за ${MAX_WAIT_MS / 1000}с.</p><p style="color:#888;font-size:13px">Лог: ${logFile}</p></body></html>`
    ));
  }
}

// --- App lifecycle ---
app.whenReady().then(async () => {
  log('app.whenReady fired successfully');
  createWindow();
  await startServer();
});

app.on('window-all-closed', () => {
  log('All windows closed, quitting');
  killServer();
  app.quit();
});

app.on('before-quit', () => {
  killServer();
});
