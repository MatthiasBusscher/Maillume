# Maillume Browser Extension

This unpacked Manifest V3 extension analyzes text the user explicitly selects or the currently open message in Gmail or Outlook. It does not request persistent Gmail or Outlook host access, inspect background tabs, or scan a mailbox.

## Local installation

1. Open `chrome://extensions` and enable Developer mode.
2. Choose **Load unpacked** and select this directory.
3. Open a message in Gmail or Outlook and click the Maillume toolbar action. Select text first to analyze only that selection; otherwise Maillume captures the visible open message. Chrome grants temporary access to that tab for this action and opens a side panel specific to the tab.
4. Keep the side panel open and press **Use current message** after opening each next email. This refreshes the reviewed fields without closing and reopening the extension. Maillume still requires this explicit click and never watches the mailbox in the background.
5. In Connection settings, enter a Maillume deployment and API key. Chrome asks for access to that deployment only.
6. Review the captured subject, sender, and message text, then press **Analyze message**.

The deployment URL is stored in extension-local storage. The API key is kept in `chrome.storage.session` and is cleared when the browser session ends. Captured message content crosses from the toolbar action to the tab-specific panel through service-worker memory, is consumed once, and expires after at most one minute if it is not consumed. A session-only recovery descriptor stores only the capture ID, state, and expiry so the panel can request a fresh tab read after service-worker suspension; it never stores message content or results. Message content and results are never written to extension storage. A new capture, tab navigation, and connection removal clear stale message or result data. Changing deployments revokes the previous origin permission; **Remove connection** clears the session key and revokes the active origin permission. The interface and assessment output support English and Dutch.

Chrome 116 or newer is required for programmatic, tab-specific side-panel opening.

The panel requires the `analysis-v2.1` classification and score-factor breakdown, verifies that factor contributions sum to the risk index, and rejects unsafe detected-link schemes.
