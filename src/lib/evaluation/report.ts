import { ANALYSIS_PIPELINE_VERSION, type AnalysisEnvelope } from "../types";
import { createAnalysisEnvelope } from "../analysis/analysis-envelope";
import { analyzeEmailHeuristic } from "../analysis/heuristic-analysis";
import { parseEml } from "../eml/parse-eml";
import {
  CROSS_INPUT_FIXTURES,
  toChromeInput,
  toDirectInput,
  toOcrInput,
  toRawEml,
} from "./cross-input-fixtures";
import { emailEvaluationFixtures } from "./email-fixtures";
import {
  summarizeEvaluation,
  summarizeEvaluationBy,
  type EvaluationSummary,
} from "./metrics";
import {
  PUBLIC_ADVISORY_HOLDOUT,
} from "./public-advisory-holdout";
import { INDEPENDENT_CORPUS } from "./independent-corpus";
import { getScenarioCategory } from "./scenario-metadata";
import { syntheticCorpus } from "./synthetic-corpus";
import {
  EVALUATION_DATASETS,
  EVALUATION_EXPECTATIONS,
  EVALUATION_PREDICTIONS,
  type EvaluationDataset,
  type EvaluationExpectation,
  type EvaluationObservation,
} from "./types";

export const EVALUATION_REPORT_SCHEMA_VERSION = "heuristic-evaluation-report-v1";

export type HeuristicEvaluationReport = {
  schemaVersion: typeof EVALUATION_REPORT_SCHEMA_VERSION;
  generatedAt: string;
  analysisVersion: typeof ANALYSIS_PIPELINE_VERSION;
  corpusRevision: string;
  methodology: {
    aggregateWarning: string;
    scenarioDefinition: string;
    privacyBoundary: string;
  };
  inventory: EvaluationSummary;
  datasets: Record<EvaluationDataset, EvaluationSummary>;
  breakdowns: {
    language: Record<string, EvaluationSummary>;
    source: Record<string, EvaluationSummary>;
    evidenceCompleteness: Record<string, EvaluationSummary>;
    scenarioCategory: Record<string, EvaluationSummary>;
  };
};

export function buildHeuristicEvaluationReport(options: {
  corpusRevision: string;
  generatedAt?: string;
}): HeuristicEvaluationReport {
  const observations = buildEvaluationObservations();
  return {
    schemaVersion: EVALUATION_REPORT_SCHEMA_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    analysisVersion: ANALYSIS_PIPELINE_VERSION,
    corpusRevision: options.corpusRevision,
    methodology: {
      aggregateWarning:
        "The inventory combines calibration, synthetic, holdout, and cross-input regression data. It is not a claim of real-world accuracy.",
      scenarioDefinition:
        "Cases derived from the same scenario count once in scenario totals, even when language, formatting, or source variants create multiple messages.",
      privacyBoundary:
        "The report contains only aggregate results. It contains no fixture message content or production scan content.",
    },
    inventory: summarizeEvaluation(observations),
    datasets: Object.fromEntries(
      EVALUATION_DATASETS.map((dataset) => [
        dataset,
        summarizeEvaluation(observations.filter((item) => item.dataset === dataset)),
      ]),
    ) as HeuristicEvaluationReport["datasets"],
    breakdowns: {
      language: summarizeEvaluationBy(observations, (item) => item.language),
      source: summarizeEvaluationBy(observations, (item) => item.source),
      evidenceCompleteness: summarizeEvaluationBy(
        observations,
        (item) => item.evidenceCompleteness,
      ),
      scenarioCategory: summarizeEvaluationBy(
        observations,
        (item) => item.scenarioCategory,
      ),
    },
  };
}

export function buildEvaluationObservations(): EvaluationObservation[] {
  return [
    ...emailEvaluationFixtures.map((fixture) =>
      observation({
        dataset: "calibration",
        caseId: fixture.id,
        scenarioId: fixture.id,
        expected: fixture.category,
        envelope: createAnalysisEnvelope(fixture.input, "paste"),
      }),
    ),
    ...PUBLIC_ADVISORY_HOLDOUT.map((item) =>
      observation({
        dataset: "public-advisory-holdout",
        caseId: item.id,
        scenarioId: item.id,
        expected: item.expected,
        envelope: createAnalysisEnvelope(item.input, "paste"),
      }),
    ),
    ...INDEPENDENT_CORPUS.map((item) =>
      observation({
        dataset: item.split === "locked"
          ? "independent-locked"
          : `independent-${item.split}`,
        caseId: item.id,
        scenarioId: item.id,
        expected: item.classification,
        envelope: createAnalysisEnvelope(item.input, item.source),
      }),
    ),
    ...syntheticCorpus.map((item) => {
      const dataset = item.split === "locked"
        ? "synthetic-locked"
        : "synthetic-development";
      return observation({
        dataset,
        caseId: item.id,
        scenarioId: item.scenarioId,
        expected: item.classification,
        envelope: createAnalysisEnvelope(item.input, "paste"),
      });
    }),
    ...CROSS_INPUT_FIXTURES.flatMap((fixture) =>
      buildCrossInputEnvelopes(fixture).map(({ source, envelope }) =>
        observation({
          dataset: "cross-input",
          caseId: `${fixture.id}/${source}`,
          scenarioId: fixture.id,
          expected: fixture.expected,
          envelope,
        }),
      ),
    ),
  ];
}

