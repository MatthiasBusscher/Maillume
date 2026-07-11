#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"

"$root_dir/scripts/package-browser-extension.sh"
"$root_dir/scripts/package-gmail-addon.sh"
cp "$root_dir/public/outlook-manifest.xml" "$root_dir/dist/maillume-outlook-manifest.xml"
(
  cd "$root_dir/dist"
  shasum -a 256 \
    maillume-browser-extension.zip \
    maillume-gmail-addon.zip \
    maillume-outlook-manifest.xml > integration-SHA256SUMS
)
printf '%s\n' "$root_dir/dist/integration-SHA256SUMS"
