# Hosted API Key Lifecycle

Maillume hosted integration keys are revocable credentials for the Chrome browser extension. They never authorize mailbox-wide access and their metadata never contains email content or analysis results.

## Production contract

- Monthly API quota belongs to the Supabase account, not an individual key.
- Hosted keys expire after a user-selected 30, 90, or 180 days. Non-expiring keys are not supported.
- An account may have at most five active keys and perform at most ten create or rotate operations in a rolling 24-hour window.
- Key creation, rotation, revocation, quota reservation, and quota refund execute in database transactions.
- Reservations contain only account/key IDs, period, and timestamps. They are finalized before a successful response, become purgeable after 10 minutes, and are checked by a five-minute cleanup job; they never contain scan content, results, prompts, links, or IP addresses.
- Rotation creates one replacement and revokes the previous key without resetting account usage.
- Plaintext keys are returned once. Supabase stores only a SHA-256 verifier, and authenticated clients cannot select that column.
- Extension `0.3.9` can create a dedicated key through a ten-minute approval exchange. The browser receives the plaintext once only after the signed-in account approves the exact request at AAL2.
- Pairing records store only a hashed random device verifier and bounded connection metadata. They cannot expose a user session or API-key plaintext and are purged after expiry.
- Account deletion cascades through limits, aggregate usage, keys, and rotation lineage.

## Browser mutation boundary

- API-key creation, rotation, revocation, and account deletion require an exact same-origin `Origin`; requests without it are rejected. Contradictory Fetch Metadata is also rejected.
- API-key mutation bodies are limited to 4 KiB and account-deletion bodies to 1 KiB. Limits are enforced while streaming even when `Content-Length` is absent.
- Permanent account deletion requires a Supabase `last_sign_in_at` no more than 15 minutes old. The user must sign out and authenticate again when that window has expired.
- These controls supplement Supabase authentication and RLS. They must not be weakened to accommodate non-browser API clients; integration clients use hosted API keys through `/api/v1/analyze` instead.
- Browser-pairing approval additionally requires exact same-origin submission and an action-bound HMAC token. Login, Google OAuth, passkey, confirmation, magic-link, and MFA flows preserve only a validated internal return path.

## Pairing migration and rollout

Apply `20260730110000_create_extension_pairings.sql` before deploying the image that exposes automatic connection. The migration is additive, so the current application and extension `0.3.8` continue to work while it is applied.

After applying it:

1. Run `supabase test db --linked supabase/tests/extension_pairing.sql` or the equivalent local rollback-only pgTAP suite.
2. Confirm `service_role` can execute the five pairing RPCs but cannot select `extension_pairings`.
3. Confirm `anon` and `authenticated` have neither table access nor RPC execution.
4. Submit extension `0.3.9` and wait until Google's public update service reports it.
5. Deploy the verified server image with both migration confirmations selected.
6. Connect a synthetic browser, verify one named key appears with a 90-day expiry, perform one scan, and verify `last_used_at` changes.
7. Revoke the synthetic key and confirm the extension receives an authentication failure without losing manual reconnection.

The production workflow refuses deployment unless the operator explicitly confirms the extension-pairing migration. Rollback to the previous application image is safe because the migration only adds an isolated table and RPCs; leave the migration in place.

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
