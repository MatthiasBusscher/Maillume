import assert from "node:assert/strict";

import {
  ACCOUNT_LOCALE_METADATA_KEY,
  getAccountLocale,
  getAccountLocaleMetadata,
} from "./account-locale";

assert.equal(ACCOUNT_LOCALE_METADATA_KEY, "locale");
assert.equal(getAccountLocale({ locale: "nl" }), "nl");
assert.equal(getAccountLocale({ locale: "en" }), "en");
assert.equal(getAccountLocale({ locale: "de" }), null);
assert.equal(getAccountLocale({ locale: ["nl"] }), null);
assert.equal(getAccountLocale(null), null);
assert.deepEqual(getAccountLocaleMetadata("nl"), { locale: "nl" });

console.log("Checked account locale metadata.");