export function formatHeuristicEvaluationReport(
  report: HeuristicEvaluationReport,
): string {
  return [
    "Maillume heuristic evaluation baseline",
    `Analysis version: ${report.analysisVersion}`,
    `Corpus revision: ${report.corpusRevision}`,
    `Generated: ${report.generatedAt}`,
    "",
    report.methodology.aggregateWarning,
    report.methodology.scenarioDefinition,
    report.methodology.privacyBoundary,
    "",
    "Dataset inventory",
    formatSummaryTable(report.datasets),
    "",
    "Combined inventory confusion matrix (cells are cases/scenarios)",
    formatConfusionMatrix(report.inventory),
    "",
    "Combined inventory rates",
    formatRateTable(report.inventory),
    "",
    "Breakdown by language",
    formatSummaryTable(report.breakdowns.language),
    "",
    "Breakdown by source",
    formatSummaryTable(report.breakdowns.source),
    "",
    "Breakdown by evidence completeness",
    formatSummaryTable(report.breakdowns.evidenceCompleteness),
    "",
    "Breakdown by scenario category",
    formatSummaryTable(report.breakdowns.scenarioCategory),
  ].join("\n");
}

function observation(input: {
  dataset: EvaluationDataset;
  caseId: string;
  scenarioId: string;
  expected: EvaluationExpectation;
  envelope: AnalysisEnvelope;
}): EvaluationObservation {
  const result = analyzeEmailHeuristic(input.envelope);
  const factorTotal = result.score_factors.reduce(
    (total, factor) => total + factor.contribution,
    0,
  );
  if (factorTotal !== result.risk_score) {
    throw new Error(
      `${input.dataset}/${input.caseId}: visible factors total ${factorTotal}, expected ${result.risk_score}.`,
    );
  }

  return {
    dataset: input.dataset,
    caseId: input.caseId,
    scenarioId: input.scenarioId,
    scenarioCategory: getScenarioCategory(input.dataset, input.scenarioId),
    expected: input.expected,
    language: input.envelope.locale,
    source: input.envelope.source,
    evidenceCompleteness: hasMaterialEvidence(input.envelope)
      ? "complete"
      : "incomplete",
    result,
  };
}

function hasMaterialEvidence(envelope: AnalysisEnvelope): boolean {
  return envelope.availability.sender
    && envelope.availability.linkDestinations
    && envelope.availability.contentComplete;
}

function buildCrossInputEnvelopes(
  fixture: (typeof CROSS_INPUT_FIXTURES)[number],
): Array<{ source: AnalysisEnvelope["source"]; envelope: AnalysisEnvelope }> {
  const parsedEml = parseEml(toRawEml(fixture));
  return [
    {
      source: "paste",
      envelope: createAnalysisEnvelope(toDirectInput(fixture), "paste"),
    },
    {
      source: "screenshot",
      envelope: createAnalysisEnvelope(toOcrInput(fixture), "screenshot"),
    },
    {
      source: "chrome",
      envelope: createAnalysisEnvelope(toChromeInput(fixture), "chrome"),
    },
    {
      source: "eml",
      envelope: createAnalysisEnvelope({
        locale: fixture.locale,
        subject: parsedEml.subject,
        senderEmail: parsedEml.senderEmail,
        body: parsedEml.body,
        links: parsedEml.links,
        linkPairs: parsedEml.linkPairs,
        attachmentRiskTypes: parsedEml.attachmentRiskTypes,
        emailAuthentication: parsedEml.emailAuthentication,
        evidenceTruncated: parsedEml.evidenceTruncated,
      }, "eml"),
    },
  ];
}

function formatSummaryTable(
  groups: Record<string, EvaluationSummary>,
): string {
  const headers = [
    "Group",
    "Cases",
    "Scenarios",
    "Phish non-low",
    "Phish high",
    "Spam non-low",
    "Legit non-low",
    "Legit high",
  ];
  const rows = Object.entries(groups).map(([name, summary]) => [
    name,
    String(summary.cases),
    String(summary.scenarios),
    formatRate(summary.rates.phishingNonLow),
    formatRate(summary.rates.phishingHigh),
    formatRate(summary.rates.spamNonLow),
    formatRate(summary.rates.legitimateNonLow),
    formatRate(summary.rates.legitimateHigh),
  ]);
  return formatTable(headers, rows);
}

function formatConfusionMatrix(summary: EvaluationSummary): string {
  const headers = ["Expected", ...EVALUATION_PREDICTIONS];
  const rows = EVALUATION_EXPECTATIONS.map((expected) => [
    expected,
    ...EVALUATION_PREDICTIONS.map((prediction) => {
      const cell = summary.confusionMatrix[expected][prediction];
      return `${cell.cases}/${cell.scenarios}`;
    }),
  ]);
  return formatTable(headers, rows);
}

function formatRateTable(summary: EvaluationSummary): string {
  return formatTable(
    ["Metric", "Rate", "Numerator", "Denominator", "Scenarios"],
    Object.entries(summary.rates).map(([name, metric]) => [
      name,
      metric.value === null ? "n/a" : formatPercent(metric.value),
      String(metric.numerator),
      String(metric.denominator),
      String(metric.scenarios),
    ]),
  );
}

function formatRate(metric: EvaluationSummary["rates"][keyof EvaluationSummary["rates"]]): string {
  if (metric.value === null) return "n/a";
  return `${formatPercent(metric.value)} (${metric.numerator}/${metric.denominator}; ${metric.scenarios} scenarios)`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  const render = (row: string[]) => row
    .map((cell, index) => cell.padEnd(widths[index]))
    .join(" | ")
    .trimEnd();
  return [
    render(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map(render),
  ].join("\n");
}
