# Browser Extension Privacy

The extension reads only text the user explicitly selects when they invoke the Maillume toolbar action. Chrome's temporary `activeTab` grant is used immediately to inspect window selections and focused input selections in accessible frames. The extension sends the reviewed subject, sender, and selected text to the deployment shown in the panel only after **Analyze selected text** is pressed.

Extension-local storage contains only the chosen deployment URL. The API key is kept separately in `chrome.storage.session` for the current browser session. Selected text is held briefly in service-worker memory for a one-time, tab-specific panel handoff and expires after at most one minute; message text and results otherwise remain only in the open panel's memory. No message content or result is written to extension storage. The extension does not use persistent content scripts, background mailbox scanning, cookies, browsing history, advertising identifiers, or analytics.

The selected Maillume deployment controls server-side processing. The official service privacy notice is at `https://maillume.io/privacy`.
