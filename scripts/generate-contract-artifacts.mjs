import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const root = process.cwd();
const check = process.argv.includes("--check");
const contractSource = path.join(root, "src/lib/contracts/public-contract.ts");

const contract = await loadContract();
const artifacts = [
  {
    path: path.join(root, "public/openapi.json"),
    content: formatJson(contract.createOpenApiDocument()),
  },
  {
    path: path.join(root, "integrations/browser-extension/compatibility.json"),
    content: formatJson(contract.createExtensionCompatibilityArtifact()),
  },
  {
    path: path.join(root, "integrations/browser-extension/sidepanel-compatibility.js"),
    content: formatExtensionModule(contract.createExtensionCompatibilityArtifact()),
  },
];

for (const artifact of artifacts) {
  if (check) {
    const actual = await readFile(artifact.path, "utf8");
    assert.equal(
      actual,
      artifact.content,
      `${path.relative(root, artifact.path)} is stale; run npm run generate:contracts.`,
    );
  } else {
    await writeFile(artifact.path, artifact.content);
  }
}

console.log(`${check ? "Checked" : "Generated"} ${artifacts.length} public contract artifacts.`);

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatExtensionModule(value) {
  return [
    "// Generated from src/lib/contracts/public-contract.ts. Do not edit by hand.",
    "/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */",
    `const MAILLUME_EXTENSION_COMPATIBILITY = Object.freeze(${JSON.stringify(value, null, 2)});`,
    "",
  ].join("\n");
}

async function loadContract() {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "maillume-contract-"));
  try {
    const compiler = path.join(root, "node_modules/typescript/bin/tsc");
    await execFileAsync(process.execPath, [
      compiler,
      contractSource,
      "--target", "ES2020",
      "--module", "commonjs",
      "--moduleResolution", "node",
      "--skipLibCheck",
      "--rootDir", path.dirname(contractSource),
      "--outDir", temporaryDirectory,
      "--pretty", "false",
    ], { cwd: root });
    return require(path.join(temporaryDirectory, "public-contract.js"));
  } finally {
    // CommonJS loads the module synchronously, so it is safe to remove after require().
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
