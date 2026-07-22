#!/usr/bin/env bash
# Makes the locally-installed Electron runnable on Apple Silicon.
#
# Two things can go wrong with a freshly-npm-installed Electron on macOS:
#   1. Its download extracted incompletely (only license files land in dist/).
#   2. Its notarization ticket has been revoked by Apple, so Gatekeeper shows
#      "Electron will damage your computer" and the kernel SIGKILLs it.
#
# This script re-extracts the cached zip with `ditto` (preserves the bundle)
# and re-signs it with a local ad-hoc signature, which detaches it from the
# revoked ticket and satisfies Apple Silicon's mandatory-signing rule.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/node_modules/electron/dist"
APP="$DIST/Electron.app"
BIN="$APP/Contents/MacOS/Electron"

if [ ! -d "$DIST" ]; then
  echo "electron isn't installed — run: npm install" >&2
  exit 1
fi

VER="$(cat "$DIST/version" 2>/dev/null || true)"
echo "• Electron dist version: ${VER:-unknown}"

# A running instance locks the bundle and makes codesign fail — stop it first.
pkill -f "the-pack/node_modules/electron/dist" 2>/dev/null || true
sleep 1

# Always re-extract a pristine bundle from the @electron/get cache, then sign
# it. (Signing over an already-signed bundle can fail with "Operation not
# permitted"; starting fresh every time is reliable and only takes seconds.)
ZIP="$(find "$HOME/Library/Caches/electron" -name 'electron-*.zip' | head -1 || true)"
if [ -z "$ZIP" ]; then
  if [ ! -f "$BIN" ]; then
    echo "  no cached zip and no binary. Try: rm -rf node_modules && npm install" >&2
    exit 1
  fi
  echo "• No cache zip found — signing the existing bundle in place…"
else
  echo "• Re-extracting a pristine bundle with ditto…"
  rm -rf "$APP"
  ditto -x -k "$ZIP" "$DIST"
fi

echo "• Clearing extended attributes…"
xattr -cr "$APP" || true

echo "• Applying local ad-hoc signature…"
codesign --force --deep --sign - "$APP"

echo "• Verifying…"
codesign --verify --verbose=1 "$APP" 2>&1 | tail -1

echo "✓ Electron is ready. Run: npm start"
