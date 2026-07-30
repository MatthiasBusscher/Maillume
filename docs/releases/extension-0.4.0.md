# Chrome extension `0.4.0`

Extension `0.4.0` turns automatic account pairing into the normal connection path and separates browser connections from developer API keys.

## Changes

- Removes manual API-key fields from the ordinary connection view.
- Keeps manual configuration under **Advanced manual setup** for self-hosted installations, development, recovery, and older deployments.
- Gives each Chrome profile a random installation identifier and sends it only during pairing.
- Stores only the installation identifier's SHA-256 hash on the server.
- Reconnecting the same Chrome profile atomically revokes and replaces that browser credential without consuming another slot.
- Adds a separate limit of five connected browsers per account.
- Uses a one-year hard lifetime with a rolling 90-day inactivity deadline and warns 30 days before effective expiry.
- Separates connected browsers from developer API keys on the account page.
- Keeps extension `0.3.9` compatible with analysis and pairing during the Chrome Web Store rollout.
- Falls back to the legacy 90-day pairing contract while a deployment still advertises `0.3.9`, so publishing `0.4.0` before the lifecycle server does not interrupt new connections.

## Privacy and security boundary

The random browser identifier is not an account credential and never leaves the extension except during a pairing request. The raw value remains in trusted extension-local storage; Supabase receives only its hash. Pairing still requires an official compatible extension, a signed-in AAL2 account session, and a signed approval token bound to the exact account and request.

Message content and assessment results remain memory-only. The extension still has no persistent Gmail or Outlook permission, content script, analytics, browsing-history access, or background mailbox scan.

## Production order

1. Merge and deploy the server-only pairing proxy fix from PR `#169`, then verify a fresh `0.3.9` connection succeeds.
2. Merge the `0.4.0` lifecycle release and wait for its verified image and extension ZIP.
3. Apply and verify `20260730130000_create_browser_connections.sql`.
4. Submit extension `0.4.0` to the Chrome Web Store.
5. Wait until Google's public update service reports `0.4.0`.
6. Deploy the verified image with all migration confirmations selected.
7. Complete the browser connect, reconnect, analysis, inactivity timestamp, and revocation checks.
