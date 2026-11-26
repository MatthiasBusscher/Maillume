# Production Deployment

The target Maillume deployment is a portable Next.js standalone container on a Hostinger VPS, behind a Caddy reverse proxy that the operator runs on the same host, with managed Supabase for anonymous scan counts and non-content feedback. The documented production configuration uses heuristic analysis and no maintainer-funded AI key. Treat these as release invariants until the live environment has passed the verification checklist below.

## Production Topology

```text
Visitor
  -> Hetzner DNS (A records to the VPS)
  -> Hostinger network firewall and host firewall: only 80/443 open to the web
  -> Caddy: TLS, rate limit on /api/*, sets X-Forwarded-For to the visitor IP
  -> maillume:3000 on the shared `maillume-edge` Docker network (no published ports)
  -> PostgREST + Postgres on the same host for the anonymous daily scan counts
```

- `https://maillume.io` is canonical and serves marketing pages.
- `https://app.maillume.io` rewrites `/` to the scanner at `/app`.
- `https://www.maillume.io/*` redirects to `https://maillume.io/$1` (handled by the app).
- `https://maillume.nl/*` redirects permanently to `https://maillume.io/nl/$1` (handled by the app).
- `https://status.maillume.io` redirects to the public UptimeRobot status page (Caddy).

## 1. Reverse proxy and DNS

Caddy runs from the operator's host stack, not from this repository. It joins the external Docker network named by `MAILLUME_EDGE_NETWORK` (default `maillume-edge`) and reaches the app as `maillume:3000`. Its site block for Maillume:

```caddyfile
maillume.io, www.maillume.io, app.maillume.io, maillume.nl, www.maillume.nl {
	header -Server
	@api path /api/*
	rate_limit @api {
		zone maillume_api {
			key {remote_host}
			events 10
			window 10s
		}
	}
	reverse_proxy maillume:3000
}
```

1. Point `maillume.io`, `www`, `app` and `status`, plus `maillume.nl` and `www.maillume.nl`, at the VPS with A records.
2. Caddy obtains and renews certificates automatically once DNS resolves to the VPS.
3. The rate limit replaces the former Cloudflare edge rule: 10 requests per 10 seconds per visitor on `/api/`, answered with HTTP `429`. It is kept in memory only.
4. Caddy writes no access log for the Maillume hosts, so visitor IP addresses are not written to logs. The `rate_limit` directive needs a Caddy build with the `caddy-ratelimit` module.
5. Caddy replaces any incoming `X-Forwarded-For` with the connecting client's address, because no trusted upstream proxies are configured. That makes the header safe for `TRUSTED_PROXY_IP_HEADER`.

Turnstile is deliberately deferred until measured abuse shows it is necessary.

## 2. Harden the Hostinger VPS

Use the Hostinger Docker template on a VPS with at least 4 GB RAM.

1. Create a non-root deployment user and add an SSH public key.
2. Set `PermitRootLogin no` and `PasswordAuthentication no` in SSH configuration, validate with `sshd -t`, and reload SSH while the original session remains open.
3. Configure Hostinger firewall/UFW to deny inbound traffic by default. Allow only 80 and 443 for the reverse proxy, and keep SSH reachable only over a private VPN or from a trusted administration address.
4. Install and enable Fail2Ban and unattended security updates.
5. Disable unused services, especially public database and mail ports.
6. Configure at least 2 GB swap when the VPS has no swap, but treat sustained swapping as a capacity alert.
7. Keep Hostinger weekly backups enabled. Create a manual snapshot immediately before initial deployment or a major operating-system change.
8. Verify Docker log rotation and disk usage monthly.

Detailed checks and recovery procedures are in `docs/operations.md`.

## 3. Install the Stack

Clone the repository into `/opt/maillume`. Copy `.env.example` to `.env.production` for application settings and `.env.infrastructure.example` to `.env.infrastructure` for Docker Compose settings. Set both files to mode `600`.

```text
ANALYSIS_MODE=heuristic
NEXT_PUBLIC_MARKETING_URL=https://maillume.io
NEXT_PUBLIC_APP_URL=https://app.maillume.io
ANALYSIS_REQUEST_LIMIT=20
ANALYSIS_REQUEST_WINDOW_SECONDS=60
ANALYSIS_DAILY_REQUEST_LIMIT=300
ANALYSIS_MAX_REQUEST_BYTES=32768
TRUST_CF_CONNECTING_IP=false
TRUSTED_PROXY_IP_HEADER=x-forwarded-for
FEEDBACK_STORAGE=disabled
MAILLUME_OPERATOR_LEGAL_NAME=<registered business name>
MAILLUME_OPERATOR_REGISTERED_ADDRESS=<optional public business address>
MAILLUME_OPERATOR_KVK=<Dutch Chamber of Commerce number>
MAILLUME_OPERATOR_VAT_ID=<VAT ID>
MAILLUME_OPERATOR_JURISDICTION=The Netherlands
MAILLUME_SUPPORT_EMAIL=support@maillume.io
MAILLUME_PRIVACY_EMAIL=privacy@maillume.io
MAILLUME_SECURITY_EMAIL=security@maillume.io
```

