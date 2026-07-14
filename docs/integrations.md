# Integrations and Hosted API

Maillume integrations share one rule: message content is accessed and sent only after a visible user action. No integration performs background mailbox scanning.

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

The response uses the same `AnalyzeResponse` envelope as the scanner and includes `X-RateLimit-Limit` and `X-RateLimit-Remaining`. Beta keys receive 100 calls per UTC calendar month. A `429` response indicates monthly quota, per-client abuse limit, or temporary analysis capacity.

The machine-readable contract is published at `/openapi.json`.

Stored API metadata is limited to key owner, name, prefix, hash, quota, creation/revocation/last-use timestamps, UTC month, and aggregate request count. Bodies, subjects, senders, links, results, prompts, IP addresses, and message IDs are excluded. Aggregate monthly usage rows are purged after 13 months.

## Browser Extension

`integrations/browser-extension` is an unpacked Manifest V3 extension for Chrome 114+.

- Temporary `activeTab` and `scripting` access captures the current text selection.
- There are no persistent Gmail or Outlook host permissions and no content script.
- Optional host access is requested only for the deployment chosen by the user.
- Endpoint and API key are stored locally; selected text and results are not.

## Gmail Add-on

`integrations/gmail-addon` is a Google Workspace add-on source project.

- Scope: `gmail.addons.current.message.action`.
- The contextual card does not read the message.
- Pressing **Analyze this message** activates temporary access, reads that message, and calls the fixed official endpoint.
- Self-hosters publish their own add-on after changing the endpoint allowlist.

## Outlook Add-in

`public/outlook-manifest.xml` installs the task pane at `/integrations/outlook`.

- Permission: `ReadItem`.
- The task pane waits for **Analyze this message** before calling `body.getAsync`.
- API key is stored in task-pane local storage and can be removed there; message content and result are not persisted.
- The production add-in uses `https://app.maillume.io` as its fixed destination.

Provider marketplace publication requires final icons, operator identity, privacy-policy URLs, test accounts, validation, and review. Those are release operations and must be completed before claiming store availability.
