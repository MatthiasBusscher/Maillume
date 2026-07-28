# Evidence coverage in `analysis-v9`

Maillume reports which message evidence was available for every assessment. This is an
explanation of the assessment boundary, not a confidence score and not a statement that an
email is safe.

## Result contract

Every `analysis-v9` result contains:

```json
{
  "evidence_coverage": {
    "subject_available": true,
    "sender_available": true,
    "full_content_available": true,
    "link_destinations_available": true,
    "authentication_results_available": false,
    "attachment_evidence_available": false,
    "extraction_type": "direct"
  }
}
```

`extraction_type` is one of:

- `direct` for pasted text and Chrome captures;
- `ocr` for locally extracted screenshot text;
- `parsed` for a locally parsed `.eml` file.

The remaining fields are booleans derived from the normalized analysis envelope:

- Subject and sender report whether non-empty normalized values were supplied.
- Full content is false for selected or explicitly truncated text, malformed MIME, and OCR.
- Link destinations are available for direct and parsed input. For OCR, they are available
  only when a link or QR destination was actually extracted.
- Authentication results are available only when the receiving provider's summarized SPF,
  DKIM, DMARC, reply-to, or return-path evidence was parsed.
- Attachment evidence is available for parsed `.eml` input or when coarse attachment-risk
  categories were supplied. Maillume does not upload or execute an attachment.

## Classification boundary

Material coverage requires sender evidence, full content, and link-destination evidence.
When any of these is missing, Maillume cannot classify the result as
`likely_legitimate`. A low-risk result with incomplete material evidence is `uncertain`.

Missing evidence never subtracts risk points. Suspicious evidence that is present remains
visible and can still produce medium or high risk. The coverage object therefore describes
limitations separately from the score.

The web scanner and extension show stronger limitation text for OCR and partial/selected
content in both English and Dutch. They also list each coverage field and the extraction
method without using the word “confidence”.

## Validation and compatibility

The web client, extension, OpenAPI contract, and public-deployment verifier validate the
coverage shape. Missing fields, non-boolean availability values, or an unknown extraction
type are rejected instead of being rendered as a partial result.

The extension first introduced coverage support in version `0.3.7`. The current staged
rollout is:

1. Publish extension `0.3.8`. It accepts `analysis-v6` through `analysis-v10`, with
   coverage required for v9 and v10.
2. Deploy the `analysis-v10` server after the compatible extension is available.
3. Extension `0.3.7` rejects the unknown v10 version safely and asks the user to update.
   It does not silently render an incompatible result.

This compatibility rule is intentionally version-specific. Coverage is optional only for
the older v6–v8 contracts and required from v9 onward.

## Privacy

Coverage is computed from facts already present in the in-memory analysis envelope. It
does not add message retention, network lookups, mailbox access, browsing history, or raw
message data to feedback. Ordinary scans remain zero-retention.

## Verification

Regression coverage includes:

- direct paste, Chrome capture, OCR, parsed `.eml`, QR/link, and malformed-MIME inputs;
- selected or truncated content;
- English and Dutch result copy;
- web and extension rejection of malformed coverage;
- OpenAPI and production-deployment contract checks;
- the rule that incomplete material evidence cannot produce `likely_legitimate`.
