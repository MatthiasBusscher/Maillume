# Maillume Gmail Add-on

This Google Workspace add-on requests temporary action access to the message currently open in Gmail. It does not request thread-wide or mailbox-wide access and calls Maillume only after the user presses **Analyze this message**.

The add-on uses compact, bilingual CardService views that match Maillume's dark green and lime identity while staying within Google Workspace add-on UI constraints. The home card shows connection status, the contextual card explains exactly what will be shared, and the result card separates the assessment, evidence, detected links, and recommended action.

## Deployment

1. Create a standalone Apps Script project and replace its manifest and script with `appsscript.json` and `Code.gs`.
2. Create a test deployment as a Gmail add-on.
3. Install it for a dedicated test account and verify the OAuth screen lists only add-on execution, current-message action, external request, and locale access.
4. Open the add-on home screen and configure an API key created in the Maillume account page.
5. Open a synthetic message, press **Analyze this message**, and verify the result card.
6. Reopen Gmail and verify the connection remains available for the same Google user.
7. Revoke or expire the test key, run another analysis, and verify the add-on removes the rejected key after a `401` response.

The official manifest permits requests only to `https://app.maillume.io/`. Google requires outbound destinations in the submitted manifest, so a self-hosted operator must change `MAILLUME_ENDPOINT`, `MAILLUME_ACCOUNT_URL`, and `urlFetchWhitelist`, then publish their own add-on deployment.

The add-on supports English and Dutch. It stores the API key in Apps Script User Properties for the Google user who configured it. The complete key is never redisplayed after saving. It remains until the user removes or replaces it, or until Maillume rejects it with `401`, at which point the add-on deletes it automatically. A `403` may instead mean that the account needs stronger authentication, so the key is preserved. No message content, sender, subject, links, analysis payload, or result is stored in User Properties, cache, or logs.

See [PRIVACY.md](./PRIVACY.md) for the complete integration-specific data handling disclosure.

Result cards require the `analysis-v2.1` classification and score-factor breakdown and explain that the score is a risk index, not a probability.
