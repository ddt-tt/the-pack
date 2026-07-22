'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const scanner = require('./src/scanner');
const executor = require('./src/executor');
const safety = require('./src/safety');
const { log, LOG } = require('./src/logger');

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
  log('── who ate the tab? started ──  log file:', LOG);
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
ipcMain.handle('pack:scan', async (_evt, opts) => {
  try {
    const targets = await scanner.scan(opts || {});
    return { ok: true, targets: safety.annotate(targets) };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err), targets: [] };
  }
});

// The real "eat": close a tab or quit an app. Gated by safety mode.
ipcMain.handle('pack:eat', async (_evt, target) => {
  const label = `${target && target.kind}:${target && target.title}`;
  const gate = safety.canEat(target);
  if (!gate.allowed) {
    log('EAT blocked', label, 'reason=' + gate.reason);
    return { ok: false, blocked: true, reason: gate.reason, dryRun: gate.dryRun };
  }
  if (gate.dryRun) {
    // Safe Mode: pretend. The dog still "wins" on screen; nothing real dies.
    log('EAT dry-run (safe mode)', label);
    return { ok: true, dryRun: true, reason: 'safe-mode' };
  }
  try {
    log('EAT real →', label, JSON.stringify(target));
    await executor.eat(target);
    log('EAT ok', label);
    return { ok: true, dryRun: false };
  } catch (err) {
    // A failed kill must never crash the game — the dog just spits it out.
    const msg = String((err && err.message) || err);
    log('EAT FAILED', label, 'error=' + msg, 'stderr=' + ((err && err.stderr) || ''));
    return { ok: false, error: msg, stderr: (err && err.stderr) || '', dryRun: false };
  }
});

// Report / change the safety mode.
// Switch the browser to a tab so the user sees which one is being eaten.
ipcMain.handle('pack:focusTab', async (_evt, target) => {
  try { await executor.focusTab(target); return { ok: true }; }
  catch (err) { return { ok: false, error: String((err && err.message) || err) }; }
});

ipcMain.handle('pack:getMode', () => safety.getState());
ipcMain.handle('pack:setMode', (_evt, mode) => { log('mode →', mode); return safety.setMode(mode); });

// Are the macOS Automation permissions granted? (best-effort probe)
ipcMain.handle('pack:checkPermissions', async () => {
  try {
    return await scanner.probePermissions();
  } catch (err) {
    return { apps: false, browsers: false, error: String(err && err.message || err) };
  }
});
