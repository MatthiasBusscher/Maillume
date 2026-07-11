import assert from "node:assert/strict";

import {
  createApiKey,
  DEFAULT_MONTHLY_API_QUOTA,
  hashApiKey,
  isApiKeyFormat,
  MAX_API_KEYS_PER_USER,
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
  assert.equal(normalizeApiKeyName("  Outlook  "), "Outlook");
  assert.equal(normalizeApiKeyName(""), null);
  assert.equal(normalizeApiKeyName("x".repeat(51)), null);
  assert.equal(DEFAULT_MONTHLY_API_QUOTA, 100);
  assert.equal(MAX_API_KEYS_PER_USER, 5);

  console.log("Checked hosted API key contracts.");
}

main();
