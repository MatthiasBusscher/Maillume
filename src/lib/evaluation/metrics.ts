import {
  EVALUATION_EXPECTATIONS,
  EVALUATION_PREDICTIONS,
  isNonLow,
  predictionFromClassification,
  type EvaluationExpectation,
  type EvaluationObservation,
  type EvaluationPrediction,
} from "./types";

export type CountMetric = {
  cases: number;
  scenarios: number;
};

export type RateMetric = {
  numerator: number;
  denominator: number;
  scenarios: number;
  value: number | null;
};

export type EvaluationRates = {
  phishingNonLow: RateMetric;
  phishingHigh: RateMetric;
  spamNonLow: RateMetric;
  legitimateNonLow: RateMetric;
  legitimateHigh: RateMetric;
};

export type ConfusionCell = CountMetric;

export type ConfusionMatrix = Record<
  EvaluationExpectation,
  Record<EvaluationPrediction, ConfusionCell>
>;

export type EvaluationSummary = {
  cases: number;
  scenarios: number;
  expected: Record<EvaluationExpectation, CountMetric>;
  predicted: Record<EvaluationPrediction, CountMetric>;
  confusionMatrix: ConfusionMatrix;
  rates: EvaluationRates;
};

export function summarizeEvaluation(
  observations: EvaluationObservation[],
): EvaluationSummary {
  return {
    cases: observations.length,
    scenarios: countScenarios(observations),
    expected: Object.fromEntries(
      EVALUATION_EXPECTATIONS.map((expected) => [
        expected,
        countMetric(observations.filter((item) => item.expected === expected)),
      ]),
    ) as EvaluationSummary["expected"],
    predicted: Object.fromEntries(
      EVALUATION_PREDICTIONS.map((prediction) => [
        prediction,
        countMetric(observations.filter(
          (item) => predictionFromClassification(item.result.classification) === prediction,
        )),
      ]),
    ) as EvaluationSummary["predicted"],
    confusionMatrix: confusionMatrix(observations),
    rates: {
      phishingNonLow: rateMetric(
        observations,
        (item) => item.expected === "phishing",
        (item) => isNonLow(item.result.risk_level),
      ),
      phishingHigh: rateMetric(
        observations,
        (item) => item.expected === "phishing",
        (item) => item.result.risk_level === "high",
      ),
      spamNonLow: rateMetric(
        observations,
        (item) => item.expected === "spam",
        (item) => isNonLow(item.result.risk_level),
      ),
      legitimateNonLow: rateMetric(
        observations,
        (item) => item.expected === "legitimate",
        (item) => isNonLow(item.result.risk_level),
      ),
      legitimateHigh: rateMetric(
        observations,
        (item) => item.expected === "legitimate",
        (item) => item.result.risk_level === "high",
      ),
    },
  };
}

export function summarizeEvaluationBy(
  observations: EvaluationObservation[],
  getKey: (observation: EvaluationObservation) => string,
): Record<string, EvaluationSummary> {
  const groups = new Map<string, EvaluationObservation[]>();
  for (const observation of observations) {
    const key = getKey(observation);
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }

  return Object.fromEntries(
    Array.from(groups)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, group]) => [key, summarizeEvaluation(group)]),
  );
}

function rateMetric(
  observations: EvaluationObservation[],
  include: (observation: EvaluationObservation) => boolean,
  match: (observation: EvaluationObservation) => boolean,
): RateMetric {
  const denominator = observations.filter(include);
  const numerator = denominator.filter(match);
  return {
    numerator: numerator.length,
    denominator: denominator.length,
    scenarios: countScenarios(denominator),
    value: denominator.length > 0 ? numerator.length / denominator.length : null,
  };
}

function countMetric(observations: EvaluationObservation[]): CountMetric {
  return {
    cases: observations.length,
    scenarios: countScenarios(observations),
  };
}

function countScenarios(observations: EvaluationObservation[]): number {
  return new Set(observations.map(
    (item) => `${item.dataset}\u0000${item.scenarioId}`,
  )).size;
}

function confusionMatrix(observations: EvaluationObservation[]): ConfusionMatrix {
  return Object.fromEntries(
    EVALUATION_EXPECTATIONS.map((expected) => [
      expected,
      Object.fromEntries(
        EVALUATION_PREDICTIONS.map((prediction) => [
          prediction,
          countMetric(observations.filter(
            (item) => item.expected === expected
              && predictionFromClassification(item.result.classification) === prediction,
          )),
        ]),
      ),
    ]),
  ) as ConfusionMatrix;
}
