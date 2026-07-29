import { performance } from "node:perf_hooks";

import { createAnalysisEnvelope } from "../analysis/analysis-envelope";
import { analyzeEmailHeuristic } from "../analysis/heuristic-analysis";
import {
  ANALYSIS_PIPELINE_VERSION,
  MAX_SCAN_BODY_LENGTH,
  type AnalysisEnvelope,
} from "../types";

export const HEURISTIC_BENCHMARK_SCHEMA_VERSION = "heuristic-benchmark-v1";

export type HeuristicBenchmarkResult = {
  schemaVersion: typeof HEURISTIC_BENCHMARK_SCHEMA_VERSION;
  generatedAt: string;
  analysisVersion: typeof ANALYSIS_PIPELINE_VERSION;
  iterations: number;
  warmupIterations: number;
  runtime: {
    node: string;
    platform: NodeJS.Platform;
    architecture: string;
  };
  scenarios: Array<{
    id: string;
    bodyLength: number;
    linkCount: number;
    medianMs: number;
    p95Ms: number;
    meanMs: number;
    minMs: number;
    maxMs: number;
  }>;
  checksum: number;
};

type BenchmarkScenario = {
  id: string;
  envelope: AnalysisEnvelope;
};

export function buildHeuristicBenchmarkScenarios(): BenchmarkScenario[] {
  const linkHeavyLinks = Array.from(
    { length: 20 },
    (_, index) => `https://portal-${index + 1}.example/review/${index + 1}`,
  );
  const neutralParagraph =
    "The project notes summarize the agreed design review and the next scheduled meeting. ";
  const longNeutralBody = neutralParagraph.repeat(120).slice(0, 10_000);
  const maxSizeBody = neutralParagraph
    .repeat(Math.ceil(MAX_SCAN_BODY_LENGTH / neutralParagraph.length))
    .slice(0, MAX_SCAN_BODY_LENGTH);

  return [
    {
      id: "short-message",
      envelope: createAnalysisEnvelope({
        subject: "Mailbox review",
        senderEmail: "notice@account-review.invalid",
        body: "Your mailbox is blocked. Verify your password immediately to restore access.",
      }, "paste"),
    },
    {
      id: "long-message",
      envelope: createAnalysisEnvelope({
        subject: "Project review notes",
        senderEmail: "notes@studio.example",
        body: longNeutralBody,
      }, "paste"),
    },
    {
      id: "link-heavy-message",
      envelope: createAnalysisEnvelope({
        subject: "Portal index",
        senderEmail: "portal@studio.example",
        body: `Reference links:\n${linkHeavyLinks.join("\n")}`,
        links: linkHeavyLinks,
      }, "paste"),
    },
    {
      id: "maximum-size-message",
      envelope: createAnalysisEnvelope({
        subject: "Complete project archive notes",
        senderEmail: "archive@studio.example",
        body: maxSizeBody,
      }, "paste"),
    },
  ];
}

export function runHeuristicBenchmark(options: {
  iterations?: number;
  warmupIterations?: number;
  generatedAt?: string;
} = {}): HeuristicBenchmarkResult {
  const iterations = boundedIterationCount(options.iterations ?? 1_000, "iterations");
  const warmupIterations = boundedIterationCount(
    options.warmupIterations ?? 100,
    "warmupIterations",
  );
  const scenarios = buildHeuristicBenchmarkScenarios();
  let checksum = 0;

  for (const scenario of scenarios) {
    for (let index = 0; index < warmupIterations; index += 1) {
      checksum += analyzeEmailHeuristic(scenario.envelope).risk_score;
    }
  }

  const results = scenarios.map((scenario) => {
    const durations: number[] = [];
    for (let index = 0; index < iterations; index += 1) {
      const started = performance.now();
      const result = analyzeEmailHeuristic(scenario.envelope);
      durations.push(performance.now() - started);
      checksum += result.risk_score;
    }
    durations.sort((left, right) => left - right);
    return {
      id: scenario.id,
      bodyLength: scenario.envelope.body.length,
      linkCount: scenario.envelope.links.length,
      medianMs: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      meanMs: durations.reduce((total, duration) => total + duration, 0) / durations.length,
      minMs: durations[0],
      maxMs: durations.at(-1) ?? durations[0],
    };
  });

  return {
    schemaVersion: HEURISTIC_BENCHMARK_SCHEMA_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    analysisVersion: ANALYSIS_PIPELINE_VERSION,
    iterations,
    warmupIterations,
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    scenarios: results,
    checksum,
  };
}

export function formatHeuristicBenchmark(result: HeuristicBenchmarkResult): string {
  const headers = ["Scenario", "Chars", "Links", "Median ms", "p95 ms", "Mean ms"];
  const rows = result.scenarios.map((scenario) => [
    scenario.id,
    String(scenario.bodyLength),
    String(scenario.linkCount),
    scenario.medianMs.toFixed(3),
    scenario.p95Ms.toFixed(3),
    scenario.meanMs.toFixed(3),
  ]);
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length)),
  );
  const render = (row: string[]) => row
    .map((cell, index) => cell.padEnd(widths[index]))
    .join(" | ")
    .trimEnd();
  return [
    "Maillume heuristic benchmark",
    `Analysis version: ${result.analysisVersion}`,
    `Runtime: ${result.runtime.node} ${result.runtime.platform}/${result.runtime.architecture}`,
    `Iterations: ${result.iterations} measured, ${result.warmupIterations} warmup per scenario`,
    "This benchmark is diagnostic and is not an absolute CI timing gate.",
    "",
    render(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map(render),
  ].join("\n");
}

function percentile(sortedValues: number[], quantile: number): number {
  const index = Math.max(0, Math.ceil(sortedValues.length * quantile) - 1);
  return sortedValues[index];
}

function boundedIterationCount(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 100_000) {
    throw new Error(`${name} must be an integer between 1 and 100000.`);
  }
  return value;
}
