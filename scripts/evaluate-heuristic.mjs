import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpusFiles = [
  "src/lib/evaluation/cross-input-fixtures.ts",
  "src/lib/evaluation/email-fixtures.ts",
  "src/lib/evaluation/independent-corpus-types.ts",
  "src/lib/evaluation/independent-corpus.ts",
  "src/lib/evaluation/independent-development.ts",
  "src/lib/evaluation/independent-validation.ts",
  "src/lib/evaluation/independent-holdout.ts",
  "src/lib/evaluation/public-advisory-holdout.ts",
  "src/lib/evaluation/scenario-metadata.ts",
  "src/lib/evaluation/synthetic-corpus.ts",
];
const options = parseArguments(process.argv.slice(2));
const corpusRevision = await calculateCorpusRevision();
const require = createRequire(import.meta.url);
const {
  buildHeuristicEvaluationReport,
  formatHeuristicEvaluationReport,
} = require(path.join(root, ".analysis-tests/src/lib/evaluation/report.js"));
const report = buildHeuristicEvaluationReport({ corpusRevision });
const output = options.format === "json"
  ? `${JSON.stringify(report, null, 2)}\n`
  : `${formatHeuristicEvaluationReport(report)}\n`;

if (options.output) {
  await writeFile(path.resolve(root, options.output), output, "utf8");
} else {
  process.stdout.write(output);
}

async function calculateCorpusRevision() {
  const hash = createHash("sha256");
  for (const relativePath of corpusFiles) {
    hash.update(`${relativePath}\0`, "utf8");
    hash.update(await readFile(path.join(root, relativePath)));
    hash.update("\0", "utf8");
  }
  return `sha256:${hash.digest("hex")}`;
}

function parseArguments(args) {
  const options = { format: "human", output: undefined };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--format") {
      options.format = requiredValue(args, ++index, "--format");
      if (!["human", "json"].includes(options.format)) {
        throw new Error("--format must be either human or json.");
      }
    } else if (argument === "--output") {
      options.output = requiredValue(args, ++index, "--output");
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function requiredValue(args, index, option) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}
