# Integrations and Hosted API

The Chrome extension is Maillume's only planned inbox integration. Message content is accessed and sent only after a visible user action; the extension does not perform background mailbox scanning.

## Hosted API

Create an API key from `/account`. The plaintext `mlm_...` credential is shown once; Maillume stores only its SHA-256 hash and a short display prefix.

```http
POST /api/v1/analyze
Authorization: Bearer mlm_...
Content-Type: application/json

{
  "source": "paste",
  "subject": "Optional subject",
  "senderEmail": "sender@example.test",
  "body": "Message text"
}
```

The response uses the same `AnalyzeResponse` envelope as the scanner and includes `X-RateLimit-Limit` and `X-RateLimit-Remaining`. During public beta, an account receives 100 calls per UTC calendar month shared across at most five active keys. This allowance is for the hosted heuristic integration API; it is not an AI allowance and it does not mean 100 keys. A `429` response indicates monthly quota, per-client abuse limit, or temporary analysis capacity.

The machine-readable contract is published at `/openapi.json`.

Stored API metadata is limited to key owner, name, prefix, hash, quota, creation/revocation/last-use timestamps, UTC month, and aggregate request count. Bodies, subjects, senders, links, results, prompts, IP addresses, and message IDs are excluded. Aggregate monthly usage rows are purged after 13 months.

## Browser Extension

`integrations/browser-extension` is an unpacked Manifest V3 extension for Chrome 116+.

- A toolbar click grants temporary `activeTab` and `scripting` access. Maillume first captures a text selection and otherwise captures the visibly open message in a supported webmail client when the page is accessible.
- There are no persistent Gmail or Outlook host permissions and no content script.
- Optional host access is requested only for the deployment chosen by the user.
- The endpoint is stored locally; the API key lives only in Chrome session storage. Captured text crosses to the tab-specific panel through a one-time in-memory handoff and message content and results are never written to extension storage.

Chrome Web Store publication requires final icons, operator identity, privacy-policy URLs, test accounts, validation, and review. Those release operations must be completed before claiming store availability.
