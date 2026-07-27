import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "../analysis/heuristic-analysis";
import { summarizeEvaluation } from "./metrics";
import { getScenarioCategory } from "./scenario-metadata";
import { syntheticCorpus, type CorpusClassification, type SyntheticCorpusCase } from "./synthetic-corpus";
import type { EvaluationObservation } from "./types";

assert.equal(syntheticCorpus.length, 300);
assert.equal(countByClass(syntheticCorpus, "phishing"), 100);
assert.equal(countByClass(syntheticCorpus, "spam"), 50);
assert.equal(countByClass(syntheticCorpus, "legitimate"), 150);
assert.equal(syntheticCorpus.filter((item) => item.locale === "en").length, 150);
assert.equal(syntheticCorpus.filter((item) => item.locale === "nl").length, 150);
assert.equal(syntheticCorpus.filter((item) => item.split === "development").length, 200);
assert.equal(syntheticCorpus.filter((item) => item.split === "locked").length, 100);

const scenarioSplits = new Map<string, Set<string>>();
for (const item of syntheticCorpus) {
  const splits = scenarioSplits.get(item.scenarioId) ?? new Set<string>();
  splits.add(item.split);
  scenarioSplits.set(item.scenarioId, splits);
  assert.match(item.input.senderEmail ?? "", /\.(?:example|invalid)$/);
  assert.equal(item.input.locale, item.locale);
}
for (const [scenarioId, splits] of scenarioSplits) {
  assert.equal(splits.size, 1, `${scenarioId} must not cross evaluation splits`);
}

const lockedResults = syntheticCorpus
  .filter((item) => item.split === "locked")
  .map((item) => ({ item, result: analyzeEmailHeuristic(item.input) }));

for (const { item, result } of lockedResults) {
  assert.equal(
    result.score_factors.reduce((total, factor) => total + factor.contribution, 0),
    result.risk_score,
    `${item.id} factors must sum to its risk index`,
  );
  assert.ok(result.risk_score >= 0 && result.risk_score <= 100);
}

const lockedObservations = lockedResults.map(({ item, result }) =>
  toObservation(item, result),
);
const overall = summarizeEvaluation(lockedObservations);
assertRateAtLeast("phishing non-low recall", overall.rates.phishingNonLow.value, 0.95);
assertRateAtLeast("phishing high recall", overall.rates.phishingHigh.value, 0.8);
assertRateAtMost("legitimate high rate", overall.rates.legitimateHigh.value, 0.02);
assertRateAtMost("legitimate non-low rate", overall.rates.legitimateNonLow.value, 0.1);
assertRateAtLeast("spam non-low recall", overall.rates.spamNonLow.value, 0.85);

const english = summarizeEvaluation(
  lockedObservations.filter((item) => item.language === "en"),
).rates;
const dutch = summarizeEvaluation(
  lockedObservations.filter((item) => item.language === "nl"),
).rates;
for (const key of ["phishingNonLow", "phishingHigh", "legitimateHigh", "legitimateNonLow", "spamNonLow"] as const) {
  assert.notEqual(english[key].value, null);
  assert.notEqual(dutch[key].value, null);
  assert.ok(
    Math.abs((english[key].value ?? 0) - (dutch[key].value ?? 0)) <= 0.1,
    `${key} language gap must remain within ten percentage points`,
  );
}

console.log("Synthetic corpus release gates passed.", JSON.stringify(overall.rates));

function countByClass(items: SyntheticCorpusCase[], classification: CorpusClassification) {
  return items.filter((item) => item.classification === classification).length;
}

function toObservation(
  item: SyntheticCorpusCase,
  result: ReturnType<typeof analyzeEmailHeuristic>,
): EvaluationObservation {
  return {
    dataset: "synthetic-locked",
    caseId: item.id,
    scenarioId: item.scenarioId,
    scenarioCategory: getScenarioCategory("synthetic-locked", item.scenarioId),
    expected: item.classification,
    language: item.locale,
    source: "paste",
    evidenceCompleteness: "complete",
    result,
  };
}

function assertRateAtLeast(label: string, value: number | null, minimum: number) {
  assert.notEqual(value, null, `${label} must have a denominator`);
  assert.ok((value ?? 0) >= minimum, report(label, value ?? 0));
}

function assertRateAtMost(label: string, value: number | null, maximum: number) {
  assert.notEqual(value, null, `${label} must have a denominator`);
  assert.ok((value ?? 1) <= maximum, report(label, value ?? 1));
}

function report(label: string, value: number) {
  return `${label} was ${(value * 100).toFixed(1)}%`;
}
