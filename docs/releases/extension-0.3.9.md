# Chrome extension `0.3.9`

Extension `0.3.9` improves connection safety and compatibility without expanding mailbox access.

## Changes

- Adds **Connect this browser**, a ten-minute account approval flow that creates a dedicated, revocable 90-day key without copy/paste.
- Preserves manual API-key entry for recovery, development, and deployments without pairing support.
- Sends the official extension ID, extension version, and supported analysis versions with hosted requests.
- Checks `/api/v1/capabilities` before pairing and explains when an extension update is required.
- Stores the key expiry beside the key, warns in the final 14 days, and disables analysis after a known expiry.
- Shows API-key last use and near-expiry warnings on the account page.
- Keeps installed `0.3.8` clients compatible with hosted analysis during the Store rollout.

## Privacy and security boundary

The extension never receives the account password, OAuth token, session cookie, or MFA secret. The approval page runs on the Maillume deployment and requires AAL2. Pairing records contain no API-key plaintext or scan data. The random device code is kept only in Chrome session storage and its server-side hash expires after ten minutes.

The official extension still has no persistent Gmail or Outlook permission, content script, analytics, browsing-history access, background mailbox scan, or stored message/result history.

## Production order

1. Apply and verify `20260730110000_create_extension_pairings.sql`.
2. Merge and build the verified server image and extension ZIP.
3. Submit extension `0.3.9` to the Chrome Web Store.
4. Wait until Google's public update service reports `0.3.9`.
5. Deploy the verified image with the extension-pairing migration confirmation selected.
6. Complete one synthetic connection, scan, last-use, and revocation test.
