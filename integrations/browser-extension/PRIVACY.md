# Browser Extension Privacy

The extension reads only text the user explicitly selects after opening the Maillume side panel and pressing **Use current selection**. It sends reviewed subject, sender, and selected text to the deployment shown in the panel only after **Analyze selected text** is pressed.

Extension storage contains only the chosen deployment URL and API key. Message text and results are held in the open panel's memory and are not written to extension storage. The extension does not use content scripts, background mailbox scanning, cookies, browsing history, advertising identifiers, or analytics.

The selected Maillume deployment controls server-side processing. The official service privacy notice is at `https://maillume.io/privacy`.
