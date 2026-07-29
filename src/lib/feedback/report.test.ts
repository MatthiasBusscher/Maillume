import assert from "node:assert/strict";

import {
  FeedbackReportError,
  fetchFeedbackAggregateReport,
  formatFeedbackAggregateReport,
} from "./report";

const modernConfig = {
  mode: "supabase" as const,
  supabaseUrl: "https://project.supabase.co",
  apiKey: "sb_secret_report-key",
  useLegacyAuthorization: false,
};
const validRows = [
  {
    analyzer_version: "analysis-v10",
    feedback_kind: "false_positive",
    dimension: "signal_category",
    dimension_value: "urgency",
    sample_count: 14,
  },
  {
    analyzer_version: "analysis-v10",
    feedback_kind: "false_negative",
    dimension: "source",
    dimension_value: "screenshot",
    sample_count: "11",
  },
];

async function main() {
  let capturedRequest: { input: RequestInfo | URL; init?: RequestInit } | undefined;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedRequest = { input, init };
    return Response.json(validRows);
  }) as typeof fetch;

  const report = await fetchFeedbackAggregateReport(modernConfig, {
    days: 45,
    minimumSamples: 10,
    hourlySignatureCap: 15,
    fetchImpl,
    generatedAt: "2026-07-28T12:00:00.000Z",
  });

  assert.ok(capturedRequest);
  assert.equal(
    capturedRequest.input,
    "https://project.supabase.co/rest/v1/rpc/detection_feedback_summary",
  );
  assert.deepEqual(JSON.parse(String(capturedRequest.init?.body)), {
    p_days: 45,
    p_min_samples: 10,
    p_hourly_signature_cap: 15,
  });
  assert.equal(capturedRequest.init?.cache, "no-store");
  assert.equal(
    (capturedRequest.init?.headers as Record<string, string>).apikey,
    modernConfig.apiKey,
  );
  assert.equal(
    "Authorization" in (capturedRequest.init?.headers as Record<string, string>),
    false,
  );
  assert.deepEqual(report.rows, [
    {
      analyzerVersion: "analysis-v10",
      feedbackKind: "false_negative",
      dimension: "source",
      value: "screenshot",
      sampleCount: 11,
    },
    {
      analyzerVersion: "analysis-v10",
      feedbackKind: "false_positive",
      dimension: "signal_category",
      value: "urgency",
      sampleCount: 14,
    },
  ]);

  const human = formatFeedbackAggregateReport(report);
  assert.match(human, /privacy-safe feedback aggregate report/i);
  assert.match(human, /false_negative/);
  assert.match(human, /no raw rows, message content, links, addresses, IPs/i);
  for (const forbidden of [
    "subject",
    "senderEmail",
    "request body",
    modernConfig.apiKey,
  ]) {
    assert.doesNotMatch(human, new RegExp(forbidden, "i"));
  }

  await fetchFeedbackAggregateReport({
    ...modernConfig,
    apiKey: "legacy-service-role",
    useLegacyAuthorization: true,
  }, { fetchImpl });
  assert.equal(
    (capturedRequest?.init?.headers as Record<string, string>).Authorization,
    "Bearer legacy-service-role",
  );

  await assert.rejects(
    fetchFeedbackAggregateReport({ mode: "memory" }),
    FeedbackReportError,
  );
  for (const options of [
    { days: 0 },
    { days: 90 },
    { minimumSamples: 4 },
    { minimumSamples: 1_001 },
    { hourlySignatureCap: 0 },
    { hourlySignatureCap: 101 },
  ]) {
    await assert.rejects(
      fetchFeedbackAggregateReport(modernConfig, options),
      FeedbackReportError,
    );
  }

  for (const malformed of [
    {},
    [{ ...validRows[0], extra: "field" }],
    [{ ...validRows[0], analyzer_version: "analysis-test-v10" }],
    [{ ...validRows[0], feedback_kind: "incorrect" }],
    [{ ...validRows[0], dimension: "sender_domain" }],
    [{ ...validRows[0], dimension_value: "identity" }],
    [{ ...validRows[0], sample_count: 9 }],
    [{ ...validRows[0], sample_count: 1.5 }],
    [validRows[0], { ...validRows[0] }],
  ]) {
    await assert.rejects(
      fetchFeedbackAggregateReport(modernConfig, {
        fetchImpl: async () => Response.json(malformed),
      }),
      FeedbackReportError,
    );
  }

  await assert.rejects(
    fetchFeedbackAggregateReport(modernConfig, {
      fetchImpl: async () => new Response(null, { status: 500 }),
    }),
    FeedbackReportError,
  );

  const empty = await fetchFeedbackAggregateReport(modernConfig, {
    fetchImpl: async () => Response.json([]),
    generatedAt: "2026-07-28T12:00:00.000Z",
  });
  assert.match(
    formatFeedbackAggregateReport(empty),
    /No aggregate cell met the publication threshold/,
  );

  console.log("Checked thresholded privacy-safe feedback aggregate reporting.");
}

void main();
