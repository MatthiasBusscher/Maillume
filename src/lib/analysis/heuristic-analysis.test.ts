import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "./heuristic-analysis";
import { heuristicCalibrationFixtures } from "./heuristic-fixtures";

const CERTAINTY_PATTERN = /\b(100%|always|guaranteed|guarantee|definitely|certainly)\b/i;

for (const fixture of heuristicCalibrationFixtures) {
  const result = analyzeEmailHeuristic(fixture.input);
  const context = `${fixture.id} (${result.risk_score}, ${result.risk_level})`;

  assert.equal(
    result.risk_level,
    fixture.expectedRiskLevel,
    `${context}: expected risk level ${fixture.expectedRiskLevel}`,
  );

  if (fixture.category === "phishing" || fixture.category === "spam") {
    assert.notEqual(result.risk_level, "low", `${context}: suspicious fixture should not be low risk`);
  }

  if (fixture.category === "legitimate") {
    assert.notEqual(result.risk_level, "high", `${context}: legitimate fixture should not be high risk`);
  }

  if (fixture.minScore !== undefined) {
    assert.ok(result.risk_score >= fixture.minScore, `${context}: score below ${fixture.minScore}`);
  }

  if (fixture.maxScore !== undefined) {
    assert.ok(result.risk_score <= fixture.maxScore, `${context}: score above ${fixture.maxScore}`);
  }

  if (fixture.minSignals !== undefined) {
    assert.ok(
      result.suspicious_signals.length >= fixture.minSignals,
      `${context}: expected at least ${fixture.minSignals} suspicious signals`,
    );
  }

  for (const snippet of fixture.requiredSignalSnippets ?? []) {
    assert.ok(
      result.suspicious_signals.some((signal) =>
        signal.toLowerCase().includes(snippet.toLowerCase()),
      ),
      `${context}: missing signal containing "${snippet}"`,
    );
  }

  assert.ok(
    !CERTAINTY_PATTERN.test(`${result.short_explanation} ${result.recommended_action}`),
    `${context}: analyzer copy should avoid certainty claims`,
  );
}

console.log(`Checked ${heuristicCalibrationFixtures.length} heuristic calibration fixtures.`);
