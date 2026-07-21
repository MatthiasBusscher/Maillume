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
- [ ] Hostinger backups are current and a restore rehearsal is recorded.
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

## Current Release Candidate

- Commit: `ffa6fd7b9c2eba9281a5f25d9eb6afb230e648db`
- Build: GitHub Actions run `29810443386`
- Deployment: GitHub Actions run `29811094270`
- Runtime: `/api/health` reports the commit above and `analysis-v3`
- Remaining human gates: Google OAuth branding confirmation, a disposable Hostinger restore rehearsal or explicit time-bounded acceptance, independent issue #47 sign-off, public provenance verification, and the 24-48 hour invited beta.

## Public Repository

- [x] Repository visibility is public and retired Gmail/Outlook build artifacts have been archived offline and removed from GitHub.
- [x] Active rulesets require pull requests, current green checks, resolved conversations, linear history, and protected `main`/`v*` refs.
- [x] GitHub Actions require immutable SHAs; workflow tokens are read-only and cannot approve pull requests.
- [x] Discussions, squash-only merging, auto-merge, and automatic branch deletion are enabled.
- [x] Secret scanning, push protection, Dependabot security updates, private vulnerability reporting, and CodeQL default setup are enabled.
- [x] Production deployment remains main-only, requires explicit review, and does not allow administrator bypass.
- [ ] A public pull request proves required-check enforcement and produces public image provenance.

## Chrome Manual Beta

- [ ] The unpacked extension passes the production-key Gmail/Outlook matrix with synthetic messages, including revocation and quota handling (#39).
- [ ] Chrome Web Store validation and the published privacy disclosure pass before claiming store availability (#39).
