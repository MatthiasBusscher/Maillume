import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "./heuristic-analysis";
import {
  createAnalysisErrorResponse,
  createAnalysisFailure,
  createAnalysisSuccessResponse,
  enforceAnalysisRequestLimit,
  executeAnalysisRequest,
  parseAnalysisRequest,
} from "./http";
import { AnalysisCapacityError } from "./concurrency";
import { AnalysisConfigError, type AnalysisConfig } from "./config";
import { AiProviderRequestError } from "./providers";
import { RateLimitError } from "./rate-limit";
import type { NormalizedScanInput } from "../types";

const heuristicConfig: AnalysisConfig = {
  mode: "heuristic",
  provider: "heuristic",
};
const input: NormalizedScanInput = {
  body: "Synthetic account update.",
  locale: "en",
  source: "paste",
};

async function main() {
  const parsed = await parseAnalysisRequest(requestWithBody({
    body: "Synthetic account update.",
    locale: "nl",
    source: "paste",
  }));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.locale, "nl");

  const malformed = await parseAnalysisRequest(requestWithRawBody("{"));
  assert.equal(malformed.ok, false);
  if (!malformed.ok) assert.equal(malformed.failure.status, 400);

  const oversized = await parseAnalysisRequest(requestWithRawBody("oversized"), {
    getMaxRequestBytes: () => 4,
  });
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.equal(oversized.failure.status, 413);

  let capturedLimit = 0;
  let capturedWindow = 0;
  const allowed = enforceAnalysisRequestLimit(new Request("https://example.test/api/analyze"), {
    env: {
      ANALYSIS_REQUEST_LIMIT: "7",
      ANALYSIS_REQUEST_WINDOW_SECONDS: "12",
    },
    enforce: (_request, options) => {
      capturedLimit = options.maxRequests;
      capturedWindow = options.windowMs;
    },
  });
  assert.equal(allowed, null);
  assert.equal(capturedLimit, 7);
  assert.equal(capturedWindow, 12_000);

  const limited = enforceAnalysisRequestLimit(new Request("https://example.test/api/analyze"), {
    enforce: () => {
      throw new RateLimitError(9);
    },
  });
  assert.equal(limited?.status, 429);
  assert.deepEqual(limited?.headers, { "Retry-After": "9" });

  const result = analyzeEmailHeuristic(input);
  const executed = await executeAnalysisRequest(
    new Request("https://example.test/api/analyze"),
    input,
    {
      analyze: async () => ({
        result,
        mode: "heuristic",
        provider: "heuristic",
      }),
      enforceAiLimit: () => undefined,
      getConfig: () => heuristicConfig,
      withCapacity: async (_config, operation) => operation(),
    },
  );
  assert.equal(executed.ok, true);

  for (const [thrown, expectedStatus, retryAfter] of [
    [new AnalysisConfigError("Bad analysis configuration."), 500, undefined],
    [new RateLimitError(14), 429, "14"],
    [new AnalysisCapacityError(), 429, "5"],
    [new AiProviderRequestError("Provider unavailable."), 502, undefined],
    [new Error("private implementation detail"), 500, undefined],
  ] as const) {
    const failed = await executeAnalysisRequest(
      new Request("https://example.test/api/analyze"),
      input,
      {
        enforceAiLimit: () => {
          throw thrown;
        },
        getConfig: () => heuristicConfig,
      },
    );
    assert.equal(failed.ok, false);
    if (!failed.ok) {
      assert.equal(failed.failure.status, expectedStatus);
      assert.equal(new Headers(failed.failure.headers).get("retry-after"), retryAfter ?? null);
      if (thrown instanceof Error && thrown.message === "private implementation detail") {
        assert.equal(failed.failure.error, "Analysis failed unexpectedly.");
      }
    }
  }

  if (!executed.ok) throw new Error("Expected successful analysis.");
  const success = createAnalysisSuccessResponse(input, executed.value);
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("cache-control"), "no-store");
  const successBody = await success.json();
  assert.equal(successBody.privacy.stored, false);
  assert.equal(successBody.analysis_mode, "heuristic");

  const errorResponse = createAnalysisErrorResponse(
    createAnalysisFailure("Limited.", 429, { "Retry-After": "3" }),
    { "X-Test-Header": "present" },
  );
  assert.equal(errorResponse.status, 429);
  assert.equal(errorResponse.headers.get("cache-control"), "no-store");
  assert.equal(errorResponse.headers.get("retry-after"), "3");
  assert.equal(errorResponse.headers.get("x-test-header"), "present");

  console.log("Checked shared analysis HTTP parsing, execution, and response behavior.");
}

function requestWithBody(body: unknown) {
  return requestWithRawBody(JSON.stringify(body));
}

function requestWithRawBody(body: string) {
  return new Request("https://example.test/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

void main();
