import assert from "node:assert/strict";

import {
  buildHeuristicBenchmarkScenarios,
  formatHeuristicBenchmark,
  HEURISTIC_BENCHMARK_SCHEMA_VERSION,
  runHeuristicBenchmark,
} from "./benchmark";
import {
  ANALYSIS_PIPELINE_VERSION,
  MAX_SCAN_BODY_LENGTH,
} from "../types";

const scenarios = buildHeuristicBenchmarkScenarios();
assert.deepEqual(
  scenarios.map((scenario) => scenario.id),
  [
    "short-message",
    "long-message",
    "link-heavy-message",
    "maximum-size-message",
  ],
);
assert.equal(
  scenarios.find((scenario) => scenario.id === "link-heavy-message")?.envelope.links.length,
  20,
);
assert.equal(
  scenarios.find((scenario) => scenario.id === "maximum-size-message")?.envelope.body.length,
  MAX_SCAN_BODY_LENGTH,
);

const result = runHeuristicBenchmark({
  iterations: 3,
  warmupIterations: 1,
  generatedAt: "2026-07-27T12:00:00.000Z",
});
assert.equal(result.schemaVersion, HEURISTIC_BENCHMARK_SCHEMA_VERSION);
assert.equal(result.analysisVersion, ANALYSIS_PIPELINE_VERSION);
assert.equal(result.iterations, 3);
assert.equal(result.warmupIterations, 1);
assert.equal(result.scenarios.length, 4);
assert.ok(Number.isFinite(result.checksum));
for (const scenario of result.scenarios) {
  assert.ok(scenario.medianMs >= 0);
  assert.ok(scenario.p95Ms >= scenario.medianMs);
  assert.ok(scenario.maxMs >= scenario.minMs);
}
assert.match(formatHeuristicBenchmark(result), /not an absolute CI timing gate/i);
assert.throws(
  () => runHeuristicBenchmark({ iterations: 0 }),
  /iterations must be an integer between 1 and 100000/,
);
assert.throws(
  () => runHeuristicBenchmark({ warmupIterations: 100_001 }),
  /warmupIterations must be an integer between 1 and 100000/,
);

console.log("Heuristic benchmark harness passed.");
