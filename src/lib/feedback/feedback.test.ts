import assert from "node:assert/strict";

import { FeedbackConfigError, getFeedbackConfig, isFeedbackEnabled } from "./config";
import {
  enforceFeedbackRateLimit,
  FEEDBACK_RATE_LIMIT_MAX_REQUESTS,
  FeedbackRateLimitError,
  type FeedbackRateLimitStore,
} from "./rate-limit";
import {
  FEEDBACK_RETENTION_DAYS,
  storeFeedback,
  toStoredFeedbackRecord,
  type MemoryFeedbackRecord,
} from "./storage";
import type { DetectionFeedbackSubmission } from "./types";
import { validateFeedbackSubmission } from "./validation";

const validFeedback: DetectionFeedbackSubmission = {
  helpful: false,
  expectedClassification: "legitimate",
  feedbackKind: "false_positive",
  locale: "en",
  source: "paste",
  analyzerVersion: "analysis-v2.1",
  scoreBand: "high",
  signalCategories: ["urgency", "impersonation"],
};

async function main() {
  assert.deepEqual(validateFeedbackSubmission(validFeedback), {
    ok: true,
    input: validFeedback,
  });

  for (const forbiddenField of [
    "body",
    "subject",
    "senderEmail",
    "links",
    "attachment",
    "screenshot",
    "eml",
    "freeText",
  ]) {
    const validation = validateFeedbackSubmission({
      ...validFeedback,
      [forbiddenField]: "private content",
    });

    assert.equal(validation.ok, false, `${forbiddenField} must be rejected`);
  }

  assert.equal(
    validateFeedbackSubmission({
      ...validFeedback,
      helpful: true,
      feedbackKind: "false_positive",
    }).ok,
    false,
  );
  assert.equal(
    validateFeedbackSubmission({
      ...validFeedback,
      signalCategories: ["urgency", "urgency"],
    }).ok,
    false,
  );

  assert.deepEqual(getFeedbackConfig({}), { mode: "disabled" });
  assert.deepEqual(getFeedbackConfig({ FEEDBACK_STORAGE: "memory", NODE_ENV: "test" }), {
    mode: "memory",
  });
  assert.equal(isFeedbackEnabled({ FEEDBACK_STORAGE: "memory", NODE_ENV: "test" }), true);
  assert.equal(isFeedbackEnabled({ FEEDBACK_STORAGE: "invalid" }), false);
  assert.throws(
    () => getFeedbackConfig({ FEEDBACK_STORAGE: "memory", NODE_ENV: "production" }),
    FeedbackConfigError,
  );
  assert.throws(
    () => getFeedbackConfig({ FEEDBACK_STORAGE: "supabase" }),
    FeedbackConfigError,
  );
  assert.deepEqual(
    getFeedbackConfig({
      FEEDBACK_STORAGE: "supabase",
      SUPABASE_URL: "https://project.supabase.co/",
      SUPABASE_SECRET_KEY: "sb_secret_modern",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-key",
    }),
    {
      mode: "supabase",
      supabaseUrl: "https://project.supabase.co",
      apiKey: "sb_secret_modern",
      useLegacyAuthorization: false,
    },
  );

  const storedRecord = toStoredFeedbackRecord(validFeedback);
  assert.deepEqual(Object.keys(storedRecord).sort(), [
    "analyzer_version",
    "expected_classification",
    "feedback_kind",
    "helpful",
    "input_mode",
    "score_band",
    "signal_categories",
    "ui_locale",
  ]);

  let capturedRequest: { input: RequestInfo | URL; init?: RequestInit } | undefined;
  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedRequest = { input, init };
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  await storeFeedback(
    validFeedback,
    {
      mode: "supabase",
      supabaseUrl: "https://project.supabase.co",
      apiKey: "sb_secret_server-secret",
      useLegacyAuthorization: false,
    },
    { fetchImpl: mockFetch },
  );

  assert.ok(capturedRequest);
  assert.equal(
    capturedRequest.input,
    "https://project.supabase.co/rest/v1/detection_feedback",
  );
  assert.deepEqual(JSON.parse(String(capturedRequest.init?.body)), storedRecord);
  assert.equal(capturedRequest.init?.cache, "no-store");
  assert.equal((capturedRequest.init?.headers as Record<string, string>).apikey, "sb_secret_server-secret");
  assert.equal(
    "Authorization" in (capturedRequest.init?.headers as Record<string, string>),
    false,
  );

  await storeFeedback(
    validFeedback,
    {
      mode: "supabase",
      supabaseUrl: "http://127.0.0.1:54321",
      apiKey: "legacy-service-role",
      useLegacyAuthorization: true,
    },
    { fetchImpl: mockFetch },
  );
  assert.equal(
    (capturedRequest?.init?.headers as Record<string, string>).Authorization,
    "Bearer legacy-service-role",
  );

  const now = Date.UTC(2026, 6, 10, 12);
  const memoryRecords: MemoryFeedbackRecord[] = [
    {
      ...storedRecord,
      id: "expired",
      created_at: new Date(now - 1000).toISOString(),
      expires_at: new Date(now - 1).toISOString(),
    },
  ];

  await storeFeedback(validFeedback, { mode: "memory" }, { memoryRecords, now: () => now });
  assert.equal(memoryRecords.length, 1);
  assert.notEqual(memoryRecords[0]?.id, "expired");
  assert.equal(memoryRecords[0]?.created_at, new Date(now).toISOString());
  assert.equal(
    Date.parse(memoryRecords[0]?.expires_at ?? "") - now,
    FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
  );

  const rateLimitStore: FeedbackRateLimitStore = new Map();
  const request = new Request("https://example.test/api/feedback", {
    headers: { "x-forwarded-for": "203.0.113.42" },
  });

  for (let index = 0; index < FEEDBACK_RATE_LIMIT_MAX_REQUESTS; index += 1) {
    enforceFeedbackRateLimit(request, {
      now: () => now,
      salt: "test-salt",
      store: rateLimitStore,
    });
  }

  assert.throws(
    () =>
      enforceFeedbackRateLimit(request, {
        now: () => now,
        salt: "test-salt",
        store: rateLimitStore,
      }),
    FeedbackRateLimitError,
  );

  console.log("Checked privacy-safe feedback contracts.");
}

void main();
