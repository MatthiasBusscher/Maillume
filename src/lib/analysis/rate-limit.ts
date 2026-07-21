import type { AnalysisConfig } from "./config";
import { getTrustedClientIdentifier } from "../security/client-identifier";

export type AiRateLimitBucket = {
  count: number;
  resetAt: number;
};

export type AiRateLimitStore = Map<string, AiRateLimitBucket>;

export const ANALYSIS_RATE_LIMIT_MAX_BUCKETS = 10_000;

type AiRateLimitOptions = {
  env?: Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "TRUST_CF_CONNECTING_IP" | "TRUSTED_PROXY_IP_HEADER">>;
  maxBuckets?: number;
  now?: () => number;
  store?: AiRateLimitStore;
};

declare global {
  var __maillumeAnalysisRateLimitStore: AiRateLimitStore | undefined;
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Analysis is temporarily rate-limited. Try again in ${retryAfterSeconds} seconds.`);
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
  const clientId = getTrustedClientIdentifier(request.headers, options.env);
  const key = `${config.provider}:${clientId}`;
  enforceBucketLimit(store, key, config.rateLimit.maxRequests, config.rateLimit.windowMs, now, options.maxBuckets);
}

export function enforceRequestRateLimit(
  request: Request,
  options: AiRateLimitOptions & { maxRequests: number; windowMs: number },
): void {
  const now = options.now?.() ?? Date.now();
  const store = options.store ?? getGlobalRateLimitStore();
  const key = `request:${getTrustedClientIdentifier(request.headers, options.env)}`;
  enforceBucketLimit(store, key, options.maxRequests, options.windowMs, now, options.maxBuckets);
}

function enforceBucketLimit(
  store: AiRateLimitStore,
  key: string,
  maxRequests: number,
  windowMs: number,
  now: number,
  maxBuckets = ANALYSIS_RATE_LIMIT_MAX_BUCKETS,
): void {
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (!bucket) ensureBucketCapacity(store, maxBuckets, now);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= maxRequests) {
    throw new RateLimitError(Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)));
  }

  bucket.count += 1;
}

function ensureBucketCapacity(store: AiRateLimitStore, maxBuckets: number, now: number): void {
  const boundedMaximum = Math.max(1, Math.floor(maxBuckets));
  if (store.size < boundedMaximum) return;

  let earliestResetAt = Number.POSITIVE_INFINITY;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    } else {
      earliestResetAt = Math.min(earliestResetAt, bucket.resetAt);
    }
  }

  if (store.size < boundedMaximum) return;
  throw new RateLimitError(Math.max(1, Math.ceil((earliestResetAt - now) / 1_000)));
}

function getGlobalRateLimitStore(): AiRateLimitStore {
  globalThis.__maillumeAnalysisRateLimitStore ??= new Map<string, AiRateLimitBucket>();

  return globalThis.__maillumeAnalysisRateLimitStore;
}
