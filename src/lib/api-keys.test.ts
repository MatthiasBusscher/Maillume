import assert from "node:assert/strict";

import {
  API_KEY_LIFETIME_DAYS,
  createApiKey,
  DEFAULT_API_KEY_LIFETIME_DAYS,
  DEFAULT_MONTHLY_API_QUOTA,
  getApiKeyExpiration,
  getApiKeyStatus,
  hashApiKey,
  isApiKeyFormat,
  MAX_API_KEYS_PER_USER,
  normalizeApiKeyLifetimeDays,
  normalizeApiKeyName,
} from "./api-keys";
import { shouldShowBrowserConnectionRecovery } from "./browser-connection-recovery";

function main() {
  const first = createApiKey();
  const second = createApiKey();

  assert.match(first.plaintext, /^mlm_[A-Za-z0-9_-]{43}$/);
  assert.equal(first.prefix, first.plaintext.slice(0, 12));
  assert.equal(first.secretHash, hashApiKey(first.plaintext));
  assert.match(first.secretHash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.plaintext, second.plaintext);
  assert.notEqual(first.secretHash, second.secretHash);
  assert.equal(isApiKeyFormat(first.plaintext), true);
  assert.equal(isApiKeyFormat("mlm_short"), false);
  assert.equal(normalizeApiKeyName("  Chrome  "), "Chrome");
  assert.equal(normalizeApiKeyName(""), null);
  assert.equal(normalizeApiKeyName("x".repeat(51)), null);
  assert.equal(DEFAULT_MONTHLY_API_QUOTA, 25);
  assert.equal(MAX_API_KEYS_PER_USER, 5);
  assert.deepEqual(API_KEY_LIFETIME_DAYS, [30, 90, 180]);
  assert.equal(DEFAULT_API_KEY_LIFETIME_DAYS, 90);
  assert.equal(normalizeApiKeyLifetimeDays(30), 30);
  assert.equal(normalizeApiKeyLifetimeDays("180"), 180);
  assert.equal(normalizeApiKeyLifetimeDays(365), null);
  assert.equal(
    getApiKeyExpiration(30, new Date("2026-01-01T00:00:00.000Z")),
    "2026-01-31T00:00:00.000Z",
  );
  const developerKey = {
    credential_kind: "developer" as const,
    inactive_after: null,
    revoked_at: null,
  };
  assert.equal(getApiKeyStatus({ ...developerKey, expires_at: "2027-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:00:00.000Z")), "active");
  assert.equal(getApiKeyStatus({ ...developerKey, expires_at: "2026-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:00:00.000Z")), "expired");
  assert.equal(getApiKeyStatus({ ...developerKey, expires_at: "2027-01-01T00:00:00.000Z", revoked_at: "2026-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:00:00.000Z")), "revoked");
  assert.equal(getApiKeyStatus({
    credential_kind: "browser",
    expires_at: "2027-01-01T00:00:00.000Z",
    inactive_after: "2026-04-01T00:00:00.000Z",
    revoked_at: null,
  }, new Date("2026-04-01T00:00:00.000Z")), "expired");
  assert.equal(shouldShowBrowserConnectionRecovery([
    { credential_kind: "developer", status: "active" },
  ]), true, "an active older developer credential needs a non-attributing recovery path");
  assert.equal(shouldShowBrowserConnectionRecovery([
    { credential_kind: "browser", status: "active" },
    { credential_kind: "developer", status: "active" },
  ]), false, "a managed browser connection makes recovery guidance unnecessary");
  assert.equal(shouldShowBrowserConnectionRecovery([
    { credential_kind: "developer", status: "expired" },
    { credential_kind: "developer", status: "revoked" },
  ]), false, "inactive developer records must not suggest a usable extension recovery");
  assert.equal(shouldShowBrowserConnectionRecovery([]), false);

  console.log("Checked hosted API key contracts.");
}

main();
