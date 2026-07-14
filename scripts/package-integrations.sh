#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"

"$root_dir/scripts/package-browser-extension.sh"
"$root_dir/scripts/package-gmail-addon.sh"
cp "$root_dir/public/outlook-manifest.xml" "$root_dir/dist/maillume-outlook-manifest.xml"

extension_entries="$(unzip -Z1 "$root_dir/dist/maillume-browser-extension.zip")"
printf '%s\n' "$extension_entries" | grep -qx 'manifest.json'
printf '%s\n' "$extension_entries" | grep -qx '_locales/en/messages.json'
printf '%s\n' "$extension_entries" | grep -qx '_locales/nl/messages.json'
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"));' \
  "$root_dir/integrations/browser-extension/manifest.json" \
  "$root_dir/integrations/gmail-addon/appsscript.json"
node -e 'const fs=require("fs"); for (const [file,size] of [[process.argv[1],64],[process.argv[2],128]]) { const png=fs.readFileSync(file); if (png.readUInt32BE(16)!==size || png.readUInt32BE(20)!==size) throw new Error(`${file} must be ${size}x${size}`); }' \
  "$root_dir/public/integration-icons/icon-64.png" \
  "$root_dir/public/integration-icons/icon-128.png"
(
  cd "$root_dir/dist"
  shasum -a 256 \
    maillume-browser-extension.zip \
    maillume-gmail-addon.zip \
    maillume-outlook-manifest.xml > integration-SHA256SUMS
)
printf '%s\n' "$root_dir/dist/integration-SHA256SUMS"
