import { randomUUID } from "node:crypto";

import type { FeedbackConfig } from "./config";
import type { DetectionFeedbackSubmission } from "./types";

export const FEEDBACK_RETENTION_DAYS = 89;
const FEEDBACK_RETENTION_MS = FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1_000;

export type StoredFeedbackRecord = {
  helpful: boolean;
  expected_classification: DetectionFeedbackSubmission["expectedClassification"];
  feedback_kind: DetectionFeedbackSubmission["feedbackKind"];
  ui_locale: DetectionFeedbackSubmission["locale"];
  input_mode: DetectionFeedbackSubmission["source"];
  analyzer_version: string;
  score_band: DetectionFeedbackSubmission["scoreBand"];
  signal_categories: DetectionFeedbackSubmission["signalCategories"];
};

export type MemoryFeedbackRecord = StoredFeedbackRecord & {
  id: string;
  created_at: string;
  expires_at: string;
};

type FeedbackStorageOptions = {
  fetchImpl?: typeof fetch;
  memoryRecords?: MemoryFeedbackRecord[];
  now?: () => number;
};

declare global {
  var __inboxRiskScannerMemoryFeedback: MemoryFeedbackRecord[] | undefined;
}

export class FeedbackStorageError extends Error {
  constructor() {
    super("Feedback storage is temporarily unavailable.");
    this.name = "FeedbackStorageError";
  }
}

export async function storeFeedback(
  input: DetectionFeedbackSubmission,
  config: FeedbackConfig,
  options: FeedbackStorageOptions = {},
): Promise<void> {
  const record = toStoredFeedbackRecord(input);

  if (config.mode === "memory") {
    storeFeedbackInMemory(record, options);
    return;
  }

  if (config.mode !== "supabase") {
    throw new FeedbackStorageError();
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    apikey: config.apiKey,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };

  if (config.useLegacyAuthorization) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  try {
    const response = await fetchImpl(`${config.supabaseUrl}/rest/v1/detection_feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify(record),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new FeedbackStorageError();
    }
  } catch (error) {
    if (error instanceof FeedbackStorageError) {
      throw error;
    }

    throw new FeedbackStorageError();
  }
}

export function toStoredFeedbackRecord(
  input: DetectionFeedbackSubmission,
): StoredFeedbackRecord {
  return {
    helpful: input.helpful,
    expected_classification: input.expectedClassification,
    feedback_kind: input.feedbackKind,
    ui_locale: input.locale,
    input_mode: input.source,
    analyzer_version: input.analyzerVersion,
    score_band: input.scoreBand,
    signal_categories: [...input.signalCategories],
  };
}

function storeFeedbackInMemory(
  record: StoredFeedbackRecord,
  options: FeedbackStorageOptions,
): void {
  const now = options.now?.() ?? Date.now();
  const createdAt = Math.floor(now / (60 * 60 * 1_000)) * 60 * 60 * 1_000;
  const records = options.memoryRecords ?? getGlobalMemoryStore();
  const retainedRecords = records.filter((item) => Date.parse(item.expires_at) > now);

  records.splice(0, records.length, ...retainedRecords, {
    ...record,
    id: randomUUID(),
    created_at: new Date(createdAt).toISOString(),
    expires_at: new Date(createdAt + FEEDBACK_RETENTION_MS).toISOString(),
  });
}

function getGlobalMemoryStore(): MemoryFeedbackRecord[] {
  globalThis.__inboxRiskScannerMemoryFeedback ??= [];
  return globalThis.__inboxRiskScannerMemoryFeedback;
}
