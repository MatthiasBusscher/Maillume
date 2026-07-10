import { createHash, randomBytes } from "node:crypto";

export const FEEDBACK_RATE_LIMIT_MAX_REQUESTS = 5;
export const FEEDBACK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;

type FeedbackRateLimitBucket = {
  count: number;
  resetAt: number;
};

export type FeedbackRateLimitStore = Map<string, FeedbackRateLimitBucket>;

type FeedbackRateLimitOptions = {
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
  const key = hashEphemeralClientId(getClientIdentifier(request.headers), salt);
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
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

function getClientIdentifier(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return (
    forwardedFor ??
    headers.get("cf-connecting-ip")?.trim() ??
    headers.get("x-real-ip")?.trim() ??
    "anonymous"
  );
}
