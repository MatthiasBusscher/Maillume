import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "../analysis/heuristic-analysis";
import { summarizeEvaluation } from "./metrics";
import { PUBLIC_ADVISORY_HOLDOUT } from "./public-advisory-holdout";
import { getScenarioCategory } from "./scenario-metadata";
import type { EvaluationObservation } from "./types";

assert.equal(PUBLIC_ADVISORY_HOLDOUT.length, 12);
assert.equal(new Set(PUBLIC_ADVISORY_HOLDOUT.map((item) => item.id)).size, 12);

const results = PUBLIC_ADVISORY_HOLDOUT.map((item) => ({
  item,
  result: analyzeEmailHeuristic(item.input),
}));
const legitimate = results.filter(({ item }) => item.expected === "legitimate");
const summary = summarizeEvaluation(results.map(({ item, result }) => ({
  dataset: "public-advisory-holdout",
  caseId: item.id,
  scenarioId: item.id,
  scenarioCategory: getScenarioCategory("public-advisory-holdout", item.id),
  expected: item.expected,
  language: item.input.locale ?? "en",
  source: "paste",
  evidenceCompleteness: "complete",
  result,
} satisfies EvaluationObservation)));

for (const { item } of results) {
  if (item.provenance.kind === "public_advisory") {
    assert.match(item.provenance.url, /^https:\/\/opgelicht\.avrotros\.nl\/alerts\//);
  } else {
    assert.match(item.provenance.path, /^supabase\/templates\//);
  }
  assert.match(item.input.senderEmail ?? "", /\.(?:example|invalid)$/);
}
assert.ok(
  (summary.rates.phishingNonLow.value ?? 0) >= 0.8,
  "Public-advisory phishing holdout non-low recall must remain at least 80%",
);
assert.ok(
  (summary.rates.legitimateNonLow.value ?? 1) <= 0.2,
  "Public-advisory hard-negative non-low rate must remain at most 20%",
);
assert.ok(legitimate.every(({ result }) => result.classification !== "likely_phishing"));

console.log("Public-advisory holdout gates passed.");
