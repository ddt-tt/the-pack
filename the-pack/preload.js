'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// The only surface the renderer (game world) gets to the real OS.
contextBridge.exposeInMainWorld('pack', {
  scan: () => ipcRenderer.invoke('pack:scan'),
  eat: (target) => ipcRenderer.invoke('pack:eat', target),
  getMode: () => ipcRenderer.invoke('pack:getMode'),
  setMode: (mode) => ipcRenderer.invoke('pack:setMode', mode),
  checkPermissions: () => ipcRenderer.invoke('pack:checkPermissions')
});
