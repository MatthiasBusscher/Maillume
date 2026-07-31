# Maillume Browser Extension

This unpacked Manifest V3 extension analyzes text the user explicitly selects or the currently open message in Gmail or Outlook. It does not request persistent Gmail or Outlook host access, inspect background tabs, or scan a mailbox.

## Local installation

1. Open `chrome://extensions` and enable Developer mode.
2. Choose **Load unpacked** and select this directory.
3. Open a message in Gmail or Outlook and click the Maillume toolbar action. Select text first to analyze only that selection; otherwise Maillume captures the visible open message. Chrome grants temporary access to that tab for this action and opens a side panel specific to the tab.
4. Keep the side panel open and press **Use current message** after opening each next email. This refreshes the reviewed fields without closing and reopening the extension. Maillume still requires this explicit click and never watches the mailbox in the background.
5. In Connection settings, choose **Connect this browser** to sign in on the Maillume account page, review the browser connection, and approve it with 2FA. The extension receives the new credential once and completes setup automatically. No API key needs to be copied.
6. The browser connection remains available in this Chrome profile across restarts and updates. Manual API-key entry is available only under **Advanced manual setup** for unpacked development, self-hosted installations, recovery, and older deployments. Chrome asks for access to that deployment only.
7. Review the captured subject, sender, and message text, then press **Analyze message**. The review step collapses and the assessment moves directly below the capture step.
8. Press **Use current message** after opening another email to clear the previous assessment and restore the review step. The explanation under step 01 can be hidden when more room is useful.

The deployment URL, browser credential, hard expiry, and rolling inactivity deadline are stored in extension-local storage; Chrome restricts this storage to trusted extension contexts. A random installation identifier also remains local. The server stores only its SHA-256 hash so reconnecting the same Chrome profile rotates the old credential instead of using another slot. Browser connections have a one-year hard expiry, become inactive after 90 days without a successful analysis request, warn during the final 30 days, and can be revoked from the account page. Remove the connection on shared profiles.

Automatic connection uses a ten-minute device-authorization exchange. The server stores only SHA-256 verifiers for the random device code and browser installation identifier, bounded requested metadata, status, account ID after approval, and timestamps. The extension keeps the device code only in session storage while polling. Account passwords, sessions, message content, and credential plaintext are never stored in pairing rows. Approval requires the official extension ID, a compatible extension/analysis contract, a signed-in AAL2 account session, and an exact user- and request-bound anti-forgery token.

Captured message content crosses from the toolbar action to the tab-specific panel through service-worker memory, is consumed once, and expires after at most one minute if it is not consumed. A session-only recovery descriptor stores only the capture ID, state, and expiry so the panel can request a fresh tab read after service-worker suspension; it never stores message content or results. Message content and results are never written to extension storage. A new capture, tab navigation, and connection removal clear stale message or result data. Changing deployments revokes the previous origin permission; **Remove connection** clears both key storage modes, any pending pairing, and the active origin permission. The interface and assessment output support English and Dutch.

Chrome 116 or newer is required for programmatic, tab-specific side-panel opening.

The panel accepts the versioned `analysis-v6` through `analysis-v12` classification and score-factor contracts, sends its extension ID/version and accepted analysis versions, verifies that factor contributions sum to the risk index, requires valid evidence coverage from `analysis-v9` onward, and rejects unsafe detected-link schemes. Version 0.4.0 adds stable per-browser rotation, rolling inactivity expiry, and simplified connection settings. Installed 0.3.9 clients remain compatible with analysis and pairing while the Store update rolls out.

Analysis replies are read as a stream and rejected above 256 KiB even when a deployment omits or lies about `Content-Length`. Before rendering, the panel also bounds response text, score factors, signals, and detected links; it never silently truncates an accepted server result. Rendering repeats the factor, signal, and text caps as a defensive fallback.

## Local panel modules

The side panel uses ordered, packaged local scripts rather than a bundler or remote imports. Generated `sidepanel-compatibility.js` projects the canonical TypeScript compatibility contract, `sidepanel-copy.js` contains localized status copy, `sidepanel-contract.js` validates server responses before rendering, `sidepanel-capture.js` manages one-time capture handoffs, `sidepanel-connection.js` owns permissions, local storage, expiry, and device pairing, and `sidepanel-render.js` performs DOM-only state transitions. `sidepanel.js` is the event-wiring coordinator. This split preserves the extension's Manifest V3 and deterministic packaging model.

## Troubleshooting the manual beta

- **Different or invalid analysis version:** download the latest source again, replace the unpacked extension directory, and choose **Reload** on `chrome://extensions`. Manual-beta installations do not update automatically.
- **More than one message is expanded:** first update to the latest source. Maillume ignores nested Outlook containers that belong to one message, but still refuses to choose when two messages are genuinely expanded. Collapse the other message or select the text you want to check.
- **The panel closes when switching Outlook messages:** update to v0.3.3 or newer. The panel now stays enabled during Outlook mail navigation, clears the previous message immediately, and waits for **Use current message**. It still closes when you leave supported webmail.
