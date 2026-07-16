import assert from "node:assert/strict";

import { analyzeEmailHeuristic, collectHeuristicEvidence } from "../analysis/heuristic-analysis";
import { MAX_SCAN_BODY_LENGTH } from "../types";
import {
  MAX_EML_ATTACHMENT_NAMES,
  MAX_EML_LINKS,
  MAX_EML_MULTIPART_SECTIONS,
  parseEml,
} from "./parse-eml";

function main() {
  const parsed = parseEml(`From: Security Team <security@example.test>
Subject: Synthetic account warning
Content-Type: text/plain; charset=UTF-8

Your mailbox access expires today. Verify your password immediately.

Open https://login.example.test/verify to prevent suspension.

This is synthetic test data.`);

  assert.equal(parsed.subject, "Synthetic account warning");
  assert.equal(parsed.senderEmail, "security@example.test");
  assert.match(parsed.body, /Your mailbox access expires today/);
  assert.match(parsed.body, /This is synthetic test data/);
  assert.deepEqual(parsed.links, ["https://login.example.test/verify"]);

  const hiddenLink = parseEml(`From: PayPal notice <billing@paypal-review.invalid>
Subject: Account review
Content-Type: text/html; charset=UTF-8

<p>Verify your account.</p>
<a href="https://paypal-review.invalid/session">https://www.paypal.com/security</a>`);
  assert.deepEqual(hiddenLink.linkPairs, [{
    displayedUrl: "https://www.paypal.com/security",
    destinationUrl: "https://paypal-review.invalid/session",
  }]);
  const hiddenLinkResult = analyzeEmailHeuristic({
    subject: hiddenLink.subject,
    senderEmail: hiddenLink.senderEmail,
    body: hiddenLink.body,
    links: hiddenLink.links,
    linkPairs: hiddenLink.linkPairs,
  });
  assert.ok(hiddenLinkResult.score_factors.some((factor) => factor.id === "link_mismatch"));

  const parityEml = parseEml(`From: Synthetic alerts <alerts@notice.example>
Subject: Synthetic account review
Content-Type: text/html; charset=UTF-8

<p>Verify your password immediately before midnight.</p>
<a href="https://bit.ly/synthetic-review">https://portal.example.test/security</a>`);
  assert.equal(
    parityEml.body,
    "Verify your password immediately before midnight.\nhttps://portal.example.test/security",
  );
  const emlResult = analyzeEmailHeuristic({
    subject: parityEml.subject,
    senderEmail: parityEml.senderEmail,
    body: parityEml.body,
    links: parityEml.links,
    linkPairs: parityEml.linkPairs,
  });
  const chromeCurrentMessageResult = analyzeEmailHeuristic({
    subject: "Synthetic account review",
    senderEmail: "alerts@notice.example",
    body: "Verify your password immediately before midnight.\nhttps://portal.example.test/security",
    links: ["https://bit.ly/synthetic-review"],
    linkPairs: [{
      displayedUrl: "https://portal.example.test/security",
      destinationUrl: "https://bit.ly/synthetic-review",
    }],
  });
  assert.deepEqual(emlResult, chromeCurrentMessageResult);
  assert.ok(collectHeuristicEvidence({
    subject: parityEml.subject,
    senderEmail: parityEml.senderEmail,
    body: parityEml.body,
    links: parityEml.links,
    linkPairs: parityEml.linkPairs,
  }).evidence.includes("short_url"));
  assert.ok(emlResult.score_factors.some((factor) => factor.id === "link_mismatch"));

  const oversizedBody = parseEml(`Content-Type: text/plain

${"x".repeat(MAX_SCAN_BODY_LENGTH + 1_000)}`);
  assert.equal(oversizedBody.body.length, MAX_SCAN_BODY_LENGTH);

  const attachmentParts = Array.from(
    { length: MAX_EML_MULTIPART_SECTIONS + 5 },
    (_, index) => `--cap\nContent-Type: text/plain\nContent-Disposition: attachment; filename=file-${index}.txt\n\nignored`,
  ).join("\n");
  const boundedMultipart = parseEml(`Content-Type: multipart/mixed; boundary=cap

${attachmentParts}
--cap--`);
  assert.equal(boundedMultipart.attachmentNames.length, MAX_EML_ATTACHMENT_NAMES);

  const manyLinks = parseEml(`Content-Type: text/plain

${Array.from({ length: MAX_EML_LINKS + 10 }, (_, index) => `https://example-${index}.test/path`).join(" ")}`);
  assert.equal(manyLinks.links.length, MAX_EML_LINKS);

  console.log("Checked .eml parsing regressions.");
}

main();
