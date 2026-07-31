import {
  predictionFromClassification,
  type EvaluationObservation,
  type EvaluationPrediction,
} from "./types";

export const V12_QUALITY_THRESHOLDS = {
  phishingRecall: 0.9,
  spamRecall: 0.9,
  phishingPrecision: 0.9,
  spamPrecision: 0.9,
  legitimateNonLowMaximum: 0.1,
  legitimateHighMaximum: 0.02,
  languageGapMaximum: 0.1,
} as const;

export type QualityRate = {
  numerator: number;
  denominator: number;
  value: number | null;
};

export type V12QualityAssessment = {
  passed: boolean;
  phishingRecall: QualityRate;
  spamRecall: QualityRate;
  phishingPrecision: QualityRate;
  spamPrecision: QualityRate;
  legitimateNonLow: QualityRate;
  legitimateHigh: QualityRate;
  languageGaps: {
    phishingRecall: number | null;
    spamRecall: number | null;
    legitimateNonLow: number | null;
  };
  failures: string[];
};

export function assessV12Quality(
  observations: EvaluationObservation[],
): V12QualityAssessment {
  const phishingRecall = rate(
    observations,
    (item) => item.expected === "phishing",
    (item) => prediction(item) === "phishing" && item.result.risk_level !== "low",
  );
  const spamRecall = rate(
    observations,
    (item) => item.expected === "spam",
    (item) => prediction(item) === "spam" && item.result.risk_level !== "low",
  );
  const phishingPrecision = rate(
    observations,
    (item) => prediction(item) === "phishing",
    (item) => item.expected === "phishing",
  );
  const spamPrecision = rate(
    observations,
    (item) => prediction(item) === "spam",
    (item) => item.expected === "spam",
  );
  const legitimateNonLow = rate(
    observations,
    (item) => item.expected === "legitimate",
    (item) => item.result.risk_level !== "low",
  );
  const legitimateHigh = rate(
    observations,
    (item) => item.expected === "legitimate",
    (item) => item.result.risk_level === "high",
  );
  const languageGaps = {
    phishingRecall: languageGap(observations, "phishing", "phishing"),
    spamRecall: languageGap(observations, "spam", "spam"),
    legitimateNonLow: languageGap(observations, "legitimate", null),
  };
  const failures = [
    minimumFailure("phishing recall", phishingRecall, V12_QUALITY_THRESHOLDS.phishingRecall),
    minimumFailure("spam recall", spamRecall, V12_QUALITY_THRESHOLDS.spamRecall),
    minimumFailure("phishing precision", phishingPrecision, V12_QUALITY_THRESHOLDS.phishingPrecision),
    minimumFailure("spam precision", spamPrecision, V12_QUALITY_THRESHOLDS.spamPrecision),
    maximumFailure(
      "legitimate non-low rate",
      legitimateNonLow,
      V12_QUALITY_THRESHOLDS.legitimateNonLowMaximum,
    ),
    maximumFailure(
      "legitimate high rate",
      legitimateHigh,
      V12_QUALITY_THRESHOLDS.legitimateHighMaximum,
    ),
    ...Object.entries(languageGaps).map(([name, value]) =>
      value !== null && value > V12_QUALITY_THRESHOLDS.languageGapMaximum
        ? `${name} language gap ${percentage(value)} exceeds ${percentage(V12_QUALITY_THRESHOLDS.languageGapMaximum)}`
        : null),
  ].filter((failure): failure is string => failure !== null);

  return {
    passed: failures.length === 0,
    phishingRecall,
    spamRecall,
    phishingPrecision,
    spamPrecision,
    legitimateNonLow,
    legitimateHigh,
    languageGaps,
    failures,
  };
}

export function assertV12Quality(observations: EvaluationObservation[]): void {
  const assessment = assessV12Quality(observations);
  if (!assessment.passed) {
    throw new Error(`v12 quality gates failed:\n- ${assessment.failures.join("\n- ")}`);
  }
}

function prediction(observation: EvaluationObservation): EvaluationPrediction {
  return predictionFromClassification(observation.result.classification);
}

function rate(
  observations: EvaluationObservation[],
  include: (observation: EvaluationObservation) => boolean,
  match: (observation: EvaluationObservation) => boolean,
): QualityRate {
  const denominator = observations.filter(include);
  const numerator = denominator.filter(match);
  return {
    numerator: numerator.length,
    denominator: denominator.length,
    value: denominator.length > 0 ? numerator.length / denominator.length : null,
  };
}

function languageGap(
  observations: EvaluationObservation[],
  expected: EvaluationObservation["expected"],
  expectedPrediction: EvaluationPrediction | null,
): number | null {
  const rates = ["en", "nl"].map((language) => rate(
    observations.filter((item) => item.language === language),
    (item) => item.expected === expected,
    (item) => expectedPrediction
      ? prediction(item) === expectedPrediction && item.result.risk_level !== "low"
      : item.result.risk_level !== "low",
  ).value);
  return rates.every((value) => value !== null)
    ? Math.abs((rates[0] as number) - (rates[1] as number))
    : null;
}

function minimumFailure(
  name: string,
  metric: QualityRate,
  minimum: number,
): string | null {
  return metric.value === null || metric.value < minimum
    ? `${name} ${formatRate(metric)} is below ${percentage(minimum)}`
    : null;
}

function maximumFailure(
  name: string,
  metric: QualityRate,
  maximum: number,
): string | null {
  return metric.value === null || metric.value > maximum
    ? `${name} ${formatRate(metric)} exceeds ${percentage(maximum)}`
    : null;
}

function formatRate(metric: QualityRate): string {
  return metric.value === null
    ? "n/a"
    : `${percentage(metric.value)} (${metric.numerator}/${metric.denominator})`;
}

function percentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
