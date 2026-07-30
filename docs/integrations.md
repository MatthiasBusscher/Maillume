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

The response uses the same `AnalyzeResponse` envelope as the scanner and includes `X-RateLimit-Limit` and `X-RateLimit-Remaining`. During public beta, an account receives 25 calls per UTC calendar month shared across all browser connections and developer keys. An account can have up to five of each credential type. This allowance is for the hosted heuristic integration API; it is not an AI allowance. A `429` response indicates monthly quota, per-client abuse limit, or temporary analysis capacity.

The machine-readable contract is published at `/openapi.json`.

Stored API metadata is limited to key owner, name, prefix, hash, quota, creation/revocation/last-use timestamps, UTC month, and aggregate request count. Bodies, subjects, senders, links, results, prompts, IP addresses, and message IDs are excluded. Aggregate monthly usage rows are purged after 13 months.

## Browser Extension

The official Manifest V3 extension for Chrome 116+ is available in the [Chrome Web Store](https://chromewebstore.google.com/detail/maillume/bjiiailjalkfjimkjdikoockjlnjolle). Its source lives in `integrations/browser-extension`.

- A toolbar click grants temporary `activeTab` and `scripting` access. Maillume first captures a text selection and otherwise captures the visibly open message in a supported webmail client when the page is accessible.
- There are no persistent Gmail or Outlook host permissions and no content script.
- Optional host access is requested only for the deployment chosen by the user.
- Extension `0.4.0` negotiates compatibility through `/api/v1/capabilities` and sends its official extension ID, version, and accepted analysis versions with hosted requests. The server continues accepting `0.3.9` during the Store rollout and returns `426` for a known incompatible client.
- **Connect this browser** opens a localized account approval page instead of asking the user to copy a secret. Approval requires a signed-in AAL2 session and creates a dedicated browser connection with a one-year hard expiry and a rolling 90-day inactivity deadline.
- The extension retains a random installation identifier in local Chrome storage. The server stores only its hash, allowing a reconnect from that Chrome profile to replace its previous credential atomically rather than consume another browser slot.
- The ten-minute pairing record stores hashed device and browser verifiers, bounded requested metadata, state, owner after approval, and timestamps. It never stores account credentials, sessions, credential plaintext, scan content, or results, and a cleanup job purges expired rows.
- The endpoint and browser credential are stored in trusted extension-local storage across restarts and updates. Captured text crosses to the tab-specific panel through a one-time in-memory handoff, and message content and results are never written to extension storage.
- Chrome requests identify their canonical source as `chrome`, preserving the difference between DOM-derived link metadata and manually pasted text without changing the server-derived scoring rules.
- Manual key entry is hidden under **Advanced manual setup** for unpacked development builds, self-hosted troubleshooting, recovery, and older deployments. Ordinary Store users use the account connection flow. Automatic pairing remains restricted to the official Store extension ID.

Chrome Web Store validation and review completed on 23 July 2026. The published listing is the supported installation path; the repository remains the source of truth for permissions, privacy boundaries, and release validation.
