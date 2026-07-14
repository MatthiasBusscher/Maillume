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

const linkPairs = validateAnalyzeRequest({
  body: "Synthetic message",
  linkPairs: [{
    displayedUrl: "https://service.example/account",
    destinationUrl: "https://service-review.invalid/account",
  }],
});
assert.equal(linkPairs.ok, true);
if (linkPairs.ok) assert.equal(linkPairs.input.linkPairs?.length, 1);

const malformedLinkPairs = validateAnalyzeRequest({
  body: "Synthetic message",
  linkPairs: [{ displayedUrl: "javascript:alert(1)", destinationUrl: "https://example.test" }],
});
assert.equal(malformedLinkPairs.ok, false);

console.log("Checked hosted analysis request validation.");
