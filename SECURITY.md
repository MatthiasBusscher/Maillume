# Security Policy

Maillume handles sensitive inputs by design. Even though the launch goal is to avoid storing scan content, contributors should treat pasted emails, screenshots, OCR text, `.eml` files, headers, and AI prompts as sensitive.

The current launch review checklist lives in `docs/security-privacy-review.md`.

## Reporting a Vulnerability

Use GitHub private vulnerability reporting when it is available for the repository. Otherwise email [security@maillume.io](mailto:security@maillume.io). Do not open a public issue asking for a private channel and do not include exploit details, private email content, API keys, or sensitive logs in any public message.

Maillume aims to acknowledge a valid report within five business days and provide a status update within 30 days. Test only the official Maillume service with synthetic data and do not access, modify, or retain another person's data. Good-faith research that follows these limits will not be treated as an authorization to bypass safeguards or access data.

Please include:

- A short description of the issue.
- The affected area, such as upload parsing, logging, AI provider configuration, or client exposure.
- Safe reproduction steps using synthetic data only.
- Potential impact.

## Sensitive Data Rules

Do not post or commit:

- Real email bodies
- Raw `.eml` files from real mailboxes
- Screenshots from private inboxes
- Full email headers from real messages
- API keys or environment files
- Provider responses that contain private scan content
- Server logs containing pasted email content, OCR text, or prompts

## Supported Versions

Security fixes target the latest `main` version and the current public-beta release. Self-hosted operators should apply updates promptly.
