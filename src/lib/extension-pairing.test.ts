import assert from "node:assert/strict";

import {
  createExtensionPairingApprovalScope,
  createExtensionPairingCredentials,
  EXTENSION_PAIRING_POLL_SECONDS,
  EXTENSION_PAIRING_TTL_SECONDS,
  getExtensionPairingMutationTokenInput,
  getPairingExpiration,
  getPairingVerificationPath,
  hashExtensionBrowserConnectionId,
  hashExtensionPairingDeviceCode,
  isExtensionBrowserConnectionId,
  isExtensionPairingApprovalScope,
  isExtensionPairingDeviceCode,
  isExtensionPairingId,
  normalizeExtensionPairingRequest,
  normalizeExtensionPairingUserCode,
} from "./extension-pairing";

const first = createExtensionPairingCredentials();
const second = createExtensionPairingCredentials();
const pairingId = "10000000-0000-4000-8000-000000000001";
const userId = "9d455f80-d850-40c4-9e05-b8885ab661f7";
const approvalScope = createExtensionPairingApprovalScope(pairingId, "ABCD-2345");

assert.match(first.deviceCode, /^mlp_[A-Za-z0-9_-]{43}$/);
assert.match(first.deviceCodeHash, /^[a-f0-9]{64}$/);
assert.match(first.userCode, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
assert.equal(first.deviceCodeHash, hashExtensionPairingDeviceCode(first.deviceCode));
assert.notEqual(first.deviceCode, second.deviceCode);
assert.notEqual(first.userCode, second.userCode);
assert.equal(isExtensionPairingDeviceCode(first.deviceCode), true);
assert.equal(isExtensionPairingDeviceCode("mlp_short"), false);
assert.equal(isExtensionBrowserConnectionId("mlb_12345678123441238123123456789abc"), true);
assert.equal(isExtensionBrowserConnectionId("mlb_short"), false);
assert.match(
  hashExtensionBrowserConnectionId("mlb_12345678123441238123123456789abc"),
  /^[a-f0-9]{64}$/,
);
assert.equal(isExtensionPairingId(pairingId), true);
assert.equal(isExtensionPairingId("not-a-uuid"), false);
assert.equal(normalizeExtensionPairingUserCode("abcd-2345"), "ABCD-2345");
assert.equal(normalizeExtensionPairingUserCode("ABCD 2345"), "ABCD-2345");
assert.equal(normalizeExtensionPairingUserCode("ABCI-2345"), null);
assert.deepEqual(normalizeExtensionPairingRequest({
  lifetimeDays: 90,
  locale: "nl",
  name: " Chrome op Mac ",
}), {
  browserConnectionId: null,
  lifetimeDays: 90,
  locale: "nl",
  name: "Chrome op Mac",
});
assert.deepEqual(normalizeExtensionPairingRequest({ name: "Chrome" }), {
  browserConnectionId: null,
  lifetimeDays: 90,
  locale: "en",
  name: "Chrome",
});
assert.deepEqual(normalizeExtensionPairingRequest({
  browserConnectionId: "mlb_12345678123441238123123456789abc",
  lifetimeDays: 30,
  name: "Chrome",
}), {
  browserConnectionId: "mlb_12345678123441238123123456789abc",
  lifetimeDays: 365,
  locale: "en",
  name: "Chrome",
});
assert.equal(normalizeExtensionPairingRequest({
  browserConnectionId: "mlb_invalid",
  name: "Chrome",
}), null);
assert.equal(normalizeExtensionPairingRequest({ lifetimeDays: 365, name: "Chrome" }), null);
assert.equal(normalizeExtensionPairingRequest({ locale: "de", name: "Chrome" }), null);
assert.equal(
  getPairingExpiration(new Date("2026-07-30T08:00:00.000Z")),
  "2026-07-30T08:10:00.000Z",
);
assert.equal(
  getPairingVerificationPath(
    pairingId,
    "ABCD-2345",
    "nl",
  ),
  "/nl/account/connect-extension/10000000-0000-4000-8000-000000000001?code=ABCD-2345",
);
assert.equal(isExtensionPairingApprovalScope(approvalScope, pairingId, "ABCD-2345"), true);
assert.equal(
  isExtensionPairingApprovalScope(
    approvalScope,
    "20000000-0000-4000-8000-000000000002",
    "ABCD-2345",
  ),
  false,
);
assert.equal(isExtensionPairingApprovalScope(approvalScope, pairingId, "EFGH-6789"), false);
assert.equal(isExtensionPairingApprovalScope(`${approvalScope}x`, pairingId, "ABCD-2345"), false);
assert.equal(isExtensionPairingApprovalScope("mlps_invalid!", pairingId, "ABCD-2345"), false);
assert.deepEqual(
  getExtensionPairingMutationTokenInput(userId, approvalScope),
  {
    context: approvalScope,
    userId,
  },
);
assert.equal(EXTENSION_PAIRING_TTL_SECONDS, 600);
assert.equal(EXTENSION_PAIRING_POLL_SECONDS, 3);

console.log("Checked one-time browser extension pairing credentials.");
