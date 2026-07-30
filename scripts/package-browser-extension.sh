#!/usr/bin/env sh
set -eu

root_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
node "$root_dir/scripts/generate-contract-artifacts.mjs" --check
source_dir="$root_dir/integrations/browser-extension"
output_dir="$root_dir/dist"
output_file="$output_dir/maillume-browser-extension.zip"
staging_dir="$(mktemp -d)"
build_revision="${BUILD_REVISION:-development}"
trap 'rm -rf "$staging_dir"' EXIT

mkdir -p "$output_dir"
rm -f "$output_file"

cp -R \
  "$source_dir/manifest.json" \
  "$source_dir/compatibility.json" \
  "$source_dir/service-worker.js" \
  "$source_dir/sidepanel.html" \
  "$source_dir/sidepanel.css" \
  "$source_dir/sidepanel-compatibility.js" \
  "$source_dir/sidepanel-copy.js" \
  "$source_dir/sidepanel-contract.js" \
  "$source_dir/sidepanel-render.js" \
  "$source_dir/sidepanel-capture.js" \
  "$source_dir/sidepanel-connection.js" \
  "$source_dir/sidepanel.js" \
  "$source_dir/icons" \
  "$source_dir/_locales" \
  "$source_dir/README.md" \
  "$source_dir/PRIVACY.md" \
  "$staging_dir/"

BUILD_REVISION="$build_revision" node --input-type=module - "$root_dir" "$staging_dir" <<'NODE'
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [rootDirectory, stagingDirectory] = process.argv.slice(2);
const manifest = JSON.parse(
  await readFile(path.join(rootDirectory, "integrations/browser-extension/manifest.json"), "utf8"),
);
const compatibility = JSON.parse(
  await readFile(path.join(rootDirectory, "integrations/browser-extension/compatibility.json"), "utf8"),
);
const revision = process.env.BUILD_REVISION;

if (!revision || (revision !== "development" && !/^[0-9a-f]{40}$/.test(revision))) {
  throw new Error("BUILD_REVISION must be development or a 40-character lowercase Git SHA.");
}
if (compatibility.schema !== "maillume-extension-compatibility-v1") {
  throw new Error("Extension compatibility metadata has an unsupported schema.");
}
if (manifest.version !== compatibility.extension_version) {
  throw new Error("Extension manifest version does not match generated compatibility metadata.");
}
if (!compatibility.supported_analysis_versions.includes(compatibility.current_analysis_version)) {
  throw new Error("The extension does not support the current server analysis version.");
}

const metadata = {
  schema: "maillume-extension-release-v1",
  extension_version: manifest.version,
  source_revision: revision,
  current_analysis_version: compatibility.current_analysis_version,
  supported_analysis_versions: compatibility.supported_analysis_versions,
};

await writeFile(
  path.join(stagingDirectory, "release-metadata.json"),
  `${JSON.stringify(metadata, null, 2)}\n`,
);
NODE

find "$staging_dir" -exec touch -t 198001010000 {} +
(cd "$staging_dir" && find . -type f | sed 's#^\./##' | LC_ALL=C sort | zip -q -X "$output_file" -@)

echo "$output_file"
