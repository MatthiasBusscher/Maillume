import assert from "node:assert/strict";

import {
  summarizeEvaluation,
  summarizeEvaluationBy,
} from "./metrics";
import type {
  EvaluationObservation,
  EvaluationPrediction,
} from "./types";

const observations = [
  fixture("phish-a/en", "phish-a", "phishing", "phishing", "high", "en"),
  fixture("phish-a/nl", "phish-a", "phishing", "phishing", "medium", "nl"),
  fixture("phish-b", "phish-b", "phishing", "uncertain", "low", "en"),
  fixture("spam-a", "spam-a", "spam", "spam", "medium", "en"),
  fixture("legit-a", "legit-a", "legitimate", "legitimate", "low", "en"),
  fixture("legit-b", "legit-b", "legitimate", "phishing", "high", "nl"),
];

const summary = summarizeEvaluation(observations);
assert.equal(summary.cases, 6);
assert.equal(summary.scenarios, 5);
assert.deepEqual(summary.expected.phishing, { cases: 3, scenarios: 2 });
assert.deepEqual(summary.predicted.phishing, { cases: 3, scenarios: 2 });
assert.deepEqual(summary.confusionMatrix.phishing.phishing, {
  cases: 2,
  scenarios: 1,
});
assert.deepEqual(summary.confusionMatrix.phishing.uncertain, {
  cases: 1,
  scenarios: 1,
});
assert.deepEqual(summary.confusionMatrix.legitimate.phishing, {
  cases: 1,
  scenarios: 1,
});
assert.deepEqual(summary.rates.phishingNonLow, {
  numerator: 2,
  denominator: 3,
  scenarios: 2,
  value: 2 / 3,
});
assert.deepEqual(summary.rates.phishingHigh, {
  numerator: 1,
  denominator: 3,
  scenarios: 2,
  value: 1 / 3,
});
assert.deepEqual(summary.rates.spamNonLow, {
  numerator: 1,
  denominator: 1,
  scenarios: 1,
  value: 1,
});
assert.deepEqual(summary.rates.legitimateNonLow, {
  numerator: 1,
  denominator: 2,
  scenarios: 2,
  value: 0.5,
});
assert.deepEqual(summary.rates.legitimateHigh, {
  numerator: 1,
  denominator: 2,
  scenarios: 2,
  value: 0.5,
});

const byLanguage = summarizeEvaluationBy(observations, (item) => item.language);
assert.deepEqual(Object.keys(byLanguage), ["en", "nl"]);
assert.equal(byLanguage.en.cases, 4);
assert.equal(byLanguage.en.scenarios, 4);
assert.equal(byLanguage.nl.cases, 2);
assert.equal(byLanguage.nl.scenarios, 2);

const empty = summarizeEvaluation([]);
assert.deepEqual(empty.rates.phishingNonLow, {
  numerator: 0,
  denominator: 0,
  scenarios: 0,
  value: null,
});
assert.deepEqual(empty.rates.legitimateHigh, {
  numerator: 0,
  denominator: 0,
  scenarios: 0,
  value: null,
});

console.log("Reusable heuristic evaluation metrics passed.");

function fixture(
  caseId: string,
  scenarioId: string,
  expected: EvaluationObservation["expected"],
  prediction: EvaluationPrediction,
  riskLevel: EvaluationObservation["result"]["risk_level"],
  language: EvaluationObservation["language"],
): EvaluationObservation {
  const classifications = {
    phishing: "likely_phishing",
    spam: "likely_spam",
    legitimate: "likely_legitimate",
    uncertain: "uncertain",
  } as const;
  return {
    dataset: "synthetic-locked",
    caseId,
    scenarioId,
    scenarioCategory: "account-access",
    expected,
    language,
    source: "paste",
    evidenceCompleteness: "complete",
    result: {
      classification: classifications[prediction],
      risk_level: riskLevel,
      risk_score: riskLevel === "high" ? 80 : riskLevel === "medium" ? 45 : 0,
      score_factors: [],
    },
  };
}
