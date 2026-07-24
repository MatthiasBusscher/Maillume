import assert from "node:assert/strict";

import { summarizeEmailAuthentication } from "./email-authentication";

function main() {
  const provider = summarizeEmailAuthentication({
    rawHeaders: [
      "Authentication-Results: mx.example.test;",
      "       dkim=pass header.i=@bank.test;",
      "       spf=pass (example.test: domain of alerts@bank.test designates 203.0.113.10)",
      "       smtp.mailfrom=alerts@bank.test;",
      "       dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=bank.test",
      "From: Bank Alerts <alerts@bank.test>",
    ].join("\n"),
    senderEmail: "alerts@bank.test",
  });
  assert.deepEqual(provider, { spf: "pass", dkim: "pass", dmarc: "pass" });

  // A folded header must be unfolded before the verdicts are read.
  const folded = summarizeEmailAuthentication({
    rawHeaders: "Authentication-Results: mx.example.test;\r\n\tdmarc=fail header.from=bank.test",
    senderEmail: "alerts@bank.test",
  });
  assert.equal(folded?.dmarc, "fail");

  // The topmost header is written by the final receiving MTA and wins.
  const multipleHops = summarizeEmailAuthentication({
    rawHeaders: [
      "Authentication-Results: mx.receiver.test; spf=fail smtp.mailfrom=alerts@bank.test",
      "Authentication-Results: mx.relay.test; spf=pass smtp.mailfrom=alerts@bank.test",
    ].join("\n"),
    senderEmail: "alerts@bank.test",
  });
  assert.equal(multipleHops?.spf, "fail");

  const arcOnly = summarizeEmailAuthentication({
    rawHeaders: "ARC-Authentication-Results: i=1; mx.example.test; dkim=fail header.i=@bank.test",
    senderEmail: "alerts@bank.test",
  });
  assert.equal(arcOnly?.dkim, "fail");

  // One passing DKIM signature among several is a pass.
  const multipleSignatures = summarizeEmailAuthentication({
    rawHeaders: "Authentication-Results: mx.example.test; dkim=fail header.i=@list.test; dkim=pass header.i=@bank.test",
    senderEmail: "alerts@bank.test",
  });
  assert.equal(multipleSignatures?.dkim, "pass");

  const receivedSpfFallback = summarizeEmailAuthentication({
    rawHeaders: "Received-SPF: SoftFail (example.test: domain of transitioning alerts@bank.test)",
    senderEmail: "alerts@bank.test",
  });
  assert.equal(receivedSpfFallback?.spf, "softfail");

  // Authentication-Results outranks the legacy Received-SPF header.
  const spfPrecedence = summarizeEmailAuthentication({
    rawHeaders: [
      "Authentication-Results: mx.example.test; spf=fail smtp.mailfrom=alerts@bank.test",
      "Received-SPF: Pass (example.test: domain of alerts@bank.test)",
    ].join("\n"),
    senderEmail: "alerts@bank.test",
  });
  assert.equal(spfPrecedence?.spf, "fail");

  const unknownVerdict = summarizeEmailAuthentication({
    rawHeaders: "Authentication-Results: mx.example.test; dmarc=bogus header.from=bank.test",
    senderEmail: "alerts@bank.test",
  });
  assert.equal(unknownVerdict, undefined);

  assert.equal(
    summarizeEmailAuthentication({
      rawHeaders: "From: Bank Alerts <alerts@bank.test>\nSubject: Synthetic notice",
      senderEmail: "alerts@bank.test",
    }),
    undefined,
    "a message without authentication headers reports nothing rather than a silent pass",
  );

  const replyElsewhere = summarizeEmailAuthentication({
    rawHeaders: "From: Director <director@company.test>",
    senderEmail: "director@company.test",
    replyTo: "director.private@secure-mail.test",
  });
  assert.equal(replyElsewhere?.replyToMismatch, true);

  // A reply address on a subdomain of the sender is the same registrable domain.
  const replySubdomain = summarizeEmailAuthentication({
    rawHeaders: "From: Support <support@company.test>",
    senderEmail: "support@company.test",
    replyTo: "desk@mail.company.test",
  });
  assert.equal(replySubdomain?.replyToMismatch, false);

  const bounceDomain = summarizeEmailAuthentication({
    rawHeaders: "From: News <news@company.test>",
    senderEmail: "news@company.test",
    returnPath: "bounce-123@bounces.sender-platform.test",
  });
  assert.equal(bounceDomain?.returnPathMismatch, true);

  // A custom bounce subdomain collapses to the sender's own registrable domain.
  const customBounce = summarizeEmailAuthentication({
    rawHeaders: "From: News <news@company.test>",
    senderEmail: "news@company.test",
    returnPath: "bounce-123@bounces.mail.company.test",
  });
  assert.equal(customBounce?.returnPathMismatch, false);

  // Comparisons need a sender to compare against.
  const noSender = summarizeEmailAuthentication({
    rawHeaders: "Reply-To: someone@elsewhere.test",
    replyTo: "someone@elsewhere.test",
  });
  assert.equal(noSender, undefined);

  const caseInsensitive = summarizeEmailAuthentication({
    rawHeaders: "AUTHENTICATION-RESULTS: mx.example.test; DMARC=Fail header.from=bank.test",
    senderEmail: "alerts@bank.test",
  });
  assert.equal(caseInsensitive?.dmarc, "fail");

  // A pathological header block must not be scanned without bound.
  const flooded = summarizeEmailAuthentication({
    rawHeaders: Array.from(
      { length: 500 },
      (_, index) => `Authentication-Results: mx${index}.example.test; spf=none`,
    ).join("\n"),
    senderEmail: "alerts@bank.test",
  });
  assert.equal(flooded?.spf, "none");

  console.log("Email authentication header summary checks passed.");
}

main();
