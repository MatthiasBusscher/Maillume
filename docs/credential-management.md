# Credential Management

This register defines the minimum security handling for Maillume production
credentials. Maintain the actual credential values, identifiers, owners, last
rotation date, expiry date, and emergency contact in a private password manager
or secure business record, never in this repository, GitHub issue, ticket,
application log, or release artifact.

## Register Entries

| Credential | Least privilege and storage | Review and rotation |
| --- | --- | --- |
| GitHub production deployment key | Dedicated non-root VPS account; private key only in the protected `production` environment; public key only in that account's `authorized_keys`. | Review quarterly; replace immediately after a contributor, device, or GitHub-environment compromise. |
| GHCR pull credential | Read access only to the Maillume package on the VPS; never use a broad personal token when a narrower package credential is available. | Record expiry before use; review quarterly and replace before expiry or on suspected VPS compromise. |
| Cloudflare Tunnel token (`CLOUDFLARE_TUNNEL_TOKEN`) | One production Tunnel only; store only in `/opt/maillume/.env.infrastructure` with mode `600`; never pass it to the app container. | Review quarterly; rotate immediately after a VPS, Cloudflare, or token exposure. |
| Cloudflare DNS/WAF credential | Scope only to Maillume zones and required DNS/WAF/Tunnel changes. | Review quarterly; remove unused tokens and rotate after administrator changes or incident response. |
| Supabase server secret | Store only in `/opt/maillume/.env.production`; never expose as `NEXT_PUBLIC_*`. | Review quarterly; rotate after a VPS, Supabase, or application-secret exposure. |
| Google OAuth client secret | Store only in Supabase's Google provider configuration and Google's OAuth console. | Review before public launch and after OAuth-console access changes or suspected exposure. |
| Resend SMTP/API credential | Scope to the verified Maillume sending domain and transactional email only. | Review quarterly; rotate after delivery-provider or credential exposure. |
| AI provider credential | The official hosted beta must not have one. Self-hosted operators keep it server-side and provider-scoped. | Rotate on exposure; set provider budgets and alerts before enabling AI mode. |

## Emergency Rotation Order

For a suspected VPS compromise, immediately isolate the host and revoke the
Tunnel token, deployment key, GHCR credential, Supabase secret, email-provider
credential, Google OAuth secret, and any AI provider credential. Rebuild from a
clean VPS image, deploy a reviewed immutable image, recreate the two production
environment files from rotated credentials, and revoke affected Supabase
sessions before restoring service.

Record only the incident timestamp, credentials rotated by category, service
impact, and recovery verification. Do not copy secret values into the incident
record.
