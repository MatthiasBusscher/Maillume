# Production Security Evidence

Use this runbook to collect the production evidence required by issue #47. Run
the checks with synthetic values only. Do not paste email content, screenshots,
`.eml` files, API keys, tokens, IP addresses, user identifiers, or raw logs into
GitHub. Attach timestamps, command outcomes, response status/header excerpts,
and redacted dashboard screenshots to the private release record instead.

The source repository enforces application limits and privacy boundaries, but it
cannot prove Cloudflare configuration, VPS firewall state, external monitoring,
or managed Supabase behavior. Each item below therefore needs fresh evidence for
the exact release digest being approved.

## Release Record

Record these non-sensitive values before testing:

- UTC timestamp and person running the check.
- GitHub workflow run URL and approved commit SHA.
- GHCR image digest deployed to `/opt/maillume/.previous-production-image`.
- `/api/health` response containing only `status`, `revision`, and
  `analysis_version`.
- `maillume-image-sbom` CycloneDX artifact URL, image vulnerability report,
  and, after the repository becomes public, the build provenance attestation
  URL.

## Edge Rate Limit

Configure a Cloudflare rate-limit rule for this expression:

```text
http.host eq "app.maillume.io" and starts_with(http.request.uri.path, "/api/")
```

Use visitor IP as the characteristic. For the initial beta, use a threshold no
higher than 10 requests per 10 seconds and choose **Block**, with an HTTP `429`
response. A Managed Challenge is useful for suspected bots but does not satisfy
the launch gate that requires an unambiguous `429` before application work.

From one external network, send eleven small invalid requests quickly. Invalid
JSON means the first requests cannot invoke OCR, an AI provider, or quota use:

```bash
for n in $(seq 1 11); do
  curl --silent --show-error --output /dev/null --dump-header "headers-$n.txt" \
    --write-out "%{http_code}\n" \
    --request POST https://app.maillume.io/api/analyze \
    --header 'content-type: application/json' \
    --data '{}'
done
```

Keep only the resulting status sequence and redacted headers. Confirm at least
one response is `429`, records a retry/mitigation period where Cloudflare
provides one, and has a matching redacted Cloudflare Security Event. Repeat the
test for `/api/v1/analyze` only when accounts and API access are enabled.

## Origin And Proxy Boundary

1. From a network outside the VPS, verify direct `http://<VPS-IP>/api/health`
   and `https://<VPS-IP>/api/health` cannot establish an application connection.
   Do not include the IP in the evidence record.
2. On the VPS, record redacted `ufw status numbered`, the public listening
   sockets, and the Cloudflare Tunnel status. There must be no public 80/443
   listener and the app Compose service must use `expose`, not `ports`.
3. Record that `NODE_ENV=production` uses only `CF-Connecting-IP` in
   `src/lib/security/client-identifier.ts`. The source test proves that
   `X-Forwarded-For` cannot override it; the direct-origin check proves a
   public client cannot inject a fake Cloudflare header into the app.

## Zero-Retention Review

For a synthetic scan marker such as `maillume-retention-check-20260718`, verify
that it is absent after the request from:

- Cloudflare request/security logs and analytics exports.
- `docker compose logs` for both application and Tunnel containers.
- VPS log aggregation, crash reporting, alerting, and backup configuration.
- Supabase tables, Auth metadata, feedback rows, and object storage.
- Application writable paths, including `/tmp`; the production app container is
  read-only and no upload volume may be mounted.
- Every configured hosted AI provider. The official beta must use heuristic
  analysis and define no provider key; self-hosted AI deployments must state
  the external-provider processing boundary in their privacy notice.

Do not save the marker in release evidence. Record only `not found`, the scope
checked, and the UTC timestamp. Confirm request/response headers use
`Cache-Control: no-store` and that raw screenshot and `.eml` files never leave
the browser.

## Supabase And Account Acceptance

Apply all migrations to the production project, then retain redacted evidence
that database linting and the SQL lifecycle tests pass. Verify RLS, function
grants, feedback expiry, API-key quota/refund behavior, deletion cascades, and
that the service-role secret exists only in the VPS application environment.

For production authentication, record the exact Site URL and redirect allowlist
without secrets. The allowlist must contain only:

```text
https://app.maillume.io/auth/callback
```

Complete the real email, Google OAuth, MFA, sign-out, API-key, and deletion
matrix in `docs/authentication.md` before enabling accounts for public use.

## Vulnerability And Dependency Review

For the approved release, retain links to:

- the full-history Gitleaks result;
- dependency review or advisory scan output;
- the Trivy image scan and its CycloneDX SBOM artifact;
- the published image provenance attestation after the repository is public;
- a dynamic scan against public, non-authenticated endpoints using synthetic
  requests only.

The blocking Trivy scan includes findings with no vendor fix. No High or
Critical finding may ship by default. If an exceptional, time-bounded risk
acceptance is required, create a separately reviewed change that identifies the
finding, owner, mitigation, expiry date, and removal condition; do not silently
weaken the release workflow.

## Monitoring, Recovery, And Rotation

1. Trigger a harmless external uptime alert for marketing, scanner, health, and
   analysis endpoints. Record that the alert excludes scan content.
2. Rehearse a deployment that fails health checks and confirm automatic rollback
   restores the prior digest. Run the protected Tunnel restart rehearsal, then
   test a full VPS reboot as the administrative operator.
3. Review `docs/credential-management.md`, record the current private register
   review date, and verify a compromised-server rotation can revoke all listed
   credentials without restoring scan content.

The release owner signs the launch checklist only after every item has an
evidence reference or a documented, time-bounded risk acceptance.
