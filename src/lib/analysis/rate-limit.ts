import type { AnalysisConfig } from "./config";

export type AiRateLimitBucket = {
  count: number;
  resetAt: number;
};

export type AiRateLimitStore = Map<string, AiRateLimitBucket>;

type AiRateLimitOptions = {
  now?: () => number;
  store?: AiRateLimitStore;
};

declare global {
  var __inboxRiskScannerAiRateLimitStore: AiRateLimitStore | undefined;
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`AI analysis is temporarily rate-limited. Try again in ${retryAfterSeconds} seconds.`);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function enforceAiRateLimit(
  request: Request,
  config: AnalysisConfig,
  options: AiRateLimitOptions = {},
): void {
  if (config.mode !== "ai" || !config.rateLimit.enabled) {
    return;
  }

  const now = options.now?.() ?? Date.now();
  const store = options.store ?? getGlobalRateLimitStore();
  const clientId = getClientIdentifier(request.headers);
  const key = `${config.provider}:${clientId}`;
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.rateLimit.windowMs,
    });

    return;
  }

  if (bucket.count >= config.rateLimit.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));

    throw new RateLimitError(retryAfterSeconds);
  }

  bucket.count += 1;
}

function getGlobalRateLimitStore(): AiRateLimitStore {
  globalThis.__inboxRiskScannerAiRateLimitStore ??= new Map<string, AiRateLimitBucket>();

  return globalThis.__inboxRiskScannerAiRateLimitStore;
}

function getClientIdentifier(headers: Headers): string {
  const forwardedFor = getFirstHeaderValue(headers.get("x-forwarded-for"));

  return (
    forwardedFor ??
    headers.get("cf-connecting-ip")?.trim() ??
    headers.get("x-real-ip")?.trim() ??
    "anonymous"
  );
}

function getFirstHeaderValue(value: string | null): string | undefined {
  const firstValue = value?.split(",")[0]?.trim();

  return firstValue ? firstValue : undefined;
}
