import assert from "node:assert/strict";

import {
  ACCOUNT_MUTATION_TOKEN_TTL_MS,
  createAccountMutationToken,
  isAuthorizedAccountMutation,
  isAccountMutationTokenCandidate,
  verifyAccountMutationToken,
} from "./account-mutation-token";
import { isStrictSameOriginMutation } from "./account-request";

const input = {
  lastSignInAt: "2026-07-18T08:00:00.000Z",
  userId: "9d455f80-d850-40c4-9e05-b8885ab661f7",
};
const secret = "server-only-test-secret";
const now = Date.parse("2026-07-18T08:00:00.000Z");
const languageToken = createAccountMutationToken("language", input, secret, now);
const redirectedMarketingRequest = new Request("https://app.maillume.io/account/language", {
  headers: {
    Origin: "https://maillume.io",
    "Sec-Fetch-Site": "same-site",
  },
  method: "POST",
});
const redirectedRequestIsSameOrigin = isStrictSameOriginMutation(
  redirectedMarketingRequest,
  "https://app.maillume.io",
);

assert.match(languageToken, /^[a-z0-9]{6,10}\.[A-Za-z0-9_-]{43}$/);
assert.equal(isAccountMutationTokenCandidate(languageToken), true);
assert.equal(isAccountMutationTokenCandidate("invalid"), false);
assert.equal(isAccountMutationTokenCandidate(null), false);
assert.equal(redirectedRequestIsSameOrigin, false);
assert.equal(verifyAccountMutationToken("language", languageToken, input, secret, now), true);
assert.equal(verifyAccountMutationToken("sign-out", languageToken, input, secret, now), false);
assert.equal(verifyAccountMutationToken("delete", languageToken, input, secret, now), false);
assert.equal(verifyAccountMutationToken("language", null, input, secret, now), false);
assert.equal(verifyAccountMutationToken("language", "invalid", input, secret, now), false);
assert.equal(
  verifyAccountMutationToken(
    "language",
    languageToken,
    input,
    secret,
    now + ACCOUNT_MUTATION_TOKEN_TTL_MS + 1,
  ),
  false,
);
assert.equal(
  verifyAccountMutationToken(
    "language",
    languageToken,
    { ...input, userId: "other-user" },
    secret,
    now,
  ),
  false,
);
assert.equal(
  verifyAccountMutationToken(
    "language",
    languageToken,
    { ...input, lastSignInAt: "2026-07-18T08:01:00.000Z" },
    secret,
    now,
  ),
  false,
);
assert.equal(isAuthorizedAccountMutation({
  action: "language",
  input,
  now,
  sameOrigin: redirectedRequestIsSameOrigin,
  secret,
  token: languageToken,
}), true, "a signed token authorizes the redirected cross-origin request");
assert.equal(isAuthorizedAccountMutation({
  action: "sign-out",
  input,
  now,
  sameOrigin: false,
  secret,
  token: languageToken,
}), false, "a language token cannot authorize sign-out");
assert.equal(isAuthorizedAccountMutation({
  action: "language",
  input: { ...input, lastSignInAt: "2026-07-18T08:01:00.000Z" },
  now,
  sameOrigin: false,
  secret,
  token: languageToken,
}), false, "a token cannot cross authenticated sessions");
assert.equal(isAuthorizedAccountMutation({
  action: "language",
  input,
  sameOrigin: true,
  token: null,
}), true, "same-origin account forms remain supported without a token");

console.log("Checked action-bound account mutation tokens.");
