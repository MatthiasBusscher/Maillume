import assert from "node:assert/strict";

import { extractScreenshotEmailFields } from "./extract-email-fields";

assert.deepEqual(
  extractScreenshotEmailFields(`Subject: Action required: verify your account
From: Security Team <alerts@notice.example>

Your account will be suspended today.`),
  {
    subject: "Action required: verify your account",
    senderEmail: "alerts@notice.example",
    body: "Your account will be suspended today.",
  },
);

assert.deepEqual(
  extractScreenshotEmailFields(`Onderwerp
Nieuwe betaalgegevens
Afzender
Facturatie <billing@invoice.example>

Gebruik vanaf vandaag ons nieuwe rekeningnummer.`),
  {
    subject: "Nieuwe betaalgegevens",
    senderEmail: "billing@invoice.example",
    body: "Gebruik vanaf vandaag ons nieuwe rekeningnummer.",
  },
);

assert.deepEqual(
  extractScreenshotEmailFields(`From: Customer service without an address

This unverified header stays visible in the message body.`),
  {
    body: "From: Customer service without an address\n\nThis unverified header stays visible in the message body.",
  },
);

const lateHeader = `${Array.from({ length: 31 }, (_, index) => `Body line ${index + 1}`).join("\n")}\nSubject: not metadata`;
assert.equal(extractScreenshotEmailFields(lateHeader).body, lateHeader);

console.log("Checked screenshot OCR subject and sender extraction.");
