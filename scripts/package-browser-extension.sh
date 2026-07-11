#!/usr/bin/env sh
set -eu

root_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
source_dir="$root_dir/integrations/browser-extension"
output_dir="$root_dir/dist"
output_file="$output_dir/maillume-browser-extension.zip"

mkdir -p "$output_dir"
rm -f "$output_file"

cd "$source_dir"
zip -qr "$output_file" manifest.json service-worker.js sidepanel.html sidepanel.css sidepanel.js icons README.md PRIVACY.md

echo "$output_file"
