import assert from "node:assert/strict";

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

  console.log("Checked .eml parsing regressions.");
}

main();
