# Chrome Extension Publication Packet

This document is the submission source of truth for the Chrome Web Store. Do not submit the Chrome extension until the production URLs, operator identity, privacy contact, and API-key flow are live.

## Shared Listing Copy

**Name:** Maillume

**Short description:** Get an explainable risk assessment for the email you choose, without background mailbox scanning or scan history.

**Required disclosure:** Maillume sends the selected or currently open message subject, sender, and text to `https://app.maillume.io` only after the user presses Analyze. The hosted service processes that content for the response and does not store the message or assessment. API-key and aggregate quota metadata are retained as described in the privacy notice. Results are automated assessments, not guarantees.

Support: `https://maillume.io/security`  
Privacy: `https://maillume.io/privacy`  
Terms: `https://maillume.io/terms`

## Chrome Web Store

Package: `dist/maillume-browser-extension.zip`, produced by `npm run package:integrations`. The command builds only the Chrome release candidate.

Permission justifications:

- `activeTab`: temporary access after the toolbar action so the extension can read text selected by the user or the visibly open message in a supported webmail client.
- `scripting`: executes the small, one-time capture function in that temporary active tab.
- `sidePanel`: keeps the review and result interface beside the email.
- `storage`: stores the deployment URL locally and the API key for the Chrome session only; never message content or results.
- Optional host access: requested interactively for the exact Maillume deployment selected by the user so the extension can call its API.

Changing deployments revokes the previous origin grant. Removing the saved connection clears the session key and revokes the active origin grant. Captured text uses a one-time in-memory handoff and expires if it is not consumed. The English and Dutch interfaces request assessment output in the browser UI language.

The package declares no content scripts, persistent webmail host access, tabs permission, cookies permission, webRequest permission, or background mailbox behavior.

Before submission:

- Capture 1280x800 screenshots using synthetic messages and invented identities.
- Complete Chrome Web Store data-use declarations from the production privacy notice.
- Test unpacked installation, permission grant/denial, key revocation, quota exhaustion, and update packaging.

## Manual Chrome Stable Acceptance

Use the exact checksummed release candidate and synthetic content only. Record the Chrome Stable version, operating system, artifact checksum, UTC test time, and sanitized screenshot filename for each applicable row in issue #39.

1. Confirm the installed manifest shows only `activeTab`, `scripting`, `sidePanel`, and `storage`, with deployment host access requested only after saving a connection. Capture the install and host-permission prompts.
2. In Gmail, test selected text and one visibly open synthetic message. Confirm subject, sender, text, displayed-link metadata, and destination-link metadata are correct. Expand two messages and confirm Maillume asks for a manual selection instead of choosing one.
3. Repeat the selected-text and visibly open-message checks in Outlook. Keep the panel open, change messages, press **Use current message**, and confirm the previous message and result disappear before the new capture appears.
4. Switch tabs and navigate within each webmail client. Confirm the panel never analyzes stale content. On a restricted page such as `chrome://settings`, confirm capture is refused with the restricted-page explanation.
5. Deny the deployment permission once and confirm no connection is saved. Grant it on the next attempt. Verify Dutch/English text containing `café — 日本語 — 🛡️` survives capture, and confirm a message beyond 20,000 characters is bounded to the documented limit.
6. Create a fresh production key from an AAL2 account and complete one synthetic assessment. Revoke that key, retry without changing the panel key, and capture the `401` rejection state. Do not record the key value.
7. With an exhausted test account, confirm the panel explains the `429` limit and retains the session key so the user can retry after the limit resets. Record only status and aggregate quota evidence.
8. Use **Remove connection** and confirm the endpoint, session key, and optional deployment permission are removed. Restart Chrome and confirm the API key is absent from the new browser session.

The automated suite exercises the corresponding capture and response branches, but it does not replace these real Chrome Stable, Gmail, Outlook, production-key, and permission-prompt observations.

## Release Evidence

Store the following with the release record:

- exact submitted Chrome package checksum;
- provider review outcome and listing URL;
- screenshots containing synthetic content only;
- permissions shown during installation;
- successful key revocation and quota-exhaustion tests;
- confirmation that monitoring and logs contain no message content or results.

`dist/integration-SHA256SUMS` records the reproducible SHA-256 checksum for the Chrome package only.
