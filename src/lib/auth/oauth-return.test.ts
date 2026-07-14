import assert from "node:assert/strict";

import {
  getOAuthFailureUrl,
  hasOAuthErrorReturn,
  OAUTH_PROVIDER_FAILURE_CODE,
} from "./oauth-return";

for (const query of [
  "error=access_denied",
  "error_code=provider_disabled",
  "error_description=sensitive-provider-detail",
]) {
  assert.equal(hasOAuthErrorReturn(new URL(`https://app.maillume.io/?${query}`)), true);
}

assert.equal(
  hasOAuthErrorReturn(new URL("https://app.maillume.io/?code=synthetic-code")),
  false,
);

const failureUrl = getOAuthFailureUrl("https://app.maillume.io");
assert.equal(failureUrl.toString(), `https://app.maillume.io/auth/sign-in?error=${OAUTH_PROVIDER_FAILURE_CODE}`);
assert.equal(failureUrl.searchParams.has("error_description"), false);
assert.equal(failureUrl.searchParams.has("state"), false);
assert.equal(failureUrl.searchParams.has("code"), false);

console.log("Checked sanitized OAuth failure redirects.");
