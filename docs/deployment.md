# Production Deployment

The target Maillume deployment is a portable Next.js standalone container on a Hostinger VPS, with Cloudflare Tunnel as its only web ingress and managed Supabase for optional authentication and non-content feedback. The documented production configuration uses heuristic analysis and no maintainer-funded AI key. Treat these as release invariants until the live environment has passed the verification checklist below.

## Production Topology

```text
Visitor
  -> Cloudflare DNS, DDoS protection, WAF, rate limit
  -> Cloudflare Tunnel (outbound connection from VPS)
  -> maillume:3000 on a private Docker network
  -> Supabase Auth/feedback when configured
```

- `https://maillume.io` is canonical and serves marketing pages.
- `https://app.maillume.io` rewrites `/` to the scanner at `/app`.
- `https://www.maillume.io/*` redirects to `https://maillume.io/$1`.
- `https://maillume.nl/*` redirects permanently to `https://maillume.io/$1`.
- No public DNS record points at the VPS IP and ports 80/443 remain closed.

## 1. Prepare Cloudflare

1. Add `maillume.io` and `maillume.nl` to Cloudflare and replace the registrar nameservers with the assigned Cloudflare nameservers.
2. Create a remotely managed Tunnel named `maillume-production`.
3. Add public hostnames for `maillume.io`, `www.maillume.io`, and `app.maillume.io`, each targeting `http://maillume:3000`.
4. Create redirect rules for `www.maillume.io` and `maillume.nl`, preserving path and query string. Use HTTP 301.
5. Enable automatic DDoS protection and the Free Managed Ruleset.
6. Use the free rate-limiting rule for paths beginning `/api/`, covering both `/api/analyze` and `/api/v1/analyze`. Start at 10 requests per 10 seconds per visitor, with a managed challenge, and tune it from observed non-content traffic.
7. Do not add an A or AAAA record containing the VPS address.

Store the Tunnel token only in `/opt/maillume/.env.infrastructure`; the application container must never receive it. Turnstile is deliberately deferred until measured abuse shows it is necessary.

## 2. Harden the Hostinger VPS

Use the Hostinger Docker template on a VPS with at least 4 GB RAM.

1. Create a non-root deployment user and add an SSH public key.
2. Set `PermitRootLogin no` and `PasswordAuthentication no` in SSH configuration, validate with `sshd -t`, and reload SSH while the original session remains open.
3. Configure Hostinger firewall/UFW to deny inbound traffic by default. Allow SSH only from a trusted administration address where practical. Do not allow 80 or 443.
4. Install and enable Fail2Ban and unattended security updates.
5. Disable unused services, especially public database and mail ports.
6. Configure at least 2 GB swap when the VPS has no swap, but treat sustained swapping as a capacity alert.
7. Keep Hostinger weekly backups enabled. Create a manual snapshot immediately before initial deployment or a major operating-system change.
8. Verify Docker log rotation and disk usage monthly.

Detailed checks and recovery procedures are in `docs/operations.md`.

## 3. Install the Stack

Clone the repository into `/opt/maillume`. Copy `.env.example` to `.env.production` for application settings and `.env.infrastructure.example` to `.env.infrastructure` for Docker/Tunnel settings. Set both files to mode `600`.

```text
ANALYSIS_MODE=heuristic
NEXT_PUBLIC_MARKETING_URL=https://maillume.io
NEXT_PUBLIC_APP_URL=https://app.maillume.io
ANALYSIS_REQUEST_LIMIT=20
ANALYSIS_REQUEST_WINDOW_SECONDS=60
ANALYSIS_MAX_REQUEST_BYTES=32768
FEEDBACK_STORAGE=disabled
```

Configure infrastructure-only values separately so the application container never receives the Tunnel token:

```text
CLOUDFLARE_TUNNEL_TOKEN=<server-only-token>
MAILLUME_IMAGE=ghcr.io/matthiasbusscher/maillume:sha-<full-commit>
```

Do not configure AI provider keys on the official public service. Build-time `NEXT_PUBLIC_` values are embedded in the image; the release workflow builds the official image with canonical defaults. Self-hosters needing different public values should build their own image.

Make `scripts/deploy-production.sh` executable. Authenticate Docker to GHCR using a read-only package token if the package is private.

## 4. Configure Supabase Authentication

Anonymous scanning remains available when authentication is enabled.

