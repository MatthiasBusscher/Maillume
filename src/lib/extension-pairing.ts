import { createHash, randomBytes, randomInt } from "node:crypto";

import {
  BROWSER_CONNECTION_LIFETIME_DAYS,
  DEFAULT_API_KEY_LIFETIME_DAYS,
  normalizeApiKeyLifetimeDays,
  normalizeApiKeyName,
  type ApiKeyLifetimeDays,
} from "./api-keys";

export const EXTENSION_PAIRING_TTL_SECONDS = 10 * 60;
export const EXTENSION_PAIRING_POLL_SECONDS = 3;
export const EXTENSION_PAIRING_MAX_REQUEST_BYTES = 2 * 1024;
const EXTENSION_PAIRING_APPROVAL_SCOPE_PREFIX = "mlps_";
const USER_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export type ExtensionPairingRequest = {
  browserConnectionId: string | null;
  lifetimeDays: ApiKeyLifetimeDays | typeof BROWSER_CONNECTION_LIFETIME_DAYS;
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

export function hashExtensionBrowserConnectionId(connectionId: string): string {
  return createHash("sha256").update(connectionId).digest("hex");
}

export function isExtensionPairingDeviceCode(value: string): boolean {
  return /^mlp_[A-Za-z0-9_-]{43}$/.test(value);
}

export function isExtensionBrowserConnectionId(value: string): boolean {
  return /^mlb_[a-f0-9]{32}$/.test(value);
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
  const browserConnectionId = typeof body.browserConnectionId === "string"
    && isExtensionBrowserConnectionId(body.browserConnectionId)
    ? body.browserConnectionId
    : body.browserConnectionId === undefined
      ? null
      : undefined;
  const lifetimeDays = browserConnectionId
    ? BROWSER_CONNECTION_LIFETIME_DAYS
    : body.lifetimeDays === undefined
      ? DEFAULT_API_KEY_LIFETIME_DAYS
      : normalizeApiKeyLifetimeDays(body.lifetimeDays);
  const locale = body.locale === "nl" ? "nl" : body.locale === "en" || body.locale === undefined ? "en" : null;
  if (!name || !lifetimeDays || !locale || browserConnectionId === undefined) return null;
  return { browserConnectionId, lifetimeDays, locale, name };
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

export function createExtensionPairingApprovalScope(
  pairingId: string,
  userCode: string,
): string {
  const payload = JSON.stringify({ pairingId, userCode });
  return `${EXTENSION_PAIRING_APPROVAL_SCOPE_PREFIX}${Buffer.from(payload).toString("base64url")}`;
}

export function isExtensionPairingApprovalScope(
  value: unknown,
  pairingId: string,
  userCode: string,
): value is string {
  if (
    typeof value !== "string"
    || !value.startsWith(EXTENSION_PAIRING_APPROVAL_SCOPE_PREFIX)
    || value.length > 256
  ) {
    return false;
  }

  const encodedPayload = value.slice(EXTENSION_PAIRING_APPROVAL_SCOPE_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(encodedPayload)) return false;

  try {
    const payloadBytes = Buffer.from(encodedPayload, "base64url");
    if (payloadBytes.toString("base64url") !== encodedPayload) return false;
    const payload = JSON.parse(payloadBytes.toString("utf8")) as unknown;
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
    const record = payload as Record<string, unknown>;
    return Object.keys(record).sort().join(",") === "pairingId,userCode"
      && record.pairingId === pairingId
      && record.userCode === userCode;
  } catch {
    return false;
  }
}

export function getExtensionPairingMutationTokenInput(
  userId: string,
  approvalScope: string,
) {
  // Sign the exact submitted scope. The resolution route independently decodes
  // and matches it to the immutable pairing identifier and displayed user code.
  return {
    context: approvalScope,
    userId,
  };
}

function createUserCode(): string {
  const characters = Array.from(
    { length: 8 },
    () => USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)],
  );
  return `${characters.slice(0, 4).join("")}-${characters.slice(4).join("")}`;
}
