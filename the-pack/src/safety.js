'use strict';
// Decides whether a real eat is allowed. Two things stand between a hungry
// dog and your unsaved work:
//   1. The never-eat list — critical apps that can NEVER be killed, any mode.
//   2. The mode — 'safe' (default) dry-runs every real action; 'chaos' executes.

// Apps that must survive no matter what. Includes the OS shell, this app,
// and the common terminals / editors a demo is likely launched from.
const NEVER_EAT = new Set(
  [
    'Finder', 'Dock', 'SystemUIServer', 'WindowServer', 'loginwindow',
    'System Events', 'ControlCenter', 'NotificationCenter', 'Spotlight',
    'coreautha', 'universalaccessd',
    'Electron', 'The Pack', 'the-pack',
    'Terminal', 'iTerm2', 'iTerm', 'Warp', 'Ghostty',
    'Code', 'Code - Insiders', 'Visual Studio Code', 'Cursor'
  ].map((s) => s.toLowerCase())
);

const state = {
  mode: 'safe', // 'safe' | 'chaos'
  selfPids: new Set()
};

function protectSelf() {
  state.selfPids.add(process.pid);
  if (process.ppid) state.selfPids.add(process.ppid);
}

function isProtected(target) {
  if (target.kind === 'app') {
    if (target.pid && state.selfPids.has(target.pid)) return true;
    if (target.appName && NEVER_EAT.has(target.appName.toLowerCase())) return true;
  }
  return false;
}

// Tag targets so the renderer can grey out the ones dogs must leave alone.
function annotate(targets) {
  return targets.map((t) => ({ ...t, protected: isProtected(t) }));
}

function canEat(target) {
  if (isProtected(target)) {
    return { allowed: false, dryRun: false, reason: 'protected' };
  }
  if (state.mode === 'safe') {
    // Allowed on screen, but nothing real dies.
    return { allowed: true, dryRun: true, reason: 'safe-mode' };
  }
  return { allowed: true, dryRun: false, reason: 'chaos' };
}

function setMode(mode) {
  state.mode = mode === 'chaos' ? 'chaos' : 'safe';
  return getState();
}

function getState() {
  return { mode: state.mode };
}

module.exports = { protectSelf, annotate, canEat, setMode, getState, isProtected, NEVER_EAT };
