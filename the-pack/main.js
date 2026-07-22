'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const scanner = require('./src/scanner');
const executor = require('./src/executor');
const safety = require('./src/safety');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: '#5a9130',
    title: 'who ate the tab?',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Surface renderer warnings/errors and crashes in the terminal.
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) console.log(`[renderer] ${message}`);
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    console.log('[renderer gone]', JSON.stringify(details));
  });

  // Register our own process so a dog can never eat the app hosting it.
  safety.protectSelf();
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ───────────────────────── IPC bridge ───────────────────────── */

// Scan the real world: open browser tabs + running apps.
ipcMain.handle('pack:scan', async () => {
  try {
    const targets = await scanner.scan();
    return { ok: true, targets: safety.annotate(targets) };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err), targets: [] };
  }
});

// The real "eat": close a tab or quit an app. Gated by safety mode.
ipcMain.handle('pack:eat', async (_evt, target) => {
  const gate = safety.canEat(target);
  if (!gate.allowed) {
    return { ok: false, blocked: true, reason: gate.reason, dryRun: gate.dryRun };
  }
  if (gate.dryRun) {
    // Safe Mode: pretend. The dog still "wins" on screen; nothing real dies.
    return { ok: true, dryRun: true, reason: 'safe-mode' };
  }
  try {
    await executor.eat(target);
    return { ok: true, dryRun: false };
  } catch (err) {
    // A failed kill must never crash the game — the dog just spits it out.
    return { ok: false, error: String(err && err.message || err), dryRun: false };
  }
});

// Report / change the safety mode.
ipcMain.handle('pack:getMode', () => safety.getState());
ipcMain.handle('pack:setMode', (_evt, mode) => safety.setMode(mode));

// Are the macOS Automation permissions granted? (best-effort probe)
ipcMain.handle('pack:checkPermissions', async () => {
  try {
    return await scanner.probePermissions();
  } catch (err) {
    return { apps: false, browsers: false, error: String(err && err.message || err) };
  }
});
