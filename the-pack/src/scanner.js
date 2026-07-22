'use strict';
// Discovers real targets on macOS: open browser tabs + running user apps.
// Everything goes through `osascript`. Missing permissions / absent browsers
// are handled gracefully — the pack just finds fewer things to eat.

const { execFile } = require('child_process');

const BROWSERS = ['Google Chrome', 'Microsoft Edge', 'Brave Browser', 'Safari'];

function runOsa(script, timeout = 6000) {
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
  // Bulk-fetch names + pids (one Apple event each) rather than per-process,
  // which is far faster than iterating with a `whose` filter per item.
  const script = `
    tell application "System Events"
      set ps to (every process whose background only is false)
      set ns to name of ps
      set us to unix id of ps
    end tell
    set out to ""
    repeat with i from 1 to (count ns)
      set out to out & (item i of us) & "\\t" & (item i of ns) & linefeed
    end repeat
    return out`;
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
  // Fetch titles and ids in BULK (one Apple event per window each) instead of
  // per-tab — orders of magnitude faster when many tabs are open.
  const script = `
    if application "${browser}" is running then
      tell application "${browser}"
        set out to ""
        repeat with wi from 1 to (count windows)
          set w to window wi
          set theTitles to {}
          try
            set theTitles to title of tabs of w
          end try
          set theIds to {}
          try
            set theIds to id of tabs of w
          end try
          set n to count theTitles
          repeat with ti from 1 to n
            set tid to ""
            try
              set tid to (item ti of theIds) as text
            end try
            set tt to ""
            try
              set tt to (item ti of theTitles) as text
            end try
            set out to out & wi & tab & ti & tab & tid & tab & tt & linefeed
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

// Enumerate tabs for ALL browsers in a SINGLE osascript process. Spawning
// osascript costs ~2s each on this machine (permission/startup overhead), so
// doing one call instead of one-per-browser is the difference between a snappy
// scan and a timeout when many tabs are open.
async function listTabs() {
  const perBrowser = BROWSERS.map((b) => `
    if application "${b}" is running then
      tell application "${b}"
        repeat with wi from 1 to (count windows)
          set w to window wi
          set theTitles to {}
          try
            set theTitles to title of tabs of w
          end try
          set theIds to {}
          try
            set theIds to id of tabs of w
          end try
          set n to count theTitles
          repeat with ti from 1 to n
            set tid to ""
            try
              set tid to (item ti of theIds) as text
            end try
            set tt to ""
            try
              set tt to (item ti of theTitles) as text
            end try
            set out to out & "${b}" & "\\t" & wi & "\\t" & ti & "\\t" & tid & "\\t" & tt & linefeed
          end repeat
        end repeat
      end tell
    end if`).join('\n');
  const script = `set out to ""\n${perBrowser}\nreturn out`;
  const { stdout } = await runOsa(script, 8000);
  const tabs = [];
  for (const line of parseLines(stdout)) {
    const parts = line.split('\t');
    if (parts.length < 4) continue;
    const browser = parts[0];
    const win = parseInt(parts[1], 10);
    const tab = parseInt(parts[2], 10);
    const tabId = (parts[3] || '').trim();
    const title = (parts.slice(4).join(' ') || '(untitled)').trim();
    if (Number.isNaN(win) || Number.isNaN(tab)) continue;
    tabs.push({
      id: tabId ? `tab:${browser}:#${tabId}` : `tab:${browser}:${win}:${tab}`,
      kind: 'tab',
      title: title || '(untitled)',
      browser, win, tab,
      tabId: tabId || null
    });
  }
  return tabs;
}

/* ───────────────────────── public API ───────────────────────── */

async function scan(opts = {}) {
  const includeApps = opts.includeApps !== false; // skip the (slower) app scan in tabs-only mode
  const [apps, tabs] = await Promise.all([
    includeApps ? listApps().catch(() => []) : Promise.resolve([]),
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
