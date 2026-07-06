# Contributing to Inbox Risk Scanner

Thanks for helping build Inbox Risk Scanner. The project goal is a privacy-first, open-source tool that helps non-technical users assess suspicious emails without storing scan content by default.

## Before You Start

- Do not include real private email content in issues, pull requests, fixtures, screenshots, logs, or commits.
- Use synthetic examples or fully sanitized examples only.
- Do not commit API keys, `.env.local`, screenshots from private inboxes, raw `.eml` files, or copied email headers that identify real people or organizations.
- Keep the required disclaimer visible in user-facing result flows: "This is an automated risk assessment and should not be considered a guarantee."

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For the public/demo mode, no AI key is needed:

```bash
ANALYSIS_MODE=heuristic
```

Self-hosted AI mode is server-configured. Self-hosters provide their own server-side provider key and optional provider base URL, and maintainer-owned keys must not be used in public deployments. Do not expose provider keys or base URLs through client-side code or `NEXT_PUBLIC_` variables.

## Branches

Use short, descriptive branch names:

```text
feature/multilingual-ui
fix/dutch-risk-calibration
docs/self-hosting
```

## Development Checks

Run these before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run test:analysis
npm run build
```

## Pull Requests

Good pull requests should:

- Stay focused on one issue or workflow.
- Include screenshots for UI changes when useful, using synthetic data only.
- Explain privacy implications if the change touches scan content, uploads, OCR, `.eml` parsing, logging, or AI prompts.
- Avoid certainty claims. Inbox Risk Scanner provides risk assessments, not guarantees.

## Detection Examples

For false positives or false negatives, use a synthetic reproduction. If you start from a real message, remove or replace:

- Names
- Email addresses
- Domains
- Phone numbers
- Addresses
- Account identifiers
- Tracking links
- Screenshots from private inboxes
- Message IDs and routing headers
