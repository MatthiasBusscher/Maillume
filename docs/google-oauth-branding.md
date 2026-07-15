# Google Sign-In Identity

Status: production configuration required. No application-code change is needed.

## Why Google Mentions Supabase

Google may send a security notification after a user first signs in with Google. With the current configuration, that notification can say the user signed in to `<project-ref>.supabase.co` because Supabase Auth owns the OAuth callback hostname. This is expected behavior and is not evidence that credentials or extra Google data were exposed.

Maillume requests only the OpenID, email, and profile identity scopes. Google sends the notification; Maillume cannot edit its wording. There are two separate improvements:

1. Complete Google brand verification so the consent flow identifies the application as Maillume.
2. Optionally buy and activate a Supabase custom domain so the OAuth callback uses `auth.maillume.io` instead of the project hostname.

Brand verification improves the displayed app identity but does not by itself replace the Supabase callback hostname in every Google security message.

## Phase A: Google Branding

This phase does not require a Supabase custom-domain purchase.

1. Open the production project in Google Auth Platform and select **Branding**.
2. Set the app name to `Maillume`.
3. Use a monitored Maillume support address when one is available. A temporary monitored address is acceptable during private beta.
4. Upload the square Maillume application mark.
5. Configure these public links:
   - Home page: `https://maillume.io`
   - Privacy policy: `https://maillume.io/privacy`
   - Terms: `https://maillume.io/terms`
6. Add `maillume.io` as an authorized domain and verify ownership through Google Search Console using a project owner or editor.
7. In **Data Access**, keep only `openid`, `email`, and `profile` for account sign-in.
8. Keep the audience **External**. Use test users until the private-beta acceptance checks pass.
9. Submit the production OAuth application for brand verification. The name and logo may not appear consistently until Google approves the brand.
10. Test the full flow with a Google account that has never authorized Maillume before.

Changing the app name, logo, home page, privacy URL, or redirect URI after approval can require brand verification again. Use a separate Google Cloud project for development experiments.

## Phase B: Optional Custom Auth Domain

Do this only after explicit cost approval. As of July 2026, Supabase lists Pro from USD 25 per month and a custom domain at USD 10 per domain per month per project. Recheck the live price before purchase.

Use `auth.maillume.io`. Do not reuse `app.maillume.io`, which belongs to the Maillume frontend and Cloudflare Tunnel.

### Prepare

1. Upgrade the production Supabase organization/project to a plan that supports the custom-domain add-on.
2. In Supabase project settings, start a custom-domain configuration for `auth.maillume.io`.
3. In Cloudflare DNS, add the exact CNAME and validation TXT records supplied by Supabase. The auth hostname points to Supabase, not the Maillume Tunnel. Keep it DNS-only unless Supabase documentation explicitly supports proxying it.
4. Wait for DNS propagation and complete domain verification in Supabase. CLI operators can inspect and reverify with:

   ```bash
   supabase domains get --project-ref <project-ref>
   supabase domains reverify --project-ref <project-ref>
   ```

5. Before activation, add both callback URLs to the production Google Web OAuth client:
   - `https://<project-ref>.supabase.co/auth/v1/callback`
   - `https://auth.maillume.io/auth/v1/callback`
6. Confirm the Supabase Auth site URL remains `https://app.maillume.io` and the application callback allowlist contains only `https://app.maillume.io/auth/callback` for production.

### Activate And Deploy

1. Activate `auth.maillume.io` in Supabase. OAuth providers begin advertising the custom hostname after activation.
2. Change the GitHub repository variable `NEXT_PUBLIC_SUPABASE_URL` to `https://auth.maillume.io`.
3. Change the VPS server-only `SUPABASE_URL` in `/opt/maillume/.env.production` to `https://auth.maillume.io`. Do not change or expose the server secret.
4. Run the production-image workflow so the public Supabase URL is embedded in a new image.
5. Deploy the immutable image through the protected production environment.
6. Use fresh English and Dutch test accounts to verify:
   - email signup and confirmation;
   - email/password sign-in;
   - password recovery;
   - Google sign-in and sign-out;
   - TOTP enrollment and challenge;
   - account deletion;
   - integration API-key access at AAL2.
7. Inspect the browser network log and Google consent flow to confirm authentication uses `auth.maillume.io` and never an unexpected host.

### Rollback

Keep the original Google callback registered until the custom domain has passed acceptance.

1. Stop public sign-in if callback behavior is inconsistent.
2. Restore the previous immutable application image and the previous VPS `SUPABASE_URL`.
3. Restore `NEXT_PUBLIC_SUPABASE_URL` to the project URL before rebuilding another image.
4. Remove or deactivate the custom domain through the Supabase-supported workflow only after the application is back on the project URL.
5. Retest email, Google, recovery, TOTP, and account deletion before reopening sign-in.

Do not improvise DNS or callback changes during an incident. The Supabase project URL and old Google callback are the rollback path.

## References

- [Supabase custom domains](https://supabase.com/docs/guides/platform/custom-domains)
- [Supabase pricing](https://supabase.com/pricing)
- [Google OAuth app branding](https://support.google.com/cloud/answer/15549049)
- [Google OAuth verification](https://support.google.com/cloud/answer/13461325)
