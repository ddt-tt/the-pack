'use strict';
// Simple append-to-file logger for the main process, so real "eat" attempts
// and AppleScript errors leave a trail. Log lives at the-pack/pack.log
// (gitignored). Tail it with:  tail -f the-pack/pack.log
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, '..', 'pack.log');

function fmt(a) {
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch (_) { return String(a); }
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(fmt).join(' ')}`;
  try { fs.appendFileSync(LOG, line + '\n'); } catch (_) {}
  console.log(line);
}

module.exports = { log, LOG };
