#!/usr/bin/env bash
# Package a double-clickable macOS .app for Apple Silicon, then ad-hoc sign it
# so it launches without Gatekeeper's "damage your computer" warning on THIS Mac.
# (Sharing it with others still needs an Apple Developer cert + notarization.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APPNAME="Who Ate The Tab"
OUT="dist-app"
APP="$OUT/$APPNAME-darwin-arm64/$APPNAME.app"

echo "• Packaging (this copies the Electron runtime — takes a moment)…"
npx electron-packager . "$APPNAME" \
  --platform=darwin --arch=arm64 \
  --out="$OUT" --overwrite --prune=true \
  --app-bundle-id=com.hackathon.whoatethetab \
  --ignore="^/dist-app" --ignore="^/\.git" --ignore="pack\.log"

echo "• Clearing quarantine + ad-hoc signing…"
xattr -cr "$APP" || true
codesign --force --deep --sign - "$APP"

echo "✓ Built: $APP"
echo "  Launch it with:  open \"$APP\""
