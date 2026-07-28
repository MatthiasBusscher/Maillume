import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const archive = path.join(root, "dist/maillume-browser-extension.zip");
const manifest = JSON.parse(
  await readFile(path.join(root, "integrations/browser-extension/manifest.json"), "utf8"),
);
const sidePanel = await readFile(
  path.join(root, "integrations/browser-extension/sidepanel.js"),
  "utf8",
);
const types = await readFile(path.join(root, "src/lib/types.ts"), "utf8");
const expectedRevision = process.env.EXPECTED_REVISION ?? "development";

assert.match(
  expectedRevision,
  /^(development|[0-9a-f]{40})$/,
  "EXPECTED_REVISION must be development or a 40-character lowercase Git SHA",
);

const { stdout } = await execFileAsync(
  "unzip",
  ["-p", archive, "release-metadata.json"],
  { maxBuffer: 64 * 1024 },
);
const metadata = JSON.parse(stdout);
const supportedMatch = sidePanel.match(
  /const SUPPORTED_ANALYSIS_VERSIONS = (\[[^\n]+\]);/,
);
const currentMatch = types.match(
  /ANALYSIS_PIPELINE_VERSION = "(analysis-v[1-9]\d*)"/,
);

assert.ok(supportedMatch, "the extension compatibility range must be statically discoverable");
assert.ok(currentMatch, "the current analysis version must be statically discoverable");

const expectedSupportedVersions = JSON.parse(supportedMatch[1]);
assert.deepEqual(
  Object.keys(metadata).sort(),
  [
    "current_analysis_version",
    "extension_version",
    "schema",
    "source_revision",
    "supported_analysis_versions",
  ],
  "release metadata must contain only the approved non-sensitive fields",
);
assert.equal(metadata.schema, "maillume-extension-release-v1");
assert.equal(metadata.extension_version, manifest.version);
assert.equal(metadata.source_revision, expectedRevision);
assert.equal(metadata.current_analysis_version, currentMatch[1]);
assert.deepEqual(metadata.supported_analysis_versions, expectedSupportedVersions);
assert.ok(
  metadata.supported_analysis_versions.includes(metadata.current_analysis_version),
  "the packaged extension must support the packaged server contract",
);

console.log(
  `Verified extension ${metadata.extension_version} revision ${metadata.source_revision} `
    + `against ${metadata.current_analysis_version}.`,
);
