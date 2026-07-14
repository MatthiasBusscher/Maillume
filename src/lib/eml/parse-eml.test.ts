import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "../analysis/heuristic-analysis";
import { parseEml } from "./parse-eml";

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
    linkPairs: hiddenLink.linkPairs,
  });
  assert.ok(hiddenLinkResult.score_factors.some((factor) => factor.id === "link_mismatch"));

  console.log("Checked .eml parsing regressions.");
}

main();