`TRUSTED_PROXY_IP_HEADER=x-forwarded-for` is safe here only because Caddy is the
origin's exclusive ingress (the app publishes no ports) and overwrites the header with
one client IP. `scripts/deploy-production.sh` refuses to deploy without it, and refuses
`TRUST_CF_CONNECTING_IP=true`, so the fair-use limit can never collapse into one shared
bucket or trust two headers at once.

Direct container deployments leave both trust settings disabled; because the Next.js request
API does not expose the socket peer here, they intentionally use the shared fail-safe bucket
and need an edge limiter for per-client fairness. `TRUST_CF_CONNECTING_IP=true` is only for
deployments where Cloudflare is the exclusive ingress. Never enable both trust modes.

Configure infrastructure-only Compose values separately from the application settings:

```text
MAILLUME_EDGE_NETWORK=maillume-edge
MAILLUME_IMAGE=ghcr.io/matthiasbusscher/maillume:sha-<full-commit>
```

GHCR lists runnable images and registry-backed provenance attachments on the same
versions page. A `sha-<full-commit>` tag is the runnable commit image.
`sha256-<image-digest>` is the Sigstore/SLSA attachment created for that image and
must not be used as `MAILLUME_IMAGE`, even when GHCR labels it as the latest package
version or displays a generated `docker pull` command. For immutable deployment, use
the resolved application form
`ghcr.io/matthiasbusscher/maillume@sha256:<image-digest>`. The protected deployment
workflow resolves and passes this digest automatically.

Do not configure AI provider keys on the official public service. Build-time `NEXT_PUBLIC_` values are embedded in the image; the release workflow builds the official image with canonical defaults. Self-hosters needing different public values should build their own image.

Maillume has no accounts. Analysis is anonymous and bounded by `ANALYSIS_REQUEST_LIMIT`, `ANALYSIS_REQUEST_WINDOW_SECONDS`, and `ANALYSIS_DAILY_REQUEST_LIMIT` per trusted client identifier, plus the reverse proxy's `/api/` rate limit. A leftover `ACCOUNTS_ENABLED` value in `.env.production` is ignored and can be deleted.

The public privacy, terms, and security pages require the `MAILLUME_OPERATOR_*` values at runtime. Create `support@maillume.io` in Proton Mail and make `privacy@maillume.io` and `security@maillume.io` addresses or aliases before setting the corresponding environment values. These are VPS runtime values, never GitHub build variables.

Make `scripts/deploy-production.sh` executable. Authenticate Docker to GHCR using a read-only package token if the package is private.

## 4. Scan counters and feedback

The official deployment counts scans in a Postgres database on its own host, behind PostgREST on a private network: `SCAN_COUNTERS=postgrest` and `SCAN_COUNTER_POSTGREST_URL=http://maillume-counts:3000`. See [self-hosted scan counters](self-hosted-scan-counters.md) for the schema, roles and PostgREST settings. Feedback storage stays disabled (`FEEDBACK_STORAGE=disabled`), so no Supabase project is needed.

Deployments that prefer managed hosting can use Supabase instead. It stores only the anonymous daily scan counts and optional, content-free feedback, and is not used for authentication.

