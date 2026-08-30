// Preload script — provides minimal bridge between renderer and main process
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('dshDesktop', {
  platform: process.platform,
  version: process.env.DSH_VERSION || '0.1.1-rc.2',
});
