import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "./heuristic-analysis";
import { createAnalysisFailure, type AnalysisHttpFailure } from "./http";
import {
  createHostedAnalysisSuccessResponse,
  executeHostedAnalysis,
  type HostedQuotaRow,
  type HostedQuotaRpc,
} from "./hosted";
import type { NormalizedScanInput } from "../types";

const input: NormalizedScanInput = {
  body: "Synthetic hosted analysis request.",
  locale: "en",
  source: "chrome",
};
const analysis = {
  result: analyzeEmailHeuristic(input),
  mode: "heuristic" as const,
  provider: "heuristic" as const,
};

async function main() {
  for (const [status, expectedStatus] of [
    ["invalid", 401],
    ["revoked", 401],
    ["expired", 401],
    ["exhausted", 429],
  ] as const) {
    const result = await executeHostedAnalysis(
      request(),
      input,
      "secret-hash",
      rpcSequence([{ data: [quota(status)], error: null }]),
      {
        execute: successfulExecution,
        now: () => Date.parse("2026-07-01T00:00:00.000Z"),
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.status, expectedStatus);
      if (status === "exhausted") {
        assert.equal(
          new Headers(result.failure.headers).get("retry-after"),
          "2678400",
        );
      }
    }
  }

  const reserveUnavailable = await executeHostedAnalysis(
    request(),
    input,
    "secret-hash",
    rpcSequence([{ data: null, error: new Error("database unavailable") }]),
    { execute: successfulExecution },
  );
  assertFailure(reserveUnavailable, 503, "API quota validation is temporarily unavailable.");

  const missingKey = await executeHostedAnalysis(
    request(),
    input,
    "secret-hash",
    rpcSequence([{ data: [], error: null }]),
    { execute: successfulExecution },
  );
  assertFailure(missingKey, 503, "API key validation is temporarily unavailable.");

  let counted = 0;
  const successRpc = rpcSequence([
    { data: [quota("reserved")], error: null },
    { data: true, error: null },
  ]);
  const success = await executeHostedAnalysis(
    request(),
    input,
    "secret-hash",
    successRpc,
    {
      count: () => {
        counted += 1;
      },
      execute: successfulExecution,
    },
  );
  assert.equal(success.ok, true);
  if (success.ok) {
    assert.equal(success.monthlyQuota, 25);
    assert.equal(success.requestCount, 4);
  }
  assert.equal(counted, 1);
  assert.deepEqual(successRpc.operations, [
    "reserve_account_api_quota",
    "finalize_account_api_quota",
  ]);
  if (!success.ok) throw new Error("Expected hosted analysis success.");
  const successResponse = createHostedAnalysisSuccessResponse(
    input,
    success,
    { "X-Maillume-Analysis-Version": "analysis-v11" },
  );
  assert.equal(successResponse.headers.get("cache-control"), "no-store");
  assert.equal(successResponse.headers.get("x-ratelimit-limit"), "25");
  assert.equal(successResponse.headers.get("x-ratelimit-remaining"), "21");
  assert.equal(
    successResponse.headers.get("x-maillume-analysis-version"),
    "analysis-v11",
  );

  const retryFinalize = rpcSequence([
    { data: [quota("reserved")], error: null },
    { data: false, error: new Error("transient") },
    { data: true, error: null },
  ]);
  const finalizedAfterRetry = await executeHostedAnalysis(
    request(),
    input,
    "secret-hash",
    retryFinalize,
    { execute: successfulExecution },
  );
  assert.equal(finalizedAfterRetry.ok, true);

  for (const failure of [
    createAnalysisFailure("Analysis is temporarily rate-limited.", 429, {
      "Retry-After": "8",
    }),
    createAnalysisFailure("Analysis capacity is temporarily busy.", 429, {
      "Retry-After": "5",
    }),
    createAnalysisFailure("Provider unavailable.", 502),
  ]) {
    const refunded = rpcSequence([
      { data: [quota("reserved")], error: null },
      { data: true, error: null },
    ]);
    const result = await executeHostedAnalysis(
      request(),
      input,
      "secret-hash",
      refunded,
      { execute: async () => ({ ok: false, failure }) },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.deepEqual(result.failure, failure);
    assert.deepEqual(refunded.operations, [
      "reserve_account_api_quota",
      "refund_account_api_quota",
    ]);
  }

  const finalizationRefund = rpcSequence([
    { data: [quota("reserved")], error: null },
    { data: false, error: null },
    { data: false, error: null },
    { data: true, error: null },
  ]);
  const restored = await executeHostedAnalysis(
    request(),
    input,
    "secret-hash",
    finalizationRefund,
    { execute: successfulExecution },
  );
  assertFailure(restored, 503, "Analysis could not be finalized. API quota was restored.");

  const refundFailure = rpcSequence([
    { data: [quota("reserved")], error: null },
    { data: false, error: null },
    { data: false, error: null },
  ]);
  const notRestored = await executeHostedAnalysis(
    request(),
    input,
    "secret-hash",
    refundFailure,
    {
      execute: async () => ({
        ok: false,
        failure: createAnalysisFailure("Provider unavailable.", 502),
      }),
    },
  );
  assertFailure(
    notRestored,
    503,
    "Analysis failed and API quota could not be restored automatically.",
  );

  let thrownRefundAttempts = 0;
  const throwingRefund: HostedQuotaRpc = async (operation) => {
    if (operation === "reserve_account_api_quota") {
      return { data: [quota("reserved")], error: null };
    }
    thrownRefundAttempts += 1;
    throw new Error("transient connection failure");
  };
  const throwingRefundResult = await executeHostedAnalysis(
    request(),
    input,
    "secret-hash",
    throwingRefund,
    {
      execute: async () => ({
        ok: false,
        failure: createAnalysisFailure("Provider unavailable.", 502),
      }),
    },
  );
  assertFailure(
    throwingRefundResult,
    503,
    "Analysis failed and API quota could not be restored automatically.",
  );
  assert.equal(thrownRefundAttempts, 2);

  console.log("Checked hosted API quota reservation, retry, refund, and failure behavior.");
}

function quota(operationStatus: string): HostedQuotaRow {
  return {
    api_key_id: "00000000-0000-4000-8000-000000000001",
    monthly_quota: 25,
    operation_status: operationStatus,
    owner_id: "00000000-0000-4000-8000-000000000002",
    request_count: 4,
    reservation_id: operationStatus === "reserved"
      ? "00000000-0000-4000-8000-000000000003"
      : null,
  };
}

function request() {
  return new Request("https://example.test/api/v1/analyze", { method: "POST" });
}

async function successfulExecution() {
  return { ok: true as const, value: analysis };
}

function rpcSequence(responses: Array<{ data: unknown; error: unknown }>) {
  const operations: string[] = [];
  const rpc = (async (operation: string) => {
    operations.push(operation);
    const response = responses.shift();
    if (!response) throw new Error(`Unexpected RPC operation: ${operation}`);
    return response;
  }) as unknown as HostedQuotaRpc & { operations: string[] };
  rpc.operations = operations;
  return rpc;
}

function assertFailure(
  result: Awaited<ReturnType<typeof executeHostedAnalysis>>,
  status: number,
  error: string,
) {
  assert.equal(result.ok, false);
  if (!result.ok) {
    const failure: AnalysisHttpFailure = result.failure;
    assert.equal(failure.status, status);
    assert.equal(failure.error, error);
  }
}

void main();
