# Public Web Beta Launch Runbook

This runbook releases the anonymous Maillume web beta. It intentionally does
not release accounts, hosted API access, managed AI, Gmail/Outlook add-ons, or
the Chrome extension.

## Release Invariants

- `ANALYSIS_MODE=heuristic`; no AI-provider key is present on the VPS.
- `ACCOUNTS_ENABLED=false`; account screens and account APIs are unavailable.
- Paste, screenshot, and `.eml` scanning stay anonymous and zero-retention.
- The public scanner is available only through Cloudflare Tunnel.
- Scores are automated risk indicators, not probabilities or guarantees.

## 1. Configure Production Runtime

On the VPS, update `/opt/maillume/.env.production` with the registered
business details and monitored addresses. Use the existing legal business
identity exactly as registered; do not invent placeholder values.

```text
ANALYSIS_MODE=heuristic
ACCOUNTS_ENABLED=false
FEEDBACK_STORAGE=disabled
ANALYSIS_REQUEST_LIMIT=20
ANALYSIS_REQUEST_WINDOW_SECONDS=60
ANALYSIS_MAX_REQUEST_BYTES=32768

MAILLUME_OPERATOR_LEGAL_NAME=<registered legal name>
MAILLUME_OPERATOR_REGISTERED_ADDRESS=<registered address>
MAILLUME_OPERATOR_KVK=<KvK number>
MAILLUME_OPERATOR_VAT_ID=<VAT ID>
MAILLUME_OPERATOR_JURISDICTION=The Netherlands
MAILLUME_SUPPORT_EMAIL=support@maillume.io
MAILLUME_PRIVACY_EMAIL=privacy@maillume.io
MAILLUME_SECURITY_EMAIL=security@maillume.io
```

Never add OpenAI, Anthropic, compatible-provider, or Supabase service keys to
GitHub variables. Keep server-only Supabase keys in this VPS file only when
they are required for an approved server-side feature.

## 2. Configure Public Contact Mail

In the existing Google Workspace:

1. Create `support@maillume.io` as a monitored mailbox.
2. Add `privacy@maillume.io` and `security@maillume.io` as aliases that
   deliver to that monitored mailbox.
3. Add the Google Workspace MX records shown in the Admin console to
   Cloudflare DNS.
4. Preserve Resend DKIM records, the existing DMARC record, and exactly one
   merged SPF TXT record. Do not publish two SPF records for the same domain.
5. Send and receive a test message at all three addresses before launch.

## 3. Keep Supabase Auth Off During Beta

In the production Supabase Dashboard:

1. Disable new user signups.
2. Disable the email provider and Google provider for this beta.
3. Retain only `https://app.maillume.io/auth/callback` as the production
   callback allowlist entry; remove any broad or stale redirects.
4. Copy the reviewed files from `supabase/templates/` into managed Supabase,
   but do not enable public sign-in yet.
5. Keep Resend click tracking disabled, then send confirmation and recovery
   tests to Gmail and Outlook test inboxes as part of the later account gate.

## 4. Complete Cloudflare And Origin Checks

1. Enable Cloudflare automatic DDoS protection and the Free Managed WAF rules.
2. Use the free rate-limit rule for `app.maillume.io/api/*`: begin with 10
   requests per 10 seconds per visitor and a Managed Challenge. The app also
   enforces 20 requests per 60 seconds before analysis.
3. Confirm there is no public A or AAAA record for the VPS address. The
   public hostnames must point to the Cloudflare Tunnel.
4. Confirm `www.maillume.io` redirects with 301 to `maillume.io`, and every
   `maillume.nl` URL redirects with 301 to the matching Dutch `.io` path.
5. From an external network, prove that a direct request to the VPS IP cannot
   serve the Maillume application. Do not open ports 80 or 443 to make this
   easier.
6. Send a short burst of synthetic `/api/analyze` requests. Confirm Cloudflare
   returns `429` or a challenge before OCR or analysis, and that a normal scan
   works again after the window expires.

The application only trusts `CF-Connecting-IP` in production. A request that
does not come through Cloudflare falls into a shared conservative limiter
bucket, so do not bypass the Tunnel for testing.

## 5. Deploy And Verify The Approved Image

1. Merge the reviewed pull request. Wait for CI, full-history Gitleaks,
   dependency checks, container scan, and browser checks to pass.
2. In GitHub Actions, choose **Build production image** → **Run workflow**,
   set `deploy` to `true`, then approve the protected `production`
   environment.
3. Confirm the workflow deploys the immutable GHCR digest and reports the
   exact approved commit revision.
4. Verify through Cloudflare, not the VPS origin:

```bash
curl --fail --silent https://app.maillume.io/api/health
curl --fail --silent --head https://maillume.io/privacy
curl --fail --silent --head https://maillume.io/security
curl --silent --head https://www.maillume.io/platform
curl --silent --head https://maillume.nl/privacy
```

The health response must contain `status: "ok"`, the approved revision, and
`analysis_version: "analysis-v2.1"`. Trust pages must show the real business
identity and Maillume contact addresses.

## 6. Privacy, Abuse, And Rollback Evidence

Use only synthetic or authorized test messages in English and Dutch.

1. Exercise paste, screenshot, and `.eml` inputs with legitimate, spam, and
   phishing samples. Confirm results include the disclaimer and no file is
   uploaded as a source file.
2. Check container logs, Cloudflare logs, monitoring, Supabase, feedback, and
   backups for the unique synthetic message marker. It must not appear.
3. Confirm `/api/analyze` returns `Cache-Control: no-store`, rejects a
   malformed or oversized request, and returns `429` before analysis at the
   configured limit.
4. Trigger one deliberately invalid deployment in the protected workflow or
   use the documented previous digest. Confirm the deploy script restores the
   last healthy image automatically.
5. Confirm external uptime monitoring covers `maillume.io`,
   `app.maillume.io/app`, `/api/health`, and a safe analysis endpoint check;
   confirm VPS CPU, memory, disk, container health, 5xx responses, rate-limit
   events, and abnormal scan volume alert without including scan content.

## 7. Soft Launch And Public Release

1. Invite five trusted testers for 24–48 hours.
2. Record issues without pasting real email content into GitHub.
3. If no critical privacy, availability, or scoring defect appears, tag
   `v0.1.0-beta`, make the repository public, publish the release notes, and
   post the LinkedIn announcement.
4. Keep accounts disabled until issue #79 is closed. Treat the Chrome
   extension as a separate post-beta release; do not advertise it as available
   before Chrome Web Store approval.
