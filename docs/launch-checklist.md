# Public Web Beta Launch Checklist

## Product and Privacy

- [ ] All CI, production build, browser, desktop, mobile, keyboard, and accessibility checks pass.
- [ ] Benign, spam, and phishing fixtures pass in English and Dutch using synthetic or authorized data.
- [ ] Privacy, terms, security, responsible disclosure, and provider disclosures identify the real operator and contact details.
- [ ] No email text, screenshot, `.eml`, OCR output, link, prompt, or result appears in storage, logs, monitoring, or feedback.
- [ ] The automated-assessment disclaimer remains visible.
- [ ] The launch sign-off links to the production security evidence in issue #47.

## Infrastructure

- [ ] Cloudflare is authoritative for both domains and the VPS IP is absent from public DNS.
- [ ] `.nl` and `www` redirects preserve paths and use HTTP 301.
- [ ] Ports 80/443 are closed and only required SSH access remains.
- [ ] Cloudflare DDoS, managed WAF, and `/api/` rate limiting for anonymous and authenticated analysis are enabled.
- [ ] Hostinger backups are current and a restore rehearsal is recorded.
- [ ] GitHub deployment verifies the VPS SSH host-key fingerprint and synchronizes deployment artifacts from the approved commit.
- [ ] Production environment approval, immutable deployment, health check, and rollback are tested.

## Identity and Operations

- [ ] Supabase production migrations and RLS are verified.
- [ ] Email confirmation/recovery and Google OAuth permit only production callbacks; branded SMTP is active.
- [ ] Google OAuth branding identifies Maillume and `maillume.io` ownership is verified; the `auth.maillume.io` cost decision is recorded.
- [ ] TOTP enrollment, AAL2 challenge, factor removal, new-session behavior, and account deletion pass in production.
- [ ] Passkeys remain disabled or the documented real-device beta matrix and rollback have passed.
- [ ] API-key creation, one-time display, revocation, quota exhaustion, and account-deletion cascade pass against production Supabase.
- [ ] Uptime and VPS alerts reach the operator without including scan content.
- [ ] DDoS, credential rotation, rollback, and compromised-host runbooks are rehearsed.
- [ ] A small invited beta completes successfully before broad anonymous traffic is announced.

## After The Web Beta

- [ ] Chrome extension passes Chrome Web Store validation using synthetic messages and the published privacy disclosure (#39).
