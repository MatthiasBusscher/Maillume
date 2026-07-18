import assert from "node:assert/strict";

import { analyzeEmailHeuristic, collectHeuristicEvidence } from "../analysis/heuristic-analysis";
import { MAX_SCAN_BODY_LENGTH } from "../types";
import {
  MAX_EML_ATTACHMENT_NAMES,
  MAX_EML_HEADER_CHARACTERS,
  MAX_EML_LINKS,
  MAX_EML_MIME_DEPTH,
  MAX_EML_MULTIPART_SECTIONS,
  MAX_EML_PART_BODY_CHARACTERS,
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

  const nestedMultipart = parseEml(`From: Nested notices <alerts@example.test>
Subject: =?UTF-8?B?VVRGLTggc3ViamVjdCDigqw=?=
Content-Type: multipart/mixed; boundary="outer"

--outer
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: base64

VVRGLTggYmFzZTY0OiBjYWbDqSDigqw=
--outer
Content-Type: multipart/alternative; boundary=inner

--inner
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

UTF-8 quoted-printable: caf=C3=A9 =E2=82=AC
--inner
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: base64

PGEgaHJlZj0iaHR0cHM6Ly9uZXN0ZWQtZGVzdGluYXRpb24uZXhhbXBsZS50ZXN0L2xvZ2luIj5odHRwczovL25lc3RlZC1kaXNwbGF5LmV4YW1wbGUudGVzdC9zZWN1cml0eTwvYT4=
--inner--
--outer
Content-Type: application/pdf; name*=utf-8''rapport-%E2%82%AC-final.pdf
Content-Disposition: attachment; filename="=?UTF-8?B?cmFwcG9ydC3igqwtZmluYWwucGRm?="
Content-Transfer-Encoding: base64

JVBERi0xLjQ=
--outer--`);
  assert.equal(nestedMultipart.subject, "UTF-8 subject €");
  assert.equal(nestedMultipart.senderEmail, "alerts@example.test");
  assert.match(nestedMultipart.body, /UTF-8 base64: café €/);
  assert.match(nestedMultipart.body, /UTF-8 quoted-printable: café €/);
  assert.match(nestedMultipart.body, /https:\/\/nested-display\.example\.test\/security/);
  assert.deepEqual(nestedMultipart.attachmentNames, ["rapport-€-final.pdf"]);
  assert.deepEqual(nestedMultipart.linkPairs, [{
    displayedUrl: "https://nested-display.example.test/security",
    destinationUrl: "https://nested-destination.example.test/login",
  }]);
  assert.ok(nestedMultipart.links.includes("https://nested-display.example.test/security"));
  assert.ok(nestedMultipart.links.includes("https://nested-destination.example.test/login"));

  const windows1252 = parseEml(`Subject: =?windows-1252?Q?Alerte:_caf=E9_et_=80?=
Content-Type: text/plain; charset=windows-1252
Content-Transfer-Encoding: quoted-printable

Windows-1252: caf=E9 and euro =80`);
  assert.equal(windows1252.subject, "Alerte: café et €");
  assert.equal(windows1252.body, "Windows-1252: café and euro €");

  const rawWindows1252 = parseEml(`Content-Type: text/plain; charset=windows-1252

Raw Windows-1252: caf${String.fromCharCode(0xe9)} and euro ${String.fromCharCode(0x80)}`);
  assert.equal(rawWindows1252.body, "Raw Windows-1252: café and euro €");

  const bareDisplayedDomain = parseEml(`Content-Type: text/html; charset=UTF-8

<a href="https://credential-capture.example/login">paypal.com/security</a>`);
  assert.deepEqual(bareDisplayedDomain.linkPairs, [{
    displayedUrl: "https://paypal.com/security",
    destinationUrl: "https://credential-capture.example/login",
  }]);

  const iso88591 = parseEml(`Subject: =?ISO-8859-1?Q?R=E9sum=E9?=
Content-Type: text/plain; charset=ISO-8859-1
Content-Transfer-Encoding: quoted-printable

ISO-8859-1: caf=E9`);
  assert.equal(iso88591.subject, "Résumé");
  assert.equal(iso88591.body, "ISO-8859-1: café");

  const malformed = parseEml(`Content-Type: multipart/mixed; boundary=broken

--broken
Content-Type: text/plain
Content-Transfer-Encoding: base64

not valid base64 !!!`);
  assert.doesNotThrow(() => parseEml("not a valid message"));
  assert.equal(malformed.body, "not valid base64 !!!");

  function nestedDepth(depth: number, level = 0): string {
    if (level === depth) {
      return "Content-Type: text/plain\n\ncontent beyond depth limit";
    }

    const boundary = `level-${level}`;
    return `Content-Type: multipart/mixed; boundary=${boundary}\n\n--${boundary}\n${nestedDepth(
      depth,
      level + 1,
    )}\n--${boundary}--`;
  }

  const depthLimited = parseEml(nestedDepth(MAX_EML_MIME_DEPTH + 2));
  assert.doesNotMatch(depthLimited.body, /content beyond depth limit/);

  const oversizedBody = parseEml(`Content-Type: text/plain

${"x".repeat(MAX_SCAN_BODY_LENGTH + 1_000)}`);
  assert.equal(oversizedBody.body.length, MAX_SCAN_BODY_LENGTH);

  const headerPastLimit = parseEml(`${"X-Fill: x\n".repeat(MAX_EML_HEADER_CHARACTERS)}Subject: outside header cap

body`);
  assert.equal(headerPastLimit.subject, undefined);

  const linkPastPartLimit = parseEml(`Content-Type: text/plain

${"x".repeat(MAX_EML_PART_BODY_CHARACTERS)} https://outside-part-limit.example.test/`);
  assert.equal(linkPastPartLimit.links.includes("https://outside-part-limit.example.test/"), false);

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
