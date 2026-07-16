import assert from "node:assert/strict";

import { getEmailAuthFailureMessage } from "./email-auth-error";

const labels = {
  invalidCredentials: "invalid credentials",
  magicLinkFailed: "magic link failed",
  resetFailed: "reset failed",
  signUpFailed: "sign-up failed",
};

assert.equal(getEmailAuthFailureMessage("sign-in", labels), "invalid credentials");
assert.equal(getEmailAuthFailureMessage("sign-up", labels), "sign-up failed");
assert.equal(getEmailAuthFailureMessage("forgot", labels), "reset failed");
assert.equal(getEmailAuthFailureMessage("magic-link", labels), "magic link failed");

console.log("Checked email authentication failure messages.");
