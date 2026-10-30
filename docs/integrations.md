# Integrations and Hosted API

The Chrome extension is Maillume's only planned inbox integration. Message content is accessed and sent only after a visible user action; the extension does not perform background mailbox scanning.

## Hosted API

The versioned analysis API is anonymous. It needs no account or API key and applies the same validation, size limits, and per-client limits as the web scanner.

```http
POST /api/v1/analyze
Content-Type: application/json

{
  "source": "paste",
  "subject": "Optional subject",
  "senderEmail": "sender@example.test",
  "body": "Message text"
}
```

The response uses the same `AnalyzeResponse` envelope as the scanner. Each client may make `ANALYSIS_REQUEST_LIMIT` requests per `ANALYSIS_REQUEST_WINDOW_SECONDS` (default 20 per minute) and `ANALYSIS_DAILY_REQUEST_LIMIT` requests per 24 hours (default 300). A `429` response with `Retry-After` indicates one of those limits or temporary analysis capacity. Production also applies Cloudflare edge limits in front of the application.

Limits are kept in server memory, keyed by the trusted client identifier, and expire with their window. Nothing about the request is stored except the anonymous daily count per input mode in `scan_counters`. An `Authorization` header is ignored.

The machine-readable contract is published at `/openapi.json`.

## Browser Extension

The official Manifest V3 extension for Chrome 116+ is available in the [Chrome Web Store](https://chromewebstore.google.com/detail/maillume/bjiiailjalkfjimkjdikoockjlnjolle). Its source lives in `integrations/browser-extension`.

- A toolbar click grants temporary `activeTab` and `scripting` access. Maillume first captures a text selection and otherwise captures the visibly open message in a supported webmail client when the page is accessible.
- There are no persistent Gmail or Outlook host permissions and no content script.
- Optional host access is requested on the first **Analyze message** click, only for the chosen deployment (`https://app.maillume.io` by default). Choosing another deployment in Settings removes access to the previous one.
- The extension sends its official extension ID, version, and accepted analysis versions with each request. The server returns `426` for a known incompatible client; `/api/v1/capabilities` publishes the compatibility contract.
- Extension `0.5.0` and later need no account. They store only a non-default deployment URL in extension-local storage and remove credentials left by the account-based `0.4.x` releases on start-up.
- Captured text crosses to the tab-specific panel through a one-time in-memory handoff, and message content and results are never written to extension storage.
- Chrome requests identify their canonical source as `chrome`, so extension usage appears as the `chrome` input mode in the anonymous daily scan counts.

Chrome Web Store validation and review completed on 23 July 2026. The published listing is the supported installation path; the repository remains the source of truth for permissions, privacy boundaries, and release validation.
