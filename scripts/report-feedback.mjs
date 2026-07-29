import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { getFeedbackConfig } = require(
  path.join(root, ".analysis-tests/src/lib/feedback/config.js"),
);
const {
  fetchFeedbackAggregateReport,
  formatFeedbackAggregateReport,
} = require(path.join(root, ".analysis-tests/src/lib/feedback/report.js"));

try {
  const options = parseArguments(process.argv.slice(2));
  const config = getFeedbackConfig();
  const report = await fetchFeedbackAggregateReport(config, {
    days: options.days,
    minimumSamples: options.minimumSamples,
    hourlySignatureCap: options.hourlySignatureCap,
  });
  const output = options.format === "json"
    ? `${JSON.stringify(report, null, 2)}\n`
    : `${formatFeedbackAggregateReport(report)}\n`;

  if (options.output) {
    await writeFile(path.resolve(root, options.output), output, "utf8");
  } else {
    process.stdout.write(output);
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Feedback report failed."}\n`,
  );
  process.exitCode = 1;
}

function parseArguments(args) {
  const options = {
    days: 30,
    minimumSamples: 10,
    hourlySignatureCap: 20,
    format: "human",
    output: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--days") {
      options.days = integerValue(args, ++index, "--days");
    } else if (argument === "--min-samples") {
      options.minimumSamples = integerValue(args, ++index, "--min-samples");
    } else if (argument === "--hourly-signature-cap") {
      options.hourlySignatureCap = integerValue(
        args,
        ++index,
        "--hourly-signature-cap",
      );
    } else if (argument === "--format") {
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

function integerValue(args, index, option) {
  const value = requiredValue(args, index, option);
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
