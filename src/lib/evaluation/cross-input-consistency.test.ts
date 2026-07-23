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
let screenshotPhishingCases = 0;
let screenshotPhishingNonLow = 0;

for (const fixture of CROSS_INPUT_FIXTURES) {
  const parsedEml = parseEml(toRawEml(fixture));
  const emlEnvelope = createAnalysisEnvelope({
    locale: fixture.locale,
    subject: parsedEml.subject,
    senderEmail: parsedEml.senderEmail,
    body: parsedEml.body,
    links: parsedEml.links,
    linkPairs: parsedEml.linkPairs,
    evidenceTruncated: parsedEml.evidenceTruncated,
  }, "eml");
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
      result: analyzeEmailHeuristic(emlEnvelope),
    },
  ];

  const screenshot = requiredVariant(variants, "screenshot", fixture.id);
  const chrome = variants.find((variant) => variant.name === "chrome")?.result;
  const eml = variants.find((variant) => variant.name === "eml")?.result;
  assert.ok(chrome && eml, `${fixture.id}: Chrome and .eml variants are required`);
  if (fixture.emlVariant === "unterminated_multipart") {
    assert.equal(
      emlEnvelope.availability.contentComplete,
      false,
      `${fixture.id}: malformed MIME must retain its incomplete-evidence boundary`,
    );
  }

  if (fixture.expected === "phishing") {
    screenshotPhishingCases += 1;
    if (screenshot.risk_level !== "low") screenshotPhishingNonLow += 1;
    for (const variant of variants) {
      assert.notEqual(variant.result.risk_level, "low", `${fixture.id}/${variant.name}: phishing evidence must not be low risk`);
      assert.notEqual(variant.result.classification, "likely_legitimate", `${fixture.id}/${variant.name}: phishing evidence must not be reassuring`);
    }
  } else {
    for (const variant of variants) {
      assert.notEqual(variant.result.risk_level, "high", `${fixture.id}/${variant.name}: legitimate hard negative must not be high risk`);
    }
    assert.equal(screenshot.classification, "uncertain", `${fixture.id}: OCR-only evidence must not claim legitimacy`);
  }

  const sharedEvidenceVariants = fixture.linkPair
    ? variants.filter((variant) => variant.name === "chrome" || variant.name === "eml")
    : variants.filter((variant) => variant.name !== "screenshot");
  const baseline = sharedEvidenceVariants[0].result;
  const baselineFactors = baseline.score_factors.map((factor) => factor.id);
  const scores = sharedEvidenceVariants.map(({ result }) => result.risk_score);
  const scoreDelta = Math.max(...scores) - Math.min(...scores);

  for (const variant of sharedEvidenceVariants.slice(1)) {
    equivalentComparisons += 1;
    if (variant.result.classification === baseline.classification) equivalentClassifications += 1;
    assert.deepEqual(
      variant.result.score_factors.map((factor) => factor.id),
      baselineFactors,
      `${fixture.id}/${variant.name}: equivalent evidence must preserve factor IDs`,
    );
  }
  assert.ok(scoreDelta <= 5, `${fixture.id}: same-evidence scores differ by ${scoreDelta}`);
  equivalentDeltas.push(scoreDelta);

  if (fixture.linkPair) {
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
}

const classificationAgreement = equivalentClassifications / equivalentComparisons;
const medianDelta = percentile(equivalentDeltas, 0.5);
const p95Delta = percentile(equivalentDeltas, 0.95);

assert.ok(classificationAgreement >= 0.95, `classification agreement is ${classificationAgreement}`);
assert.ok(medianDelta <= 5, `median score delta is ${medianDelta}`);
assert.ok(p95Delta <= 5, `p95 score delta is ${p95Delta}`);
assert.equal(
  screenshotPhishingNonLow / screenshotPhishingCases,
  1,
  "OCR-only phishing fixtures must not fall to low risk",
);

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
  screenshotPhishingNonLow: screenshotPhishingNonLow / screenshotPhishingCases,
  scoreDeltas: equivalentDeltas,
}));

function requiredVariant(
  variants: NamedResult[],
  name: NamedResult["name"],
  fixtureId: string,
): EmailAnalysisResult {
  const result = variants.find((variant) => variant.name === name)?.result;
  assert.ok(result, `${fixtureId}: ${name} variant is required`);
  return result;
}

function percentile(values: number[], quantile: number): number {
  assert.ok(values.length > 0, "at least one score delta is required");
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)];
}
