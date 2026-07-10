import {
  feedbackClassifications,
  feedbackKinds,
  feedbackSignalCategories,
  type DetectionFeedbackSubmission,
  type FeedbackClassification,
  type FeedbackKind,
  type FeedbackSignalCategory,
} from "./types";

export const MAX_FEEDBACK_PAYLOAD_BYTES = 4_096;

const ALLOWED_KEYS = new Set([
  "helpful",
  "expectedClassification",
  "feedbackKind",
  "locale",
  "source",
  "analyzerVersion",
  "scoreBand",
  "signalCategories",
]);
const CLASSIFICATIONS = new Set<string>(feedbackClassifications);
const FEEDBACK_KINDS = new Set<string>(feedbackKinds);
const SIGNAL_CATEGORIES = new Set<string>(feedbackSignalCategories);
const LOCALES = new Set(["en", "nl"]);
const SOURCES = new Set(["paste", "screenshot", "eml"]);
const SCORE_BANDS = new Set(["low", "medium", "high"]);
const ANALYZER_VERSION_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,63}$/i;

type FeedbackValidationResult =
  | { ok: true; input: DetectionFeedbackSubmission }
  | { ok: false; error: string };

export function validateFeedbackSubmission(payload: unknown): FeedbackValidationResult {
  if (!isRecord(payload) || Object.keys(payload).some((key) => !ALLOWED_KEYS.has(key))) {
    return invalidFeedback();
  }

  const {
    helpful,
    expectedClassification,
    feedbackKind,
    locale,
    source,
    analyzerVersion,
    scoreBand,
    signalCategories,
  } = payload;

  if (
    typeof helpful !== "boolean" ||
    typeof expectedClassification !== "string" ||
    !CLASSIFICATIONS.has(expectedClassification) ||
    typeof feedbackKind !== "string" ||
    !FEEDBACK_KINDS.has(feedbackKind) ||
    typeof locale !== "string" ||
    !LOCALES.has(locale) ||
    typeof source !== "string" ||
    !SOURCES.has(source) ||
    typeof analyzerVersion !== "string" ||
    !ANALYZER_VERSION_PATTERN.test(analyzerVersion) ||
    typeof scoreBand !== "string" ||
    !SCORE_BANDS.has(scoreBand) ||
    !isSignalCategoryArray(signalCategories)
  ) {
    return invalidFeedback();
  }

  if ((helpful && feedbackKind !== "accurate") || (!helpful && feedbackKind === "accurate")) {
    return invalidFeedback();
  }

  return {
    ok: true,
    input: {
      helpful,
      expectedClassification: expectedClassification as FeedbackClassification,
      feedbackKind: feedbackKind as FeedbackKind,
      locale: locale as DetectionFeedbackSubmission["locale"],
      source: source as DetectionFeedbackSubmission["source"],
      analyzerVersion,
      scoreBand: scoreBand as DetectionFeedbackSubmission["scoreBand"],
      signalCategories: signalCategories as FeedbackSignalCategory[],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSignalCategoryArray(value: unknown): value is FeedbackSignalCategory[] {
  if (!Array.isArray(value) || value.length > feedbackSignalCategories.length) {
    return false;
  }

  const uniqueValues = new Set(value);

  return (
    uniqueValues.size === value.length &&
    value.every((category) => typeof category === "string" && SIGNAL_CATEGORIES.has(category))
  );
}

function invalidFeedback(): FeedbackValidationResult {
  return {
    ok: false,
    error: "Feedback contains unsupported or missing fields.",
  };
}
