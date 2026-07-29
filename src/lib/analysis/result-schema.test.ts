import assert from "node:assert/strict";

import {
  ANALYSIS_DISCLAIMERS,
  ANALYSIS_PIPELINE_VERSION,
  type AnalyzeResponse,
} from "../types";
import { analyzeEmailHeuristic } from "./heuristic-analysis";
import {
  isAnalyzeErrorResponse,
  isAnalyzeResponse,
  isEmailAnalysisResult,
} from "./result-schema";

const result = analyzeEmailHeuristic({
  senderEmail: "updates@service.example",
  body: "The requested project update is ready.",
});
const response: AnalyzeResponse = {
  result,
  analysis_mode: "heuristic",
  analysis_provider: "heuristic",
  analysis_version: ANALYSIS_PIPELINE_VERSION,
  disclaimer: ANALYSIS_DISCLAIMERS.en,
  privacy: {
    stored: false,
    retention: "not_stored",
    message: "Not stored.",
  },
};

assert.equal(isEmailAnalysisResult(result), true);
assert.equal(isAnalyzeResponse(response), true);
assert.equal(isAnalyzeErrorResponse({ error: "Invalid request." }), true);
assert.equal(isAnalyzeErrorResponse({
  error: "Invalid request.",
  fieldErrors: { body: "Required." },
}), true);

for (const malformedCoverage of [
  undefined,
  {},
  { ...result.evidence_coverage, sender_available: "yes" },
  { ...result.evidence_coverage, extraction_type: "selected" },
]) {
  assert.equal(isEmailAnalysisResult({
    ...result,
    evidence_coverage: malformedCoverage,
  }), false);
  assert.equal(isAnalyzeResponse({
    ...response,
    result: {
      ...result,
      evidence_coverage: malformedCoverage,
    },
  }), false);
}

assert.equal(isAnalyzeResponse({
  ...response,
  result: {
    ...result,
    risk_score: result.risk_score + 1,
  },
}), false);
assert.equal(isAnalyzeResponse({
  ...response,
  analysis_version: "analysis-v9",
}), false);
assert.equal(isAnalyzeErrorResponse({
  error: "Invalid request.",
  fieldErrors: { body: 42 },
}), false);

console.log("Checked web-client analysis response validation.");
