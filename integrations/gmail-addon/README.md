# Maillume Gmail Add-on

This Google Workspace add-on requests temporary action access to the message currently open in Gmail. It does not request thread-wide or mailbox-wide access and calls Maillume only after the user presses **Analyze this message**.

## Deployment

1. Create a standalone Apps Script project and replace its manifest and script with `appsscript.json` and `Code.gs`.
2. Create a test deployment as a Gmail add-on.
3. Install it for a dedicated test account and verify the OAuth screen lists only add-on execution, current-message action, external request, and locale access.
4. Open the add-on home screen and temporarily configure an API key created in the Maillume account page.
5. Open a synthetic message, press **Analyze this message**, and verify the result card.

The official manifest permits requests only to `https://app.maillume.io/`. Google requires outbound destinations in the submitted manifest, so a self-hosted operator must change `MAILLUME_ENDPOINT` and `urlFetchWhitelist`, then publish their own add-on deployment. The add-on supports English and Dutch, does not redisplay a key, and keeps it only in the per-user Apps Script cache for up to six hours. Cache entries may expire sooner, and the user can remove the temporary key explicitly at any time.

Result cards require the `analysis-v2` classification and score-factor breakdown and explain that the score is a risk index, not a probability.
