import type { FeedbackConfig } from "./config";
import {
  feedbackClassifications,
  feedbackKinds,
  feedbackSignalCategories,
  type FeedbackKind,
} from "./types";

export const DEFAULT_FEEDBACK_REPORT_DAYS = 30;
export const DEFAULT_FEEDBACK_REPORT_MIN_SAMPLES = 10;
export const DEFAULT_FEEDBACK_REPORT_HOURLY_SIGNATURE_CAP = 20;

export const feedbackReportDimensions = [
  "source",
  "locale",
  "score_band",
  "expected_classification",
  "signal_category",
] as const;

export type FeedbackReportDimension = (typeof feedbackReportDimensions)[number];

export type FeedbackAggregateRow = {
  analyzerVersion: string;
  feedbackKind: FeedbackKind;
  dimension: FeedbackReportDimension;
  value: string;
  sampleCount: number;
};

export type FeedbackAggregateReport = {
  schemaVersion: "feedback-aggregate-report-v1";
  generatedAt: string;
  windowDays: number;
  minimumSamples: number;
  hourlySignatureCap: number;
  privacyBoundary: string;
  interpretationBoundary: string;
  rows: FeedbackAggregateRow[];
};

type FeedbackReportOptions = {
  days?: number;
  minimumSamples?: number;
  hourlySignatureCap?: number;
  fetchImpl?: typeof fetch;
  generatedAt?: string;
};

const ANALYZER_VERSION_PATTERN = /^analysis-v[1-9]\d{0,2}$/;
const TEST_VERSION_PATTERN = /(?:test|development|local|(?:^|[-_.:])dev(?:$|[-_.:]))/i;
const DIMENSIONS = new Set<string>(feedbackReportDimensions);
const FEEDBACK_KINDS = new Set<string>(feedbackKinds);
const DIMENSION_VALUES: Record<FeedbackReportDimension, Set<string>> = {
  source: new Set(["paste", "screenshot", "eml"]),
  locale: new Set(["en", "nl"]),
  score_band: new Set(["low", "medium", "high"]),
  expected_classification: new Set(feedbackClassifications),
  signal_category: new Set(feedbackSignalCategories),
};

export class FeedbackReportError extends Error {
  constructor(message = "The privacy-safe feedback report could not be generated.") {
    super(message);
    this.name = "FeedbackReportError";
  }
}

export async function fetchFeedbackAggregateReport(
  config: FeedbackConfig,
  options: FeedbackReportOptions = {},
): Promise<FeedbackAggregateReport> {
  if (config.mode !== "supabase") {
    throw new FeedbackReportError(
      "The feedback report requires server-only Supabase feedback storage.",
    );
  }

  const days = boundedInteger(
    options.days ?? DEFAULT_FEEDBACK_REPORT_DAYS,
    1,
    89,
    "days",
  );
  const minimumSamples = boundedInteger(
    options.minimumSamples ?? DEFAULT_FEEDBACK_REPORT_MIN_SAMPLES,
    5,
    1_000,
    "minimum samples",
  );
  const hourlySignatureCap = boundedInteger(
    options.hourlySignatureCap
      ?? DEFAULT_FEEDBACK_REPORT_HOURLY_SIGNATURE_CAP,
    1,
    100,
    "hourly signature cap",
  );
  const headers: Record<string, string> = {
    apikey: config.apiKey,
    "Content-Type": "application/json",
  };
  if (config.useLegacyAuthorization) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  let payload: unknown;
  try {
    const response = await fetchImpl(
      `${config.supabaseUrl}/rest/v1/rpc/detection_feedback_summary`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_days: days,
          p_min_samples: minimumSamples,
          p_hourly_signature_cap: hourlySignatureCap,
        }),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new FeedbackReportError();
    payload = await response.json();
  } catch (error) {
    if (error instanceof FeedbackReportError) throw error;
    throw new FeedbackReportError();
  }

  return {
    schemaVersion: "feedback-aggregate-report-v1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    windowDays: days,
    minimumSamples,
    hourlySignatureCap,
    privacyBoundary:
      "Only thresholded label counts are returned. The report contains no raw rows, message content, links, addresses, IPs, account IDs, or stable user identifiers.",
    interpretationBoundary:
      "Counts are voluntary feedback trends, not accuracy rates. Identical hourly signatures are capped and test-like analyzer versions are excluded.",
    rows: parseAggregateRows(payload, minimumSamples),
  };
}

