import assert from "node:assert/strict";

import { AnalysisCapacityError, withAnalysisCapacity } from "./concurrency";
import type { AnalysisConfig } from "./config";

const AI_CONFIG = {
  mode: "ai",
  provider: "openai",
  apiKey: "test-key",
  model: "test-model",
  maxOutputTokens: 800,
  maxConcurrentRequests: 1,
  rateLimit: { enabled: true, maxRequests: 10, windowMs: 60_000 },
} as const satisfies AnalysisConfig;

async function main() {
  globalThis.__maillumeAiActiveRequests = 0;
  let release: (() => void) | undefined;
  const waiting = withAnalysisCapacity(
    AI_CONFIG,
    () => new Promise<void>((resolve) => { release = resolve; }),
  );

  await assert.rejects(
    () => withAnalysisCapacity(AI_CONFIG, async () => undefined),
    AnalysisCapacityError,
  );

  release?.();
  await waiting;
  assert.equal(globalThis.__maillumeAiActiveRequests, 0);
  await withAnalysisCapacity(AI_CONFIG, async () => undefined);

  console.log("Checked AI analysis concurrency limiting.");
}

void main();
