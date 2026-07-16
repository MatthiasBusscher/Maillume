import assert from "node:assert/strict";

import {
  createAccountDeletionToken,
  verifyAccountDeletionToken,
} from "./account-deletion-token";

const input = {
  lastSignInAt: "2026-07-16T12:00:00.000Z",
  userId: "9d455f80-d850-40c4-9e05-b8885ab661f7",
};
const secret = "server-only-test-secret";
const token = createAccountDeletionToken(input, secret);

assert.match(token, /^[A-Za-z0-9_-]{43}$/);
assert.equal(verifyAccountDeletionToken(token, input, secret), true);
assert.equal(verifyAccountDeletionToken(null, input, secret), false);
assert.equal(verifyAccountDeletionToken("invalid", input, secret), false);
assert.equal(
  verifyAccountDeletionToken(token, { ...input, userId: "different-user" }, secret),
  false,
);
assert.equal(
  verifyAccountDeletionToken(
    token,
    { ...input, lastSignInAt: "2026-07-16T12:01:00.000Z" },
    secret,
  ),
  false,
);
assert.equal(verifyAccountDeletionToken(token, input, "different-secret"), false);

console.log("Checked signed account-deletion tokens.");
