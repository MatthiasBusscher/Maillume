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

`scripts/deploy-production.sh` keeps separate immutable current and previous
known-good release slots. A failed deployment returns to the current slot before
the failed candidate can replace it. For a later manual rollback:

```bash
cd /opt/maillume
./scripts/rollback-production.sh
```

The rollback command uses the same health and revision checks as a deployment
and swaps the release slots, so running it again returns to the release that was
active before the rollback. Verify health, scanner, and authentication afterward.
Do not delete either known-good image until the incident is resolved.

The protected **Rehearse production rollback** workflow requires the literal
confirmation `REHEARSE`. It switches to the previous known-good image, verifies
it, restores the starting release, and verifies the public revision. Run it after
deploying a release that initialized both state slots. Production secrets remain
limited to the protected `production` environment.

## Release Supply-Chain Evidence

Every main-branch image build produces a CycloneDX SBOM artifact named
`maillume-image-sbom`. Retain the artifact URL and the immutable GHCR image digest
with the release record. The workflow scans the image before publishing it.

Once the repository is public, the same workflow also publishes a GitHub build
provenance attestation for the exact GHCR digest. Before a public release, verify
the attestation against that digest and record its URL with the deployment
evidence. Do not treat a workflow definition as proof that a specific release
has an SBOM, a clean scan, or a valid attestation.

## Compromised VPS

1. Isolate the VPS at Cloudflare and Hostinger; do not attempt to keep serving traffic.
2. Revoke the Tunnel token, deployment SSH key, GHCR token, Supabase server secret, and any configured provider key.
3. Preserve provider and infrastructure audit evidence without copying private scan content.
4. Reinstall from a clean Hostinger image instead of trusting an in-place cleanup.
5. Redeploy a reviewed immutable image, recreate `.env.production` from rotated secrets, and restore only required configuration.
6. Review Supabase Auth sessions and revoke them when exposure is possible.
7. Complete legal and user-notification assessment before returning to service.

## Recovery Expectations

The application stores no scan history on the VPS. Recovery requires the Compose file, deployment script, environment secrets, and an existing GHCR image. Supabase is recovered independently through its managed controls. Target an initial four-hour recovery objective for public beta and document the measured rehearsal result.
