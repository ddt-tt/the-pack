'use strict';
// The real "eat". Closes a browser tab or quits an app on macOS.
// Callers must gate through safety.canEat() first.

const { execFile } = require('child_process');

function runOsa(script, timeout = 4000) {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], { timeout }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve((stdout || '').trim());
    });
  });
}

async function eatTab(target) {
  const { browser, win, tab, tabId } = target;
  // Chrome tab ids are decimal integers, but they DON'T compare equal to a raw
  // numeric literal in AppleScript — you must compare `(id ...) as text`.
  if (tabId && /^\d+$/.test(String(tabId))) {
    // Close by STABLE id — robust against tabs shifting as others close.
    const script = `
      if application "${browser}" is running then
        tell application "${browser}"
          repeat with wi from 1 to (count windows)
            set w to window wi
            repeat with ti from 1 to (count tabs of w)
              if ((id of tab ti of w) as text) is "${tabId}" then
                close tab ti of w
                return "ok"
              end if
            end repeat
          end repeat
        end tell
      end if
      return "gone"`;
    // "gone" = the tab already closed; that's mission-accomplished, not an error.
    await runOsa(script);
    return;
  }
  // Fallback (e.g. Safari): positional index. Fragile, but best available.
  const script = `
    if application "${browser}" is running then
      tell application "${browser}" to close tab ${tab} of window ${win}
    end if`;
  await runOsa(script);
}

async function eatApp(target) {
  const name = target.appName;
  // Graceful quit first (lets the app do its own thing).
  try {
    await runOsa(`tell application "${name}" to quit`);
    return;
  } catch (_e) {
    // Fall back to a polite signal on the PID.
  }
  if (target.pid) {
    try {
      process.kill(target.pid, 'SIGTERM');
      return;
    } catch (e) {
      throw new Error(`could not quit "${name}": ${e.message}`);
    }
  }
  throw new Error(`could not quit "${name}"`);
}

async function eat(target) {
  if (target.kind === 'tab') return eatTab(target);
  if (target.kind === 'app') return eatApp(target);
  throw new Error(`unknown target kind: ${target.kind}`);
}

// Bring a tab to the front (switch to it + raise its window + focus the browser)
// so the user can see which tab is about to be eaten.
async function focusTab(target) {
  const { browser, tabId } = target;
  if (!tabId || !/^\d+$/.test(String(tabId))) return;
  const script = `
    if application "${browser}" is running then
      tell application "${browser}"
        repeat with wi from 1 to (count windows)
          set w to window wi
          repeat with ti from 1 to (count tabs of w)
            if ((id of tab ti of w) as text) is "${tabId}" then
              set active tab index of w to ti
              set index of w to 1
              activate
              return "ok"
            end if
          end repeat
        end repeat
      end tell
    end if`;
  await runOsa(script);
}

module.exports = { eat, eatTab, eatApp, focusTab };
