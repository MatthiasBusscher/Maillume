# ADR 0001: Bounded Browser `.eml` Parser

- Status: Accepted (temporary)
- Date: 2026-07-18
- Owner: Matthias Busscher, Maillume project maintainer
- Review deadline: 2026-10-18

## Context

`.eml` files are attacker-controlled MIME documents. Maillume only needs a
small, privacy-preserving projection of them: sender, subject, readable
plain/HTML text, HTTP(S) links and displayed-link pairs, plus attachment file
names. The raw file must stay in the browser and must never be sent to the
analysis API, written to disk, or retained after the current assessment.

The current parser in `src/lib/eml/parse-eml.ts` is custom and runs in the
browser. It enforces a 2 MB input limit before parsing, then bounds header
characters, MIME depth, multipart sections, per-part body characters,
attachment names, link count, link length, and final normalized text. It ignores
attachment content and unsupported MIME structures rather than attempting to
render or execute them. Regression tests cover malformed input, nested MIME,
base64 and quoted-printable decoding, supported legacy character sets,
attachment metadata, displayed/destination link mismatches, and each material
resource cap.

`postal-mime` was evaluated as the leading maintained browser-compatible
alternative. At the time of this decision, npm reports version `2.7.5`, modified
on 2026-06-25, with an MIT-0 license and the `postalsys/postal-mime` repository.
It is a credible replacement candidate, but importing it now would add a
security-sensitive dependency and require a wrapper that independently proves
all of Maillume's privacy and resource bounds. No production bug or supported
input requirement currently justifies that migration during public beta.

## Decision

Retain the current bounded custom parser through the public beta. Do not add a
general MIME parser dependency before the review deadline.

This is a temporary decision, not a claim that custom parsing is preferable in
general. The parser's supported scope remains deliberately narrow: textual
content, HTTP(S) link evidence, and attachment metadata. It is not an archive,
signature, malware, calendar, rich-media, nested-message, or attachment-content
parser.

## Required Reassessment

The owner must complete a written reassessment by 2026-10-18, or before either
of these happens, whichever is earlier:

1. A security issue, denial-of-service condition, privacy leak, or incorrect
   result is found in the custom parser.
2. Maillume adds a MIME feature outside the supported scope, such as nested
   `message/rfc822` bodies, calendar messages, attachment-content inspection,
   signature validation, or additional complex charset handling.
3. A maintained browser-compatible parser can meet the comparison criteria
   below with less custom security-critical code.

The reassessment compares the existing parser with `postal-mime` and any other
credible maintained candidate using only synthetic `.eml` fixtures. A replacement
is acceptable only when it:

- keeps the raw file entirely in browser memory;
- preserves Maillume's sender, subject, text, link, displayed-link-pair, and
  attachment-name contract;
- enforces the same or stricter size, depth, section, text, link, and time/
  memory limits in a visible wrapper;
- passes the existing parser regression suite plus malformed and fuzzed
  synthetic fixtures without client crashes or unbounded work;
- adds a pinned dependency with an active maintenance, license, vulnerability,
  and bundle-size review; and
- receives a new ADR decision and security-review update before release.

If the criteria are not met by the deadline, record why, renew the decision for
at most one additional 90-day period, and open a tracked issue with the owner
and new deadline. Do not leave the decision silently expired.

## Consequences

The current implementation stays small and has no parser supply-chain
dependency, but Maillume owns the supported MIME subset and must keep its caps
and fixtures current. The explicit deadline prevents a public-beta convenience
decision from becoming an unreviewed permanent security boundary.
