import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "../analysis/heuristic-analysis";
import { createAnalysisEnvelope } from "../analysis/analysis-envelope";
import type { AnalysisLocale, ScanSource } from "../types";

const scenarios: Array<{ id: string; locale: AnalysisLocale; subject?: string; body: string }> = [
  {
    id: "en-credential-lure",
    locale: "en",
    subject: "Final notice: account locked",
    body: "Your account is blocked. Verify your password immediately to keep access.",
  },
  {
    id: "nl-payment-change",
    locale: "nl",
    subject: "Nieuwe betaalgegevens",
    body: "Gebruik direct onze nieuwe bankrekening voor de achterstallige overschrijving.",
  },
  {
    id: "en-promotion",
    locale: "en",
    body: "Claim your 75% renewal discount before midnight. This limited-time offer ends tonight.",
  },
  {
    id: "nl-legitimate-hard-negative",
    locale: "nl",
    body: "De projectbespreking blijft donderdagmiddag staan. Er is geen actie nodig.",
  },
];

const sources: ScanSource[] = ["paste", "screenshot", "eml"];
const scoreDeltas: number[] = [];

for (const scenario of scenarios) {
  const results = sources.map((source) => analyzeEmailHeuristic(createAnalysisEnvelope({
    locale: scenario.locale,
    subject: scenario.subject,
    body: scenario.body,
  }, source)));
  const classifications = new Set(results.map((result) => result.classification));
  const scores = results.map((result) => result.risk_score);
  const scoreDelta = Math.max(...scores) - Math.min(...scores);

  assert.equal(classifications.size, 1, `${scenario.id}: equivalent inputs must classify alike`);
  assert.ok(scoreDelta <= 5, `${scenario.id}: equivalent scores differ by ${scoreDelta}`);
  assert.deepEqual(
    results.map((result) => result.score_factors.map((factor) => factor.id)),
    [
      results[0].score_factors.map((factor) => factor.id),
      results[0].score_factors.map((factor) => factor.id),
      results[0].score_factors.map((factor) => factor.id),
    ],
    `${scenario.id}: equivalent inputs must preserve evidence IDs`,
  );
  scoreDeltas.push(scoreDelta);
}

const cleanScreenshot = analyzeEmailHeuristic(createAnalysisEnvelope({
  body: "The project review remains scheduled for Thursday afternoon. These are the notes we discussed yesterday, and no action is required.",
}, "screenshot"));
assert.equal(cleanScreenshot.risk_score, 0);
assert.equal(cleanScreenshot.classification, "uncertain");

console.log(JSON.stringify({
  scenarios: scenarios.length,
  classificationAgreement: 1,
  scoreDeltas,
}));
