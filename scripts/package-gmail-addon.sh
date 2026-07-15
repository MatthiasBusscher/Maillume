#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$root_dir/integrations/gmail-addon"
output_dir="$root_dir/dist"
output_file="$output_dir/maillume-gmail-addon.zip"
staging_dir="$(mktemp -d)"
trap 'rm -rf "$staging_dir"' EXIT

mkdir -p "$output_dir"
rm -f "$output_file"
cp "$source_dir/Code.gs" "$source_dir/appsscript.json" "$source_dir/README.md" "$source_dir/PRIVACY.md" "$staging_dir/"
find "$staging_dir" -exec touch -t 198001010000 {} +
(cd "$staging_dir" && printf '%s\n' Code.gs PRIVACY.md README.md appsscript.json | zip -q -X "$output_file" -@)
printf '%s\n' "$output_file"
