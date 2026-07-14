import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "../analysis/heuristic-analysis";
import { syntheticCorpus, type CorpusClassification, type SyntheticCorpusCase } from "./synthetic-corpus";

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

const overall = metrics(lockedResults);
assert.ok(overall.phishingNonLow >= 0.95, report("phishing non-low recall", overall.phishingNonLow));
assert.ok(overall.phishingHigh >= 0.8, report("phishing high recall", overall.phishingHigh));
assert.ok(overall.legitimateHigh <= 0.02, report("legitimate high rate", overall.legitimateHigh));
assert.ok(overall.legitimateNonLow <= 0.1, report("legitimate non-low rate", overall.legitimateNonLow));
assert.ok(overall.spamNonLow >= 0.85, report("spam non-low recall", overall.spamNonLow));

const english = metrics(lockedResults.filter(({ item }) => item.locale === "en"));
const dutch = metrics(lockedResults.filter(({ item }) => item.locale === "nl"));
for (const key of ["phishingNonLow", "phishingHigh", "legitimateHigh", "legitimateNonLow", "spamNonLow"] as const) {
  assert.ok(
    Math.abs(english[key] - dutch[key]) <= 0.1,
    `${key} language gap must remain within ten percentage points`,
  );
}

console.log("Synthetic corpus release gates passed.", JSON.stringify(overall));

function countByClass(items: SyntheticCorpusCase[], classification: CorpusClassification) {
  return items.filter((item) => item.classification === classification).length;
}

function metrics(results: Array<{ item: SyntheticCorpusCase; result: ReturnType<typeof analyzeEmailHeuristic> }>) {
  const phishing = results.filter(({ item }) => item.classification === "phishing");
  const spam = results.filter(({ item }) => item.classification === "spam");
  const legitimate = results.filter(({ item }) => item.classification === "legitimate");
  return {
    phishingNonLow: rate(phishing, ({ result }) => result.risk_level !== "low"),
    phishingHigh: rate(phishing, ({ result }) => result.risk_level === "high"),
    legitimateHigh: rate(legitimate, ({ result }) => result.risk_level === "high"),
    legitimateNonLow: rate(legitimate, ({ result }) => result.risk_level !== "low"),
    spamNonLow: rate(spam, ({ result }) => result.risk_level !== "low"),
  };
}

function rate<T>(items: T[], predicate: (item: T) => boolean): number {
  assert.ok(items.length > 0);
  return items.filter(predicate).length / items.length;
}

function report(label: string, value: number): string {
  return `${label} was ${(value * 100).toFixed(1)}%`;
}
