#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"

"$root_dir/scripts/package-browser-extension.sh"

extension_entries="$(unzip -Z1 "$root_dir/dist/maillume-browser-extension.zip")"
printf '%s\n' "$extension_entries" | grep -qx 'manifest.json'
printf '%s\n' "$extension_entries" | grep -qx '_locales/en/messages.json'
printf '%s\n' "$extension_entries" | grep -qx '_locales/nl/messages.json'
printf '%s\n' "$extension_entries" | grep -qx 'release-metadata.json'
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));' \
  "$root_dir/integrations/browser-extension/manifest.json"
node "$root_dir/scripts/verify-extension-assets.mjs"
EXPECTED_REVISION="${BUILD_REVISION:-development}" \
  node "$root_dir/scripts/verify-release-artifacts.mjs"
(
  cd "$root_dir/dist"
  shasum -a 256 maillume-browser-extension.zip > integration-SHA256SUMS
)
printf '%s\n' "$root_dir/dist/integration-SHA256SUMS"
