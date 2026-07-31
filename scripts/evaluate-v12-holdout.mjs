import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { createAnalysisEnvelope } = require(
  path.join(root, ".analysis-tests/src/lib/analysis/analysis-envelope.js"),
);
const { analyzeEmailHeuristic } = require(
  path.join(root, ".analysis-tests/src/lib/analysis/heuristic-analysis.js"),
);
const { hasMaterialEvidenceCoverage } = require(
  path.join(root, ".analysis-tests/src/lib/analysis/evidence-coverage.js"),
);
const { assessV12Quality } = require(
  path.join(root, ".analysis-tests/src/lib/evaluation/quality-gates.js"),
);
const { V12_HOLDOUT } = require(
  path.join(root, ".analysis-tests/src/lib/evaluation/v12-holdout.js"),
);
const { ANALYSIS_PIPELINE_VERSION } = require(
  path.join(root, ".analysis-tests/src/lib/types.js"),
);

const observations = V12_HOLDOUT.map((item) => {
  const envelope = createAnalysisEnvelope(item.input, item.source);
  const result = analyzeEmailHeuristic(envelope);
  const factorTotal = result.score_factors.reduce(
    (total, factor) => total + factor.contribution,
    0,
  );
  if (factorTotal !== result.risk_score) {
    throw new Error(
      `${item.id}: visible factor total ${factorTotal} does not equal ${result.risk_score}.`,
    );
  }
  if (
    result.classification === "likely_legitimate"
    && !hasMaterialEvidenceCoverage(result.evidence_coverage)
  ) {
    throw new Error(`${item.id}: incomplete evidence produced likely_legitimate.`);
  }
  return {
    dataset: "independent-locked",
    caseId: item.id,
    scenarioId: item.id,
    scenarioCategory: item.scenarioCategory,
    expected: item.classification,
    language: item.locale,
    source: item.source,
    evidenceCompleteness: hasMaterialEvidenceCoverage(result.evidence_coverage)
      ? "complete"
      : "incomplete",
    result,
  };
});

const assessment = assessV12Quality(observations);
const corpusRevision = await revision(
  "src/lib/evaluation/v12-holdout.ts",
);
const output = {
  schema: "maillume-v12-holdout-evaluation-v1",
  analysis_version: ANALYSIS_PIPELINE_VERSION,
  corpus_revision: corpusRevision,
  cases: observations.length,
  assessment,
};

console.log(JSON.stringify(output, null, 2));
if (!assessment.passed) {
  throw new Error(`v12 quality gates failed:\n- ${assessment.failures.join("\n- ")}`);
}

async function revision(relativePath) {
  const hash = createHash("sha256");
  hash.update(`${relativePath}\0`, "utf8");
  hash.update(await readFile(path.join(root, relativePath)));
  return `sha256:${hash.digest("hex")}`;
}
