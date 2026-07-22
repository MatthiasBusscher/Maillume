# Public Web Beta Launch Checklist

## Product and Privacy

- [x] All CI, production build, browser, desktop, mobile, keyboard, and accessibility checks pass.
- [x] Benign, spam, and phishing fixtures pass in English and Dutch using synthetic or authorized data.
- [x] Privacy, terms, security, responsible disclosure, and provider disclosures identify the real operator and contact details.
- [x] No email text, screenshot, `.eml`, OCR output, link, prompt, or result appears in application storage, logs, monitoring, or feedback under the scoped zero-retention acceptance in issue #47.
- [x] The `.eml` parser decision in `docs/adr/0001-eml-parser.md` remains within its review deadline, or a reviewed replacement/renewal is recorded.
- [x] The automated-assessment disclaimer remains visible.
- [x] The founder launch decision links to the production security evidence and explicit independent-sign-off waiver in issue #47.
- [x] The release record follows `docs/production-security-evidence.md`, including rate-limit, zero-retention, origin, scan, SBOM, rollback, and public provenance evidence.

## Infrastructure

- [x] Cloudflare is authoritative for both domains and the VPS IP is absent from public DNS.
- [x] `.nl` and `www` redirects preserve paths and use HTTP 301.
- [x] Ports 80/443 are closed and only required SSH access remains.
- [x] Cloudflare DDoS, managed WAF, and `/api/` rate limiting for anonymous and authenticated analysis are enabled.
- [x] Hostinger backups cover persisted VPS state. Issue #47 records the architecture-backed beta acceptance, full VPS restart, and immutable rebuild evidence; a destructive same-VPS restore is explicitly deferred.
- [x] GitHub deployment verifies the VPS SSH host-key fingerprint and synchronizes deployment artifacts from the approved commit.
- [x] Production environment approval, immutable deployment, health check, and rollback are tested.

## Identity and Operations

- [x] Supabase production migrations and RLS are verified.
- [x] Email confirmation/recovery and Google OAuth permit only production callbacks; branded SMTP is active.
- [x] The founder deferred free Google OAuth branding/domain verification and separately deferred the paid optional `auth.maillume.io` Supabase custom domain; the known consent/security-message limitation is disclosed in the beta release.
- [x] TOTP enrollment, AAL2 challenge, factor removal, new-session behavior, and account deletion pass in production.
- [x] Passkeys remain disabled or the documented real-device beta matrix and rollback have passed.
- [x] API-key creation, one-time display, revocation, quota exhaustion, and account-deletion cascade pass against production Supabase.
- [x] Uptime alerts reach the operator without including scan content; VPS resource alerts use the time-bounded beta acceptance in issue #47.
- [x] DDoS, credential rotation, rollback, and compromised-host runbooks are rehearsed.
- [x] The private credential register is reviewed using `docs/credential-management.md`; no credentials appear in repository files, issues, or release evidence.
- [x] The founder replaced the pre-launch invited-beta gate with monitored post-launch beta observation beginning 22 July 2026 and will address critical tester findings immediately.

## Last Deployed Baseline

- Release: `v0.1.0-beta`
- Commit: `cdc05cdfdd0650ed926ec7950e292914d9bf4487`
- Container: `ghcr.io/matthiasbusscher/maillume@sha256:384492facd1d24bb1aa3fb944b251f523432b87fb8bfb53844f132d5fea022d0`
- Build: GitHub Actions run `29901267974`
- Deployment: GitHub Actions run `29902308597`
- Runtime: `/api/health` reports the commit above and `analysis-v6`
- Runtime audit: GitHub Actions run `29902566050` passed the synthetic no-store probe plus VPS isolation, resource, credential, port, and zero-retention checks.
- Founder waivers: independent second-person production sign-off, separate-account GitHub acceptance tests, Google OAuth branding verification, and the pre-launch five-person/24-48-hour soft launch were waived rather than marked as passed. Issues #40, #47, #93, and the prerelease notes contain the decision and residual-risk record.

## Public Repository

- [x] Repository visibility is public and retired Gmail/Outlook build artifacts have been archived offline and removed from GitHub.
- [x] Active rulesets require pull requests, current green checks, resolved conversations, linear history, and protected `main`/`v*` refs.
- [x] GitHub Actions require immutable SHAs; workflow tokens are read-only and cannot approve pull requests.
- [x] Discussions, squash-only merging, auto-merge, and automatic branch deletion are enabled.
- [x] Secret scanning, push protection, Dependabot security updates, private vulnerability reporting, and CodeQL default setup are enabled.
- [x] Production deployment remains main-only, requires explicit review, and does not allow administrator bypass.
- [x] Public pull requests prove required-check enforcement; the public release workflow publishes immutable image provenance.
- [x] Protected tag `v0.1.0-beta` points to the deployed commit and its public prerelease discloses integration status, known limitations, and founder waivers.

## Chrome Manual Beta

- Automated readiness is green for the reviewed v0.3.1 artifact: `maillume-browser-extension.zip` has SHA-256 `ec152651b6aa3a3651dd02b1641629cc68941f85cb4d057e0e39bec3955b91f3`. Automated checks cover capture, fallback, restricted pages, multiple-message ambiguity, navigation clearing, Unicode and size boundaries, handoff, in-panel recapture, permission denial, revoked-key and quota response handling, the manifest, privacy invariants, and the API contract.
- Status: not cleared for Chrome distribution. The public web beta may remain live, but do not claim Chrome Web Store or generally available extension support until both gates below are checked.
- [ ] The unpacked extension passes the production-key Gmail/Outlook matrix with synthetic messages, including revocation and quota handling (#39).
- [ ] Chrome Web Store validation and the published privacy disclosure pass before claiming store availability (#39).
