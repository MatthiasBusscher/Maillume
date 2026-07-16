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

## Release Evidence

Store the following with the release record:

- exact submitted Chrome package checksum;
- provider review outcome and listing URL;
- screenshots containing synthetic content only;
- permissions shown during installation;
- successful key revocation and quota-exhaustion tests;
- confirmation that monitoring and logs contain no message content or results.

`dist/integration-SHA256SUMS` records the reproducible SHA-256 checksum for the Chrome package only.
