# Maillume Browser Extension

This unpacked Manifest V3 extension analyzes only text the user explicitly selects. It does not request persistent Gmail or Outlook host access, inspect background tabs, or scan a mailbox.

## Local installation

1. Open `chrome://extensions` and enable Developer mode.
2. Choose **Load unpacked** and select this directory.
3. Open a message, select its visible content, and click the Maillume toolbar action.
4. In Connection settings, enter a Maillume deployment and API key. Chrome asks for access to that deployment only.
5. Review the captured text and press **Analyze selected text**.

The destination and API key are stored in extension-local storage. Selected message content and results are kept only in the open side panel and are not written to extension storage.
