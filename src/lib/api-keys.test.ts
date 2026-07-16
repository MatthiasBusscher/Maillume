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
  assert.equal(DEFAULT_MONTHLY_API_QUOTA, 100);
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
  assert.equal(getApiKeyStatus({ expires_at: "2027-01-01T00:00:00.000Z", revoked_at: null }, new Date("2026-01-01T00:00:00.000Z")), "active");
  assert.equal(getApiKeyStatus({ expires_at: "2026-01-01T00:00:00.000Z", revoked_at: null }, new Date("2026-01-01T00:00:00.000Z")), "expired");
  assert.equal(getApiKeyStatus({ expires_at: "2027-01-01T00:00:00.000Z", revoked_at: "2026-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:00:00.000Z")), "revoked");

  console.log("Checked hosted API key contracts.");
}

main();
