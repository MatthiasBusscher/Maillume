# Hosted Credential Lifecycle

Maillume uses separate revocable credentials for connected browser profiles and direct developer API integrations. Neither credential type authorizes mailbox-wide access, and their metadata never contains email content or analysis results.

## Production contract

- Monthly API quota belongs to the Supabase account, not an individual key.
- Developer keys expire after a user-selected 30, 90, or 180 days. Non-expiring keys are not supported.
- Browser connections have a one-year hard expiry and a rolling 90-day inactivity deadline. Every successful quota reservation advances the inactivity deadline, without extending the one-year limit.
- An account may have at most five connected browsers and five active developer keys. It may perform at most ten credential create or rotate operations in a rolling 24-hour window.
- Key creation, rotation, revocation, quota reservation, and quota refund execute in database transactions.
- Reservations contain only account/key IDs, period, and timestamps. They are finalized before a successful response, become purgeable after 10 minutes, and are checked by a five-minute cleanup job; they never contain scan content, results, prompts, links, or IP addresses.
- Rotation creates one replacement and revokes the previous key without resetting account usage.
- Plaintext keys are returned once. Supabase stores only a SHA-256 verifier, and authenticated clients cannot select that column.
- Extension `0.4.0` creates a dedicated browser credential through a ten-minute approval exchange. The browser receives the plaintext once only after the signed-in account approves the exact request at AAL2.
- A random installation identifier remains local to the Chrome profile. Pairing and credential rows store only its SHA-256 hash, which allows reconnecting the same browser to atomically revoke and replace its prior credential instead of consuming another slot.
- Pairing records also store only a hashed random device verifier and bounded connection metadata. They cannot expose a user session or credential plaintext and are purged after expiry.
- Account deletion cascades through limits, aggregate usage, keys, and rotation lineage.

## Browser mutation boundary

- API-key creation, rotation, revocation, and account deletion require an exact same-origin `Origin`; requests without it are rejected. Contradictory Fetch Metadata is also rejected.
- API-key mutation bodies are limited to 4 KiB and account-deletion bodies to 1 KiB. Limits are enforced while streaming even when `Content-Length` is absent.
- Permanent account deletion requires a Supabase `last_sign_in_at` no more than 15 minutes old. The user must sign out and authenticate again when that window has expired.
- These controls supplement Supabase authentication and RLS. They must not be weakened to accommodate non-browser API clients; integration clients use hosted API keys through `/api/v1/analyze` instead.
- Browser-pairing approval requires an action-bound, user-bound HMAC token for the exact canonical pairing request. Exact same-origin submission is accepted directly; the signed token also permits the same request when a trusted production proxy prevents reliable origin reconstruction. Login, Google OAuth, passkey, confirmation, magic-link, and MFA flows preserve only a validated internal return path.

## Browser-connection migration and rollout

Apply `20260730110000_create_extension_pairings.sql` before automatic pairing, then apply `20260730130000_create_browser_connections.sql` before deploying extension `0.4.0` support. The second migration classifies credentials, adds the hashed browser installation identifier and inactivity deadline, and installs the browser-aware pairing RPCs.

After applying it:

1. Run `supabase test db --linked supabase/tests/extension_pairing.sql supabase/tests/browser_connections.sql` or the equivalent local rollback-only pgTAP suites.
2. Confirm only `service_role` can execute the browser-aware pairing RPCs.
3. Submit extension `0.4.0` and wait until Google's public update service reports it.
4. Deploy the verified image with all migration confirmations selected.
5. Connect a synthetic browser and verify the account lists it under **Connected browsers**, with a one-year hard expiry and a 90-day inactivity deadline.
6. Perform one scan and verify `last_used_at` and `inactive_after` advance.
7. Reconnect the same Chrome profile and verify its previous credential is revoked while the active browser count stays unchanged.
8. Revoke the synthetic browser and confirm the extension receives an authentication failure.

The production workflow refuses deployment unless the operator explicitly confirms both pairing migrations. Extension `0.3.9` remains analysis- and pairing-compatible while the Store update rolls out. Extension `0.4.0` falls back to the legacy 90-day request while a deployment still advertises `0.3.9`, preventing a Store-first rollout interruption. A legacy connection's next lifecycle reconnect is treated as a new browser because it has no stable installation identifier.

Legacy browser pairings cannot be retrospectively attached to a managed browser connection: their short-lived approval records are purged and do not retain a created-key identifier, while API key names and usage metadata are not proof of browser ownership. The account page therefore gives conditional recovery guidance rather than guessing. The user reconnects from the Chrome profile, confirms the new managed connection works, and then explicitly removes the old developer key. Reconnecting never reveals, reuses, transfers, or automatically revokes the older key.

## Migration and verification

This is a forward-only cutover because the migration removes the per-key quota RPCs. Deploy the corresponding application image first, then immediately apply `20260714183000_harden_api_key_lifecycle.sql`. During that short interval hosted API-key requests and key management may return `503`, while anonymous web scans remain available.

Before the cutover, create a Supabase backup and avoid issuing or rotating keys. After the migration, verify the new RPCs before reopening hosted integrations. Finalization and quota refunds are tied to one reservation and its original billing period, so retries cannot finalize or refund a different request.

After applying it, verify with synthetic accounts only:

1. Create five keys concurrently and confirm no more than five are active.
2. Reserve quota through two different keys and confirm both increment one account counter.
3. Revoke and recreate a key and confirm the counter does not reset.
4. Rotate a key and confirm the old key is rejected while the replacement retains account usage.
5. Advance a test key past `expires_at` and confirm it cannot reserve quota.
6. Query `api_keys` as `authenticated` and confirm metadata is readable but `secret_hash` is denied.
7. Delete the test account and confirm its keys, limits, and aggregate usage are removed.
8. Confirm `service_role` has no direct table access and can only execute the lifecycle RPCs.
9. Finalize a successful reservation, refund a failed reservation twice, and confirm both operations are idempotent and stale metadata becomes purgeable after 10 minutes.

## Rollback notes

Do not deploy the previous application image after this migration: it calls RPCs that no longer exist. Roll forward with a corrected image instead.

Do not copy account-level counts back into per-key counters: that would restore the quota-bypass vulnerability. A database rollback is only acceptable by restoring the pre-cutover backup before any new key is issued. Once creation, rotation, or usage has occurred under the new lifecycle, reversal requires a reviewed data migration and forced revocation of every affected key.
