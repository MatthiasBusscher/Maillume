# Maillume Browser Extension

This unpacked Manifest V3 extension analyzes text the user explicitly selects or the currently open message in Gmail or Outlook. It does not request persistent Gmail or Outlook host access, inspect background tabs, or scan a mailbox.

## Local installation

1. Open `chrome://extensions` and enable Developer mode.
2. Choose **Load unpacked** and select this directory.
3. Open a message in Gmail or Outlook and click the Maillume toolbar action. Select text first to analyze only that selection; otherwise Maillume captures the visible open message. Chrome grants temporary access to that tab for this action and opens a side panel specific to the tab.
4. Keep the side panel open and press **Use current message** after opening each next email. This refreshes the reviewed fields without closing and reopening the extension. Maillume still requires this explicit click and never watches the mailbox in the background.
5. In Connection settings, choose **Connect this browser** to sign in on the Maillume account page, review the browser-specific key name and 90-day lifetime, and approve the connection with 2FA. The extension receives the new key once and completes setup automatically. Manual API-key entry remains available for unpacked development builds and deployments without pairing support.
6. Leave **Remember API key on this device** enabled to keep the key in this Chrome profile across browser restarts and extension updates, or disable it for session-only storage. Chrome asks for access to that deployment only.
7. Review the captured subject, sender, and message text, then press **Analyze message**. The review step collapses and the assessment moves directly below the capture step.
8. Press **Use current message** after opening another email to clear the previous assessment and restore the review step. The explanation under step 01 can be hidden when more room is useful.

The deployment URL is stored in extension-local storage. With **Remember API key on this device** enabled, the key and its expiry are stored locally in that Chrome profile; Chrome restricts this storage to trusted extension contexts. With the option disabled, they use `chrome.storage.session` and are cleared when the browser session ends. The panel warns during the final 14 days and disables analysis after a known expiry. Local extension storage is not a server-side secret vault, so use a dedicated, revocable Maillume key and remove the connection on shared profiles.

Automatic connection uses a ten-minute device-authorization exchange. The server stores only a SHA-256 verifier for the random device code, the requested key metadata, status, account ID after approval, and timestamps. The extension keeps the device code only in session storage while polling. Account passwords, sessions, message content, and API-key plaintext are never stored in pairing rows. Approval requires the official extension ID, a compatible extension/analysis contract, a signed-in AAL2 account session, exact same-origin form submission, and an action-bound anti-forgery token.

Captured message content crosses from the toolbar action to the tab-specific panel through service-worker memory, is consumed once, and expires after at most one minute if it is not consumed. A session-only recovery descriptor stores only the capture ID, state, and expiry so the panel can request a fresh tab read after service-worker suspension; it never stores message content or results. Message content and results are never written to extension storage. A new capture, tab navigation, and connection removal clear stale message or result data. Changing deployments revokes the previous origin permission; **Remove connection** clears both key storage modes, any pending pairing, and the active origin permission. The interface and assessment output support English and Dutch.

Chrome 116 or newer is required for programmatic, tab-specific side-panel opening.

The panel accepts the versioned `analysis-v6` through `analysis-v10` classification and score-factor contracts, sends its extension ID/version and accepted analysis versions, verifies that factor contributions sum to the risk index, requires valid evidence coverage from `analysis-v9` onward, and rejects unsafe detected-link schemes. Version 0.3.9 adds capability negotiation, automatic browser connection, and key-expiry warnings. Installed 0.3.8 clients remain compatible with analysis while the Store update rolls out, but cannot start automatic pairing.

## Troubleshooting the manual beta

- **Different or invalid analysis version:** download the latest source again, replace the unpacked extension directory, and choose **Reload** on `chrome://extensions`. Manual-beta installations do not update automatically.
- **More than one message is expanded:** first update to the latest source. Maillume ignores nested Outlook containers that belong to one message, but still refuses to choose when two messages are genuinely expanded. Collapse the other message or select the text you want to check.
- **The panel closes when switching Outlook messages:** update to v0.3.3 or newer. The panel now stays enabled during Outlook mail navigation, clears the previous message immediately, and waits for **Use current message**. It still closes when you leave supported webmail.
