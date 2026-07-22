# Maillume Browser Extension

This unpacked Manifest V3 extension analyzes text the user explicitly selects or the currently open message in Gmail or Outlook. It does not request persistent Gmail or Outlook host access, inspect background tabs, or scan a mailbox.

## Local installation

1. Open `chrome://extensions` and enable Developer mode.
2. Choose **Load unpacked** and select this directory.
3. Open a message in Gmail or Outlook and click the Maillume toolbar action. Select text first to analyze only that selection; otherwise Maillume captures the visible open message. Chrome grants temporary access to that tab for this action and opens a side panel specific to the tab.
4. Keep the side panel open and press **Use current message** after opening each next email. This refreshes the reviewed fields without closing and reopening the extension. Maillume still requires this explicit click and never watches the mailbox in the background.
5. In Connection settings, enter a Maillume deployment and API key. Leave **Remember API key on this device** enabled to keep the key in this Chrome profile across browser restarts and extension updates, or disable it for session-only storage. Chrome asks for access to that deployment only.
6. Review the captured subject, sender, and message text, then press **Analyze message**. The review step collapses and the assessment moves directly below the capture step.
7. Press **Use current message** after opening another email to clear the previous assessment and restore the review step. The explanation under step 01 can be hidden when more room is useful.

The deployment URL is stored in extension-local storage. With **Remember API key on this device** enabled, the key is also stored locally in that Chrome profile; Chrome restricts this storage to trusted extension contexts. With the option disabled, the key uses `chrome.storage.session` and is cleared when the browser session ends. Local extension storage is not a server-side secret vault, so use a dedicated, revocable Maillume key and remove the connection on shared profiles. Captured message content crosses from the toolbar action to the tab-specific panel through service-worker memory, is consumed once, and expires after at most one minute if it is not consumed. A session-only recovery descriptor stores only the capture ID, state, and expiry so the panel can request a fresh tab read after service-worker suspension; it never stores message content or results. Message content and results are never written to extension storage. A new capture, tab navigation, and connection removal clear stale message or result data. Changing deployments revokes the previous origin permission; **Remove connection** clears both key storage modes and revokes the active origin permission. The interface and assessment output support English and Dutch.

Chrome 116 or newer is required for programmatic, tab-specific side-panel opening.

The panel requires the `analysis-v6` classification and score-factor breakdown, verifies that factor contributions sum to the risk index, and rejects unsafe detected-link schemes.

## Troubleshooting the manual beta

- **Different or invalid analysis version:** download the latest source again, replace the unpacked extension directory, and choose **Reload** on `chrome://extensions`. Manual-beta installations do not update automatically.
- **More than one message is expanded:** first update to the latest source. Maillume ignores nested Outlook containers that belong to one message, but still refuses to choose when two messages are genuinely expanded. Collapse the other message or select the text you want to check.
- **The panel closes when switching Outlook messages:** update to v0.3.3 or newer. The panel now stays enabled during Outlook mail navigation, clears the previous message immediately, and waits for **Use current message**. It still closes when you leave supported webmail.
