#!/usr/bin/env sh
set -eu

root_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
source_dir="$root_dir/integrations/browser-extension"
output_dir="$root_dir/dist"
output_file="$output_dir/maillume-browser-extension.zip"
staging_dir="$(mktemp -d)"
trap 'rm -rf "$staging_dir"' EXIT

mkdir -p "$output_dir"
rm -f "$output_file"

cp -R \
  "$source_dir/manifest.json" \
  "$source_dir/service-worker.js" \
  "$source_dir/sidepanel.html" \
  "$source_dir/sidepanel.css" \
  "$source_dir/sidepanel.js" \
  "$source_dir/icons" \
  "$source_dir/_locales" \
  "$source_dir/README.md" \
  "$source_dir/PRIVACY.md" \
  "$staging_dir/"

find "$staging_dir" -exec touch -t 198001010000 {} +
(cd "$staging_dir" && find . -type f | sed 's#^\./##' | LC_ALL=C sort | zip -q -X "$output_file" -@)

echo "$output_file"