export function formatFeedbackAggregateReport(
  report: FeedbackAggregateReport,
): string {
  const lines = [
    "Maillume privacy-safe feedback aggregate report",
    `Generated: ${report.generatedAt}`,
    `Window: last ${report.windowDays} day${report.windowDays === 1 ? "" : "s"}`,
    `Minimum published cell: ${report.minimumSamples}`,
    `Hourly identical-signature cap: ${report.hourlySignatureCap}`,
    "",
    report.privacyBoundary,
    report.interpretationBoundary,
    "",
  ];

  if (report.rows.length === 0) {
    lines.push("No aggregate cell met the publication threshold.");
    return lines.join("\n");
  }

  lines.push(formatTable(
    ["Analysis version", "Feedback kind", "Dimension", "Value", "Samples"],
    report.rows.map((row) => [
      row.analyzerVersion,
      row.feedbackKind,
      row.dimension,
      row.value,
      String(row.sampleCount),
    ]),
  ));
  return lines.join("\n");
}

function parseAggregateRows(
  payload: unknown,
  minimumSamples: number,
): FeedbackAggregateRow[] {
  if (!Array.isArray(payload)) throw new FeedbackReportError();

  const seen = new Set<string>();
  const rows = payload.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new FeedbackReportError();
    }
    const record = value as Record<string, unknown>;
    if (
      Object.keys(record).sort().join(",")
      !== "analyzer_version,dimension,dimension_value,feedback_kind,sample_count"
    ) {
      throw new FeedbackReportError();
    }

    const analyzerVersion = record.analyzer_version;
    const feedbackKind = record.feedback_kind;
    const dimension = record.dimension;
    const dimensionValue = record.dimension_value;
    const sampleCount = normalizeCount(record.sample_count);

    if (
      typeof analyzerVersion !== "string"
      || !ANALYZER_VERSION_PATTERN.test(analyzerVersion)
      || TEST_VERSION_PATTERN.test(analyzerVersion)
      || typeof feedbackKind !== "string"
      || !FEEDBACK_KINDS.has(feedbackKind)
      || typeof dimension !== "string"
      || !DIMENSIONS.has(dimension)
      || typeof dimensionValue !== "string"
      || !isDimensionValue(dimension as FeedbackReportDimension, dimensionValue)
      || sampleCount < minimumSamples
    ) {
      throw new FeedbackReportError();
    }

    const key = [
      analyzerVersion,
      feedbackKind,
      dimension,
      dimensionValue,
    ].join("\0");
    if (seen.has(key)) throw new FeedbackReportError();
    seen.add(key);

    return {
      analyzerVersion,
      feedbackKind: feedbackKind as FeedbackKind,
      dimension: dimension as FeedbackReportDimension,
      value: dimensionValue,
      sampleCount,
    };
  });

  return rows.sort((left, right) =>
    left.analyzerVersion.localeCompare(right.analyzerVersion)
    || left.feedbackKind.localeCompare(right.feedbackKind)
    || left.dimension.localeCompare(right.dimension)
    || left.value.localeCompare(right.value)
  );
}

function normalizeCount(value: unknown): number {
  const count = typeof value === "string" && /^[1-9]\d*$/.test(value)
    ? Number(value)
    : value;
  if (
    typeof count !== "number"
    || !Number.isSafeInteger(count)
    || count < 1
  ) {
    throw new FeedbackReportError();
  }
  return count;
}

function isDimensionValue(
  dimension: FeedbackReportDimension,
  value: string,
): boolean {
  return DIMENSION_VALUES[dimension].has(value);
}

function boundedInteger(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new FeedbackReportError(
      `Feedback report ${label} must be between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}

function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0))
  );
  const formatRow = (row: string[]) =>
    row.map((value, index) => value.padEnd(widths[index] ?? value.length)).join(" | ");
  return [
    formatRow(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map(formatRow),
  ].join("\n");
}
