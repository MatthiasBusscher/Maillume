import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArguments(process.argv.slice(2));
const require = createRequire(import.meta.url);
const {
  formatHeuristicBenchmark,
  runHeuristicBenchmark,
} = require(path.join(root, ".analysis-tests/src/lib/evaluation/benchmark.js"));
const result = runHeuristicBenchmark({
  iterations: options.iterations,
  warmupIterations: options.warmupIterations,
});
const output = options.format === "json"
  ? `${JSON.stringify(result, null, 2)}\n`
  : `${formatHeuristicBenchmark(result)}\n`;

if (options.output) {
  await writeFile(path.resolve(root, options.output), output, "utf8");
} else {
  process.stdout.write(output);
}

function parseArguments(args) {
  const options = {
    format: "human",
    iterations: undefined,
    warmupIterations: undefined,
    output: undefined,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--format") {
      options.format = requiredValue(args, ++index, "--format");
      if (!["human", "json"].includes(options.format)) {
        throw new Error("--format must be either human or json.");
      }
    } else if (argument === "--iterations") {
      options.iterations = parseInteger(requiredValue(args, ++index, "--iterations"), "--iterations");
    } else if (argument === "--warmup") {
      options.warmupIterations = parseInteger(requiredValue(args, ++index, "--warmup"), "--warmup");
    } else if (argument === "--output") {
      options.output = requiredValue(args, ++index, "--output");
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function parseInteger(value, option) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${option} requires an integer.`);
  }
  return Number(value);
}

function requiredValue(args, index, option) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}
