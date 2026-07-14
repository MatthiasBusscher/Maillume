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

const dutchResult = analyzeEmailHeuristic({
  locale: "nl",
  subject: "Laatste waarschuwing: account geblokkeerd",
  senderEmail: "beveiliging@mcafee-verlenging.click",
  body: "Uw abonnement verloopt vandaag. Klik hier en bevestig uw gegevens: https://mcafee-verlenging.click/login",
});
assert.notEqual(dutchResult.risk_level, "low", "Dutch suspicious sample should not be low risk");
assert.ok(dutchResult.suspicious_signals.some((signal) => /dringende|geblokkeerd|abonnement|afzenderdomein/.test(signal)), "Dutch analysis should localize suspicious signals");
assert.match(dutchResult.recommended_action, /Klik niet|voorzichtig/);
assert.doesNotMatch(dutchResult.short_explanation, /This message/);

const structuralUrlRegression = analyzeEmailHeuristic({
  senderEmail: "account@microsoft.example",
  body: "Review your own account activity at https://account.microsoft.com/security and download the requested archive from https://files.example/archive.zip.",
});
assert.ok(!structuralUrlRegression.score_factors.some((factor) => factor.id === "short_url"));
assert.ok(!structuralUrlRegression.score_factors.some((factor) => factor.id === "risky_link_domain"));

const brandSubstringRegression = analyzeEmailHeuristic({
  senderEmail: "orders@applecart.example",
  body: "Your Applecart order was delivered successfully. No action is required.",
});
assert.ok(!brandSubstringRegression.score_factors.some((factor) => factor.id === "brand_lookalike_sender"));

const redirectRegression = analyzeEmailHeuristic({
  senderEmail: "billing@vendor.example",
  body: '<a href="https://tracking.vendor.example/open">https://portal.vendor.example/invoice</a>',
});
assert.ok(!redirectRegression.score_factors.some((factor) => factor.id === "link_mismatch"));

const changedPaymentDetails = analyzeEmailHeuristic({
  senderEmail: "director@company-finance.example",
  body: "This is the CEO. Use our new bank account for the urgent supplier transfer today.",
});
assert.notEqual(changedPaymentDetails.risk_level, "low");
assert.equal(changedPaymentDetails.classification, "likely_phishing");

const insufficientContext = analyzeEmailHeuristic({ body: "Can you take a look?" });
assert.equal(insufficientContext.risk_level, "low");
assert.equal(insufficientContext.classification, "uncertain");

const noWarningSignals = analyzeEmailHeuristic({
  senderEmail: "colleague@example.test",
  body: "Here are the meeting notes we discussed yesterday. The next project review remains scheduled for Thursday afternoon.",
});
assert.equal(noWarningSignals.risk_score, 0);
assert.equal(noWarningSignals.classification, "likely_legitimate");

for (const result of [dutchResult, structuralUrlRegression, brandSubstringRegression, redirectRegression, changedPaymentDetails, insufficientContext, noWarningSignals]) {
  assert.equal(
    result.score_factors.reduce((total, factor) => total + factor.contribution, 0),
    result.risk_score,
  );
}

console.log(`Checked ${heuristicCalibrationFixtures.length} heuristic calibration fixtures.`);
