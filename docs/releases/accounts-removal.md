# Removing accounts

Maillume is a free, open-source project with no paid plans, so accounts were removed rather than kept as an optional extra.

## What changed

- The web scanner, the Chrome extension (`0.5.0`), and `/api/v1/analyze` are anonymous. `/api/v1/analyze` shares the website's per-client limits and adds a daily cap (`ANALYSIS_DAILY_REQUEST_LIMIT`, default 300 per client).
- Sign-in, sign-up, OAuth, TOTP, passkeys, the account page, API keys, account deletion, and browser pairing (`/api/v1/extension-pairing`) are removed. Old `/auth/*` and `/account/*` links redirect to the scanner with `308` and drop their query values.
- The proxy no longer refreshes Supabase sessions, and the page CSP no longer allows browser connections to Supabase.
- `@supabase/ssr` and `@supabase/supabase-js` are no longer dependencies. Supabase is still used, server-side only, for anonymous daily scan counts and optional feedback.
- The pricing page drops the planned paid tier, and the privacy notice, terms, and security page describe the anonymous service and the in-memory fair-use limits.

## Operator steps

1. Deploy the server, then publish extension `0.5.0` to the Chrome Web Store.
2. Remove `ACCOUNTS_ENABLED`, `NEXT_PUBLIC_SUPABASE_*`, and `NEXT_PUBLIC_PASSKEYS_ENABLED` from `.env.production` and the GitHub repository variables. They are ignored now.
3. Disable every Auth provider in the Supabase dashboard.
4. Track extension usage with the `chrome` rows in `public.scan_counters`.

## Database

This change does not drop any table. The account-era tables (`api_keys`, `api_usage_monthly`, `api_account_usage_monthly`, `api_account_limits`, `api_quota_reservations`, `extension_pairings`) and Supabase Auth users are no longer read or written. Dropping them is a separate, reviewed migration.

## Rollback

Redeploy the previous image tag. Extension `0.5.0` keeps working only against the new server, so roll back the Store release too if the server is rolled back.
