import assert from "node:assert/strict";

import {
  findEvidenceCandidates,
  hasActionableMatch,
  hasCooccurringContext,
  segmentMessage,
} from "./context";

const content = "Never approve an unexpected MFA request. Approve this MFA request now!\nReport anything unusual.";
const segments = segmentMessage(content);
assert.equal(segments.length, 3);
assert.deepEqual(
  segments.map((segment) => content.slice(segment.start, segment.end)),
  segments.map((segment) => segment.text),
);

const candidates = findEvidenceCandidates(
  content,
  [/approve.{0,16}mfa request/i],
  { suppressions: [/never approve/i] },
);
assert.equal(candidates.length, 1);
assert.match(candidates[0]?.segment.text ?? "", /^Approve this MFA request/);
assert.equal(
  content.slice(candidates[0]?.matchStart, candidates[0]?.matchEnd),
  candidates[0]?.matchedText,
);

assert.equal(
  hasActionableMatch(
    "You requested this password reset, so no action is needed.",
    [/password reset/i],
    [/you requested.{0,24}password reset|password reset.{0,40}no action/i],
  ),
  false,
);
assert.equal(
  hasActionableMatch(
    "Reset your password using the attached form.",
    [/reset your password/i],
    [/you requested/i],
  ),
  true,
);

assert.equal(
  hasCooccurringContext(
    "The parcel could not be delivered. Pay €2.10 today to prevent its return.",
    [
      [/(?:parcel|package).{0,40}(?:not|could not).{0,20}delivered/i],
      [/(?:pay|€|\$)/i],
      [/(?:today|prevent|return)/i],
    ],
  ),
  true,
);
assert.equal(
  hasCooccurringContext(
    "Your order was delivered. No payment is required.",
    [
      [/(?:parcel|package|order).{0,40}delivered/i],
      [/(?:pay|payment)/i],
    ],
    { suppressions: [/no payment is required/i] },
  ),
  false,
);

const boundedSegments = segmentMessage(`${"x.\n".repeat(400)}final`);
assert.ok(boundedSegments.length <= 256);
assert.match(boundedSegments.at(-1)?.text ?? "", /final$/);

console.log("Context segmentation and scoped suppression checks passed.");
