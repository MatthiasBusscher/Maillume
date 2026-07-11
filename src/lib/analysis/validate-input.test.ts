import assert from "node:assert/strict";

import { validateAnalyzeRequest } from "./validate-input";

const dutch = validateAnalyzeRequest({
  source: "paste",
  locale: "nl",
  body: "Synthetic message",
});
assert.equal(dutch.ok, true);
if (dutch.ok) assert.equal(dutch.input.locale, "nl");

const fallback = validateAnalyzeRequest({ body: "Synthetic message" });
assert.equal(fallback.ok, true);
if (fallback.ok) assert.equal(fallback.input.locale, "en");

const unsupportedLocale = validateAnalyzeRequest({ body: "Synthetic message", locale: "de" });
assert.equal(unsupportedLocale.ok, false);

const unknownField = validateAnalyzeRequest({ body: "Synthetic message", rawEmail: "must not be accepted" });
assert.equal(unknownField.ok, false);
if (!unknownField.ok) assert.equal(unknownField.error, "Request contains unsupported fields.");

console.log("Checked hosted analysis request validation.");
