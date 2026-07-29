import assert from "node:assert/strict";

import { ANALYSIS_PIPELINE_VERSION } from "../types";
import { CROSS_INPUT_FIXTURES } from "./cross-input-fixtures";
import { emailEvaluationFixtures } from "./email-fixtures";
import {
  INDEPENDENT_DEVELOPMENT,
  INDEPENDENT_HOLDOUT,
  INDEPENDENT_VALIDATION,
} from "./independent-corpus";
import {
  buildEvaluationObservations,
  buildHeuristicEvaluationReport,
  EVALUATION_REPORT_SCHEMA_VERSION,
  formatHeuristicEvaluationReport,
} from "./report";
import {
  getScenarioCategory,
  getScenarioMetadataIds,
} from "./scenario-metadata";
import { PUBLIC_ADVISORY_HOLDOUT } from "./public-advisory-holdout";
import { syntheticCorpus } from "./synthetic-corpus";

const generatedAt = "2026-07-27T12:00:00.000Z";
const report = buildHeuristicEvaluationReport({
  corpusRevision: "sha256:test-corpus",
  generatedAt,
});

assert.equal(report.schemaVersion, EVALUATION_REPORT_SCHEMA_VERSION);
assert.equal(report.generatedAt, generatedAt);
assert.equal(report.analysisVersion, ANALYSIS_PIPELINE_VERSION);
assert.equal(report.corpusRevision, "sha256:test-corpus");
assert.equal(report.inventory.cases, 456);
assert.equal(report.inventory.scenarios, 132);
assert.deepEqual(
  Object.fromEntries(
    Object.entries(report.datasets).map(([dataset, summary]) => [
      dataset,
      [summary.cases, summary.scenarios],
    ]),
  ),
  {
    calibration: [12, 12],
    "public-advisory-holdout": [12, 12],
    "independent-development": [20, 20],
    "independent-validation": [20, 20],
    "independent-locked": [20, 20],
    "synthetic-development": [200, 20],
    "synthetic-locked": [100, 10],
    "cross-input": [72, 18],
  },
);
assert.equal(report.breakdowns.source.paste.cases, 356);
assert.equal(report.breakdowns.source.screenshot.cases, 33);
assert.equal(report.breakdowns.source.chrome.cases, 33);
assert.equal(report.breakdowns.source.eml.cases, 34);
assert.equal(report.breakdowns.language.en.cases, 229);
assert.equal(report.breakdowns.language.nl.cases, 227);

const observations = buildEvaluationObservations();
assert.equal(observations.length, report.inventory.cases);
assert.equal(
  observations.filter((item) => item.evidenceCompleteness === "incomplete").length,
  35,
);
assert.equal(
  observations.filter((item) => item.evidenceCompleteness === "complete").length,
  421,
);
for (const observation of observations) {
  assert.equal(
    observation.result.score_factors.reduce(
      (total, factor) => total + factor.contribution,
      0,
    ),
    observation.result.risk_score,
    `${observation.dataset}/${observation.caseId} factors must sum to its score`,
  );
}

const serialized = JSON.stringify(report);
for (const forbidden of [
  '"body"',
  '"subject"',
  '"senderEmail"',
  '"detected_links"',
  "Your mailbox is blocked",
]) {
  assert.ok(!serialized.includes(forbidden), `Report must not contain ${forbidden}`);
}

const human = formatHeuristicEvaluationReport(report);
assert.match(human, /Maillume heuristic evaluation baseline/);
assert.match(human, new RegExp(`Analysis version: ${ANALYSIS_PIPELINE_VERSION}`));
assert.match(human, /calibration\s+\|\s+12\s+\|\s+12/);
assert.match(human, /not a claim of real-world accuracy/i);
assert.match(human, /Cases\s+\|\s+Scenarios/);

assertScenarioMetadataCoverage();

console.log("Heuristic evaluation report passed.");

function assertScenarioMetadataCoverage() {
  const expectedIds = {
    calibration: emailEvaluationFixtures.map((item) => item.id),
    "public-advisory-holdout": PUBLIC_ADVISORY_HOLDOUT.map((item) => item.id),
    "independent-development": INDEPENDENT_DEVELOPMENT.map((item) => item.id),
    "independent-validation": INDEPENDENT_VALIDATION.map((item) => item.id),
    "independent-locked": INDEPENDENT_HOLDOUT.map((item) => item.id),
    "cross-input": CROSS_INPUT_FIXTURES.map((item) => item.id),
  } as const;

  for (const [dataset, ids] of Object.entries(expectedIds)) {
    const uniqueIds = Array.from(new Set(ids)).sort();
    assert.deepEqual(
      getScenarioMetadataIds(dataset as keyof typeof expectedIds),
      uniqueIds,
      `${dataset} metadata must exactly cover its corpus scenarios`,
    );
    for (const id of uniqueIds) {
      assert.doesNotThrow(() =>
        getScenarioCategory(dataset as keyof typeof expectedIds, id),
      );
    }
  }

  const allSyntheticIds = Array.from(
    new Set(syntheticCorpus.map((item) => item.scenarioId)),
  ).sort();
  assert.deepEqual(
    getScenarioMetadataIds("synthetic-development"),
    allSyntheticIds,
  );
  assert.deepEqual(
    getScenarioMetadataIds("synthetic-locked"),
    allSyntheticIds,
  );
  for (const item of syntheticCorpus) {
    const dataset = item.split === "locked"
      ? "synthetic-locked"
      : "synthetic-development";
    assert.doesNotThrow(() => getScenarioCategory(dataset, item.scenarioId));
  }
}
