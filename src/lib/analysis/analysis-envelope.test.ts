import assert from "node:assert/strict";

import { ANALYSIS_ENVELOPE_VERSION } from "../types";
import { createAnalysisEnvelope, ensureAnalysisEnvelope } from "./analysis-envelope";

const envelope = createAnalysisEnvelope({
  locale: "nl",
  subject: "  Laatste\u00a0waarschuwing\0  ",
  senderEmail: " notice@example.test ",
  body: "Regel 1\r\n\r\n\r\nRegel   2 https://EXAMPLE.test/path#tracking",
  links: ["https://example.test/path#tracking", "https://example.test/path"],
  linkPairs: [
    {
      displayedUrl: "https://example.test/security#visible",
      destinationUrl: "https://login.example.test/session#hidden",
    },
  ],
}, "eml");

assert.equal(envelope.version, ANALYSIS_ENVELOPE_VERSION);
assert.equal(envelope.subject, "Laatste waarschuwing");
assert.equal(envelope.senderEmail, "notice@example.test");
assert.equal(envelope.body, "Regel 1\n\nRegel 2 https://EXAMPLE.test/path#tracking");
assert.deepEqual(envelope.links, [
  "https://example.test/path",
  "https://login.example.test/session",
]);
assert.deepEqual(envelope.linkPairs, [
  {
    displayedUrl: "https://example.test/security",
    destinationUrl: "https://login.example.test/session",
  },
]);
assert.deepEqual(envelope.availability, {
  subject: true,
  sender: true,
  linkDestinations: true,
  authenticationHeaders: false,
  textExtraction: "parsed",
});
assert.equal(ensureAnalysisEnvelope(envelope), envelope);

const screenshot = createAnalysisEnvelope({ body: "Ordinary project update." }, "screenshot");
assert.equal(screenshot.availability.sender, false);
assert.equal(screenshot.availability.linkDestinations, false);
assert.equal(screenshot.availability.textExtraction, "ocr");

const chrome = createAnalysisEnvelope({ body: "Captured project update." }, "chrome");
assert.equal(chrome.source, "chrome");
assert.equal(chrome.availability.textExtraction, "direct");
assert.equal(chrome.availability.linkDestinations, true);

console.log("Checked canonical analysis-envelope normalization and evidence availability.");
