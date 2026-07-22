'use strict';
// Discovers real targets on macOS: open browser tabs + running user apps.
// Everything goes through `osascript`. Missing permissions / absent browsers
// are handled gracefully — the pack just finds fewer things to eat.

const { execFile } = require('child_process');

const BROWSERS = ['Google Chrome', 'Microsoft Edge', 'Brave Browser', 'Safari'];

function runOsa(script, timeout = 4000) {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], { timeout }, (err, stdout, stderr) => {
      resolve({
        code: err ? (err.code || 1) : 0,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim()
      });
    });
  });
}

function parseLines(stdout) {
  return stdout.split('\n').map((l) => l.trim()).filter(Boolean);
}

/* ───────────────────────── running apps ───────────────────────── */

async function listApps() {
  const script = `
    tell application "System Events"
      set out to ""
      repeat with p in (every process whose background only is false)
        set out to out & (unix id of p) & "\\t" & (name of p) & linefeed
      end repeat
      return out
    end tell`;
  const { stdout } = await runOsa(script);
  const apps = [];
  for (const line of parseLines(stdout)) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const pid = parseInt(line.slice(0, tab), 10);
    const name = line.slice(tab + 1).trim();
    if (!name || Number.isNaN(pid)) continue;
    apps.push({
      id: `app:${pid}`,
      kind: 'app',
      title: name,
      appName: name,
      pid
    });
  }
  return apps;
}

/* ───────────────────────── browser tabs ───────────────────────── */

// Chromium browsers + Safari share a compatible tab/window vocabulary.
async function listTabsFor(browser) {
  // Capture each tab's STABLE id where the browser exposes one (Chromium does;
  // Safari does not). Positional indices shift as tabs close, so the id is what
  // lets us reliably close the right tab later.
  const script = `
    if application "${browser}" is running then
      tell application "${browser}"
        set out to ""
        set wi to 0
        repeat with w in windows
          set wi to wi + 1
          set ti to 0
          repeat with t in tabs of w
            set ti to ti + 1
            set theTitle to ""
            try
              set theTitle to (title of t) as text
            end try
            set tid to ""
            try
              set tid to (id of t) as text
            end try
            set out to out & wi & "\\t" & ti & "\\t" & tid & "\\t" & theTitle & linefeed
          end repeat
        end repeat
        return out
      end tell
    else
      return ""
    end if`;
  const { stdout } = await runOsa(script);
  const tabs = [];
  for (const line of parseLines(stdout)) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const win = parseInt(parts[0], 10);
    const tab = parseInt(parts[1], 10);
    const tabId = (parts[2] || '').trim();
    const title = (parts.slice(3).join(' ') || '(untitled)').trim();
    if (Number.isNaN(win) || Number.isNaN(tab)) continue;
    tabs.push({
      // id (our on-screen key) prefers the stable browser tab id
      id: tabId ? `tab:${browser}:#${tabId}` : `tab:${browser}:${win}:${tab}`,
      kind: 'tab',
      title: title || '(untitled)',
      browser,
      win,
      tab,
      tabId: tabId || null
    });
  }
  return tabs;
}

async function listTabs() {
  const results = await Promise.all(BROWSERS.map((b) => listTabsFor(b).catch(() => [])));
  return results.flat();
}

/* ───────────────────────── public API ───────────────────────── */

async function scan() {
  const [apps, tabs] = await Promise.all([
    listApps().catch(() => []),
    listTabs().catch(() => [])
  ]);
  return [...tabs, ...apps];
}

// Best-effort probe of macOS Automation permissions.
async function probePermissions() {
  const appsProbe = await runOsa(
    'tell application "System Events" to get name of first process whose background only is false'
  );
  const anyBrowser = BROWSERS.map((b) => `(application "${b}" is running)`).join(' or ');
  const browserRunning = await runOsa(`return (${anyBrowser})`);
  const running = browserRunning.stdout === 'true';
  let browsersOk = true;
  if (running) {
    // Only meaningful if at least one browser is open.
    const probe = await runOsa(
      BROWSERS.map(
        (b) => `if application "${b}" is running then return (count of windows of application "${b}")`
      ).join('\n')
    );
    browsersOk = probe.code === 0;
  }
  return {
    apps: appsProbe.code === 0,
    browsers: browsersOk,
    anyBrowserOpen: running
  };
}

module.exports = { scan, listApps, listTabs, probePermissions, BROWSERS };
