#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$root_dir/integrations/gmail-addon"
output_dir="$root_dir/dist"
output_file="$output_dir/maillume-gmail-addon.zip"

mkdir -p "$output_dir"
rm -f "$output_file"
(cd "$source_dir" && zip -q -X "$output_file" Code.gs appsscript.json README.md)
printf '%s\n' "$output_file"
