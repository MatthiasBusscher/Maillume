import type { AnalysisConfig } from "./config";

declare global {
  var __maillumeAiActiveRequests: number | undefined;
}

export class AnalysisCapacityError extends Error {
  constructor() {
    super("Analysis capacity is temporarily busy. Try again shortly.");
    this.name = "AnalysisCapacityError";
  }
}

export async function withAnalysisCapacity<T>(
  config: AnalysisConfig,
  operation: () => Promise<T>,
): Promise<T> {
  if (config.mode !== "ai") {
    return operation();
  }

  const active = globalThis.__maillumeAiActiveRequests ?? 0;
  if (active >= config.maxConcurrentRequests) {
    throw new AnalysisCapacityError();
  }

  globalThis.__maillumeAiActiveRequests = active + 1;
  try {
    return await operation();
  } finally {
    globalThis.__maillumeAiActiveRequests = Math.max(
      0,
      (globalThis.__maillumeAiActiveRequests ?? 1) - 1,
    );
  }
}
