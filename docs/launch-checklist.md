# Public Web Beta Launch Checklist

## Product and Privacy

- [x] All CI, production build, browser, desktop, mobile, keyboard, and accessibility checks pass.
- [x] Benign, spam, and phishing fixtures pass in English and Dutch using synthetic or authorized data.
- [x] Privacy, terms, security, responsible disclosure, and provider disclosures identify the real operator and contact details.
- [x] No email text, screenshot, `.eml`, OCR output, link, prompt, or result appears in application storage, logs, monitoring, or feedback under the scoped zero-retention acceptance in issue #47.
- [x] The `.eml` parser decision in `docs/adr/0001-eml-parser.md` remains within its review deadline, or a reviewed replacement/renewal is recorded.
- [x] The automated-assessment disclaimer remains visible.
- [ ] The launch sign-off links to the production security evidence in issue #47.
- [x] The release record follows `docs/production-security-evidence.md`, including rate-limit, zero-retention, origin, scan, SBOM, and rollback evidence. Public provenance remains a repository-public release step.

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
- [ ] Google OAuth branding identifies Maillume and `maillume.io` ownership is verified; the `auth.maillume.io` cost decision is recorded.
- [x] TOTP enrollment, AAL2 challenge, factor removal, new-session behavior, and account deletion pass in production.
- [x] Passkeys remain disabled or the documented real-device beta matrix and rollback have passed.
- [x] API-key creation, one-time display, revocation, quota exhaustion, and account-deletion cascade pass against production Supabase.
- [x] Uptime alerts reach the operator without including scan content; VPS resource alerts use the time-bounded beta acceptance in issue #47.
- [x] DDoS, credential rotation, rollback, and compromised-host runbooks are rehearsed.
- [x] The private credential register is reviewed using `docs/credential-management.md`; no credentials appear in repository files, issues, or release evidence.
- [ ] A small invited beta completes successfully before broad anonymous traffic is announced.

## Last Deployed Baseline

- Commit: `41cef3b5452cdb30f0972a9195eb82066eedaabd`
- Build: GitHub Actions run `29898275462`
- Deployment: GitHub Actions run `29898997528`
- Runtime: `/api/health` reports the commit above and `analysis-v4`
- Runtime audit: GitHub Actions run `29900139827` passed the synthetic no-store probe plus VPS isolation, resource, credential, port, and zero-retention checks.
- Remaining human gates: Google OAuth branding confirmation, independent issue #47 sign-off, separate-account issue #93 acceptance tests, five trusted testers, and the monitored 24-48 hour invited beta.

## Public Repository

- [x] Repository visibility is public and retired Gmail/Outlook build artifacts have been archived offline and removed from GitHub.
- [x] Active rulesets require pull requests, current green checks, resolved conversations, linear history, and protected `main`/`v*` refs.
- [x] GitHub Actions require immutable SHAs; workflow tokens are read-only and cannot approve pull requests.
- [x] Discussions, squash-only merging, auto-merge, and automatic branch deletion are enabled.
- [x] Secret scanning, push protection, Dependabot security updates, private vulnerability reporting, and CodeQL default setup are enabled.
- [x] Production deployment remains main-only, requires explicit review, and does not allow administrator bypass.
- [x] Public pull requests prove required-check enforcement; the public release workflow publishes immutable image provenance.

## Chrome Manual Beta

- [ ] The unpacked extension passes the production-key Gmail/Outlook matrix with synthetic messages, including revocation and quota handling (#39).
- [ ] Chrome Web Store validation and the published privacy disclosure pass before claiming store availability (#39).
