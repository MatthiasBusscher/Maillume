# Chrome extension `0.5.0`

Extension `0.5.0` removes the account requirement. It works straight after installation.

- Analysis is anonymous. The panel no longer offers **Connect this browser**, manual API-key entry, or connection removal, and requests carry no `Authorization` header.
- Chrome asks once for access to the chosen deployment on the first **Analyze message** click. Nothing is sent if access is declined. The required permissions are unchanged, so Chrome does not disable the extension on update.
- Settings only chooses the deployment, `https://app.maillume.io` by default. Only a non-default URL is stored.
- On start-up the extension deletes API keys, browser-connection identifiers, and pairing state stored by `0.4.x`.
- A `429` response now explains the fair-use limit instead of referring to account usage.

Deploy the server change before publishing this version to the Chrome Web Store: `0.5.0` sends unauthenticated requests that the previous server rejects. Installed `0.4.x` clients cannot analyze against the new server until Chrome updates them.

The upload artifact must be built from the final source revision and must have the same `0.5.0` version in `manifest.json`, generated compatibility metadata, and release metadata.
