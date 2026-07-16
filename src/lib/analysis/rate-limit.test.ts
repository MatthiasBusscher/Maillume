import assert from "node:assert/strict";

import type { AnalysisConfig } from "./config";
import { enforceAiRateLimit, enforceRequestRateLimit, RateLimitError, type AiRateLimitStore } from "./rate-limit";

const HEURISTIC_CONFIG = {
  mode: "heuristic",
  provider: "heuristic",
} as const satisfies AnalysisConfig;

const AI_CONFIG = {
  mode: "ai",
  provider: "openai",
  apiKey: "fake-openai-key-for-tests",
  model: "openai-test-model",
  maxOutputTokens: 800,
  maxConcurrentRequests: 2,
  rateLimit: {
    enabled: true,
    maxRequests: 2,
    windowMs: 1_000,
  },
} as const satisfies AnalysisConfig;

function main() {
  const heuristicStore = new Map() satisfies AiRateLimitStore;

  for (let index = 0; index < 5; index += 1) {
    enforceAiRateLimit(requestFromIp("203.0.113.10"), HEURISTIC_CONFIG, {
      now: () => 0,
      store: heuristicStore,
    });
  }

  assert.equal(heuristicStore.size, 0, "heuristic mode should not allocate rate-limit buckets");

  const aiStore = new Map() satisfies AiRateLimitStore;
  const request = requestFromIp("203.0.113.20");

  enforceAiRateLimit(request, AI_CONFIG, { now: () => 0, store: aiStore });
  enforceAiRateLimit(request, AI_CONFIG, { now: () => 100, store: aiStore });

  let limitedError: unknown;

  try {
    enforceAiRateLimit(request, AI_CONFIG, { now: () => 500, store: aiStore });
  } catch (error) {
    limitedError = error;
  }

  assert.ok(
    limitedError instanceof RateLimitError,
    "AI mode should reject requests above the configured window limit",
  );

  const requestStore = new Map() satisfies AiRateLimitStore;
  enforceRequestRateLimit(requestFromIp("203.0.113.60"), {
    maxRequests: 1,
    windowMs: 1_000,
    now: () => 0,
    store: requestStore,
  });
  assert.throws(
    () =>
      enforceRequestRateLimit(requestFromIp("203.0.113.60"), {
        maxRequests: 1,
        windowMs: 1_000,
        now: () => 100,
        store: requestStore,
      }),
    RateLimitError,
    "all hosted analysis modes should support request limiting",
  );
  assert.equal(limitedError.retryAfterSeconds, 1);

  enforceAiRateLimit(request, AI_CONFIG, { now: () => 1_001, store: aiStore });

  const secondClientStore = new Map() satisfies AiRateLimitStore;

  enforceAiRateLimit(requestFromIp("203.0.113.30"), AI_CONFIG, {
    now: () => 0,
    store: secondClientStore,
  });
  enforceAiRateLimit(requestFromIp("203.0.113.31"), AI_CONFIG, {
    now: () => 0,
    store: secondClientStore,
  });
  enforceAiRateLimit(requestFromIp("203.0.113.30"), AI_CONFIG, {
    now: () => 100,
    store: secondClientStore,
  });

  const disabledConfig = {
    ...AI_CONFIG,
    rateLimit: {
      ...AI_CONFIG.rateLimit,
      enabled: false,
    },
  } satisfies AnalysisConfig;
  const disabledStore = new Map() satisfies AiRateLimitStore;

  for (let index = 0; index < 5; index += 1) {
    enforceAiRateLimit(requestFromIp("203.0.113.40"), disabledConfig, {
      now: () => index,
      store: disabledStore,
    });
  }

  assert.equal(disabledStore.size, 0, "disabled rate limiting should not allocate buckets");

  const forwardedStore = new Map() satisfies AiRateLimitStore;
  const forwardedRequest = new Request("https://example.test/api/analyze", {
    headers: {
      "x-forwarded-for": "203.0.113.50, 198.51.100.10",
    },
  });

  enforceAiRateLimit(forwardedRequest, AI_CONFIG, { now: () => 0, store: forwardedStore });

  assert.ok(
    forwardedStore.has("openai:203.0.113.50"),
    "x-forwarded-for should use the first client IP",
  );

  const productionStore = new Map() satisfies AiRateLimitStore;
  enforceAiRateLimit(forwardedRequest, AI_CONFIG, {
    env: { NODE_ENV: "production" },
    now: () => 0,
    store: productionStore,
  });
  assert.ok(
    productionStore.has("openai:anonymous"),
    "production must not trust a client-supplied forwarding header",
  );

  console.log("Checked AI analysis rate limiting.");
}

main();

function requestFromIp(ip: string): Request {
  return new Request("https://example.test/api/analyze", {
    headers: {
      "x-forwarded-for": ip,
    },
  });
}
