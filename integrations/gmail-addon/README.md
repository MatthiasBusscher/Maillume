# Maillume Gmail Add-on

This Google Workspace add-on requests temporary read access to the message currently open in Gmail. It does not request mailbox-wide access and calls Maillume only after the user presses **Analyze this message**.

## Deployment

1. Create a standalone Apps Script project and replace its manifest and script with `appsscript.json` and `Code.gs`.
2. Create a test deployment as a Gmail add-on.
3. Install it for a dedicated test account and verify the OAuth screen lists only current-message read and external request access.
4. Open the add-on home screen and save an API key created in the Maillume account page.
5. Open a synthetic message, press **Analyze this message**, and verify the result card.

The official manifest permits requests only to `https://app.maillume.io/`. Google requires outbound destinations in the submitted manifest, so a self-hosted operator must change `MAILLUME_ENDPOINT` and `urlFetchWhitelist`, then publish their own add-on deployment. The add-on supports English and Dutch, does not redisplay a saved key, and lets the user remove it.
