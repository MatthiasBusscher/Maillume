import assert from "node:assert/strict";

import { areAccountsEnabled } from "./config";

assert.equal(areAccountsEnabled({}), false);
assert.equal(areAccountsEnabled({ ACCOUNTS_ENABLED: "false" }), false);
assert.equal(areAccountsEnabled({ ACCOUNTS_ENABLED: "TRUE" }), false);
assert.equal(areAccountsEnabled({ ACCOUNTS_ENABLED: "true" }), true);

console.log("Checked public-beta account feature gating.");
