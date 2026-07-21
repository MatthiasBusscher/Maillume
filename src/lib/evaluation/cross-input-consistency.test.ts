import assert from "node:assert/strict";

import { createAnalysisEnvelope } from "../analysis/analysis-envelope";
import { analyzeEmailHeuristic } from "../analysis/heuristic-analysis";
import { parseEml } from "../eml/parse-eml";
import type { EmailAnalysisResult } from "../types";
import {
  CROSS_INPUT_FIXTURES,
  toChromeInput,
  toDirectInput,
  toOcrInput,
  toRawEml,
} from "./cross-input-fixtures";

type NamedResult = {
  name: "paste" | "screenshot" | "chrome" | "eml";
  result: EmailAnalysisResult;
};

const equivalentDeltas: number[] = [];
let equivalentClassifications = 0;
let equivalentComparisons = 0;

for (const fixture of CROSS_INPUT_FIXTURES) {
  const parsedEml = parseEml(toRawEml(fixture));
  const variants: NamedResult[] = [
    {
      name: "paste",
      result: analyzeEmailHeuristic(createAnalysisEnvelope(toDirectInput(fixture), "paste")),
    },
    {
      name: "screenshot",
      result: analyzeEmailHeuristic(createAnalysisEnvelope(toOcrInput(fixture), "screenshot")),
    },
    {
      name: "chrome",
      result: analyzeEmailHeuristic(createAnalysisEnvelope(toChromeInput(fixture), "chrome")),
    },
    {
      name: "eml",
      result: analyzeEmailHeuristic(createAnalysisEnvelope({
        locale: fixture.locale,
        subject: parsedEml.subject,
        senderEmail: parsedEml.senderEmail,
        body: parsedEml.body,
        links: parsedEml.links,
        linkPairs: parsedEml.linkPairs,
      }, "eml")),
    },
  ];

  if (!fixture.linkPair) {
    const baseline = variants[0].result;
    const scores = variants.map(({ result }) => result.risk_score);
    const scoreDelta = Math.max(...scores) - Math.min(...scores);
    const baselineFactors = baseline.score_factors.map((factor) => factor.id);

    for (const variant of variants) {
      equivalentComparisons += 1;
      if (variant.result.classification === baseline.classification) {
        equivalentClassifications += 1;
      }
      assert.deepEqual(
        variant.result.score_factors.map((factor) => factor.id),
        baselineFactors,
        `${fixture.id}/${variant.name}: equivalent evidence must preserve factor IDs`,
      );
    }

    assert.ok(scoreDelta <= 10, `${fixture.id}: equivalent scores differ by ${scoreDelta}`);
    equivalentDeltas.push(scoreDelta);
    continue;
  }

  const chrome = variants.find((variant) => variant.name === "chrome")?.result;
  const eml = variants.find((variant) => variant.name === "eml")?.result;
  assert.ok(chrome && eml, `${fixture.id}: enriched variants are required`);
  assert.equal(chrome.classification, eml.classification, `${fixture.id}: Chrome and .eml must classify alike`);
  assert.ok(Math.abs(chrome.risk_score - eml.risk_score) <= 5, `${fixture.id}: enriched scores must stay aligned`);
  assert.deepEqual(
    chrome.score_factors.map((factor) => factor.id),
    eml.score_factors.map((factor) => factor.id),
    `${fixture.id}: Chrome and .eml must preserve enriched factor IDs`,
  );
  assert.ok(chrome.score_factors.some((factor) => factor.id === "link_mismatch"));
  assert.ok(eml.score_factors.some((factor) => factor.id === "link_mismatch"));
  assert.equal(
    chrome.score_factors.find((factor) => factor.id === "link_mismatch")?.label,
    fixture.locale === "nl"
      ? "Toont één domein maar linkt naar een ander domein."
      : "Displays one domain but links to another.",
    `${fixture.id}: enriched evidence must be explained in the selected language`,
  );
}

const classificationAgreement = equivalentClassifications / equivalentComparisons;
const medianDelta = percentile(equivalentDeltas, 0.5);
const p95Delta = percentile(equivalentDeltas, 0.95);

assert.ok(classificationAgreement >= 0.95, `classification agreement is ${classificationAgreement}`);
assert.ok(medianDelta <= 5, `median score delta is ${medianDelta}`);
assert.ok(p95Delta <= 10, `p95 score delta is ${p95Delta}`);

const cleanScreenshot = analyzeEmailHeuristic(createAnalysisEnvelope({
  body: "The project review remains scheduled for Thursday afternoon. These are the notes we discussed yesterday, and no action is required.",
}, "screenshot"));
assert.equal(cleanScreenshot.risk_score, 0);
assert.equal(cleanScreenshot.classification, "uncertain");

console.log(JSON.stringify({
  scenarios: CROSS_INPUT_FIXTURES.length,
  equivalentScenarios: equivalentDeltas.length,
  enrichedScenarios: CROSS_INPUT_FIXTURES.filter((fixture) => fixture.linkPair).length,
  classificationAgreement,
  medianDelta,
  p95Delta,
  scoreDeltas: equivalentDeltas,
}));

function percentile(values: number[], quantile: number): number {
  assert.ok(values.length > 0, "at least one score delta is required");
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)];
}
