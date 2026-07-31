import assert from "node:assert/strict";

import { buildEvaluationObservations } from "./report";
import {
  assessV12Quality,
  assertV12Quality,
  V12_QUALITY_THRESHOLDS,
} from "./quality-gates";

const observations = buildEvaluationObservations();
const independentLocked = observations.filter(
  (item) => item.dataset === "independent-locked",
);
const assessment = assessV12Quality(independentLocked);

assert.equal(V12_QUALITY_THRESHOLDS.phishingRecall, 0.9);
assert.equal(V12_QUALITY_THRESHOLDS.spamRecall, 0.9);
assert.equal(V12_QUALITY_THRESHOLDS.phishingPrecision, 0.9);
assert.equal(V12_QUALITY_THRESHOLDS.spamPrecision, 0.9);
assert.equal(assessment.passed, true, assessment.failures.join("\n"));
assert.equal(assessment.phishingRecall.value, 1);
assert.equal(assessment.spamRecall.value, 1);
assert.equal(assessment.phishingPrecision.value, 1);
assert.equal(assessment.spamPrecision.value, 1);
assert.equal(assessment.legitimateNonLow.value, 0);
assert.doesNotThrow(() => assertV12Quality(independentLocked));

const degraded = independentLocked.map((item) => item.expected === "spam"
  ? {
      ...item,
      result: {
        ...item.result,
        classification: "likely_legitimate" as const,
        risk_level: "low" as const,
      },
    }
  : item);
const degradedAssessment = assessV12Quality(degraded);
assert.equal(degradedAssessment.passed, false);
assert.ok(degradedAssessment.failures.some((failure) => failure.includes("spam recall")));
assert.throws(() => assertV12Quality(degraded), /spam recall/);

console.log("Checked explicit v12 recall, precision, false-positive, and parity gates.");