1. Create a production Supabase project in an EU region and apply every migration in `supabase/migrations`.
2. Add only the server-side `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to the VPS `.env.production`. No public Supabase values are embedded in the image.
3. Disable the email, Google, and other Auth providers so nobody can start a sign-in flow against the project directly.
4. Verify Row Level Security is enabled. The counter and feedback tables accept writes only through the server role and contain no scan-content columns.

Never prefix a Supabase server secret or AI provider key with `NEXT_PUBLIC_`.

## 5. Configure GitHub Deployment

The `release.yml` workflow builds `ghcr.io/matthiasbusscher/maillume:sha-<full-commit>` and scans it with Trivy on every push to `main`. Pull requests are verified by `ci.yml`; that workflow does not run again after merge. If a main-branch push is skipped by GitHub because its commit message contains a CI-skip instruction, manually dispatch the workflow on `main` with `release_action=build` to produce the same verified image without deploying it. Production deployment runs only through a separate manual dispatch with `release_action=deploy`. That dispatch resolves the already verified SHA image to its immutable digest instead of rebuilding it, then requires approval from the protected `production` environment before the release is published to the server.

The deployment dispatch also requires
`feedback_summary_migration_applied=true`,
`extension_pairing_migration_applied=true`, and
`browser_connections_migration_applied=true`. Before resolving an image, its
preflight calls Google's Chrome update service and requires the Store to serve
the version in `integrations/browser-extension/manifest.json`. A dashboard
submission or approval notice is not enough: the public update service must
report the compatible version. This prevents a new analysis contract from
reaching production before browser clients can consume it. Apply and verify
`supabase/migrations/20260728110000_create_feedback_summary.sql`,
`supabase/migrations/20260730110000_create_extension_pairings.sql`, and
`supabase/migrations/20260730130000_create_browser_connections.sql` before
enabling their migration confirmations; the application deployment does not
apply managed Supabase migrations automatically.

Create a protected GitHub environment named `production` and require reviewer approval. It needs no secrets: GitHub never connects to the server.

### Pull-based delivery

The VPS accepts SSH only over a private VPN, so it fetches approved releases itself. After approval, the deploy job records a GitHub deployment in the `maillume-vps` environment with the verified image digest as payload. On the VPS, `scripts/pull-production-deployment.sh` runs every two minutes as the deployment user. For a deployment it hasn't seen, it validates the commit and digest, downloads `docker-compose.production.yml` and the production scripts from exactly that commit, and runs `scripts/deploy-production.sh`. Each deployment is attempted once; a failed one waits for a new approval. The GitHub job then waits up to ten minutes for the public site to report the approved revision and records the deployment as successful or failed.

Install the timer once, as root, after placing the script in `/opt/maillume/scripts`:

```ini
# /etc/systemd/system/maillume-pull-deploy.service
[Unit]
Description=Deploy the latest approved Maillume release
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
User=maillume
WorkingDirectory=/opt/maillume
ExecStart=/opt/maillume/scripts/pull-production-deployment.sh

# /etc/systemd/system/maillume-pull-deploy.timer
[Unit]
Description=Check for approved Maillume releases every two minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
```

Then `systemctl daemon-reload && systemctl enable --now maillume-pull-deploy.timer`. Read its output with `journalctl -u maillume-pull-deploy`. The script reads the public GitHub API without a token (one request per run) and needs `curl` and `python3` on the host.

Add repository variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_PASSKEYS_ENABLED` before enabling production authentication. Keep the passkey variable `false` until its acceptance matrix passes. These public browser values are intentionally supplied while the image is built. Server secrets remain only in the VPS `.env.production` file.

The pull script takes `docker-compose.production.yml` and the production scripts from the approved commit, so the VPS never depends on a stale manual copy or a Git checkout. The deploy script pulls the immutable image, waits for `/api/health`, verifies that the running container reports the approved Git revision, and restores the previous image if health or revision checks fail. GitHub then verifies the same revision and analyzer version through the public domains, together with the public marketing and sign-in routes. GitHub Actions builds images; production never builds source code.

The image job uploads a CycloneDX SBOM for every main-branch build. Once the
repository is public, it also publishes a GitHub build provenance attestation
for the exact GHCR image digest. Save the SBOM artifact URL, image digest,
attestation URL, scan result, and deployment run URL as the release evidence;
the workflow configuration alone is not evidence for a deployed release.

`/api/health` returns the non-secret build revision and analyzer version. Compare its `revision` with the commit approved in the production workflow when confirming a release.

## Verification

Use synthetic data only.

1. Check `/api/health`, marketing, scanner, trust, and resource routes through the public domains.
2. Confirm `maillume.nl` and `www.maillume.io` preserve paths while redirecting to canonical `.io` URLs.
3. Confirm direct requests to the VPS IP cannot reach the app.
4. Confirm `/api/analyze` and `/api/v1/analyze` return `Cache-Control: no-store`, reject oversized requests with `413`, and reject excess requests with `429` before analysis.
5. Confirm production reports `analysis_mode: heuristic` and has no provider key.
6. Confirm screenshot and `.eml` source files remain browser-side.
7. Confirm that `/api/v1/analyze` answers without credentials and that old `/auth` and `/account` links redirect to the scanner.
8. Rehearse deployment rollback and VPS restart recovery before the public announcement. Follow `docs/production-security-evidence.md` for the sanitized proof required by the release gate.

## Future Migration

The image uses standard Next.js standalone output and has no Hostinger-specific application code. A future migration can run the same image on another container platform or deploy the unchanged Next.js project to Vercel. Move DNS only after the new origin passes health and privacy checks.
