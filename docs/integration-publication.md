# Integration Publication Packet

This document is the submission source of truth for Chrome Web Store, Google Workspace Marketplace, and Microsoft AppSource. Do not submit until the production URLs, operator identity, privacy contact, and API-key flow are live.

## Shared Listing Copy

**Name:** Maillume

**Short description:** Get an explainable risk assessment for the email you choose, without background mailbox scanning or scan history.

**Required disclosure:** Maillume sends the selected or currently open message subject, sender, and text to `https://app.maillume.io` only after the user presses Analyze. The hosted service processes that content for the response and does not store the message or assessment. API-key and aggregate quota metadata are retained as described in the privacy notice. Results are automated assessments, not guarantees.

Support: `https://maillume.io/security`  
Privacy: `https://maillume.io/privacy`  
Terms: `https://maillume.io/terms`

## Chrome Web Store

Package: `dist/maillume-browser-extension.zip`, produced with the other signed-off integration artifacts by `npm run package:integrations`.

Permission justifications:

- `activeTab`: temporary access after the toolbar action so the extension can read text the user selected on the current page.
- `scripting`: executes the small selection-reading function in that temporary active tab.
- `sidePanel`: keeps the review and result interface beside the email.
- `storage`: stores deployment URL and API key only; never message content or results.
- Optional host access: requested interactively for the exact Maillume deployment selected by the user so the extension can call its API.

Changing deployments revokes the previous origin grant. Removing the saved connection clears the API key and revokes the active origin grant. The English and Dutch interfaces request assessment output in the browser UI language.

The package declares no content scripts, persistent Gmail/Outlook host access, tabs permission, cookies permission, webRequest permission, or background mailbox behavior.

Before submission:

- Capture 1280x800 screenshots using synthetic messages and invented identities.
- Complete Chrome Web Store data-use declarations from the production privacy notice.
- Test unpacked installation, permission grant/denial, key revocation, quota exhaustion, and update packaging.

## Google Workspace Marketplace

Source: `integrations/gmail-addon`.
Release artifact: `dist/maillume-gmail-addon.zip`.

OAuth scope justifications:

- `gmail.addons.execute`: runs the add-on cards and button actions.
- `gmail.addons.current.message.readonly`: grants temporary access to only the message currently open while the add-on is active.
- `script.external_request`: sends the user-initiated assessment to the fixed Maillume endpoint.

The contextual trigger builds a ready card without reading the message. `getPlainBody()` is called only from the Analyze button handler. The manifest allowlists only `https://app.maillume.io/`.
The add-on follows Gmail's English or Dutch locale, requests analysis in that language, never redisplays a saved key, and provides a key-removal action. A self-hosted operator must publish a separate add-on build because Google requires outbound destinations to be declared in the add-on manifest.

Before submission:

- Create the production Apps Script deployment under the project operator account.
- Complete OAuth consent verification and Marketplace SDK listing.
- Provide a synthetic-message test account and reviewer instructions.
- Verify mobile Gmail behavior or explicitly limit supported hosts in the listing.

## Microsoft AppSource

Manifest: `public/outlook-manifest.xml`.
Release artifact: `dist/maillume-outlook-manifest.xml`.

Permission justification:

- `ReadItem`: reads subject, sender, and body of the currently open message after the user presses Analyze.

The add-in does not request `ReadWriteMailbox`, Graph mailbox scopes, event-based activation, or send-time activation. Message text and results are not stored in task-pane local storage.
The manifest includes Dutch labels and opens the Dutch task pane for `nl-NL`. The task pane permits framing only by Microsoft Office hosts; the rest of Maillume remains non-frameable.

Before submission:

- Validate the production XML with Microsoft tooling and sideload it in classic Outlook, new Outlook, Outlook on the web, and supported mobile clients.
- Supply synthetic-message reviewer instructions and production support/privacy URLs.
- Record any client limitations in the AppSource listing.

## Release Evidence

Store the following with the release record:

- exact submitted package or manifest checksum;
- provider review outcome and listing URL;
- screenshots containing synthetic content only;
- permissions shown during installation;
- successful key revocation and quota-exhaustion tests;
- confirmation that monitoring and logs contain no message content or results.

`dist/integration-SHA256SUMS` records reproducible SHA-256 checksums for all three submitted artifacts.
