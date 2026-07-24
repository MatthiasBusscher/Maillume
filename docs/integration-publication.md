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

### Store listing

**Category:** Tools

**Detailed description:**

> Maillume gives you an explainable risk assessment for an email you choose in Gmail or Outlook.
>
> Open a message, select text or use the visibly open message, review the captured subject, sender, and text, then press Analyze message. Maillume returns a risk score, suspicious signals, an explanation, and a recommended next step. The assessment is automated and is not a guarantee.
>
> The extension acts only after you invoke it. It has no persistent Gmail or Outlook host access, background mailbox scanning, scan history, advertising, or analytics. Message content and results stay in memory and are not written to extension storage.
>
> The selected content is sent over HTTPS to the Maillume deployment shown in the panel only after you press Analyze message. The official service processes it for that response and does not store the message or assessment. A revocable Maillume API key is required. You can keep the key for the browser session or explicitly remember it in this Chrome profile.
>
> Supported webmail clients: Gmail and Outlook on the web. English and Dutch interfaces are included.

Localize the listing in Dutch using the same claims and boundaries before submission. Do not add ranking, accuracy, or Chrome Web Store endorsement claims.

### Privacy practices answers

**Single purpose:** Assess one email selected by the user in supported webmail and return an explainable risk report.

Declare these handled data types:

- `Authentication information`: the dedicated Maillume API key, stored locally only when the user chooses that option and sent to the selected deployment to authenticate an assessment.
- `Personal communications`: the reviewed email subject, sender, and text sent only for the requested assessment.
- `Website content`: the explicitly selected or visibly open supported-webmail content and available displayed/destination link metadata needed for the assessment.

Do not declare browsing history, background user activity, location, financial data, health data, or analytics; the extension does not collect them. If the dashboard wording or extension behavior changes, re-evaluate these selections instead of copying this list mechanically.

Certify that data use is limited to the extension's single purpose; data is not sold, used for advertising or creditworthiness, or transferred for unrelated purposes; and people do not read message content except with specific support consent or for the security/legal exceptions in the published privacy notice.

Privacy policy: `https://maillume.io/privacy`

Permission justifications:

- `activeTab`: temporary access after the toolbar action so the extension can read text selected by the user or the visibly open message in a supported webmail client.
- `scripting`: executes the small, one-time capture function in that temporary active tab.
- `sidePanel`: keeps the review and result interface beside the email.
- `storage`: stores the deployment URL locally and, when the user enables the clearly disclosed remember option, stores the dedicated API key in trusted extension-local storage across restarts and updates. Otherwise the key remains session-only. It never stores message content or results.
- Optional host access: requested interactively for the exact Maillume deployment selected by the user so the extension can call its API.

Changing deployments revokes the previous origin grant. Removing the saved connection clears the key from both local and session storage and revokes the active origin grant. Captured text uses a one-time in-memory handoff and expires if it is not consumed. The English and Dutch interfaces request assessment output in the browser UI language.

The package declares no content scripts, persistent webmail host access, tabs permission, cookies permission, webRequest permission, or background mailbox behavior.

Before submission:

- Capture at least one full-bleed 1280x800 screenshot using synthetic messages and invented identities.
- Provide a full-bleed 440x280 small promotional image with little or no text.
- Confirm the packaged 128px icon contains the centered 96px square mark with 16px transparent padding.
- Complete the Chrome Web Store privacy fields exactly from the production behavior and privacy notice.
- Test unpacked installation, permission grant/denial, key revocation, quota exhaustion, and update packaging.

### Reviewer instructions

1. Use Chrome 116 or newer and a dedicated reviewer API key supplied through the private reviewer-instructions field. Never place a key in listing copy, screenshots, GitHub, or issue comments.
2. Open one synthetic message in Gmail or Outlook on the web and click the Maillume toolbar icon.
3. Under **Connection settings**, keep `https://app.maillume.io`, enter the reviewer key, choose the desired key-storage option, and select **Save connection**. Approve the host permission for that deployment.
4. Confirm the captured subject, sender, and text, then select **Analyze message**.
5. The expected result is a score, risk level, explanation, observed signals, and a recommended action. Results vary with the synthetic message and are not guarantees.
6. Select **Remove connection** after review to clear the endpoint and key and revoke the optional host permission.

Record the reviewer key's creation and expiry in the private operator record. Revoke it after review or at its planned expiry.

## Manual Chrome Stable Acceptance

Use the exact checksummed release candidate and synthetic content only. Record the Chrome Stable version, operating system, artifact checksum, UTC test time, and sanitized screenshot filename for each applicable row in issue #39.

1. Confirm the installed manifest shows only `activeTab`, `scripting`, `sidePanel`, and `storage`, with deployment host access requested only after saving a connection. Capture the install and host-permission prompts.
2. In Gmail, test selected text and one visibly open synthetic message. Confirm subject, sender, text, displayed-link metadata, and destination-link metadata are correct. Expand two messages and confirm Maillume asks for a manual selection instead of choosing one.
3. Repeat the selected-text and visibly open-message checks in Outlook. Keep the panel open, change messages, press **Use current message**, and confirm the previous message and result disappear before the new capture appears.
4. Switch tabs and navigate within each webmail client. Confirm the panel never analyzes stale content. On a restricted page such as `chrome://settings`, confirm capture is refused with the restricted-page explanation.
5. Deny the deployment permission once and confirm no connection is saved. Grant it on the next attempt. Verify Dutch/English text containing `café — 日本語 — 🛡️` survives capture, and confirm a message beyond 20,000 characters is bounded to the documented limit.
6. Create a fresh production key from an AAL2 account and complete one synthetic assessment. Revoke that key, retry without changing the panel key, and capture the `401` rejection state. Do not record the key value.
7. With an exhausted test account, confirm the panel explains the `429` limit and retains the configured key so the user can retry after the limit resets. Record only status and aggregate quota evidence.
8. Test both key-storage choices. With remember disabled, restart Chrome and confirm the key is absent. With remember enabled, reload the unpacked extension from the same directory and confirm the key remains available and can be revealed. Use **Remove connection** and confirm the endpoint, local key, session key, and optional deployment permission are all removed.

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
