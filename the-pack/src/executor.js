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
  const { browser, win, tab } = target;
  // Indices are 1-based and match the AppleScript window/tab vocabulary.
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

module.exports = { eat, eatTab, eatApp };
