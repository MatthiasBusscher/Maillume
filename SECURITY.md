# Security Policy

Inbox Risk Scanner handles sensitive inputs by design. Even though the launch goal is to avoid storing scan content, contributors should treat pasted emails, screenshots, OCR text, `.eml` files, headers, and AI prompts as sensitive.

The current launch review checklist lives in `docs/security-privacy-review.md`.

## Reporting a Vulnerability

Use GitHub private vulnerability reporting when it is available for the repository. If private reporting is not available yet, open a minimal public issue asking for a private disclosure channel without including exploit details, private email content, API keys, or sensitive logs.

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

Inbox Risk Scanner is pre-v1. Security fixes should target the main development branch until a release process exists.
