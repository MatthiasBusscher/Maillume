# Production Operations

## Monitoring

Monitor these public endpoints from outside Hostinger every five minutes:

- `https://maillume.io/`
- `https://app.maillume.io/app`
- `https://app.maillume.io/api/health`

Alert on two consecutive failures. Monitor VPS CPU, RAM, swap, disk, Docker health, restart count, and Cloudflare 5xx/rate-limit events. Alerts and telemetry may contain route, status, duration, release SHA, and aggregate counts, but never request bodies, email fields, OCR output, links, prompts, or results.

Initial thresholds:

- CPU above 85% for 10 minutes.
- RAM above 85% or any sustained swap activity for 10 minutes.
- Disk above 75% warning and 85% critical.
- Any repeated container restart or health failure.
- 5xx response rate above 2% for five minutes.
- Analysis `429` volume above the normal beta baseline.

## Routine Maintenance

- Weekly: review container health, Cloudflare security events, Hostinger resource graphs, and backup completion.
- Monthly: install OS updates, review the official `cloudflared` release and image vulnerabilities, update its verified digest when needed, inspect disk/log growth, and verify SSH/firewall users.
- Before major change: create a Hostinger snapshot, verify the previous image digest, and test rollback.
- Quarterly: restore into a disposable environment and verify the documented recovery path.

## Immutable Image Inputs

Production accepts Maillume and cloudflared images only by registry digest. The release workflow passes Maillume to the deployment script as `ghcr.io/matthiasbusscher/maillume@sha256:<64-hex-digest>`. Compose defaults to the official multi-platform digest resolved from Cloudflare's `2026.7.0` release on 14 July 2026:

```dotenv
CLOUDFLARED_IMAGE=cloudflare/cloudflared@sha256:5e49861633763e8933475477c20bae6039ed47f32c1d267a34babc347f28f0df
```

`CLOUDFLARED_IMAGE` is optional unless you intentionally update the sidecar. Resolve any replacement from an official versioned Cloudflare image, record the release, and keep the full digest. The deployment script rejects tags such as `latest` and non-Cloudflare image repositories.

## DDoS or Abuse Response

1. Confirm Cloudflare remains the only web ingress and inspect Security Events without exporting payloads.
2. Tighten the `/api/` rate-limit action covering anonymous and authenticated analysis, or temporarily enable Under Attack Mode.
3. Reduce application analysis/concurrency limits if origin CPU is affected.
4. Add Turnstile to analysis submission only if managed challenges and rate limits are insufficient.
5. Never expose the VPS IP as a workaround. Rotate the origin IP if it becomes public and targeted.
6. Record timestamps, aggregate request counts, affected routes, actions, and outcomes without scan content.

## Failed Deployment and Rollback

`scripts/deploy-production.sh` automatically returns to `.previous-production-image` when the new container fails health checks. For manual rollback:

```bash
cd /opt/maillume
previous="$(cat .previous-production-image)"
MAILLUME_IMAGE="$previous" docker compose \
  --env-file .env.infrastructure \
  -f docker-compose.production.yml \
  up -d --remove-orphans
```

Verify health, scanner, and authentication afterward. Do not delete the failing image until the cause is understood.

## Compromised VPS

1. Isolate the VPS at Cloudflare and Hostinger; do not attempt to keep serving traffic.
2. Revoke the Tunnel token, deployment SSH key, GHCR token, Supabase server secret, and any configured provider key.
3. Preserve provider and infrastructure audit evidence without copying private scan content.
4. Reinstall from a clean Hostinger image instead of trusting an in-place cleanup.
5. Redeploy a reviewed immutable image, recreate `.env.production` from rotated secrets, and restore only required configuration.
6. Review Supabase Auth sessions and revoke them when exposure is possible.
7. Complete legal and user-notification assessment before returning to service.

## Recovery Expectations

The application stores no scan history on the VPS. Recovery requires the Compose file, deployment script, environment secrets, and an existing GHCR image. Supabase is recovered independently through its managed controls. Target an initial four-hour recovery objective for private beta and document the measured rehearsal result.
