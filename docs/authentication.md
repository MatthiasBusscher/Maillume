# Authentication And Account Security

Status: implementation complete; production acceptance pending.

## Supported Sign-In Methods

- Email and password with confirmation email and password recovery.
- Google OAuth with the Supabase callback restricted to the production app origin.
- Authenticator-app two-factor authentication (TOTP), managed from the account page.
- Passkeys behind `NEXT_PUBLIC_PASSKEYS_ENABLED`; disabled by default while Supabase marks the API experimental.

Anonymous scanning remains available without an account. Authentication stores identity and security-factor metadata, never scan content or results.

## MFA Enforcement

TOTP is optional for basic account access during beta and mandatory for integration API keys. After a user enrolls a verified factor, every new AAL1 session is redirected to `/auth/mfa`. API-key listing and mutations require an AAL2 session at both the Next.js route and Supabase RLS boundaries. Account deletion requires AAL2 when a factor is enrolled and always requires a recent primary sign-in. UI redirects are convenience only; server and database controls independently enforce sensitive boundaries.

Production acceptance:

1. Confirm TOTP enrollment and challenge APIs are enabled in Supabase Authentication settings.
2. Enroll with at least two authenticator apps using a dedicated test account.
3. Test email/password and Google first-factor sign-in, wrong/reused codes, session refresh, sign-out, and a new browser session.
4. Confirm API-key and deletion routes reject an enrolled AAL1 session with `403` or redirect to the MFA challenge.
5. Document a support-led factor recovery process before requiring MFA for every account. Do not add recovery codes until they can be generated, hashed, consumed once, and audited safely.

## Passkey Rollout

Supabase passkeys are experimental. Keep the UI disabled in production until the following passes:

1. In Supabase, enable passkeys and configure relying-party ID `maillume.io`, display name `Maillume`, and allowed origin `https://app.maillume.io`.
2. Set the GitHub repository variable `NEXT_PUBLIC_PASSKEYS_ENABLED=true`; the public flag is embedded in the Docker image at build time.
3. Test registration, sign-in, naming, listing, and removal with Safari/iCloud Keychain, Chrome/Google Password Manager, Windows Hello, Android, and a hardware security key.
4. Test a missing device, cancelled WebAuthn prompts, duplicate registration, account deletion, and a rollback to password/Google sign-in.
5. Keep TOTP available as the stable second-factor option. Do not describe beta passkeys as the only recovery path.

## Production Email Requirements

Before enabling public email/password registration:

- configure branded SMTP and Maillume confirmation, reset, and password-change templates;
- use a verified Maillume sender domain rather than the Supabase default sender;
- keep generic reset responses to avoid email-address enumeration;
- configure production Auth rate limits and add Turnstile if signup or reset abuse appears;
- verify allowed redirect URLs contain production origins only;
- test account deletion and factor cleanup with email, Google, and passkey users.

### Template Language And Deployment

Maillume passes `data: { locale: "en" | "nl" }` when a user signs up or requests a magic link. The branded templates in `supabase/templates/` use that account metadata to render English or Dutch. The account language control persists the same preference in Supabase user metadata; it is restored after password, Google, and passkey sign-in. Existing accounts are backfilled with their current site locale at the next successful sign-in.

`supabase/config.toml` and the template files configure local development and self-hosted Supabase only. For the managed production project, copy the subjects and HTML from those files into Supabase Dashboard → Authentication → Email Templates, then send confirmation, recovery, and magic-link tests to English and Dutch test accounts. Keep Resend click tracking disabled so it does not rewrite Supabase confirmation links.

## Google Sign-In Identity

Google security notifications can currently mention the Supabase project hostname because it owns the OAuth callback. That message is expected and is not evidence of a breach. Complete the free Google branding work before public beta. Replacing the project hostname with `auth.maillume.io` is a separate paid Supabase custom-domain decision.

Follow `docs/google-oauth-branding.md` for brand verification, cost approval, DNS and callback ordering, production acceptance, and rollback.

## Secret Boundaries

The browser receives only the Supabase project URL and publishable key. `SUPABASE_SECRET_KEY` or the legacy service-role key remains server-only. Passkeys store public credential material in Supabase; private key material remains with the user's authenticator. TOTP secrets are handled by Supabase Auth and shown to the user only during enrollment.
