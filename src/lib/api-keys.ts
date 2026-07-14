import { createHash, randomBytes } from "node:crypto";

export const MAX_API_KEYS_PER_USER = 5;
export const DEFAULT_MONTHLY_API_QUOTA = 100;
export const API_KEY_LIFETIME_DAYS = [30, 90, 180] as const;
export const DEFAULT_API_KEY_LIFETIME_DAYS = 90;

export type ApiKeyLifetimeDays = (typeof API_KEY_LIFETIME_DAYS)[number];
export type ApiKeyStatus = "active" | "expired" | "revoked";

export type AccountApiUsage = {
  monthly_quota: number;
  period_start: string;
  request_count: number;
};

export type PublicApiKey = {
  created_at: string;
  expires_at: string;
  id: string;
  key_prefix: string;
  last_used_at: string | null;
  monthly_quota: number;
  name: string;
  revoked_at: string | null;
  rotated_from_id: string | null;
  status: ApiKeyStatus;
};

export function createApiKey() {
  const plaintext = `mlm_${randomBytes(32).toString("base64url")}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 12),
    secretHash: hashApiKey(plaintext),
  };
}

export function hashApiKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function isApiKeyFormat(value: string): boolean {
  return /^mlm_[A-Za-z0-9_-]{43}$/.test(value);
}

export function normalizeApiKeyName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= 50 ? normalized : null;
}

export function normalizeApiKeyLifetimeDays(value: unknown): ApiKeyLifetimeDays | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return API_KEY_LIFETIME_DAYS.find((days) => days === parsed) ?? null;
}

export function getApiKeyExpiration(
  lifetimeDays: ApiKeyLifetimeDays,
  now = new Date(),
): string {
  return new Date(now.getTime() + lifetimeDays * 24 * 60 * 60 * 1_000).toISOString();
}

export function getApiKeyStatus(
  key: Pick<PublicApiKey, "expires_at" | "revoked_at">,
  now = new Date(),
): ApiKeyStatus {
  if (key.revoked_at) return "revoked";
  return new Date(key.expires_at).getTime() <= now.getTime() ? "expired" : "active";
}