1. Create a production Supabase project in an EU region and apply every migration in `supabase/migrations`, including the account-level API quota and expiring key lifecycle migration. Follow the verification and rollback notes in `docs/api-key-lifecycle.md`.
2. Enable email/password sign-in, require email confirmation, configure branded SMTP/templates, and keep secure password changes enabled.
3. Create a Google Web OAuth client and use the Supabase callback shown in its Google-provider settings as the Google authorized redirect URI.
4. Enable Google in Supabase with only OpenID, email, and profile scopes.
5. Set the Supabase site URL to `https://app.maillume.io` and allow only `https://app.maillume.io/auth/callback` in production. Keep localhost only in a separate development project.
6. Add only the server-side Supabase secret to the VPS `.env.production`. Public Supabase values are embedded from GitHub repository variables during the image build.
7. Confirm TOTP APIs are enabled and complete the MFA acceptance matrix in `docs/authentication.md`.
8. Leave passkeys disabled for the first production image. Enable them only after configuring the WebAuthn relying party and completing the real-device matrix.
9. Enable production sign-in only after email confirmation, password reset, Google sign-in, sign-out, session refresh, MFA challenge, and confirmation-gated account deletion pass.
10. Verify Row Level Security is enabled. The feedback table accepts writes only through the server role and contains no scan-content columns.

Complete the Google application identity checklist in `docs/google-oauth-branding.md`. The custom `auth.maillume.io` hostname is optional and adds recurring Supabase cost; Google brand verification should be completed even if the project remains on its Supabase hostname during private beta.

Never prefix a Supabase server secret or AI provider key with `NEXT_PUBLIC_`.

## 5. Configure GitHub Deployment

The `release.yml` workflow builds `ghcr.io/matthiasbusscher/maillume:sha-<full-commit>` and scans it with Trivy on every push to `main`. Production deployment runs only through a manual workflow dispatch with the `deploy` input enabled, then requires approval from the protected `production` environment before SSH access.

Create a protected GitHub environment named `production`, require reviewer approval, and add:

- `PRODUCTION_HOST`: VPS SSH address.
- `PRODUCTION_USER`: non-root deployment user.
- `PRODUCTION_SSH_KEY`: dedicated private deployment key.
- `PRODUCTION_SSH_FINGERPRINT`: the VPS host-key fingerprint, for example `SHA256:...`. Read it from the VPS console with `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256`; do not trust a fingerprint first observed over the same network connection it is meant to verify.

Add repository variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_PASSKEYS_ENABLED` before enabling production authentication. Keep the passkey variable `false` until its acceptance matrix passes. These public browser values are intentionally supplied while the image is built. Server secrets remain only in the VPS `.env.production` file.

The protected deploy job checks out the approved commit and synchronizes only `docker-compose.production.yml` and `scripts/deploy-production.sh` before invoking the script. The VPS therefore never depends on a stale manual copy or a Git checkout. The remote deploy script pulls the immutable image, waits for `/api/health`, verifies that the running container reports the approved Git revision, and restores the previous image if health or revision checks fail. GitHub then verifies the same revision and analyzer version through Cloudflare, together with the public marketing and sign-in routes. GitHub Actions builds images; production never builds source code.

`/api/health` returns the non-secret build revision and analyzer version. Compare its `revision` with the commit approved in the production workflow when confirming a release.

## Verification

Use synthetic data only.

1. Check `/api/health`, marketing, scanner, trust, auth, and resource routes through Cloudflare.
2. Confirm `maillume.nl` and `www.maillume.io` preserve paths while redirecting to canonical `.io` URLs.
3. Confirm direct requests to the VPS IP cannot reach the app.
4. Confirm `/api/analyze` and `/api/v1/analyze` return `Cache-Control: no-store`, reject oversized requests with `413`, and reject excess requests with `429` before analysis.
5. Confirm production reports `analysis_mode: heuristic` and has no provider key.
6. Confirm screenshot and `.eml` source files remain browser-side.
7. Test email/password confirmation and recovery, Google authentication, TOTP enrollment/challenge, and account deletion with dedicated test accounts.
8. Rehearse deployment rollback and VPS restart recovery before private beta.

## Future Migration

The image uses standard Next.js standalone output and has no Hostinger-specific application code. A future migration can run the same image on another container platform or deploy the unchanged Next.js project to Vercel. Move DNS only after the new origin passes health and privacy checks.
