# Chrome Extension Publication Packet

This document is the submission source of truth for the Chrome Web Store. The Gmail Workspace add-on and Outlook add-in are retired experiments and must not be submitted, advertised, or included in the supported release scope. Do not submit the Chrome extension until the production URLs, operator identity, privacy contact, and API-key flow are live.

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

## Retired Google Workspace Experiment

Legacy source: `integrations/gmail-addon`. A maintainer can run `npm run package:gmail` for historical verification, but the release workflow never builds or uploads it.

This experiment is not shipped, supported, or submitted to Google Workspace Marketplace. The source and checks remain so its historical access boundary can be audited:

OAuth scope justifications:

- `gmail.addons.execute`: runs the add-on cards and button actions.
- `gmail.addons.current.message.action`: grants temporary access to the open message only after the user presses the add-on's Analyze action.
- `script.external_request`: sends the user-initiated assessment to the fixed Maillume endpoint.
- `script.locale`: reads Gmail's locale so the add-on can choose its English or Dutch interface.

The contextual trigger builds a ready card without reading the message. `getPlainBody()` is called only from the Analyze button handler. The manifest allowlists only `https://app.maillume.io/`.
The add-on follows Gmail's English or Dutch locale, requests analysis in that language, never redisplays a saved key, and provides replace and removal actions. The key stays in user-scoped Apps Script properties until removal, replacement, or a `401` response; a generic `403` is treated as a possibly temporary policy denial and does not erase the key. Message content and results are never saved there. A self-hosted operator must publish a separate add-on build because Google requires outbound destinations to be declared in the add-on manifest.

No production Apps Script deployment, OAuth consent verification, marketplace listing, or reviewer submission is planned.

## Retired Microsoft Outlook Experiment

Legacy manifest: `integrations/outlook-addin/outlook-manifest.xml`. The release workflow never builds or uploads it, and its former production task-pane route has been removed.

This experiment is not shipped, supported, or submitted to Microsoft AppSource. The manifest and checks remain so its historical permission boundary can be audited:

Permission justification:

- `ReadItem`: reads subject, sender, and body of the currently open message after the user presses Analyze.

The add-in does not request `ReadWriteMailbox`, Graph mailbox scopes, event-based activation, or send-time activation. Message text and results are not stored in task-pane local storage.
The manifest includes Dutch labels and opens the Dutch task pane for `nl-NL`. The task pane permits framing only by Microsoft Office hosts; the rest of Maillume remains non-frameable.

No AppSource validation, client support matrix, listing, or reviewer submission is planned.

## Release Evidence

Store the following with the release record:

- exact submitted Chrome package checksum;
- provider review outcome and listing URL;
- screenshots containing synthetic content only;
- permissions shown during installation;
- successful key revocation and quota-exhaustion tests;
- confirmation that monitoring and logs contain no message content or results.

`dist/integration-SHA256SUMS` records the reproducible SHA-256 checksum for the Chrome package only.
