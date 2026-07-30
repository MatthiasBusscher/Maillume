import assert from "node:assert/strict";

import {
  createExtensionPairingCredentials,
  EXTENSION_PAIRING_POLL_SECONDS,
  EXTENSION_PAIRING_TTL_SECONDS,
  getPairingExpiration,
  getPairingVerificationPath,
  hashExtensionPairingDeviceCode,
  isExtensionPairingDeviceCode,
  isExtensionPairingId,
  normalizeExtensionPairingRequest,
  normalizeExtensionPairingUserCode,
} from "./extension-pairing";

const first = createExtensionPairingCredentials();
const second = createExtensionPairingCredentials();

assert.match(first.deviceCode, /^mlp_[A-Za-z0-9_-]{43}$/);
assert.match(first.deviceCodeHash, /^[a-f0-9]{64}$/);
assert.match(first.userCode, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
assert.equal(first.deviceCodeHash, hashExtensionPairingDeviceCode(first.deviceCode));
assert.notEqual(first.deviceCode, second.deviceCode);
assert.notEqual(first.userCode, second.userCode);
assert.equal(isExtensionPairingDeviceCode(first.deviceCode), true);
assert.equal(isExtensionPairingDeviceCode("mlp_short"), false);
assert.equal(isExtensionPairingId("10000000-0000-4000-8000-000000000001"), true);
assert.equal(isExtensionPairingId("not-a-uuid"), false);
assert.equal(normalizeExtensionPairingUserCode("abcd-2345"), "ABCD-2345");
assert.equal(normalizeExtensionPairingUserCode("ABCD 2345"), "ABCD-2345");
assert.equal(normalizeExtensionPairingUserCode("ABCI-2345"), null);
assert.deepEqual(normalizeExtensionPairingRequest({
  lifetimeDays: 90,
  locale: "nl",
  name: " Chrome op Mac ",
}), {
  lifetimeDays: 90,
  locale: "nl",
  name: "Chrome op Mac",
});
assert.deepEqual(normalizeExtensionPairingRequest({ name: "Chrome" }), {
  lifetimeDays: 90,
  locale: "en",
  name: "Chrome",
});
assert.equal(normalizeExtensionPairingRequest({ lifetimeDays: 365, name: "Chrome" }), null);
assert.equal(normalizeExtensionPairingRequest({ locale: "de", name: "Chrome" }), null);
assert.equal(
  getPairingExpiration(new Date("2026-07-30T08:00:00.000Z")),
  "2026-07-30T08:10:00.000Z",
);
assert.equal(
  getPairingVerificationPath(
    "10000000-0000-4000-8000-000000000001",
    "ABCD-2345",
    "nl",
  ),
  "/nl/account/connect-extension/10000000-0000-4000-8000-000000000001?code=ABCD-2345",
);
assert.equal(EXTENSION_PAIRING_TTL_SECONDS, 600);
assert.equal(EXTENSION_PAIRING_POLL_SECONDS, 3);

console.log("Checked one-time browser extension pairing credentials.");
