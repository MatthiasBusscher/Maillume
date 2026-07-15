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

The response uses the same `AnalyzeResponse` envelope as the scanner and includes `X-RateLimit-Limit` and `X-RateLimit-Remaining`. During private beta, an account receives 100 calls per UTC calendar month shared across at most five active keys. This allowance is for the hosted heuristic integration API; it is not an AI allowance and it does not mean 100 keys. A `429` response indicates monthly quota, per-client abuse limit, or temporary analysis capacity.

The machine-readable contract is published at `/openapi.json`.

Stored API metadata is limited to key owner, name, prefix, hash, quota, creation/revocation/last-use timestamps, UTC month, and aggregate request count. Bodies, subjects, senders, links, results, prompts, IP addresses, and message IDs are excluded. Aggregate monthly usage rows are purged after 13 months.

## Browser Extension

`integrations/browser-extension` is an unpacked Manifest V3 extension for Chrome 116+.

- A toolbar click grants temporary `activeTab` and `scripting` access. Maillume first captures a text selection and otherwise captures the visibly open Gmail or Outlook message when the page is accessible.
- There are no persistent Gmail or Outlook host permissions and no content script.
- Optional host access is requested only for the deployment chosen by the user.
- The endpoint is stored locally; the API key lives only in Chrome session storage. Captured text crosses to the tab-specific panel through a one-time in-memory handoff and message content and results are never written to extension storage.

## Gmail Add-on

`integrations/gmail-addon` is a Google Workspace add-on source project.

- Scope: `gmail.addons.current.message.action`.
- Locale scope: `script.locale`, used only to show the English or Dutch interface that Gmail selected.
- The contextual card does not read the message.
- Pressing **Analyze this message** activates temporary access, reads that message, and calls the fixed official endpoint.
- The API key is saved in user-scoped Apps Script properties until the user removes/replaces it or Maillume rejects it. No message content or result is saved there.
- Self-hosters publish their own add-on after changing the endpoint allowlist.

## Outlook Add-in

`public/outlook-manifest.xml` installs the task pane at `/integrations/outlook`.

- Permission: `ReadItem`.
- The task pane waits for **Analyze this message** before calling `body.getAsync`.
- API key is stored in task-pane session storage and can be removed there; message content and result are not persisted.
- The production add-in uses `https://app.maillume.io` as its fixed destination.

Provider marketplace publication requires final icons, operator identity, privacy-policy URLs, test accounts, validation, and review. Those are release operations and must be completed before claiming store availability.
