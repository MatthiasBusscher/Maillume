import { createHash, randomBytes } from "node:crypto";
import { getTrustedClientIdentifier } from "../security/client-identifier";

export const FEEDBACK_RATE_LIMIT_MAX_REQUESTS = 5;
export const FEEDBACK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
export const FEEDBACK_RATE_LIMIT_MAX_BUCKETS = 10_000;

type FeedbackRateLimitBucket = {
  count: number;
  resetAt: number;
};

export type FeedbackRateLimitStore = Map<string, FeedbackRateLimitBucket>;

type FeedbackRateLimitOptions = {
  env?: Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "TRUST_CF_CONNECTING_IP" | "TRUSTED_PROXY_IP_HEADER">>;
  maxBuckets?: number;
  now?: () => number;
  salt?: string;
  store?: FeedbackRateLimitStore;
};

declare global {
  var __inboxRiskScannerFeedbackRateLimitSalt: string | undefined;
  var __inboxRiskScannerFeedbackRateLimitStore: FeedbackRateLimitStore | undefined;
}

export class FeedbackRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Feedback is temporarily rate-limited. Try again in ${retryAfterSeconds} seconds.`);
    this.name = "FeedbackRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function enforceFeedbackRateLimit(
  request: Request,
  options: FeedbackRateLimitOptions = {},
): void {
  const now = options.now?.() ?? Date.now();
  const store = options.store ?? getGlobalStore();
  const salt = options.salt ?? getProcessSalt();
  const key = hashEphemeralClientId(getTrustedClientIdentifier(request.headers, options.env), salt);
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (!bucket) ensureBucketCapacity(store, options.maxBuckets ?? FEEDBACK_RATE_LIMIT_MAX_BUCKETS, now);
    store.set(key, {
      count: 1,
      resetAt: now + FEEDBACK_RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (bucket.count >= FEEDBACK_RATE_LIMIT_MAX_REQUESTS) {
    throw new FeedbackRateLimitError(Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)));
  }

  bucket.count += 1;
}

function ensureBucketCapacity(
  store: FeedbackRateLimitStore,
  maxBuckets: number,
  now: number,
): void {
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
  throw new FeedbackRateLimitError(Math.max(1, Math.ceil((earliestResetAt - now) / 1_000)));
}

function getGlobalStore(): FeedbackRateLimitStore {
  globalThis.__inboxRiskScannerFeedbackRateLimitStore ??= new Map();
  return globalThis.__inboxRiskScannerFeedbackRateLimitStore;
}

function getProcessSalt(): string {
  globalThis.__inboxRiskScannerFeedbackRateLimitSalt ??= randomBytes(32).toString("base64url");
  return globalThis.__inboxRiskScannerFeedbackRateLimitSalt;
}

function hashEphemeralClientId(clientId: string, salt: string): string {
  return createHash("sha256").update(salt).update(clientId).digest("base64url");
}
