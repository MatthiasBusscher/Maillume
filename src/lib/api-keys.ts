import { createHash, randomBytes } from "node:crypto";

export const MAX_API_KEYS_PER_USER = 5;
export const DEFAULT_MONTHLY_API_QUOTA = 100;

export type PublicApiKey = {
  created_at: string;
  id: string;
  key_prefix: string;
  last_used_at: string | null;
  monthly_quota: number;
  name: string;
  revoked_at: string | null;
  usage: number;
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
