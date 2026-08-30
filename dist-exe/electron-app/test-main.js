const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const logFile = path.join(process.env.USERPROFILE || '.', '.dsh', 'test-electron.log');
fs.mkdirSync(path.dirname(logFile), { recursive: true });
fs.appendFileSync(logFile, `[${new Date().toISOString()}] test-main.js loaded\n`);

app.whenReady().then(() => {
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] app ready\n`);
  const win = new BrowserWindow({ width: 800, height: 600, title: 'Test Window' });
  win.loadURL('data:text/html,<h1>Hello from Electron!</h1>');
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] window created\n`);
});

app.on('window-all-closed', () => app.quit());
