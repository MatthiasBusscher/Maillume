import { createHash, randomBytes, randomInt } from "node:crypto";

import {
  DEFAULT_API_KEY_LIFETIME_DAYS,
  normalizeApiKeyLifetimeDays,
  normalizeApiKeyName,
  type ApiKeyLifetimeDays,
} from "./api-keys";

export const EXTENSION_PAIRING_TTL_SECONDS = 10 * 60;
export const EXTENSION_PAIRING_POLL_SECONDS = 3;
export const EXTENSION_PAIRING_MAX_REQUEST_BYTES = 2 * 1024;
const USER_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export type ExtensionPairingRequest = {
  lifetimeDays: ApiKeyLifetimeDays;
  locale: "en" | "nl";
  name: string;
};

export function createExtensionPairingCredentials() {
  const deviceCode = `mlp_${randomBytes(32).toString("base64url")}`;
  return {
    deviceCode,
    deviceCodeHash: hashExtensionPairingDeviceCode(deviceCode),
    userCode: createUserCode(),
  };
}

export function hashExtensionPairingDeviceCode(deviceCode: string): string {
  return createHash("sha256").update(deviceCode).digest("hex");
}

export function isExtensionPairingDeviceCode(value: string): boolean {
  return /^mlp_[A-Za-z0-9_-]{43}$/.test(value);
}

export function isExtensionPairingId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeExtensionPairingUserCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== 8 || [...compact].some((character) => !USER_CODE_ALPHABET.includes(character))) {
    return null;
  }
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

export function normalizeExtensionPairingRequest(value: unknown): ExtensionPairingRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const name = normalizeApiKeyName(body.name);
  const lifetimeDays = body.lifetimeDays === undefined
    ? DEFAULT_API_KEY_LIFETIME_DAYS
    : normalizeApiKeyLifetimeDays(body.lifetimeDays);
  const locale = body.locale === "nl" ? "nl" : body.locale === "en" || body.locale === undefined ? "en" : null;
  if (!name || !lifetimeDays || !locale) return null;
  return { lifetimeDays, locale, name };
}

export function getPairingExpiration(now = new Date()): string {
  return new Date(now.getTime() + EXTENSION_PAIRING_TTL_SECONDS * 1_000).toISOString();
}

export function getPairingVerificationPath(
  pairingId: string,
  userCode: string,
  locale: "en" | "nl",
): string {
  const prefix = locale === "nl" ? "/nl" : "";
  return `${prefix}/account/connect-extension/${encodeURIComponent(pairingId)}?code=${encodeURIComponent(userCode)}`;
}

function createUserCode(): string {
  const characters = Array.from(
    { length: 8 },
    () => USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)],
  );
  return `${characters.slice(0, 4).join("")}-${characters.slice(4).join("")}`;
}
